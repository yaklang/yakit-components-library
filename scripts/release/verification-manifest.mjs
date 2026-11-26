#!/usr/bin/env node

import { validateDeferredImpact } from './release-deferrals.mjs'

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { validateSizeReport } from '../../packages/yakit-ui-icons/scripts/size-observability-validator.mjs'

export const RELEASE_MANIFEST_SCHEMA_ID = 'yakit-ui-release-manifest/v3'
const PUBLIC_PACKAGES = ['@yakit-libs/yakit-ui', '@yakit-libs/yakit-ui-icons']
const sortPublicPackages = (packages) =>
  [...packages].sort((left, right) => PUBLIC_PACKAGES.indexOf(left) - PUBLIC_PACKAGES.indexOf(right))
const validateReleaseSet = (releaseSet) => {
  checkedSet('releaseSet', releaseSet, { allowEmpty: false })
  const sorted = sortPublicPackages(releaseSet)
  if (JSON.stringify(sorted) !== JSON.stringify(releaseSet))
    throw new Error(`releaseSet must use deterministic order ${JSON.stringify(sorted)}`)
  return releaseSet
}
const VALID_PUBLISH_STATES = new Set(['pending', 'verified', 'publishing', 'published', 'failed'])
const REQUIRED_FINAL_GATES = ['build', 'consumer']
export function requiredReleaseGates(entry) {
  return entry?.name === '@yakit-libs/yakit-ui-icons' ? [...REQUIRED_FINAL_GATES, 'size'] : [...REQUIRED_FINAL_GATES]
}

export function isManifestFinalized(manifest) {
  return (
    Array.isArray(manifest?.releases) &&
    manifest.releases.length > 0 &&
    manifest.releases.every((entry) => requiredReleaseGates(entry).every((gate) => entry.gates?.[gate] === 'passed'))
  )
}
const PUBLISH_TRANSITIONS = new Map([
  ['pending', new Set(['verified'])],
  ['verified', new Set(['publishing'])],
  ['publishing', new Set(['published', 'failed'])],
  ['failed', new Set(['publishing'])],
  ['published', new Set()],
])

export function transitionPublishState(entry, nextStatus, { registryMatch = false } = {}) {
  if (!VALID_PUBLISH_STATES.has(entry?.publish?.status) || !VALID_PUBLISH_STATES.has(nextStatus))
    throw new Error('invalid publish state transition')
  if (entry.publish.status === 'published' && nextStatus === 'published') return entry
  if (registryMatch && nextStatus === 'published')
    return { ...entry, publish: { ...entry.publish, status: 'published' } }
  if (!PUBLISH_TRANSITIONS.get(entry.publish.status).has(nextStatus))
    throw new Error(`publish transition ${entry.publish.status} -> ${nextStatus} is not allowed`)
  return {
    ...entry,
    publish: {
      ...entry.publish,
      status: nextStatus,
      attempt: nextStatus === 'publishing' ? (entry.publish.attempt ?? 0) + 1 : entry.publish.attempt,
    },
  }
}

export async function sha256File(filePath) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return hash.digest('hex')
}

async function sriFile(filePath) {
  const hash = createHash('sha512')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return `sha512-${hash.digest('base64')}`
}

export function releasesForManifest(manifest) {
  if (manifest?.schemaId === RELEASE_MANIFEST_SCHEMA_ID && manifest?.schemaVersion === 3) return manifest.releases ?? []
  if (manifest?.schemaVersion === 2)
    return (manifest.artifacts ?? []).map((item) => ({
      name: item.package,
      version: item.version,
      distTag: manifest.package?.distTag,
      tarball: {
        filename: item.filename,
        sha256: item.sha256,
        packedBytes: item.packedBytes,
        unpackedBytes: item.unpackedBytes,
        fileCount: item.fileCount,
      },
    }))
  if (manifest?.schemaVersion === 1 && manifest?.package && manifest?.tarball)
    return [
      {
        name: manifest.package.name,
        version: manifest.package.version,
        distTag: manifest.package.distTag,
        tarball: manifest.tarball,
      },
    ]
  return []
}

export const artifactsForManifest = (manifest) =>
  releasesForManifest(manifest).map((entry) => ({
    package: entry.name,
    version: entry.version,
    distTag: entry.distTag,
    filename: entry.tarball.filename,
    sha256: entry.tarball.sha256,
    integrity: entry.tarball.integrity,
    packedBytes: entry.tarball.packedBytes,
    unpackedBytes: entry.tarball.unpackedBytes,
    fileCount: entry.tarball.fileCount,
  }))

function checkedSet(name, value, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0))
    throw new Error(`${name} must be ${allowEmpty ? 'an' : 'a non-empty'} array`)
  if (new Set(value).size !== value.length) throw new Error(`${name} must not contain duplicate packages`)
  for (const packageName of value)
    if (!PUBLIC_PACKAGES.includes(packageName)) throw new Error(`${name} contains unsupported package ${packageName}`)
  return sortPublicPackages(value)
}

function validateImpactProbes(value) {
  if (!Array.isArray(value)) throw new Error('impactProbeSet must be an array')
  for (const probe of value) {
    if (!PUBLIC_PACKAGES.includes(probe?.package)) throw new Error('impactProbeSet contains an unsupported package')
    if (probe.nonPublishable !== true || probe.kind !== 'impact-probe')
      throw new Error('impactProbeSet entries must be non-publishable shadow artifacts')
    if (!probe.baseRevision || !probe.headRevision || !probe.sourceHash)
      throw new Error('impactProbeSet identity is incomplete')
  }
  return value
}

function validateCompatibilityBaselines(value, releaseSet) {
  if (!Array.isArray(value)) throw new Error('compatibilityBaselineSet must be an array')
  const expected = releaseSet.length === 1 ? PUBLIC_PACKAGES.filter((name) => !releaseSet.includes(name)) : []
  if (JSON.stringify(value.map((item) => item.package)) !== JSON.stringify(expected))
    throw new Error(`compatibilityBaselineSet must contain exact counterpart identities ${JSON.stringify(expected)}`)
  for (const item of value) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(item.version ?? ''))
      throw new Error('compatibility baseline version is invalid')
    if (
      !/^https:\/\//.test(item.resolved ?? '') ||
      !/^sha(?:256|384|512)-[A-Za-z0-9+/=]+$/.test(item.integrity ?? '') ||
      !/^[0-9a-f]{64}$/i.test(item.sha256 ?? '') ||
      !/^baseline-[A-Za-z0-9._-]+\.tgz$/.test(item.filename ?? '') ||
      !Number.isSafeInteger(item.packedBytes) ||
      item.packedBytes <= 0 ||
      !item.cacheKey ||
      !item.distTag
    )
      throw new Error(`compatibility baseline ${item.package} identity is incomplete`)
  }
  return value
}

export async function createVerificationManifest(options) {
  for (const field of [
    'repository',
    'workflowCommitSha',
    'runId',
    'runAttempt',
    'sourceRef',
    'packArtifactId',
    'packArtifactDigest',
  ])
    if (options[field] === undefined || options[field] === '') throw new Error(`Missing verification field: ${field}`)
  const artifacts = options.artifacts ?? []
  const releaseSet = validateReleaseSet(sortPublicPackages(options.releaseSet ?? artifacts.map((item) => item.package)))
  const byName = new Map(artifacts.map((item) => [item.package, item]))
  const releases = []
  for (const name of releaseSet) {
    const item = byName.get(name)
    if (!item) throw new Error(`Missing release artifact for ${name}`)
    const tarballPath = path.resolve(item.tarballPath ?? item.tarball)
    const packedBytes = (await stat(tarballPath)).size
    const sha256 = await sha256File(tarballPath)
    releases.push({
      name,
      version: item.version,
      distTag: item.distTag ?? options.distTag,
      identity: `${name}@${item.version}`,
      tarball: {
        filename: path.basename(tarballPath),
        sha256,
        integrity: item.integrity ?? (await sriFile(tarballPath)),
        packedBytes,
        unpackedBytes: Number(item.unpackedBytes ?? 0),
        fileCount: Number(item.fileCount ?? 0),
      },
      gates: item.gates ?? options.gates ?? {},
      publish: { status: 'verified', attempt: 0 },
      metadata: { status: 'pending', tag: `${name}@${item.version}` },
      recovery: { status: 'pending', revision: 0 },
    })
  }
  return {
    schemaId: RELEASE_MANIFEST_SCHEMA_ID,
    schemaVersion: 3,
    repository: options.repository,
    workflowCommitSha: options.workflowCommitSha,
    runId: String(options.runId),
    runAttempt: String(options.runAttempt),
    sourceRef: options.sourceRef,
    releaseSet,
    impactProbeSet: validateImpactProbes(options.impactProbeSet ?? []),
    compatibilityBaselineSet: validateCompatibilityBaselines(options.compatibilityBaselineSet ?? [], releaseSet),
    ...(options.deferredImpact
      ? {
          deferredImpact: validateDeferredImpact(options.deferredImpact, {
            releases,
            compatibilityBaselineSet: options.compatibilityBaselineSet,
            headRevision: options.workflowCommitSha,
          }),
        }
      : {}),
    packArtifact: {
      id: String(options.packArtifactId),
      digest: options.packArtifactDigest,
    },
    releases,
    finalized: isManifestFinalized({ releases }),
  }
}

function validateLegacyManifest(manifest, options, failures) {
  if (![1, 2].includes(manifest?.schemaVersion)) {
    failures.push('legacy schemaVersion must equal 1 or 2')
    return
  }
  if (options.allowLegacy !== true) failures.push('legacy v1/v2 evidence is recovery-only')
  if (manifest.schemaVersion === 1 && options.legacyOperation !== 'metadata')
    failures.push('legacy schema-v1 evidence supports metadata recovery only')
  if (manifest.schemaVersion === 2 && options.legacyOperation === 'publish')
    failures.push('legacy schema-v2 evidence cannot initiate publication')
  if (manifest.schemaVersion === 2) {
    const artifacts = manifest.artifacts ?? []
    const names = artifacts.map((item) => item.package)
    if (JSON.stringify(names) !== JSON.stringify(PUBLIC_PACKAGES))
      failures.push('legacy schema-v2 evidence must retain the original ordered pair')
    if (new Set(artifacts.map((item) => item.version)).size > 1)
      failures.push('legacy schema-v2 evidence must retain its original same-version identity')
    if (manifest.package?.name !== '@yakit-libs/yakit-ui')
      failures.push('legacy schema-v2 primary package identity is invalid')
  }
}

export async function validateVerificationManifest(manifest, options = {}) {
  const failures = []
  const isV3 = manifest?.schemaId === RELEASE_MANIFEST_SCHEMA_ID && manifest?.schemaVersion === 3
  if (!isV3) {
    validateLegacyManifest(manifest, options, failures)
    if (failures.length) throw new Error(`Verification manifest failed:\n- ${failures.join('\n- ')}`)
    return manifest
  }
  if (manifest.finalized !== true && options.allowDraft !== true)
    failures.push('manifest must be finalized before publish or recovery')
  for (const field of ['repository', 'workflowCommitSha', 'runId', 'runAttempt', 'sourceRef'])
    if (!manifest[field]) failures.push(`${field} is required`)
  if (!/^[0-9a-f]{40}$/i.test(manifest.workflowCommitSha ?? ''))
    failures.push('workflowCommitSha must be a 40-character Git commit SHA')
  if (!manifest.packArtifact?.id) failures.push('packArtifact.id is required')
  if (!/^sha256:[0-9a-f]{64}$/i.test(manifest.packArtifact?.digest ?? ''))
    failures.push('packArtifact.digest must use sha256:<64 hex>')
  if (manifest.publicationOutbox !== undefined) {
    if (
      manifest.publicationOutbox?.filename !== 'transactional-outbox.json' ||
      !/^[0-9a-f]{64}$/i.test(manifest.publicationOutbox?.sha256 ?? '')
    )
      failures.push('publicationOutbox identity is invalid')
  } else if (options.requirePublicationOutbox === true) {
    failures.push('publicationOutbox is required for publication')
  }
  let releaseSet = []
  try {
    releaseSet = validateReleaseSet(manifest.releaseSet)
  } catch (error) {
    failures.push(error.message)
  }
  try {
    validateImpactProbes(manifest.impactProbeSet)
    if (
      JSON.stringify(sortPublicPackages(manifest.impactProbeSet.map((probe) => probe.package))) !==
      JSON.stringify(releaseSet)
    )
      failures.push('impactProbeSet must exactly match releaseSet')
  } catch (error) {
    failures.push(error.message)
  }
  try {
    validateCompatibilityBaselines(manifest.compatibilityBaselineSet, releaseSet)
  } catch (error) {
    failures.push(error.message)
  }
  if (manifest.deferredImpact !== undefined) {
    try {
      validateDeferredImpact(manifest.deferredImpact, {
        releases: manifest.releases,
        compatibilityBaselineSet: manifest.compatibilityBaselineSet,
        headRevision: manifest.workflowCommitSha,
      })
    } catch (error) {
      failures.push(error.message)
    }
  }
  if (!Array.isArray(manifest.releases) || manifest.releases.length === 0)
    failures.push('releases must be a non-empty array')
  else {
    const names = []
    for (const entry of manifest.releases) {
      names.push(entry?.name)
      if (!PUBLIC_PACKAGES.includes(entry?.name)) failures.push(`unsupported release package ${entry?.name}`)
      if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(entry?.version ?? ''))
        failures.push(`release ${entry?.name ?? '<unknown>'} version is invalid`)
      if (entry?.identity !== `${entry?.name}@${entry?.version}`)
        failures.push(`release ${entry?.name ?? '<unknown>'} identity mismatch`)
      if (!entry?.distTag) failures.push(`release ${entry?.name ?? '<unknown>'} distTag is required`)
      if (!/^[0-9a-f]{64}$/i.test(entry?.tarball?.sha256 ?? ''))
        failures.push(`release ${entry?.name ?? '<unknown>'} tarball SHA-256 is invalid`)
      if (!/^sha(?:256|384|512)-[A-Za-z0-9+/=]+$/.test(entry?.tarball?.integrity ?? ''))
        failures.push(`release ${entry?.name ?? '<unknown>'} tarball integrity is invalid`)
      for (const field of ['packedBytes', 'unpackedBytes', 'fileCount'])
        if (!Number.isSafeInteger(entry?.tarball?.[field]) || entry.tarball[field] < 0)
          failures.push(`release ${entry?.name ?? '<unknown>'} ${field} is invalid`)
      if (!entry?.gates || Object.keys(entry.gates).length === 0)
        failures.push(`release ${entry?.name ?? '<unknown>'} gates are required`)
      else
        for (const [gate, result] of Object.entries(entry.gates))
          if (result !== 'passed') failures.push(`release ${entry.name} gates.${gate} must equal passed`)
      if (entry.name === '@yakit-libs/yakit-ui-icons' && entry.gates?.size === 'passed') {
        const size = entry.evidence?.size
        if (
          size?.status !== 'PASS' ||
          size?.artifactSha256 !== entry.tarball.sha256 ||
          !/^[0-9a-f]{64}$/i.test(size?.reportSha256 ?? '') ||
          !/^yakit-ui-icons-size-report-[A-Za-z0-9._-]+\.json$/.test(size?.filename ?? '')
        )
          failures.push(`release ${entry.name} size evidence is invalid`)
      }
      if (manifest.finalized === true)
        for (const gate of requiredReleaseGates(entry))
          if (entry.gates?.[gate] !== 'passed') failures.push(`release ${entry.name} required gate ${gate} is missing`)
      if (!VALID_PUBLISH_STATES.has(entry?.publish?.status))
        failures.push(`release ${entry?.name ?? '<unknown>'} publish status is invalid`)
      if (!entry?.metadata?.status || !entry?.recovery?.status)
        failures.push(`release ${entry?.name ?? '<unknown>'} lifecycle state is incomplete`)
    }
    if (new Set(names).size !== names.length) failures.push('releases must contain unique package names')
    if (JSON.stringify(names) !== JSON.stringify(releaseSet))
      failures.push('releaseSet must equal releases in deterministic package order')
  }
  for (const [name, actual] of Object.entries({
    repository: manifest.repository,
    workflowCommitSha: manifest.workflowCommitSha,
    runId: manifest.runId,
    sourceRef: manifest.sourceRef,
    packArtifactId: manifest.packArtifact?.id,
  }))
    if (options[name] !== undefined && String(options[name]) !== String(actual))
      failures.push(`${name} mismatch: expected ${options[name]}, got ${actual}`)
  if (options.expectedPackages && JSON.stringify(options.expectedPackages) !== JSON.stringify(releaseSet))
    failures.push(
      `releaseSet mismatch: expected ${JSON.stringify(options.expectedPackages)}, got ${JSON.stringify(releaseSet)}`,
    )
  if (options.tarballPaths) {
    for (const entry of manifest.releases ?? []) {
      const artifactPath = options.tarballPaths[entry.name]
      if (!artifactPath) {
        failures.push(`missing tarball path for ${entry.name}`)
        continue
      }
      if ((await sha256File(artifactPath)) !== entry.tarball.sha256)
        failures.push(`${entry.name} tarball SHA-256 mismatch`)
      if ((await sriFile(artifactPath)) !== entry.tarball.integrity)
        failures.push(`${entry.name} tarball integrity mismatch`)
      if ((await stat(artifactPath)).size !== entry.tarball.packedBytes)
        failures.push(`${entry.name} packedBytes mismatch`)
      if (path.basename(artifactPath) !== entry.tarball.filename) failures.push(`${entry.name} filename mismatch`)
    }
  }
  if (options.evidenceDirectory) {
    if (manifest.publicationOutbox) {
      const outboxPath = path.join(options.evidenceDirectory, manifest.publicationOutbox.filename)
      try {
        if ((await sha256File(outboxPath)) !== manifest.publicationOutbox.sha256)
          failures.push('publication outbox SHA-256 mismatch')
      } catch (error) {
        failures.push(`publication outbox is unavailable: ${error.message}`)
      }
    }
    for (const entry of manifest.releases ?? []) {
      const size = entry.evidence?.size
      if (!size) continue
      const reportPath = path.join(options.evidenceDirectory, size.filename)
      try {
        if ((await sha256File(reportPath)) !== size.reportSha256)
          failures.push(`${entry.name} size report SHA-256 mismatch`)
        const report = JSON.parse(await readFile(reportPath, 'utf8'))
        const strictSizeFailures = validateSizeReport(report, {
          fileCount: entry.tarball.fileCount,
          filename: entry.tarball.filename,
          integrity: entry.tarball.integrity,
          package: entry.name,
          packedBytes: entry.tarball.packedBytes,
          sha256: entry.tarball.sha256,
          unpackedBytes: entry.tarball.unpackedBytes,
          version: entry.version,
        })
        if (report.status !== size.status || report.schemaVersion !== size.schemaVersion)
          failures.push(`${entry.name} size report identity mismatch`)
        if (strictSizeFailures.length > 0)
          failures.push(`${entry.name} size report strict validation failed: ${strictSizeFailures.join('; ')}`)
      } catch (error) {
        failures.push(`${entry.name} size report is unavailable: ${error.message}`)
      }
    }
  }
  if (failures.length) throw new Error(`Verification manifest failed:\n- ${failures.join('\n- ')}`)
  return manifest
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [command, manifestPath] = process.argv.slice(2)
  if (command !== 'verify' || !manifestPath) throw new Error('Usage: verification-manifest.mjs verify <manifest>')
  await validateVerificationManifest(JSON.parse(await readFile(manifestPath, 'utf8')))
  console.log('Verification manifest is valid')
}
