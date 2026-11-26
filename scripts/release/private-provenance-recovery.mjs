import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { payloadHash } from './durable-release-state.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const POLICY_PATH = path.join(ROOT, 'scripts/release/private-provenance-incident-policy.json')
const SHA1 = /^[0-9a-f]{40}$/i
const SHA256 = /^[0-9a-f]{64}$/i
const DIGEST = /^sha256:[0-9a-f]{64}$/i

export const PRIVATE_PROVENANCE_INCIDENT_POLICY_SCHEMA = 'yakit-ui-private-provenance-incident-policy/v1'
export const PRIVATE_PROVENANCE_REJECTION_SCHEMA = 'yakit-ui-private-provenance-rejection/v1'
export const BOUND_PRIVATE_PROVENANCE_REJECTION_SCHEMA = 'yakit-ui-bound-private-provenance-rejection/v1'

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

function exact(value, expected, label) {
  if (value !== expected) throw new Error(`${label} mismatch`)
}

function same(value, expected, label) {
  if (JSON.stringify(value) !== JSON.stringify(expected)) throw new Error(`${label} mismatch`)
}

async function githubResponse(fetchImpl, url, token) {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
    },
  })
  if (!response.ok) throw new Error(`GitHub incident evidence failed with HTTP ${response.status}`)
  return response
}

export function validatePrivateProvenanceIncidentPolicy(policy) {
  if (
    policy?.schemaId !== PRIVATE_PROVENANCE_INCIDENT_POLICY_SCHEMA ||
    policy?.schemaVersion !== 1 ||
    !policy.incidentId ||
    !Number.isFinite(Date.parse(policy.notAfter ?? '')) ||
    !policy.repository?.id ||
    !policy.repository?.name ||
    policy.repository?.visibility !== 'private' ||
    !policy.source?.runId ||
    policy.source?.runAttempt !== 1 ||
    !policy.source?.publishJobId ||
    !SHA1.test(policy.source?.headSha ?? '') ||
    policy.source?.sourceRef !== 'refs/heads/main' ||
    !DIGEST.test(policy.artifacts?.verification?.digest ?? '') ||
    !DIGEST.test(policy.artifacts?.intent?.digest ?? '') ||
    !DIGEST.test(policy.artifacts?.receipt?.digest ?? '') ||
    !SHA256.test(policy.outboxSha256 ?? '') ||
    !Array.isArray(policy.releaseSet) ||
    policy.releaseSet.length < 2 ||
    !SHA1.test(policy.sourceConsumer?.blobSha ?? '') ||
    !SHA256.test(policy.sourceConsumer?.sha256 ?? '') ||
    !Array.isArray(policy.requiredJobSteps) ||
    !Array.isArray(policy.requiredLogTokens) ||
    !Array.isArray(policy.forbiddenLogTokens) ||
    !Array.isArray(policy.allowedInconclusiveIds)
  )
    throw new Error('private provenance incident policy is invalid')
  const identities = policy.releaseSet.map((release) => release.identity)
  if (
    new Set(identities).size !== identities.length ||
    policy.releaseSet.some(
      (release, index) =>
        release.identity !== `${release.name}@${release.version}` ||
        !/^\d+\.\d+\.\d+$/.test(release.expectedLatest ?? '') ||
        !release.tarballFilename ||
        !SHA256.test(release.tarballSha256 ?? '') ||
        !/^sha512-[A-Za-z0-9+/=]+$/.test(release.integrity ?? '') ||
        (index === 0
          ? release.priorStatus !== 'AMBIGUOUS' || release.resolvedOutcome !== 'NOT_APPLIED'
          : release.priorStatus !== 'PROCESSING' || release.resolvedOutcome !== 'NOT_ATTEMPTED'),
    )
  )
    throw new Error('private provenance incident release policy is invalid')
  same(
    policy.allowedInconclusiveIds,
    [policy.source.runId, policy.artifacts.receipt.id],
    'private provenance allowed inconclusive identities',
  )
  return policy
}

export async function readPrivateProvenanceIncidentPolicy() {
  return validatePrivateProvenanceIncidentPolicy(JSON.parse(await readFile(POLICY_PATH, 'utf8')))
}

function artifactByPolicy(evidence, policy, expected, kind) {
  const artifact = evidence.inventory.artifacts.find((item) => String(item.id) === String(expected.id))
  if (
    !artifact ||
    artifact.kind !== kind ||
    artifact.digest !== expected.digest ||
    artifact.headSha !== policy.source.headSha ||
    String(artifact.workflowRunId) !== policy.source.runId ||
    artifact.strictValidation?.status !== 'passed'
  )
    throw new Error(`private provenance ${kind} artifact mismatch`)
  return artifact
}

function validateSourceArtifacts(evidence, policy) {
  const sourceRun = evidence.inventory.runs.find((run) => String(run.id) === policy.source.runId)
  if (
    !sourceRun ||
    sourceRun.headSha !== policy.source.headSha ||
    sourceRun.sourceRef !== policy.source.sourceRef ||
    sourceRun.conclusion !== 'failure' ||
    sourceRun.workflowPath !== '.github/workflows/publish.yml'
  )
    throw new Error('private provenance source run mismatch')
  const verification = artifactByPolicy(evidence, policy, policy.artifacts.verification, 'verification')
  const intent = artifactByPolicy(evidence, policy, policy.artifacts.intent, 'publish-intent')
  const receipt = artifactByPolicy(evidence, policy, policy.artifacts.receipt, 'publish-receipt')

  const manifest = verification.jsonDocuments?.['verification-manifest.json']?.value
  const outbox = verification.jsonDocuments?.['transactional-outbox.json']?.value
  if (
    manifest?.workflowCommitSha !== policy.source.headSha ||
    String(manifest?.runId) !== policy.source.runId ||
    manifest?.publicationOutbox?.sha256 !== policy.outboxSha256 ||
    String(outbox?.sourceRunId) !== policy.source.runId ||
    JSON.stringify(manifest?.releaseSet) !== JSON.stringify(policy.releaseSet.map((release) => release.name))
  )
    throw new Error('private provenance verification identity mismatch')
  for (const expected of policy.releaseSet) {
    const release = manifest.releases.find((item) => item.name === expected.name)
    if (
      release?.identity !== expected.identity ||
      release?.version !== expected.version ||
      release?.tarball?.filename !== expected.tarballFilename ||
      release?.tarball?.sha256 !== expected.tarballSha256 ||
      release?.tarball?.integrity !== expected.integrity
    )
      throw new Error('private provenance tarball identity mismatch')
  }
  const intentLifecycle = intent.jsonDocuments?.['lifecycle-snapshot.json']?.value
  const receiptLifecycle = receipt.jsonDocuments?.['lifecycle-snapshot.json']?.value
  const receiptInbox = receipt.jsonDocuments?.['consumer-inbox.json']?.value
  if (
    intentLifecycle?.outboxSha256 !== policy.outboxSha256 ||
    receiptLifecycle?.outboxSha256 !== policy.outboxSha256 ||
    receiptLifecycle?.durableIntentArtifact?.id !== policy.artifacts.intent.id ||
    receiptLifecycle?.durableIntentArtifact?.digest !== policy.artifacts.intent.digest
  )
    throw new Error('private provenance lifecycle identity mismatch')
  for (const [index, expected] of policy.releaseSet.entries()) {
    const lifecycle = receiptLifecycle.releases.find((release) => release.name === expected.name)
    const record = receiptInbox.records?.[`publish:${expected.identity}`]
    if (index === 0) {
      if (
        lifecycle?.recoveryStatus !== 'ambiguous' ||
        record?.status !== 'AMBIGUOUS' ||
        record?.observation !== 'NOT_APPLIED' ||
        !record?.error?.includes('--provenance')
      )
        throw new Error('private provenance ambiguous package mismatch')
    } else if (lifecycle?.recoveryStatus !== 'processing' || record?.status !== 'PROCESSING')
      throw new Error('private provenance unattempted package mismatch')
  }
  return { intent, receipt, verification }
}

async function registryObservation(fetchImpl, release, observedAt) {
  const response = await fetchImpl(`https://registry.npmjs.org/${encodeURIComponent(release.name)}`, {
    headers: { accept: 'application/json' },
  })
  if (response.status !== 200) throw new Error(`${release.identity} package-root registry evidence is inconclusive`)
  const metadata = await response.json()
  if (metadata?.versions?.[release.version] || metadata?.['dist-tags']?.latest !== release.expectedLatest)
    throw new Error(`${release.identity} registry is not definitively missing`)
  return {
    identity: release.identity,
    observedAt: new Date(observedAt).toISOString(),
    registryUrl: `https://registry.npmjs.org/${encodeURIComponent(release.name)}`,
    httpStatus: response.status,
    versionExists: false,
    latest: metadata['dist-tags'].latest,
    result: 'NOT_APPLIED',
  }
}

export function validatePrivateProvenanceResolution({
  cutoverEvidence,
  now,
  policy,
  requireFreshRegistryObservation = true,
  resolution,
}) {
  validatePrivateProvenanceIncidentPolicy(policy)
  const { evidenceHash, ...payload } = resolution ?? {}
  if (
    payload.schemaId !== PRIVATE_PROVENANCE_REJECTION_SCHEMA ||
    payload.schemaVersion !== 1 ||
    payload.incidentId !== policy.incidentId ||
    payload.policySha256 !== payloadHash(policy) ||
    payload.repository?.id !== policy.repository.id ||
    payload.repository?.name !== policy.repository.name ||
    payload.repository?.visibility !== policy.repository.visibility ||
    payload.sourceRunId !== policy.source.runId ||
    payload.publishJobId !== policy.source.publishJobId ||
    payload.workflowCommitSha !== policy.source.headSha ||
    payload.failureReleaseIdentity !== policy.releaseSet[0].identity ||
    JSON.stringify(payload.releaseIdentities) !==
      JSON.stringify(policy.releaseSet.map((release) => release.identity)) ||
    JSON.stringify(payload.allowedInconclusiveIds) !== JSON.stringify(policy.allowedInconclusiveIds) ||
    payload.npmErrorCode !== 'E422' ||
    payload.failureReason !== 'PRIVATE_SOURCE_REPOSITORY_PROVENANCE_UNSUPPORTED' ||
    JSON.stringify(payload.resolvedOutcomes) !==
      JSON.stringify(
        Object.fromEntries(policy.releaseSet.map((release) => [release.identity, release.resolvedOutcome])),
      ) ||
    JSON.stringify(payload.sourceArtifactEvidence) !==
      JSON.stringify({
        intent: policy.artifacts.intent,
        receipt: policy.artifacts.receipt,
        verification: policy.artifacts.verification,
      }) ||
    !SHA256.test(payload.logSha256 ?? '') ||
    payload.sourceConsumerSha256 !== policy.sourceConsumer.sha256 ||
    !SHA256.test(payload.cutoverInventoryHash ?? '') ||
    !Number.isSafeInteger(payload.propagationWindowMs) ||
    payload.propagationWindowMs < 30_000 ||
    !Number.isSafeInteger(payload.observationMaxAgeMs) ||
    payload.observationMaxAgeMs <= 0 ||
    !Array.isArray(payload.registryObservations) ||
    payload.registryObservations.length !== 2 ||
    evidenceHash !== payloadHash(payload)
  )
    throw new Error('private provenance resolution is invalid')
  const currentTime = Date.parse(now)
  if (!Number.isFinite(currentTime) || currentTime > Date.parse(policy.notAfter))
    throw new Error('private provenance incident authorization has expired')
  for (const pass of payload.registryObservations)
    if (
      !Array.isArray(pass) ||
      pass.length !== policy.releaseSet.length ||
      pass.some(
        (item, index) =>
          item.identity !== policy.releaseSet[index].identity ||
          item.registryUrl !== `https://registry.npmjs.org/${encodeURIComponent(policy.releaseSet[index].name)}` ||
          item.httpStatus !== 200 ||
          item.versionExists !== false ||
          item.latest !== policy.releaseSet[index].expectedLatest ||
          item.result !== 'NOT_APPLIED' ||
          !Number.isFinite(Date.parse(item.observedAt ?? '')),
      )
    )
      throw new Error('private provenance registry observation is invalid')
  if (payload.registryObservations.some((pass) => new Set(pass.map((item) => item.observedAt)).size !== 1))
    throw new Error('private provenance registry observation time is invalid')
  const observations = payload.registryObservations
  if (
    Date.parse(observations[1][0].observedAt) - Date.parse(observations[0][0].observedAt) <
    payload.propagationWindowMs
  )
    throw new Error('private provenance registry propagation window is invalid')
  if (
    (requireFreshRegistryObservation &&
      currentTime - Date.parse(observations[1][0].observedAt) > payload.observationMaxAgeMs) ||
    currentTime < Date.parse(observations[1][0].observedAt)
  )
    throw new Error('private provenance registry observation is stale')

  if (cutoverEvidence) {
    const priorResolutions = cutoverEvidence.inventory.artifacts.filter(
      (artifact) =>
        artifact.kind === 'incident-resolution' &&
        artifact.jsonDocuments?.['incident-resolution.json']?.value?.incidentId === policy.incidentId,
    )
    if (priorResolutions.length > 0) throw new Error('private provenance incident was already consumed')
    const inconclusiveIds = [...cutoverEvidence.inventory.runs, ...cutoverEvidence.inventory.artifacts]
      .filter((item) => item.disposition === 'inconclusive')
      .map((item) => String(item.id))
    same(inconclusiveIds, policy.allowedInconclusiveIds, 'private provenance inconclusive inventory')
    exact(
      payload.cutoverInventoryHash,
      payloadHash(cutoverEvidence.inventory),
      'private provenance cutover inventory hash',
    )
  }
  return resolution
}

export function validatePrivateProvenancePublishAuthorization({ now, policy, resolution }) {
  return validatePrivateProvenanceResolution({
    now,
    policy,
    requireFreshRegistryObservation: false,
    resolution,
  })
}

export function createPrivateProvenanceAuthorizedPublish({
  now = () => new Date().toISOString(),
  policy,
  publish,
  resolution,
}) {
  if (typeof publish !== 'function') throw new Error('private provenance publish callback is required')
  return async (...arguments_) => {
    validatePrivateProvenancePublishAuthorization({
      now: typeof now === 'function' ? now() : now,
      policy,
      resolution,
    })
    return publish(...arguments_)
  }
}

export async function resolvePrivateProvenanceIncident({
  cutoverEvidence,
  fetchImpl = fetch,
  incidentId,
  now = () => Date.now(),
  observationMaxAgeMs = 300_000,
  policy: suppliedPolicy,
  propagationWindowMs = 30_000,
  repository,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  token,
}) {
  const policy = suppliedPolicy
    ? validatePrivateProvenanceIncidentPolicy(suppliedPolicy)
    : await readPrivateProvenanceIncidentPolicy()
  exact(incidentId, policy.incidentId, 'private provenance incident ID')
  exact(repository, policy.repository.name, 'private provenance repository')
  const startedAt = typeof now === 'function' ? now() : now
  if (startedAt > Date.parse(policy.notAfter)) throw new Error('private provenance incident authorization has expired')
  const sourceArtifacts = validateSourceArtifacts(cutoverEvidence, policy)
  if (cutoverEvidence.inventory.artifacts.some((artifact) => artifact.kind === 'incident-resolution'))
    throw new Error('private provenance incident resolution already exists')

  const repositoryResponse = await githubResponse(fetchImpl, `https://api.github.com/repos/${repository}`, token)
  const repositoryMetadata = await repositoryResponse.json()
  exact(String(repositoryMetadata.id), policy.repository.id, 'private provenance repository ID')
  exact(repositoryMetadata.full_name, policy.repository.name, 'private provenance repository name')
  exact(repositoryMetadata.visibility, policy.repository.visibility, 'private provenance repository visibility')

  const jobResponse = await githubResponse(
    fetchImpl,
    `https://api.github.com/repos/${repository}/actions/jobs/${policy.source.publishJobId}`,
    token,
  )
  const job = await jobResponse.json()
  if (
    String(job.id) !== policy.source.publishJobId ||
    String(job.run_id) !== policy.source.runId ||
    job.run_attempt !== policy.source.runAttempt ||
    job.name !== 'publish' ||
    job.conclusion !== 'failure' ||
    job.head_sha !== policy.source.headSha ||
    !Number.isFinite(Date.parse(job.completed_at ?? ''))
  )
    throw new Error('private provenance publish job mismatch')
  for (const expected of policy.requiredJobSteps) {
    const step = job.steps?.find((item) => item.name === expected.name)
    if (step?.conclusion !== expected.conclusion) throw new Error('private provenance publish job step mismatch')
  }

  const logsResponse = await githubResponse(
    fetchImpl,
    `https://api.github.com/repos/${repository}/actions/jobs/${policy.source.publishJobId}/logs`,
    token,
  )
  const logs = await logsResponse.text()
  if (
    policy.requiredLogTokens.some((tokenValue) => !logs.includes(tokenValue)) ||
    policy.forbiddenLogTokens.some((tokenValue) => logs.includes(tokenValue))
  )
    throw new Error('private provenance publish log mismatch')

  const sourceResponse = await githubResponse(
    fetchImpl,
    `https://api.github.com/repos/${repository}/contents/${policy.sourceConsumer.path}?ref=${policy.source.headSha}`,
    token,
  )
  const source = await sourceResponse.json()
  const sourceBytes = Buffer.from(String(source.content ?? '').replaceAll('\n', ''), 'base64')
  if (
    source.encoding !== 'base64' ||
    source.sha !== policy.sourceConsumer.blobSha ||
    sha256(sourceBytes) !== policy.sourceConsumer.sha256
  )
    throw new Error('private provenance source consumer identity mismatch')

  const registryObservations = []
  registryObservations.push(
    await Promise.all(policy.releaseSet.map((release) => registryObservation(fetchImpl, release, startedAt))),
  )
  await sleep(propagationWindowMs)
  const completedAt = typeof now === 'function' ? now() : now
  registryObservations.push(
    await Promise.all(policy.releaseSet.map((release) => registryObservation(fetchImpl, release, completedAt))),
  )

  const payload = {
    schemaId: PRIVATE_PROVENANCE_REJECTION_SCHEMA,
    schemaVersion: 1,
    incidentId: policy.incidentId,
    policySha256: payloadHash(policy),
    repository: policy.repository,
    sourceRunId: policy.source.runId,
    publishJobId: policy.source.publishJobId,
    workflowCommitSha: policy.source.headSha,
    rejectionObservedAt: job.completed_at,
    npmErrorCode: 'E422',
    failureReason: 'PRIVATE_SOURCE_REPOSITORY_PROVENANCE_UNSUPPORTED',
    failureReleaseIdentity: policy.releaseSet[0].identity,
    releaseIdentities: policy.releaseSet.map((release) => release.identity),
    resolvedOutcomes: Object.fromEntries(
      policy.releaseSet.map((release) => [release.identity, release.resolvedOutcome]),
    ),
    allowedInconclusiveIds: policy.allowedInconclusiveIds,
    sourceConsumerSha256: policy.sourceConsumer.sha256,
    logSha256: sha256(logs),
    cutoverInventoryHash: payloadHash(cutoverEvidence.inventory),
    sourceArtifactEvidence: Object.fromEntries(
      Object.entries(sourceArtifacts).map(([kind, artifact]) => [kind, { id: artifact.id, digest: artifact.digest }]),
    ),
    propagationWindowMs,
    observationMaxAgeMs,
    registryObservations,
  }
  const resolution = { ...payload, evidenceHash: payloadHash(payload) }
  validatePrivateProvenanceResolution({
    cutoverEvidence,
    now: new Date(completedAt).toISOString(),
    policy,
    resolution,
  })
  return resolution
}

export async function bindPrivateProvenanceResolutionArtifact({
  artifactDigest,
  artifactId,
  currentRunId,
  fetchImpl = fetch,
  now = new Date().toISOString(),
  repository,
  resolutionPath,
  token,
}) {
  const policy = await readPrivateProvenanceIncidentPolicy()
  if (!artifactDigest || !artifactId || !currentRunId || !repository || !resolutionPath || !token)
    throw new Error('private provenance resolution binding is incomplete')
  const resolutionBytes = await readFile(resolutionPath)
  const resolution = JSON.parse(resolutionBytes.toString('utf8'))
  validatePrivateProvenanceResolution({ now, policy, resolution })
  const response = await githubResponse(
    fetchImpl,
    `https://api.github.com/repos/${repository}/actions/artifacts/${encodeURIComponent(artifactId)}`,
    token,
  )
  const artifact = await response.json()
  const normalizedDigest = artifactDigest.startsWith('sha256:') ? artifactDigest : `sha256:${artifactDigest}`
  if (
    String(artifact.id) !== String(artifactId) ||
    artifact.expired ||
    artifact.digest !== normalizedDigest ||
    String(artifact.workflow_run?.id) !== String(currentRunId) ||
    String(artifact.workflow_run?.repository_id) !== policy.repository.id ||
    artifact.name !== `yakit-ui-incident-resolution-${policy.incidentId}-${currentRunId}`
  )
    throw new Error('private provenance resolution artifact identity mismatch')
  const payload = {
    schemaId: BOUND_PRIVATE_PROVENANCE_REJECTION_SCHEMA,
    schemaVersion: 1,
    resolution,
    resolutionSha256: sha256(resolutionBytes),
    resolutionArtifact: {
      id: String(artifact.id),
      digest: artifact.digest,
      workflowRunId: String(artifact.workflow_run.id),
    },
  }
  return { ...payload, evidenceHash: payloadHash(payload) }
}

async function main() {
  const incidentId = process.argv[2]
  const cutoverEvidencePath = process.argv[3]
  const outputPath = process.argv[4]
  if (!incidentId || !cutoverEvidencePath || !outputPath)
    throw new Error('Usage: private-provenance-recovery.mjs <incident-id> <cutover-evidence> <output>')
  const resolution = await resolvePrivateProvenanceIncident({
    cutoverEvidence: JSON.parse(await readFile(cutoverEvidencePath, 'utf8')),
    incidentId,
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GITHUB_TOKEN,
  })
  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(resolution, null, 2)}\n`, {
    flag: 'wx',
  })
  console.log(JSON.stringify(resolution, null, 2))
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) await main()
