#!/usr/bin/env node

// Read-only registry reconciliation. This entry point has no publication callback.
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { validateStrictArtifact } from './collect-release-cutover-evidence.mjs'
import { downloadPublicationArtifacts } from './download-publication-artifacts.mjs'
import { inventoryPublicationArtifacts } from './inventory-publication-artifacts.mjs'
import { preparePublicationAttempt, dispatchPreparedPublication } from './publication-consumer.mjs'
import { classifyPublicationState, registryRecord } from './recover-partial-publication.mjs'
import { artifactsForManifest, sha256File, validateVerificationManifest } from './verification-manifest.mjs'

export function validateReconciliationSource({ artifact, run, repository, sourceRunId, artifactId, manifest }) {
  if (
    String(artifact.id) !== String(artifactId) ||
    artifact.expired ||
    !/^sha256:[0-9a-f]{64}$/.test(artifact.digest ?? '') ||
    artifact.name !== `yakit-ui-verification-${sourceRunId}` ||
    String(artifact.workflow_run?.id) !== String(sourceRunId) ||
    String(run.id) !== String(sourceRunId) ||
    run.repository?.full_name !== repository ||
    run.path !== '.github/workflows/publish.yml' ||
    run.event !== 'push' ||
    run.status !== 'completed' ||
    !/^(main|pre\/.+)$/.test(run.head_branch ?? '') ||
    manifest.schemaVersion !== 3 ||
    manifest.repository !== repository ||
    String(manifest.runId) !== String(sourceRunId) ||
    manifest.sourceRef !== `refs/heads/${run.head_branch}` ||
    manifest.workflowCommitSha !== run.head_sha ||
    artifact.workflow_run?.head_sha !== run.head_sha
  )
    throw new Error('reconciliation verification artifact/source identity mismatch')
  const created = Date.parse(artifact.created_at)
  if (!Number.isFinite(created) || created > Date.now() || Date.now() - created > 14 * 86400000)
    throw new Error('reconciliation artifact is outside the 14-day recovery window')
}

export async function observeExactPublished(
  release,
  artifact,
  tarballPath,
  { record = registryRecord, request = fetch } = {},
) {
  const registry = await record(artifact, tarballPath, release.distTag)
  const plan = classifyPublicationState([artifact], {
    [release.name]: registry,
  })
  if (plan.published.length !== 1)
    throw new Error(`${release.identity} is not published; read-only reconciliation cannot retry`)
  const response = await request(
    `https://registry.npmjs.org/${encodeURIComponent(release.name)}/${encodeURIComponent(release.version)}`,
    { headers: { accept: 'application/json' } },
  )
  if (!response.ok) throw new Error('registry version lookup failed')
  const version = await response.json()
  const url = new URL(version.dist?.tarball ?? 'https://invalid.invalid')
  if (
    version.name !== release.name ||
    version.version !== release.version ||
    url.origin !== 'https://registry.npmjs.org'
  )
    throw new Error('registry package identity mismatch')
  const tarball = await request(url)
  if (!tarball.ok) throw new Error('registry tarball download failed')
  const bytes = Buffer.from(await tarball.arrayBuffer())
  const local = await readFile(tarballPath)
  if (
    !bytes.equals(local) ||
    bytes.length !== release.tarball.packedBytes ||
    createHash('sha256').update(bytes).digest('hex') !== release.tarball.sha256
  )
    throw new Error('registry tarball bytes differ from verified artifact')
  return 'APPLIED'
}

async function strictDirectory(artifact, directory) {
  const entries = await readdir(directory)
  const jsonDocuments = Object.fromEntries(
    await Promise.all(
      entries
        .filter((name) => name.endsWith('.json'))
        .map(async (name) => [
          name,
          {
            value: JSON.parse(await readFile(path.join(directory, name), 'utf8')),
          },
        ]),
    ),
  )
  return validateStrictArtifact({
    artifact: { ...artifact, entries },
    directory,
    jsonDocuments,
  })
}

async function main() {
  const [mode, rootArgument] = process.argv.slice(2)
  if (!['prepare', 'receipt'].includes(mode) || !rootArgument)
    throw new Error('Usage: reconcile-published-artifact.mjs <prepare|receipt> <directory>')
  const env = (name) => {
    if (!process.env[name]) throw new Error(`${name} is required`)
    return process.env[name]
  }
  if (process.env.AUTHORIZE_PUBLICATION_RETRY === 'true' || process.env.INCIDENT_ID)
    throw new Error('read-only reconciliation cannot authorize retries or incidents')
  const repository = env('GITHUB_REPOSITORY'),
    sourceRunId = env('SOURCE_RUN_ID'),
    artifactId = env('VERIFICATION_ARTIFACT_ID'),
    token = env('GITHUB_TOKEN')
  if (
    env('GITHUB_REF') !== 'refs/heads/main' ||
    env('GITHUB_WORKFLOW_REF') !== `${repository}/.github/workflows/publish.yml@refs/heads/main`
  )
    throw new Error('reconciliation requires the reviewed main workflow')
  const root = path.resolve(rootArgument)
  const api = async (endpoint) => {
    const response = await fetch(`https://api.github.com/repos/${repository}${endpoint}`, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
      },
    })
    if (!response.ok) throw new Error(`GitHub lookup failed: ${response.status}`)
    return response.json()
  }
  const artifact = await api(`/actions/artifacts/${encodeURIComponent(artifactId)}`)
  const run = await api(`/actions/runs/${encodeURIComponent(sourceRunId)}`)
  const inventoryFor = (artifacts) => ({
    schemaId: 'yakit-ui-publication-artifact-inventory/v1',
    repository,
    artifacts,
  })
  const evidence = path.join(root, 'evidence', `yakit-ui-verification-${sourceRunId}`)
  if (mode === 'prepare') {
    // Validate metadata before using its artifact name as a filesystem path.
    if (artifact.name !== `yakit-ui-verification-${sourceRunId}` || !/^\d+$/.test(sourceRunId))
      throw new Error('unexpected verification artifact name')
    await downloadPublicationArtifacts({
      inventory: inventoryFor([artifact]),
      outputRoot: path.join(root, 'evidence'),
      repository,
      token,
    })
  }
  const manifest = JSON.parse(await readFile(path.join(evidence, 'verification-manifest.json'), 'utf8'))
  validateReconciliationSource({
    artifact,
    run,
    repository,
    sourceRunId,
    artifactId,
    manifest,
  })
  await strictDirectory({ ...artifact, kind: 'verification', workflowRunId: sourceRunId }, evidence)
  const tarballPaths = Object.fromEntries(
    manifest.releases.map((release) => [release.name, path.join(evidence, release.tarball.filename)]),
  )
  await validateVerificationManifest(manifest, {
    evidenceDirectory: evidence,
    repository,
    runId: sourceRunId,
    sourceRef: `refs/heads/${run.head_branch}`,
    expectedPackages: manifest.releaseSet,
    requirePublicationOutbox: true,
    tarballPaths,
  })
  const outboxPath = path.join(evidence, 'transactional-outbox.json')
  const outbox = JSON.parse(await readFile(outboxPath, 'utf8'))
  const artifacts = artifactsForManifest(manifest)
  const observe = (release) =>
    observeExactPublished(
      release,
      artifacts.find((item) => item.package === release.name),
      tarballPaths[release.name],
    )
  // Complete every registry check before creating any state, including for multi-package releases.
  for (const release of manifest.releases) await observe(release)
  const common = {
    manifest,
    outbox,
    outboxSha256: await sha256File(outboxPath),
    observe,
  }
  if (mode === 'prepare') {
    const inventory = await inventoryPublicationArtifacts({
      repository,
      sourceRunId,
      token,
    })
    if (!inventory.artifacts.length) throw new Error('read-only reconciliation requires existing publication history')
    const priorStateRoot = path.join(root, 'prior')
    await downloadPublicationArtifacts({
      inventory,
      outputRoot: priorStateRoot,
      repository,
      token,
    })
    for (const prior of inventory.artifacts)
      await strictDirectory(
        {
          ...prior,
          kind: prior.name.includes('-publish-')
            ? prior.name.includes('-intent-')
              ? 'publish-intent'
              : 'publish-receipt'
            : prior.name.includes('-intent-')
              ? 'recovery-intent'
              : 'recovery-receipt',
        },
        path.join(priorStateRoot, prior.name),
      )
    await preparePublicationAttempt({
      ...common,
      stateDirectory: path.join(root, 'intent'),
      priorStateRoot,
      priorArtifactInventory: inventory,
      attemptId: `${env('GITHUB_RUN_ID')}:${env('GITHUB_RUN_ATTEMPT')}`,
    })
    await writeFile(
      path.join(root, 'intent', 'prior-artifact-inventory.json'),
      `${JSON.stringify(inventory, null, 2)}\n`,
      { flag: 'wx' },
    )
    await strictDirectory(
      {
        name: `yakit-ui-recovery-intent-${sourceRunId}-${env('GITHUB_RUN_ID')}-${env('GITHUB_RUN_ATTEMPT')}`,
        workflowRunId: env('GITHUB_RUN_ID'),
        kind: 'recovery-intent',
      },
      path.join(root, 'intent'),
    )
  } else {
    const intent = await api(`/actions/artifacts/${encodeURIComponent(env('PUBLICATION_INTENT_ARTIFACT_ID'))}`)
    const expectedName = `yakit-ui-recovery-intent-${sourceRunId}-${env('GITHUB_RUN_ID')}-${env('GITHUB_RUN_ATTEMPT')}`
    if (
      intent.name !== expectedName ||
      intent.expired ||
      String(intent.workflow_run?.id) !== env('GITHUB_RUN_ID') ||
      intent.digest !== `sha256:${env('PUBLICATION_INTENT_ARTIFACT_DIGEST').replace(/^sha256:/, '')}`
    )
      throw new Error('reconciliation intent identity mismatch')
    await downloadPublicationArtifacts({
      inventory: inventoryFor([intent]),
      outputRoot: path.join(root, 'durable'),
      repository,
      token,
    })
    const intentDirectory = path.join(root, 'durable', expectedName)
    await strictDirectory(
      {
        ...intent,
        workflowRunId: env('GITHUB_RUN_ID'),
        kind: 'recovery-intent',
      },
      intentDirectory,
    )
    await dispatchPreparedPublication({
      ...common,
      intentDirectory,
      receiptDirectory: path.join(root, 'receipt'),
      intentArtifactIdentity: { id: String(intent.id), digest: intent.digest },
      publish: async () => {
        throw new Error('read-only reconciliation cannot publish')
      },
    })
    const validation = await strictDirectory(
      {
        name: `yakit-ui-recovery-receipt-${sourceRunId}-${env('GITHUB_RUN_ID')}-${env('GITHUB_RUN_ATTEMPT')}`,
        workflowRunId: env('GITHUB_RUN_ID'),
        kind: 'recovery-receipt',
      },
      path.join(root, 'receipt'),
    )
    if (validation.semanticOutcome !== 'closed-terminal')
      throw new Error('reconciliation receipt is not terminal success')
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) await main()
