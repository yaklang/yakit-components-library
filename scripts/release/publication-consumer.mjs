import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  INBOX_STATES,
  atomicWriteJsonCas,
  beginInboxOperation,
  createOutboxRecord,
  finishInboxOperation,
  payloadHash,
  readRevisionedJson,
} from './durable-release-state.mjs'
import {
  BOUND_PRIVATE_PROVENANCE_REJECTION_SCHEMA,
  PRIVATE_PROVENANCE_REJECTION_SCHEMA,
} from './private-provenance-recovery.mjs'

export const PUBLICATION_OUTBOX_SCHEMA = 'yakit-ui-publication-outbox/v1'
export const PUBLICATION_STATE_SCHEMA = 'yakit-ui-publication-state/v1'
export const PUBLICATION_INVENTORY_SCHEMA = 'yakit-ui-publication-artifact-inventory/v1'
export const REGISTRY_ABSENCE_SCHEMA = 'yakit-ui-publication-registry-absence/v1'

const registryUrl = (packageName) => `https://registry.npmjs.org/${encodeURIComponent(packageName)}`

export function createRegistryAbsenceObservation(release, observedAt) {
  const evidence = {
    schemaId: REGISTRY_ABSENCE_SCHEMA,
    schemaVersion: 1,
    observedAt: new Date(observedAt).toISOString(),
    registryUrl: registryUrl(release.name),
    packageName: release.name,
    version: release.version,
    distTag: release.distTag,
    expectedSha256: release.tarball.sha256,
    expectedIntegrity: release.tarball.integrity,
    result: 'NOT_APPLIED',
  }
  return { ...evidence, evidenceHash: payloadHash(evidence) }
}

export function publicationPayload(manifest, release) {
  return {
    repository: manifest.repository,
    workflowCommitSha: manifest.workflowCommitSha,
    sourceRunId: manifest.runId,
    packArtifactId: manifest.packArtifact.id,
    distTag: release.distTag,
    filename: release.tarball.filename,
    integrity: release.tarball.integrity,
    sha256: release.tarball.sha256,
    packedBytes: release.tarball.packedBytes,
  }
}

export function createPublicationOutbox(manifest) {
  const records = {}
  for (const release of manifest.releases) {
    const record = createOutboxRecord({
      operation: 'publish',
      packageName: release.name,
      version: release.version,
      payload: publicationPayload(manifest, release),
    })
    records[record.id] = record
  }
  return {
    schemaId: PUBLICATION_OUTBOX_SCHEMA,
    schemaVersion: 1,
    revision: 1,
    sourceRunId: manifest.runId,
    records,
  }
}

export function validatePublicationOutbox(outbox, manifest) {
  if (
    outbox?.schemaId !== PUBLICATION_OUTBOX_SCHEMA ||
    outbox?.schemaVersion !== 1 ||
    String(outbox?.sourceRunId) !== String(manifest.runId)
  )
    throw new Error('publication outbox identity is invalid')
  const expected = createPublicationOutbox(manifest)
  const actualKeys = Object.keys(outbox.records ?? {})
  const expectedKeys = Object.keys(expected.records)
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys))
    throw new Error('publication outbox release set mismatch')
  for (const key of expectedKeys) {
    const actual = outbox.records[key]
    const wanted = expected.records[key]
    if (
      actual?.idempotencyKey !== wanted.idempotencyKey ||
      actual?.payloadHash !== wanted.payloadHash ||
      actual?.payloadHash !== payloadHash(actual?.payload) ||
      actual?.status !== 'PENDING'
    )
      throw new Error(`publication outbox record ${key} is invalid`)
  }
  return outbox
}

async function findFiles(root, filename) {
  const found = []
  if (!root) return found
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return found
    throw error
  }
  for (const entry of entries) {
    const target = path.join(root, entry.name)
    if (entry.isDirectory()) found.push(...(await findFiles(target, filename)))
    else if (entry.isFile() && entry.name === filename) found.push(target)
  }
  return found
}

function validatePriorInventory(inventory, manifest) {
  if (
    inventory?.schemaId !== PUBLICATION_INVENTORY_SCHEMA ||
    inventory?.schemaVersion !== 1 ||
    inventory?.repository !== manifest.repository ||
    String(inventory?.sourceRunId) !== String(manifest.runId) ||
    !Number.isSafeInteger(inventory?.enumeratedArtifactCount) ||
    !Array.isArray(inventory?.artifacts) ||
    inventory.relevantArtifactCount !== inventory.artifacts.length ||
    inventory.enumeratedArtifactCount < inventory.relevantArtifactCount
  )
    throw new Error('prior publication artifact inventory is invalid')
  const ids = new Set()
  const names = new Set()
  for (const artifact of inventory.artifacts) {
    if (
      !artifact?.id ||
      !artifact?.name ||
      !/^sha256:[0-9a-f]{64}$/i.test(artifact?.digest ?? '') ||
      !artifact?.workflowRunId ||
      artifact?.producerPath !== '.github/workflows/publish.yml' ||
      ids.has(artifact.id) ||
      names.has(artifact.name)
    )
      throw new Error('prior publication artifact inventory entry is invalid')
    ids.add(artifact.id)
    names.add(artifact.name)
  }
  return inventory
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

function artifactStateIdentity(artifact, sourceRunId) {
  const escaped = String(sourceRunId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = artifact.name.match(
    new RegExp(`^yakit-ui-(publish|recovery)-(intent|receipt)-${escaped}-(?:([0-9]+)-)?([0-9]+)$`),
  )
  if (!match) throw new Error('prior publication artifact name is invalid')
  const [, workflow, phase, recoveryRunId, runAttempt] = match
  if ((workflow === 'publish' && recoveryRunId) || (workflow === 'recovery' && !recoveryRunId))
    throw new Error('prior publication artifact run identity is invalid')
  return {
    attemptId: `${recoveryRunId ?? sourceRunId}:${runAttempt}`,
    phase: phase === 'intent' ? 'INTENT' : 'RECEIPT',
    workflowRunId: String(recoveryRunId ?? sourceRunId),
  }
}

async function latestPriorState(priorRoot, inventory, manifest, outboxSha256) {
  validatePriorInventory(inventory, manifest)
  const candidates = []
  const lifecycleFiles = await findFiles(priorRoot, 'lifecycle-snapshot.json')
  for (const artifact of inventory.artifacts) {
    const artifactRoot = path.join(priorRoot, artifact.name)
    const matchingFiles = lifecycleFiles.filter((file) => path.dirname(file) === artifactRoot)
    if (matchingFiles.length !== 1)
      throw new Error(`publication artifact ${artifact.id} must contain exactly one lifecycle snapshot`)
    const [file] = matchingFiles
    const bytes = await readFile(file)
    const state = JSON.parse(bytes.toString('utf8'))
    const inboxBytes = await readFile(path.join(path.dirname(file), 'consumer-inbox.json'))
    const expectedIdentity = artifactStateIdentity(artifact, manifest.runId)
    if (
      state.schemaId !== PUBLICATION_STATE_SCHEMA ||
      String(state.sourceRunId) !== String(manifest.runId) ||
      state.outboxSha256 !== outboxSha256 ||
      !Number.isSafeInteger(state.generation) ||
      state.generation < 1 ||
      state.phase !== expectedIdentity.phase ||
      state.attemptId !== expectedIdentity.attemptId ||
      String(artifact.workflowRunId) !== expectedIdentity.workflowRunId
    )
      throw new Error(`prior publication state identity mismatch: ${file}`)
    candidates.push({
      artifact,
      file,
      lifecycleSha256: sha256(bytes),
      inbox: JSON.parse(inboxBytes.toString('utf8')),
      inboxSha256: sha256(inboxBytes),
      state,
    })
  }
  const inventoriedRoots = new Set(
    inventory.artifacts.map((artifact) => path.join(priorRoot, artifact.name, 'lifecycle-snapshot.json')),
  )
  if (lifecycleFiles.some((file) => !inventoriedRoots.has(file)))
    throw new Error('downloaded publication state is absent from inventory')
  const phaseRank = (state) => (state.phase === 'RECEIPT' ? 1 : 0)
  candidates.sort(
    (left, right) => right.state.generation - left.state.generation || phaseRank(right.state) - phaseRank(left.state),
  )
  if (
    candidates.length > 1 &&
    candidates[0].state.generation === candidates[1].state.generation &&
    candidates[0].state.phase === candidates[1].state.phase &&
    JSON.stringify(candidates[0].state) !== JSON.stringify(candidates[1].state)
  )
    throw new Error('prior publication state has an ambiguous generation fork')
  return { candidates, selected: candidates[0] ?? null }
}

function authorizeRetry({ attemptId, candidates, manifest, outboxSha256, request, selected }) {
  if (!request?.authorized) return null
  if (!request.intentArtifactId || !request.receiptArtifactId)
    throw new Error('authorized retry requires exact intent and receipt artifact IDs')
  if (selected?.state.phase !== 'RECEIPT') throw new Error('authorized retry requires a producer-authenticated receipt')
  if (selected.artifact.id !== String(request.receiptArtifactId))
    throw new Error('authorized retry receipt artifact does not match latest state')
  const intent = candidates.find((candidate) => candidate.artifact.id === String(request.intentArtifactId))
  if (
    !intent ||
    intent.state.phase !== 'INTENT' ||
    intent.state.attemptId !== selected.state.attemptId ||
    intent.state.generation !== selected.state.generation ||
    intent.state.outboxSha256 !== outboxSha256 ||
    selected.state.durableIntentArtifact?.id !== intent.artifact.id ||
    selected.state.durableIntentArtifact?.digest !== intent.artifact.digest
  )
    throw new Error('authorized retry dual evidence identity mismatch')
  const receiptRetryablePackages = selected.state.releases
    .filter((release) => release.recoveryStatus === 'not-applied')
    .map((release) => release.name)
  const rejectionEvidence = request.definitiveNoApplyEvidence
  let remediatedPackages = []
  if (rejectionEvidence) {
    const { evidenceHash, ...boundPayload } = rejectionEvidence
    const resolution = boundPayload.resolution
    const { evidenceHash: resolutionHash, ...resolutionPayload } = resolution ?? {}
    const expectedReleaseIdentities = manifest.releases.map((release) => release.identity)
    const expectedResolvedOutcomes = Object.fromEntries(
      expectedReleaseIdentities.map((identity, index) => [identity, index === 0 ? 'NOT_APPLIED' : 'NOT_ATTEMPTED']),
    )
    if (
      boundPayload.schemaId !== BOUND_PRIVATE_PROVENANCE_REJECTION_SCHEMA ||
      boundPayload.schemaVersion !== 1 ||
      !/^[0-9a-f]{64}$/i.test(boundPayload.resolutionSha256 ?? '') ||
      !boundPayload.resolutionArtifact?.id ||
      !/^sha256:[0-9a-f]{64}$/i.test(boundPayload.resolutionArtifact?.digest ?? '') ||
      !boundPayload.resolutionArtifact?.workflowRunId ||
      evidenceHash !== payloadHash(boundPayload) ||
      resolutionPayload.schemaId !== PRIVATE_PROVENANCE_REJECTION_SCHEMA ||
      resolutionPayload.schemaVersion !== 1 ||
      resolutionPayload.repository?.name !== manifest.repository ||
      resolutionPayload.repository?.visibility !== 'private' ||
      String(resolutionPayload.sourceRunId) !== String(manifest.runId) ||
      resolutionPayload.workflowCommitSha !== manifest.workflowCommitSha ||
      resolutionPayload.npmErrorCode !== 'E422' ||
      resolutionPayload.failureReason !== 'PRIVATE_SOURCE_REPOSITORY_PROVENANCE_UNSUPPORTED' ||
      resolutionPayload.failureReleaseIdentity !== expectedReleaseIdentities[0] ||
      JSON.stringify(resolutionPayload.releaseIdentities) !== JSON.stringify(expectedReleaseIdentities) ||
      JSON.stringify(resolutionPayload.resolvedOutcomes) !== JSON.stringify(expectedResolvedOutcomes) ||
      !/^[0-9a-f]{64}$/i.test(resolutionPayload.logSha256 ?? '') ||
      resolutionHash !== payloadHash(resolutionPayload) ||
      resolutionPayload.sourceArtifactEvidence?.intent?.id !== intent.artifact.id ||
      resolutionPayload.sourceArtifactEvidence?.intent?.digest !== intent.artifact.digest ||
      resolutionPayload.sourceArtifactEvidence?.receipt?.id !== selected.artifact.id ||
      resolutionPayload.sourceArtifactEvidence?.receipt?.digest !== selected.artifact.digest ||
      !Number.isFinite(Date.parse(resolutionPayload.rejectionObservedAt ?? ''))
    )
      throw new Error('private provenance rejection evidence is invalid')
    for (const [index, release] of manifest.releases.entries()) {
      const lifecycle = selected.state.releases.find((item) => item.name === release.name)
      const receipt = selected.inbox.records?.[`publish:${release.name}@${release.version}`]
      if (index === 0) {
        if (
          lifecycle?.recoveryStatus !== 'ambiguous' ||
          receipt?.status !== INBOX_STATES.AMBIGUOUS ||
          receipt?.observation !== 'NOT_APPLIED' ||
          !receipt?.error?.includes('--provenance')
        )
          throw new Error('private provenance rejection receipt state is invalid')
      } else if (lifecycle?.recoveryStatus !== 'processing' || receipt?.status !== INBOX_STATES.PROCESSING)
        throw new Error('private provenance unattempted package state is invalid')
    }
    if (receiptRetryablePackages.length > 0)
      throw new Error('private provenance remediation cannot mix with ordinary retry receipts')
    remediatedPackages = manifest.releases.map((release) => release.name)
  }
  const retryablePackages = remediatedPackages.length > 0 ? remediatedPackages : receiptRetryablePackages
  if (retryablePackages.length === 0)
    throw new Error(
      'authorized retry requires a definitive producer-authenticated no-success receipt; AMBIGUOUS is never retry authority',
    )
  for (const packageName of receiptRetryablePackages) {
    const release = manifest.releases.find((item) => item.name === packageName)
    const key = `publish:${packageName}@${release.version}`
    const receipt = selected.inbox.records?.[key]
    if (
      receipt?.status !== INBOX_STATES.FAILED ||
      receipt?.reconciled !== true ||
      !['NOT_ATTEMPTED', 'NOT_APPLIED'].includes(receipt?.sideEffectOutcome)
    )
      throw new Error('authorized retry receipt does not definitively prove a no-success outcome')
  }
  return {
    schemaId: 'yakit-ui-publication-retry-decision/v1',
    schemaVersion: 1,
    authorized: true,
    decisionId: attemptId,
    priorAttemptId: selected.state.attemptId,
    sourceRunId: manifest.runId,
    outboxSha256,
    releaseIdentities: manifest.releases
      .filter((release) => retryablePackages.includes(release.name))
      .map((release) => release.identity),
    intentEvidence: {
      id: intent.artifact.id,
      digest: intent.artifact.digest,
      inboxSha256: intent.inboxSha256,
      lifecycleSha256: intent.lifecycleSha256,
    },
    receiptEvidence: {
      id: selected.artifact.id,
      digest: selected.artifact.digest,
      inboxSha256: selected.inboxSha256,
      lifecycleSha256: selected.lifecycleSha256,
    },
    definitiveNoApplyEvidence: rejectionEvidence ?? null,
    registryAbsenceEvidence: [],
  }
}

function validateRegistryAbsenceObservation({
  evidence,
  release,
  receipt,
  retryDecision,
  now,
  propagationWindowMs,
  observationMaxAgeMs,
}) {
  const { evidenceHash, ...payload } = evidence ?? {}
  if (
    payload.schemaId !== REGISTRY_ABSENCE_SCHEMA ||
    payload.schemaVersion !== 1 ||
    payload.registryUrl !== registryUrl(release.name) ||
    payload.packageName !== release.name ||
    payload.version !== release.version ||
    payload.distTag !== release.distTag ||
    payload.expectedSha256 !== release.tarball.sha256 ||
    payload.expectedIntegrity !== release.tarball.integrity ||
    payload.result !== 'NOT_APPLIED' ||
    evidenceHash !== payloadHash(payload)
  )
    throw new Error(`${release.identity} registry absence evidence identity or hash is invalid`)
  const observedAt = Date.parse(payload.observedAt)
  const definitiveReceiptTime = [...receipt.state.history]
    .reverse()
    .find(
      (event) => event.packageName === release.name && event.event === 'PUBLISH_DEFINITIVELY_NOT_APPLIED',
    )?.recordedAt
  const remediatedRejectionTime = retryDecision?.definitiveNoApplyEvidence?.resolution?.releaseIdentities.includes(
    release.identity,
  )
    ? retryDecision.definitiveNoApplyEvidence.resolution.rejectionObservedAt
    : undefined
  const noSuccessAt = Date.parse(definitiveReceiptTime ?? remediatedRejectionTime ?? '')
  if (!Number.isFinite(observedAt) || !Number.isFinite(noSuccessAt))
    throw new Error(`${release.identity} registry absence evidence has no valid observation time`)
  if (observedAt - noSuccessAt < propagationWindowMs)
    throw new Error(`${release.identity} registry absence evidence predates the configured propagation window`)
  if (observedAt > now || now - observedAt > observationMaxAgeMs)
    throw new Error(`${release.identity} registry absence evidence is stale or future-dated`)
  return evidence
}

function initialReleases(manifest, prior) {
  const byName = new Map((prior?.releases ?? []).map((release) => [release.name, release]))
  return manifest.releases.map((release) => {
    const previous = byName.get(release.name)
    return {
      name: release.name,
      version: release.version,
      publishStatus: previous?.publishStatus ?? 'verified',
      publishAttempt: previous?.publishAttempt ?? 0,
      recoveryStatus: previous?.recoveryStatus ?? 'pending',
      recoveryRevision: previous?.recoveryRevision ?? 0,
    }
  })
}

async function initializeAttemptState({
  manifest,
  outboxSha256,
  stateDirectory,
  prior,
  attemptId,
  now,
  inventory,
  retryDecision,
}) {
  const lifecyclePath = path.join(stateDirectory, 'lifecycle-snapshot.json')
  const inboxPath = path.join(stateDirectory, 'consumer-inbox.json')
  const generation = (prior?.state.generation ?? 0) + 1
  await atomicWriteJsonCas(lifecyclePath, 0, {
    schemaId: PUBLICATION_STATE_SCHEMA,
    schemaVersion: 1,
    sourceRunId: manifest.runId,
    outboxSha256,
    generation,
    phase: 'INTENT',
    priorArtifactInventoryHash: payloadHash(inventory),
    authorizedRetryDecision: retryDecision,
    attemptId,
    releases: initialReleases(manifest, prior?.state),
    history: [
      {
        sequence: 1,
        event: 'ATTEMPT_STARTED',
        attemptId,
        recordedAt: new Date(now).toISOString(),
      },
    ],
  })
  let copiedInbox = false
  if (prior) {
    const priorInboxPath = path.join(path.dirname(prior.file), 'consumer-inbox.json')
    try {
      const inbox = JSON.parse(await readFile(priorInboxPath, 'utf8'))
      await writeFile(inboxPath, `${JSON.stringify(inbox, null, 2)}\n`, {
        flag: 'wx',
      })
      copiedInbox = true
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  if (
    prior &&
    !copiedInbox &&
    prior.state.releases.some(
      (release) => release.publishStatus === 'publishing' || release.recoveryStatus === 'ambiguous',
    )
  )
    throw new Error('prior lifecycle has an unresolved side effect but its durable inbox receipt is missing')
  if (!copiedInbox)
    await writeFile(inboxPath, `${JSON.stringify({ revision: 0, records: {} }, null, 2)}\n`, { flag: 'wx' })
  return { lifecyclePath, inboxPath, generation, prior: prior?.state }
}

async function recordLifecycle(lifecyclePath, packageName, patch, event, now = Date.now()) {
  const current = await readRevisionedJson(lifecyclePath)
  const releases = current.releases.map((release) =>
    release.name === packageName ? { ...release, ...patch } : release,
  )
  if (!releases.some((release) => release.name === packageName))
    throw new Error(`missing lifecycle identity ${packageName}`)
  return atomicWriteJsonCas(lifecyclePath, current.revision, {
    ...current,
    releases,
    history: [
      ...current.history,
      {
        sequence: current.history.length + 1,
        event,
        packageName,
        recordedAt: new Date(now).toISOString(),
      },
    ],
  })
}

export async function preparePublicationAttempt({
  manifest,
  outbox,
  outboxSha256,
  stateDirectory,
  priorStateRoot,
  priorArtifactInventory,
  retryAuthorizationRequest,
  attemptId,
  observe,
  now = () => Date.now(),
  propagationWindowMs = 30_000,
  observationMaxAgeMs = 300_000,
}) {
  validatePublicationOutbox(outbox, manifest)
  const { candidates, selected } = await latestPriorState(
    priorStateRoot,
    priorArtifactInventory,
    manifest,
    outboxSha256,
  )
  if (priorArtifactInventory.artifacts.length === 0 && selected)
    throw new Error('initial publication intent requires a confirmed empty inventory')
  if (priorArtifactInventory.artifacts.length > 0 && !selected)
    throw new Error('publication history exists but no prior lifecycle was downloaded')
  const retryDecision = authorizeRetry({
    attemptId,
    candidates,
    manifest,
    outboxSha256,
    request: retryAuthorizationRequest,
    selected,
  })
  const currentTime = () => (typeof now === 'function' ? now() : now)
  const observations = new Map()
  for (const release of manifest.releases) {
    const observed = await observe(release)
    observations.set(release.name, observed)
    if (retryDecision?.releaseIdentities.includes(release.identity))
      retryDecision.registryAbsenceEvidence.push(
        validateRegistryAbsenceObservation({
          evidence: observed,
          release,
          receipt: selected,
          retryDecision,
          now: currentTime(),
          propagationWindowMs,
          observationMaxAgeMs,
        }),
      )
  }
  const observationTime = currentTime()
  const { lifecyclePath, inboxPath, prior } = await initializeAttemptState({
    manifest,
    outboxSha256,
    stateDirectory,
    prior: selected,
    attemptId,
    now: observationTime,
    inventory: priorArtifactInventory,
    retryDecision,
  })
  const published = []
  const pending = []
  for (const release of manifest.releases) {
    const record = outbox.records[`publish:${release.name}@${release.version}`]
    const observation = observations.get(release.name)
    const observed = typeof observation === 'string' ? observation : observation?.result
    if (observed === 'APPLIED') {
      const inboxState = await readRevisionedJson(inboxPath, {
        revision: 0,
        records: {},
      })
      const existingInbox = inboxState.records?.[record.idempotencyKey]
      if (existingInbox) {
        if (existingInbox.idempotencyKey !== record.idempotencyKey || existingInbox.payloadHash !== record.payloadHash)
          throw new Error(`${release.identity} registry reconciliation found an inbox identity conflict`)
        if (existingInbox.status !== INBOX_STATES.SUCCEEDED)
          await finishInboxOperation(inboxPath, record.idempotencyKey, {
            status: INBOX_STATES.SUCCEEDED,
            reconciled: true,
            observation: 'APPLIED',
          })
      }
      await recordLifecycle(
        lifecyclePath,
        release.name,
        { publishStatus: 'published', recoveryStatus: 'reconciled' },
        'REGISTRY_RECONCILED_APPLIED',
        observationTime,
      )
      published.push(release.name)
      continue
    }
    if (observed !== 'NOT_APPLIED') throw new Error(`${release.identity} registry state is ambiguous`)

    let intake = await beginInboxOperation(inboxPath, record)
    if (intake.decision === 'RECONCILE_REQUIRED') {
      const previous = prior?.releases?.find((item) => item.name === release.name)
      if (selected?.state.phase !== 'RECEIPT')
        throw new Error(
          `${release.identity} is UNKNOWN because its durable success receipt is missing; replay is forbidden`,
        )
      const authorizedIdentity = retryDecision?.releaseIdentities.includes(release.identity)
      const remediatedIdentity = retryDecision?.definitiveNoApplyEvidence?.resolution?.releaseIdentities.includes(
        release.identity,
      )
      if (
        !authorizedIdentity ||
        (previous?.recoveryStatus !== 'not-applied' &&
          !(remediatedIdentity && ['ambiguous', 'processing'].includes(previous?.recoveryStatus)))
      )
        throw new Error(`${release.identity} requires an explicit producer-authenticated retry decision`)
      await finishInboxOperation(inboxPath, record.idempotencyKey, {
        status: INBOX_STATES.FAILED,
        reconciled: true,
        observation: 'NOT_APPLIED',
      })
      await recordLifecycle(
        lifecyclePath,
        release.name,
        { publishStatus: 'failed', recoveryStatus: 'reconciled' },
        'MISSING_RECEIPT_RECONCILED_NOT_APPLIED',
        observationTime,
      )
      intake = await beginInboxOperation(inboxPath, record)
    }
    if (intake.decision === 'SKIP_SUCCEEDED')
      throw new Error(`${release.identity} has a success receipt but registry does not contain the exact package`)
    if (intake.decision !== 'EXECUTE') throw new Error(`${release.identity} cannot enter durable publish processing`)

    const before = (await readRevisionedJson(lifecyclePath)).releases.find((item) => item.name === release.name)
    await recordLifecycle(
      lifecyclePath,
      release.name,
      {
        publishStatus: 'publishing',
        publishAttempt: (before?.publishAttempt ?? 0) + 1,
        recoveryStatus: 'processing',
        recoveryRevision: (before?.recoveryRevision ?? 0) + 1,
        intentRecordedAt: new Date(observationTime).toISOString(),
      },
      'PUBLISH_INTENT_DURABLY_RECORDED',
      observationTime,
    )
    pending.push(release.name)
  }
  return { pending, published }
}

export async function dispatchPreparedPublication({
  manifest,
  outbox,
  outboxSha256,
  intentDirectory,
  receiptDirectory,
  intentArtifactIdentity,
  observe,
  observeAfterPublish = observe,
  publish,
  now = () => Date.now(),
}) {
  const currentTime = () => (typeof now === 'function' ? now() : now)
  validatePublicationOutbox(outbox, manifest)
  if (!intentArtifactIdentity?.id || !/^sha256:[0-9a-f]{64}$/i.test(intentArtifactIdentity?.digest ?? ''))
    throw new Error('durable intent artifact identity is invalid')
  const intentLifecycle = JSON.parse(await readFile(path.join(intentDirectory, 'lifecycle-snapshot.json'), 'utf8'))
  const intentInbox = JSON.parse(await readFile(path.join(intentDirectory, 'consumer-inbox.json'), 'utf8'))
  if (
    intentLifecycle.schemaId !== PUBLICATION_STATE_SCHEMA ||
    String(intentLifecycle.sourceRunId) !== String(manifest.runId) ||
    intentLifecycle.outboxSha256 !== outboxSha256 ||
    intentLifecycle.phase !== 'INTENT' ||
    !Number.isSafeInteger(intentLifecycle.generation)
  )
    throw new Error('prepared publication state identity mismatch')
  const lifecyclePath = path.join(receiptDirectory, 'lifecycle-snapshot.json')
  const inboxPath = path.join(receiptDirectory, 'consumer-inbox.json')
  await atomicWriteJsonCas(lifecyclePath, 0, {
    ...intentLifecycle,
    revision: 0,
    phase: 'RECEIPT',
    durableIntentArtifact: intentArtifactIdentity,
    history: [
      ...intentLifecycle.history,
      {
        sequence: intentLifecycle.history.length + 1,
        event: 'DURABLE_INTENT_ARTIFACT_VALIDATED',
        recordedAt: new Date(currentTime()).toISOString(),
      },
    ],
  })
  await writeFile(inboxPath, `${JSON.stringify(intentInbox, null, 2)}\n`, {
    flag: 'wx',
  })

  const published = []
  for (const release of manifest.releases) {
    const record = outbox.records[`publish:${release.name}@${release.version}`]
    const lifecycle = intentLifecycle.releases.find((item) => item.name === release.name)
    const inbox = intentInbox.records?.[record.idempotencyKey]
    const beforeDispatch = await observe(release)
    if (lifecycle?.publishStatus === 'published') {
      if (beforeDispatch !== 'APPLIED')
        throw new Error(`${release.identity} lifecycle says published but registry reconciliation disagrees`)
      published.push(release.name)
      continue
    }
    if (
      lifecycle?.publishStatus !== 'publishing' ||
      inbox?.status !== INBOX_STATES.PROCESSING ||
      inbox?.payloadHash !== record.payloadHash
    )
      throw new Error(`${release.identity} has no durable PROCESSING intent`)
    if (beforeDispatch === 'APPLIED') {
      await finishInboxOperation(inboxPath, record.idempotencyKey, {
        status: INBOX_STATES.SUCCEEDED,
        reconciled: true,
        observation: 'APPLIED',
      })
      await recordLifecycle(
        lifecyclePath,
        release.name,
        { publishStatus: 'published', recoveryStatus: 'complete' },
        'PRE_DISPATCH_RECONCILED_APPLIED',
        currentTime(),
      )
      published.push(release.name)
      continue
    }
    if (beforeDispatch !== 'NOT_APPLIED') throw new Error(`${release.identity} registry state is ambiguous`)

    let publishError
    try {
      await publish(release)
    } catch (error) {
      publishError = error
    }
    const after = await observeAfterPublish(release)
    if (after === 'APPLIED') {
      await finishInboxOperation(inboxPath, record.idempotencyKey, {
        status: INBOX_STATES.SUCCEEDED,
        reconciled: true,
        observation: 'APPLIED',
      })
      await recordLifecycle(
        lifecyclePath,
        release.name,
        { publishStatus: 'published', recoveryStatus: 'complete' },
        publishError ? 'PUBLISH_ERROR_RECONCILED_APPLIED' : 'PUBLISH_CONFIRMED_APPLIED',
        currentTime(),
      )
      published.push(release.name)
      continue
    }
    if (
      publishError &&
      ['NOT_ATTEMPTED', 'NOT_APPLIED'].includes(publishError.publicationOutcome) &&
      after === 'NOT_APPLIED'
    ) {
      await finishInboxOperation(inboxPath, record.idempotencyKey, {
        status: INBOX_STATES.FAILED,
        reconciled: true,
        observation: 'NOT_APPLIED',
        sideEffectOutcome: publishError.publicationOutcome,
        error: publishError.message,
      })
      await recordLifecycle(
        lifecyclePath,
        release.name,
        { publishStatus: 'failed', recoveryStatus: 'not-applied' },
        'PUBLISH_DEFINITIVELY_NOT_APPLIED',
        currentTime(),
      )
      throw new Error(
        `${release.identity} publication was definitively not applied; retry requires fresh registry evidence and explicit authorization`,
        { cause: publishError },
      )
    }
    await finishInboxOperation(inboxPath, record.idempotencyKey, {
      status: INBOX_STATES.AMBIGUOUS,
      reconciled: false,
      observation: after,
      error: publishError?.message ?? 'registry did not confirm publication',
    })
    await recordLifecycle(
      lifecyclePath,
      release.name,
      { publishStatus: 'failed', recoveryStatus: 'ambiguous' },
      'PUBLISH_OUTCOME_AMBIGUOUS',
      currentTime(),
    )
    throw new Error(
      `${release.identity} publication outcome is ambiguous; retry must reconcile registry before any side effect`,
      publishError ? { cause: publishError } : undefined,
    )
  }
  return { published }
}
