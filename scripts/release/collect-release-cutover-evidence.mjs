#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { dispositionForExactRef, readCutoverPolicy } from './release-cutover-policy.mjs'
import { impactProbesForRelease, PUBLIC_PACKAGES } from './release-impact.mjs'
import {
  PUBLICATION_INVENTORY_SCHEMA,
  PUBLICATION_OUTBOX_SCHEMA,
  PUBLICATION_STATE_SCHEMA,
  validatePublicationOutbox,
} from './publication-consumer.mjs'
import { payloadHash } from './durable-release-state.mjs'
import { validateVerificationManifest } from './verification-manifest.mjs'

const API_VERSION = '2022-11-28'
const ROOT = path.resolve(import.meta.dirname, '../..')
const RELEVANT_ARTIFACT =
  /^yakit-ui-(?:release-impact|verification|publish-intent|publish-receipt|recovery-intent|recovery-receipt|incident-resolution)-/
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

function requiredEnvironment(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function nextLink(headers) {
  const link = headers.get('link') ?? ''
  for (const item of link.split(',')) {
    const match = item.match(/<([^>]+)>;\s*rel="([^"]+)"/)
    if (match?.[2] === 'next') return match[1]
  }
  return null
}

async function githubResponse(url, token) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': API_VERSION,
    },
  })
  if (!response.ok) throw new Error(`GitHub evidence request failed with HTTP ${response.status}`)
  return response
}

async function githubJson(url, token) {
  const response = await githubResponse(url, token)
  return { response, value: await response.json() }
}

export async function collectGithubPages({ token, url, itemsFromResponse }) {
  const pages = []
  let next = url
  while (next) {
    const { response, value } = await githubJson(next, token)
    const following = nextLink(response.headers)
    pages.push({
      items: itemsFromResponse(value),
      hasNextPage: Boolean(following),
    })
    next = following
  }
  return pages
}

async function collectCountedGithubSnapshot({ token, url, itemsFromResponse, idFromItem }) {
  const pages = []
  let next = url
  let totalCount
  while (next) {
    const { response, value } = await githubJson(next, token)
    if (!Number.isSafeInteger(value?.total_count) || value.total_count < 0)
      throw new Error('GitHub inventory total_count is missing')
    if (totalCount === undefined) totalCount = value.total_count
    if (totalCount !== value.total_count) throw new Error('GitHub inventory total_count drifted across pages')
    const following = nextLink(response.headers)
    pages.push({
      items: itemsFromResponse(value),
      hasNextPage: Boolean(following),
    })
    next = following
  }
  const items = pages.flatMap((page) => page.items)
  const ids = items.map((item) => String(idFromItem(item) ?? ''))
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length || items.length !== totalCount)
    throw new Error('GitHub inventory count or unique identity mismatch')
  return { items, pages, totalCount }
}

function stableInventoryIdentity(items, fields) {
  return JSON.stringify(
    [...items]
      .map((item) => Object.fromEntries(fields.map((field) => [field, item?.[field]])))
      .sort((left, right) => String(left.id ?? left.ref).localeCompare(String(right.id ?? right.ref))),
  )
}

export async function collectStableCountedInventory(options) {
  const first = await collectCountedGithubSnapshot(options)
  const second = await collectCountedGithubSnapshot(options)
  if (
    first.totalCount !== second.totalCount ||
    stableInventoryIdentity(first.items, options.stableFields) !==
      stableInventoryIdentity(second.items, options.stableFields)
  )
    throw new Error('GitHub inventory changed during stable reread')
  return second
}

export function validateStableRefSnapshots(first, second) {
  const fields = ['ref', 'headSha']
  if (
    stableInventoryIdentity(first, fields) !== stableInventoryIdentity(second, fields) ||
    new Set(first.map((item) => item.ref)).size !== first.length ||
    new Set(second.map((item) => item.ref)).size !== second.length
  )
    throw new Error('GitHub ref inventory changed during stable reread')
  return second
}

async function contentIdentity({ repository, path: filePath, sha, token }) {
  const { value } = await githubJson(
    `https://api.github.com/repos/${repository}/contents/${filePath}?ref=${encodeURIComponent(sha)}`,
    token,
  )
  if (value?.encoding !== 'base64' || typeof value.content !== 'string' || !/^[0-9a-f]{40}$/i.test(value.sha ?? ''))
    throw new Error(`GitHub content identity is incomplete for ${filePath}`)
  const bytes = Buffer.from(value.content.replaceAll('\n', ''), 'base64')
  return { blobSha: value.sha, sha256: sha256(bytes), bytes }
}

async function containsRevision({ repository, headSha, revision, token }) {
  const { value } = await githubJson(
    `https://api.github.com/repos/${repository}/compare/${encodeURIComponent(revision)}...${encodeURIComponent(headSha)}`,
    token,
  )
  return ['ahead', 'identical'].includes(value?.status)
}

async function enforcementIdentity({ repository, sha, token }) {
  const identity = await contentIdentity({
    repository,
    path: '.github/workflows/publish.yml',
    sha,
    token,
  })
  const isV3 =
    identity.bytes.includes(Buffer.from('prepare-publication-attempt.mjs')) &&
    identity.bytes.includes(Buffer.from('publish-verification-artifact.mjs')) &&
    identity.bytes.includes(Buffer.from('release-cutover-preflight.mjs'))
  return {
    producerKind: isV3 ? 'release-v3' : 'legacy',
    enforcementBlobSha: identity.blobSha,
    enforcementSha256: identity.sha256,
  }
}

function artifactKind(name) {
  for (const kind of [
    'release-impact',
    'verification',
    'publish-intent',
    'publish-receipt',
    'recovery-intent',
    'recovery-receipt',
    'incident-resolution',
  ])
    if (name.startsWith(`yakit-ui-${kind}-`)) return kind
  return 'unknown'
}

function exactJsonNames(jsonDocuments, expected) {
  const actual = Object.keys(jsonDocuments).sort()
  const wanted = [...expected].sort()
  if (JSON.stringify(actual) !== JSON.stringify(wanted))
    throw new Error(`artifact JSON document set mismatch: ${JSON.stringify(actual)}`)
}

function exactArchiveEntries(artifact, expected) {
  const actual = [...(artifact.entries ?? [])].sort()
  const wanted = [...expected].sort()
  if (
    actual.length === 0 ||
    new Set(actual).size !== actual.length ||
    JSON.stringify(actual) !== JSON.stringify(wanted)
  )
    throw new Error(`artifact archive entry set mismatch: ${JSON.stringify(actual)}`)
}

function lifecycleArtifactIdentity(name, workflowRunId) {
  const match = name.match(/^yakit-ui-(publish|recovery)-(intent|receipt)-(?:(\d+)-)?(\d+)-(\d+)$/)
  if (!match) throw new Error('publication lifecycle artifact name is invalid')
  const [, workflow, phase, sourceRunId, artifactRunId, runAttempt] = match
  if (
    artifactRunId !== String(workflowRunId) ||
    (workflow === 'publish' && sourceRunId) ||
    (workflow === 'recovery' && !sourceRunId)
  )
    throw new Error('publication lifecycle run identity is invalid')
  return {
    phase: phase === 'intent' ? 'INTENT' : 'RECEIPT',
    sourceRunId: sourceRunId ?? artifactRunId,
    attemptId: `${artifactRunId}:${runAttempt}`,
  }
}

function validateLifecycleArtifact({ artifact, jsonDocuments }) {
  const identity = lifecycleArtifactIdentity(artifact.name, artifact.workflowRunId)
  const expectedDocuments = ['consumer-inbox.json', 'lifecycle-snapshot.json']
  if (identity.phase === 'INTENT') expectedDocuments.push('prior-artifact-inventory.json')
  exactJsonNames(jsonDocuments, expectedDocuments)
  exactArchiveEntries(artifact, expectedDocuments)
  const state = jsonDocuments['lifecycle-snapshot.json'].value
  const inbox = jsonDocuments['consumer-inbox.json'].value
  if (
    state?.schemaId !== PUBLICATION_STATE_SCHEMA ||
    state?.schemaVersion !== 1 ||
    String(state.sourceRunId) !== identity.sourceRunId ||
    state.phase !== identity.phase ||
    state.attemptId !== identity.attemptId ||
    !Number.isSafeInteger(state.generation) ||
    state.generation < 1 ||
    !Number.isSafeInteger(state.revision) ||
    !/^[0-9a-f]{64}$/i.test(state.outboxSha256 ?? '') ||
    !Array.isArray(state.releases) ||
    state.releases.length === 0 ||
    new Set(state.releases.map((item) => `${item.name}@${item.version}`)).size !== state.releases.length ||
    !Array.isArray(state.history) ||
    state.history.length === 0 ||
    state.history.some((item, index) => item.sequence !== index + 1) ||
    !Number.isSafeInteger(inbox?.revision) ||
    inbox.revision < 0 ||
    !inbox.records ||
    typeof inbox.records !== 'object' ||
    Array.isArray(inbox.records)
  )
    throw new Error('publication lifecycle schema is invalid')
  const validPublishStates = new Set(['verified', 'publishing', 'published', 'failed'])
  for (const release of state.releases)
    if (
      !release?.name ||
      !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(release.version ?? '') ||
      !validPublishStates.has(release.publishStatus) ||
      !Number.isSafeInteger(release.publishAttempt) ||
      !Number.isSafeInteger(release.recoveryRevision)
    )
      throw new Error('publication lifecycle release state is invalid')
  for (const [key, record] of Object.entries(inbox.records))
    if (
      key !== record?.idempotencyKey ||
      !['PROCESSING', 'SUCCEEDED', 'FAILED', 'AMBIGUOUS'].includes(record?.status) ||
      !/^[0-9a-f]{64}$/i.test(record?.payloadHash ?? '')
    )
      throw new Error('publication consumer inbox is invalid')
  const releaseKeys = state.releases.map((release) => `publish:${release.name}@${release.version}`).sort()
  const actualInboxKeys = Object.keys(inbox.records).sort()
  const requiredInboxKeys = state.releases
    .filter((release) => ['publishing', 'failed'].includes(release.publishStatus))
    .map((release) => `publish:${release.name}@${release.version}`)
  if (
    actualInboxKeys.some((key) => !releaseKeys.includes(key)) ||
    requiredInboxKeys.some((key) => !actualInboxKeys.includes(key))
  )
    throw new Error('publication inbox/release identity set mismatch')
  const durableEvent = state.history.some((item) => item.event === 'DURABLE_INTENT_ARTIFACT_VALIDATED')
  if (
    (identity.phase === 'INTENT' && durableEvent) ||
    (identity.phase === 'RECEIPT' &&
      (!durableEvent ||
        !state.durableIntentArtifact?.id ||
        !/^sha256:[0-9a-f]{64}$/i.test(state.durableIntentArtifact?.digest ?? '')))
  )
    throw new Error('publication lifecycle phase transition is invalid')
  if (identity.phase === 'INTENT') {
    const inventory = jsonDocuments['prior-artifact-inventory.json'].value
    if (
      inventory?.schemaId !== PUBLICATION_INVENTORY_SCHEMA ||
      inventory?.schemaVersion !== 1 ||
      String(inventory.sourceRunId) !== identity.sourceRunId ||
      !Number.isSafeInteger(inventory.enumeratedArtifactCount) ||
      !Number.isSafeInteger(inventory.relevantArtifactCount) ||
      !Array.isArray(inventory.artifacts) ||
      inventory.relevantArtifactCount !== inventory.artifacts.length ||
      inventory.enumeratedArtifactCount < inventory.relevantArtifactCount ||
      state.priorArtifactInventoryHash !== payloadHash(inventory)
    )
      throw new Error('publication intent inventory is invalid')
    const ids = new Set()
    const names = new Set()
    for (const prior of inventory.artifacts) {
      if (
        !prior?.id ||
        !prior?.name ||
        !/^sha256:[0-9a-f]{64}$/i.test(prior.digest ?? '') ||
        !prior?.workflowRunId ||
        prior.producerPath !== '.github/workflows/publish.yml' ||
        ids.has(String(prior.id)) ||
        names.has(prior.name)
      )
        throw new Error('publication intent inventory entry is invalid')
      ids.add(String(prior.id))
      names.add(prior.name)
    }
  }
  let hasDefinitiveFailure = false
  let hasInconclusive = false
  let hasProcessing = false
  for (const release of state.releases) {
    const key = `publish:${release.name}@${release.version}`
    const record = inbox.records[key]
    if (!record) {
      if (release.publishStatus === 'published' && ['complete', 'reconciled'].includes(release.recoveryStatus)) continue
      hasInconclusive = true
      continue
    }
    if (record.status === 'SUCCEEDED') {
      if (
        record.reconciled !== true ||
        record.observation !== 'APPLIED' ||
        release.publishStatus !== 'published' ||
        !['complete', 'reconciled'].includes(release.recoveryStatus)
      )
        throw new Error('successful inbox/lifecycle state is inconsistent')
      continue
    }
    if (record.status === 'FAILED') {
      if (
        record.reconciled !== true ||
        record.observation !== 'NOT_APPLIED' ||
        !['NOT_ATTEMPTED', 'NOT_APPLIED'].includes(record.sideEffectOutcome) ||
        release.publishStatus !== 'failed' ||
        release.recoveryStatus !== 'not-applied'
      )
        throw new Error('failed inbox/lifecycle state is not definitive')
      hasDefinitiveFailure = true
      continue
    }
    if (record.status === 'PROCESSING') {
      if (
        identity.phase !== 'INTENT' ||
        release.publishStatus !== 'publishing' ||
        release.recoveryStatus !== 'processing'
      )
        hasInconclusive = true
      else hasProcessing = true
      continue
    }
    if (record.status === 'AMBIGUOUS') {
      if (record.reconciled !== false || release.publishStatus !== 'failed' || release.recoveryStatus !== 'ambiguous')
        throw new Error('ambiguous inbox/lifecycle state is inconsistent')
      return 'inconclusive'
    }
    return 'inconclusive'
  }
  if (hasInconclusive) return 'inconclusive'
  if (hasProcessing) return 'recoverable'
  return hasDefinitiveFailure ? 'recoverable' : 'closed-terminal'
}

async function validateVerificationArtifact({ artifact, directory, jsonDocuments }) {
  const manifest = jsonDocuments['verification-manifest.json']?.value
  const outbox = jsonDocuments['transactional-outbox.json']?.value
  if (!manifest || !outbox) throw new Error('verification documents are missing')
  const expectedJson = ['transactional-outbox.json', 'verification-manifest.json']
  for (const release of manifest.releases ?? [])
    if (release.evidence?.size?.filename) expectedJson.push(release.evidence.size.filename)
  exactJsonNames(jsonDocuments, expectedJson)
  exactArchiveEntries(artifact, verificationArchiveEntries(manifest))
  const tarballPaths = Object.fromEntries(
    (manifest.releases ?? []).map((release) => [
      release.name,
      path.join(directory, release.tarball?.filename ?? '<missing>'),
    ]),
  )
  await validateVerificationManifest(manifest, {
    evidenceDirectory: directory,
    expectedPackages: manifest.releaseSet,
    requirePublicationOutbox: true,
    tarballPaths,
  })
  for (const baseline of manifest.compatibilityBaselineSet ?? []) {
    const baselinePath = path.join(directory, baseline.filename)
    const bytes = await readFile(baselinePath)
    const sriMatch = /^(sha(?:256|384|512))-([A-Za-z0-9+/=]+)$/.exec(baseline.integrity ?? '')
    if (
      sha256(bytes) !== baseline.sha256 ||
      bytes.length !== baseline.packedBytes ||
      !sriMatch ||
      createHash(sriMatch[1]).update(bytes).digest('base64') !== sriMatch[2]
    )
      throw new Error(`compatibility baseline ${baseline.package} file identity mismatch`)
  }
  validatePublicationOutbox(outbox, manifest)
  if (
    outbox.schemaId !== PUBLICATION_OUTBOX_SCHEMA ||
    String(manifest.runId) !== String(artifact.workflowRunId) ||
    artifact.name !== `yakit-ui-verification-${artifact.workflowRunId}`
  )
    throw new Error('verification artifact run/outbox identity mismatch')
}

export function verificationArchiveEntries(manifest) {
  return [
    'transactional-outbox.json',
    'verification-manifest.json',
    ...(manifest.releases ?? []).map((release) => release.evidence?.size?.filename).filter(Boolean),
    ...(manifest.releases ?? []).map((release) => release.tarball?.filename ?? '<missing>'),
    ...(manifest.compatibilityBaselineSet ?? []).map((baseline) => baseline.filename ?? '<missing>'),
  ]
}

export async function validateStrictArtifact({ artifact, directory, jsonDocuments }) {
  if (artifact.kind === 'release-impact') {
    exactJsonNames(jsonDocuments, ['release-impact.json'])
    exactArchiveEntries(artifact, ['release-impact.json'])
    const impact = jsonDocuments['release-impact.json'].value
    const declaredSet = impact?.declaredSet
    if (
      artifact.name !== `yakit-ui-release-impact-${artifact.workflowRunId}` ||
      !Array.isArray(declaredSet) ||
      declaredSet.length === 0 ||
      new Set(declaredSet).size !== declaredSet.length ||
      declaredSet.some((name) => !PUBLIC_PACKAGES.includes(name)) ||
      JSON.stringify(declaredSet) !== JSON.stringify(PUBLIC_PACKAGES.filter((name) => declaredSet.includes(name)))
    )
      throw new Error('release impact artifact identity or declared set is invalid')
    impactProbesForRelease(impact, impact.declaredSet)
    return { semanticOutcome: 'closed-terminal' }
  }
  if (artifact.kind === 'verification') {
    await validateVerificationArtifact({ artifact, directory, jsonDocuments })
    return { semanticOutcome: 'recoverable' }
  }
  if (artifact.kind === 'incident-resolution') {
    exactJsonNames(jsonDocuments, ['incident-resolution.json'])
    exactArchiveEntries(artifact, ['incident-resolution.json'])
    const resolution = jsonDocuments['incident-resolution.json'].value
    const { evidenceHash, ...payload } = resolution ?? {}
    if (
      resolution?.schemaId !== 'yakit-ui-private-provenance-rejection/v1' ||
      resolution?.schemaVersion !== 1 ||
      !resolution?.incidentId ||
      evidenceHash !== payloadHash(payload)
    )
      throw new Error('incident resolution artifact is invalid')
    return { semanticOutcome: 'closed-terminal' }
  }
  if (['publish-intent', 'publish-receipt', 'recovery-intent', 'recovery-receipt'].includes(artifact.kind)) {
    return {
      semanticOutcome: validateLifecycleArtifact({
        artifact,
        jsonDocuments,
      }),
    }
  }
  throw new Error('unknown artifact kind')
}

async function inspectArtifactArchive({ artifact, token }) {
  if (artifact.expired === true) return { disposition: 'inconclusive', reason: 'artifact expired' }
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'yakit-cutover-artifact-'))
  const archivePath = path.join(temporaryDirectory, 'artifact.zip')
  const extractedDirectory = path.join(temporaryDirectory, 'extracted')
  try {
    const response = await githubResponse(artifact.archive_download_url, token)
    const bytes = Buffer.from(await response.arrayBuffer())
    const archiveSha256 = sha256(bytes)
    const expectedDigest = /^sha256:([0-9a-f]{64})$/i.exec(artifact.digest ?? '')?.[1]
    if (!expectedDigest || expectedDigest.toLowerCase() !== archiveSha256)
      return {
        disposition: 'inconclusive',
        reason: 'artifact archive digest mismatch',
        archiveSha256,
      }
    await writeFile(archivePath, bytes, { flag: 'wx' })
    const entries = execFileSync('unzip', ['-Z1', archivePath], {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    })
      .trim()
      .split('\n')
      .filter(Boolean)
    if (
      entries.length === 0 ||
      entries.some((entry) => path.posix.isAbsolute(entry) || entry.split('/').some((part) => part === '..'))
    )
      return { disposition: 'inconclusive', reason: 'unsafe artifact archive' }
    const jsonDocuments = {}
    for (const entry of entries.filter((item) => item.endsWith('.json'))) {
      const content = execFileSync('unzip', ['-p', archivePath, entry], {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
      })
      jsonDocuments[entry] = {
        sha256: sha256(content),
        value: JSON.parse(content),
      }
    }
    await mkdir(extractedDirectory)
    execFileSync('unzip', ['-qq', archivePath, '-d', extractedDirectory], {
      maxBuffer: 8 * 1024 * 1024,
    })
    const strictArtifact = { ...artifact, entries }
    let validation
    try {
      validation = await validateStrictArtifact({
        artifact: strictArtifact,
        directory: extractedDirectory,
        jsonDocuments,
      })
    } catch (error) {
      return {
        archiveSha256,
        entries,
        jsonDocuments,
        strictValidation: { status: 'failed', reason: error.message },
      }
    }
    return {
      archiveSha256,
      entries,
      jsonDocuments,
      strictValidation: { status: 'passed', ...validation },
    }
  } catch (error) {
    return { disposition: 'inconclusive', reason: error.message }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

async function registryDisposition(jsonDocuments) {
  const manifest = Object.values(jsonDocuments ?? {}).find(
    (document) => document.value?.schemaId === 'yakit-ui-release-manifest/v3',
  )?.value
  if (!manifest) return null
  const registry = []
  for (const release of manifest.releases ?? []) {
    try {
      const response = await fetch(
        `https://registry.npmjs.org/${encodeURIComponent(release.name)}/${encodeURIComponent(release.version)}`,
        { headers: { accept: 'application/json' } },
      )
      if (response.status === 404) {
        registry.push({ identity: release.identity, status: 'missing' })
        continue
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const metadata = await response.json()
      registry.push({
        identity: release.identity,
        status: metadata?.dist?.integrity === release.tarball?.integrity ? 'exact' : 'conflict',
        integrity: metadata?.dist?.integrity ?? null,
      })
    } catch (error) {
      registry.push({
        identity: release.identity,
        status: 'inconclusive',
        reason: error.message,
      })
    }
  }
  return registry
}

export function classifyArtifactEvidence(artifact) {
  if (artifact.disposition === 'inconclusive') return artifact
  if (artifact.strictValidation?.status !== 'passed')
    return {
      ...artifact,
      disposition: 'inconclusive',
      reason: artifact.strictValidation?.reason ?? 'artifact strict validation is missing',
    }
  const kind = artifact.kind
  const semanticOutcome = artifact.strictValidation.semanticOutcome
  if (semanticOutcome === 'inconclusive')
    return {
      ...artifact,
      disposition: 'inconclusive',
      reason: 'artifact lifecycle outcome is ambiguous',
    }
  if (['release-impact', 'incident-resolution'].includes(kind)) {
    return { ...artifact, disposition: semanticOutcome }
  }
  if (['publish-receipt', 'recovery-receipt'].includes(kind)) return { ...artifact, disposition: semanticOutcome }
  if (kind === 'verification') {
    if (artifact.registry?.some((item) => ['conflict', 'inconclusive'].includes(item.status)))
      return {
        ...artifact,
        disposition: 'inconclusive',
        reason: 'registry verification is ambiguous',
      }
    return {
      ...artifact,
      disposition: artifact.registry?.every((item) => item.status === 'exact') ? 'closed-terminal' : 'recoverable',
    }
  }
  if (['publish-intent', 'recovery-intent'].includes(kind)) return { ...artifact, disposition: semanticOutcome }
  return {
    ...artifact,
    disposition: 'inconclusive',
    reason: 'unknown artifact kind',
  }
}

function lifecycleReleaseIdentities(state) {
  return (state?.releases ?? []).map((release) => `${release.name}@${release.version}`)
}

function recoveryClosesArtifact(sourceArtifact, recoveryReceipt) {
  if (
    recoveryReceipt.kind !== 'recovery-receipt' ||
    !recoveryReceipt.id ||
    !recoveryReceipt.workflowRunId ||
    !/^sha256:[0-9a-f]{64}$/i.test(recoveryReceipt.digest ?? '') ||
    recoveryReceipt.disposition !== 'closed-terminal' ||
    recoveryReceipt.strictValidation?.status !== 'passed' ||
    recoveryReceipt.strictValidation?.semanticOutcome !== 'closed-terminal'
  )
    return false
  const recoveryState = recoveryReceipt.jsonDocuments?.['lifecycle-snapshot.json']?.value
  if (
    String(recoveryState?.sourceRunId) !== String(sourceArtifact.workflowRunId) ||
    !/^[0-9a-f]{64}$/i.test(recoveryState?.outboxSha256 ?? '')
  )
    return false
  const recoveryReleaseIdentities = lifecycleReleaseIdentities(recoveryState)
  if (recoveryReleaseIdentities.length === 0) return false

  if (
    !['publish-intent', 'publish-receipt'].includes(sourceArtifact.kind) ||
    !['recoverable', 'inconclusive'].includes(sourceArtifact.disposition) ||
    sourceArtifact.strictValidation?.status !== 'passed'
  )
    return false
  const sourceState = sourceArtifact.jsonDocuments?.['lifecycle-snapshot.json']?.value
  return (
    String(sourceState?.sourceRunId) === String(sourceArtifact.workflowRunId) &&
    sourceState?.outboxSha256 === recoveryState.outboxSha256 &&
    JSON.stringify(lifecycleReleaseIdentities(sourceState)) === JSON.stringify(recoveryReleaseIdentities)
  )
}

export function reconcileRecoveredArtifacts(artifacts) {
  const recoveryReceipts = artifacts.filter((artifact) => artifact.kind === 'recovery-receipt')
  return artifacts.map((artifact) => {
    const recoveryReceipt = recoveryReceipts.find((receipt) => recoveryClosesArtifact(artifact, receipt))
    if (artifact.disposition === 'closed-terminal' || !recoveryReceipt) return artifact
    return {
      ...artifact,
      historicalDisposition: artifact.disposition,
      historicalReason: artifact.reason,
      disposition: 'closed-terminal',
      reason: undefined,
      recoveredBy: {
        artifactId: String(recoveryReceipt.id),
        digest: recoveryReceipt.digest,
        workflowRunId: String(recoveryReceipt.workflowRunId),
      },
    }
  })
}

export function classifyRunEvidence(run, artifacts, currentRunId) {
  const owned = artifacts.filter((artifact) => String(artifact.workflowRunId) === String(run.id))
  if (owned.some((artifact) => artifact.disposition === 'inconclusive')) return { ...run, disposition: 'inconclusive' }
  if (owned.some((artifact) => artifact.disposition === 'recoverable')) return { ...run, disposition: 'recoverable' }
  if (String(run.id) === String(currentRunId) && run.status !== 'completed')
    return { ...run, disposition: 'recoverable' }
  if (run.status === 'completed') return { ...run, disposition: 'closed-terminal' }
  return { ...run, disposition: 'inconclusive' }
}

export function isArtifactRevisionRelevant({ artifact, containedCutoverRevisions = [], policy }) {
  if (
    policy.legacyExactAllowlist.some(
      (entry) =>
        String(entry.artifactId) === String(artifact.id) &&
        String(entry.workflowRunId) === String(artifact.workflow_run?.id),
    )
  )
    return true
  return policy.refDispositions.some((item) => containedCutoverRevisions.includes(item.cutoverRevision))
}

export async function collectCutoverEvidence({ repository, runId, token }) {
  const encodedRepository = repository.split('/').map(encodeURIComponent).join('/')
  const apiRoot = `https://api.github.com/repos/${encodedRepository}`
  const policy = await readCutoverPolicy(ROOT)
  const runSnapshot = await collectStableCountedInventory({
    token,
    url: `${apiRoot}/actions/workflows/publish.yml/runs?per_page=100&created=${encodeURIComponent(`>=${policy.inventoryWindowStartsAt}`)}`,
    itemsFromResponse: (value) => value.workflow_runs ?? [],
    idFromItem: (item) => item.id,
    stableFields: ['id', 'head_branch', 'head_sha', 'status', 'conclusion', 'path'],
  })
  const rawRuns = runSnapshot.pages
  const runById = new Map()
  for (const run of rawRuns.flatMap((page) => page.items)) runById.set(String(run.id), run)
  const inventoriedPublishRunIds = new Set(runById.keys())

  const artifactSnapshot = await collectStableCountedInventory({
    token,
    url: `${apiRoot}/actions/artifacts?per_page=100`,
    itemsFromResponse: (value) => value.artifacts ?? [],
    idFromItem: (item) => item.id,
    stableFields: ['id', 'name', 'digest', 'expired', 'created_at', 'workflow_run'],
  })
  const rawArtifacts = artifactSnapshot.pages
  const candidateArtifacts = rawArtifacts
    .flatMap((page) => page.items)
    .filter((artifact) => RELEVANT_ARTIFACT.test(artifact.name ?? ''))
  for (const artifact of candidateArtifacts) {
    const artifactRunId = String(artifact.workflow_run?.id ?? '')
    if (!artifactRunId) throw new Error(`artifact ${artifact.id} has no workflow run`)
    if (!runById.has(artifactRunId)) {
      const { value } = await githubJson(`${apiRoot}/actions/runs/${artifactRunId}`, token)
      runById.set(artifactRunId, value)
    }
  }

  const ancestryCache = new Map()
  const relevantArtifacts = []
  for (const artifact of candidateArtifacts) {
    const run = runById.get(String(artifact.workflow_run.id))
    const containedCutoverRevisions = []
    for (const disposition of policy.refDispositions) {
      const cacheKey = `${run.head_sha}:${disposition.cutoverRevision}`
      if (!ancestryCache.has(cacheKey))
        ancestryCache.set(
          cacheKey,
          await containsRevision({
            repository,
            headSha: run.head_sha,
            revision: disposition.cutoverRevision,
            token,
          }),
        )
      if (ancestryCache.get(cacheKey)) containedCutoverRevisions.push(disposition.cutoverRevision)
    }
    if (
      isArtifactRevisionRelevant({
        artifact,
        containedCutoverRevisions,
        policy,
      })
    )
      relevantArtifacts.push(artifact)
  }

  const enforcementBySha = new Map()
  const runs = []
  const relevantRunIds = new Set([
    ...inventoriedPublishRunIds,
    ...relevantArtifacts.map((artifact) => String(artifact.workflow_run.id)),
  ])
  for (const [runIdKey, run] of runById) {
    if (!relevantRunIds.has(runIdKey)) continue
    if (!run?.id || !run?.head_branch || !run?.head_sha) throw new Error('workflow run evidence is incomplete')
    if (!enforcementBySha.has(run.head_sha))
      enforcementBySha.set(run.head_sha, await enforcementIdentity({ repository, sha: run.head_sha, token }))
    runs.push({
      id: String(run.id),
      sourceRef: `refs/heads/${run.head_branch}`,
      headSha: run.head_sha,
      status: run.status,
      conclusion: run.conclusion,
      workflowPath: run.path,
      ...enforcementBySha.get(run.head_sha),
    })
  }

  const classifiedArtifacts = []
  for (const artifact of relevantArtifacts) {
    const run = runById.get(String(artifact.workflow_run.id))
    const kind = artifactKind(artifact.name)
    const inspected = await inspectArtifactArchive({
      artifact: {
        ...artifact,
        kind,
        workflowRunId: String(run.id),
      },
      token,
    })
    const evidence = {
      id: String(artifact.id),
      name: artifact.name,
      kind,
      workflowRunId: String(run.id),
      sourceRef: `refs/heads/${run.head_branch}`,
      headSha: run.head_sha,
      digest: artifact.digest ?? null,
      expired: artifact.expired === true,
      createdAt: artifact.created_at,
      ...inspected,
    }
    evidence.registry = await registryDisposition(evidence.jsonDocuments)
    classifiedArtifacts.push(classifyArtifactEvidence(evidence))
  }
  const artifacts = reconcileRecoveredArtifacts(classifiedArtifacts)

  const refOptions = {
    token,
    url: `${apiRoot}/git/matching-refs/heads/?per_page=100`,
    itemsFromResponse: (value) =>
      (Array.isArray(value) ? value : []).filter(
        (item) => item?.ref === 'refs/heads/main' || item?.ref?.startsWith('refs/heads/pre/'),
      ),
  }
  const firstRefPages = await collectGithubPages(refOptions)
  const rawRefs = await collectGithubPages(refOptions)
  validateStableRefSnapshots(
    firstRefPages.flatMap((page) => page.items.map((item) => ({ ref: item.ref, headSha: item.object?.sha }))),
    rawRefs.flatMap((page) => page.items.map((item) => ({ ref: item.ref, headSha: item.object?.sha }))),
  )
  const refs = []
  for (const item of rawRefs.flatMap((page) => page.items)) {
    const disposition = dispositionForExactRef(policy, item.ref)
    if (!disposition) {
      refs.push({
        ref: item.ref,
        headSha: item.object?.sha,
        evidenceDisposition: 'inconclusive',
        reason: 'no exact policy disposition',
      })
      continue
    }
    try {
      const audit = await contentIdentity({
        repository,
        path: disposition.approval.auditArtifact.path,
        sha: disposition.cutoverRevision,
        token,
      })
      const containsCutover = await containsRevision({
        repository,
        headSha: item.object?.sha,
        revision: disposition.cutoverRevision,
        token,
      })
      const auditMatches =
        audit.blobSha === disposition.approval.auditArtifact.blobSha &&
        audit.sha256 === disposition.approval.auditArtifact.sha256
      const headMatches =
        disposition.disposition === 'migrated'
          ? disposition.headBinding === 'live-producer'
          : item.object?.sha === disposition.expectedHeadSha
      refs.push({
        ref: item.ref,
        headSha: item.object?.sha,
        policyDisposition: disposition.disposition,
        cutoverRevision: disposition.cutoverRevision,
        containsCutoverRevision: containsCutover,
        approvalAudit: { blobSha: audit.blobSha, sha256: audit.sha256 },
        evidenceDisposition: containsCutover && auditMatches && headMatches ? 'closed-terminal' : 'inconclusive',
        ...(containsCutover && auditMatches && headMatches ? {} : { reason: 'ref cutover approval evidence mismatch' }),
      })
    } catch (error) {
      refs.push({
        ref: item.ref,
        headSha: item.object?.sha,
        evidenceDisposition: 'inconclusive',
        reason: error.message,
      })
    }
  }
  const classifiedRuns = runs.map((run) => classifyRunEvidence(run, artifacts, runId))
  const currentRun = classifiedRuns.find((run) => run.id === String(runId))
  if (!currentRun) throw new Error('current workflow run is absent from evidence')
  const disposition = dispositionForExactRef(policy, currentRun.sourceRef)
  if (!disposition) throw new Error('current release ref has no exact cutover disposition')
  const producerRef = refs.find((item) => item.ref === currentRun.sourceRef)
  const producer = {
    producerKind: currentRun.producerKind,
    workflowProducerKind: currentRun.producerKind,
    sourceRef: currentRun.sourceRef,
    headSha: currentRun.headSha,
    workflowRunId: currentRun.id,
    cutoverRevision: disposition.cutoverRevision,
    containsCutoverRevision: await containsRevision({
      repository,
      headSha: currentRun.headSha,
      revision: disposition.cutoverRevision,
      token,
    }),
    enforcementBlobSha: currentRun.enforcementBlobSha,
    enforcementSha256: currentRun.enforcementSha256,
    approvalAudit: producerRef?.approvalAudit,
  }
  return {
    evidence: {
      schemaId: 'yakit-ui-release-cutover-evidence/v2',
      inventory: { runs: classifiedRuns, artifacts, refs },
      pagination: {
        runsComplete: rawRuns.at(-1)?.hasNextPage === false,
        artifactsComplete: rawArtifacts.at(-1)?.hasNextPage === false,
        refsComplete: rawRefs.at(-1)?.hasNextPage === false,
      },
    },
    producer,
  }
}

async function main() {
  const evidenceOutput = path.resolve(process.argv[2] ?? '.release/cutover-evidence.json')
  const producerOutput = path.resolve(process.argv[3] ?? '.release/cutover-producer.json')
  const result = await collectCutoverEvidence({
    repository: requiredEnvironment('GITHUB_REPOSITORY'),
    runId: requiredEnvironment('GITHUB_RUN_ID'),
    token: requiredEnvironment('GITHUB_TOKEN'),
  })
  for (const output of [evidenceOutput, producerOutput]) await mkdir(path.dirname(output), { recursive: true })
  await Promise.all([
    writeFile(evidenceOutput, `${JSON.stringify(result.evidence, null, 2)}\n`, {
      flag: 'wx',
    }),
    writeFile(producerOutput, `${JSON.stringify(result.producer, null, 2)}\n`, {
      flag: 'wx',
    }),
  ])
  process.stdout.write(`${JSON.stringify({ evidenceOutput, producerOutput, producer: result.producer }, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) await main()
