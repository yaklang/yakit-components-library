import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  observeExactPublished,
  validateReconciliationSource,
} from '../../scripts/release/reconcile-published-artifact.mjs'

function source() {
  return {
    repository: 'org/repo',
    sourceRunId: '42',
    artifactId: '7',
    artifact: {
      id: 7,
      name: 'yakit-ui-verification-42',
      digest: `sha256:${'a'.repeat(64)}`,
      created_at: new Date().toISOString(),
      workflow_run: { id: 42, head_sha: 'a'.repeat(40) },
    },
    run: {
      id: 42,
      repository: { full_name: 'org/repo' },
      path: '.github/workflows/publish.yml',
      event: 'push',
      status: 'completed',
      head_branch: 'main',
      head_sha: 'a'.repeat(40),
    },
    manifest: {
      schemaVersion: 3,
      repository: 'org/repo',
      runId: '42',
      sourceRef: 'refs/heads/main',
      workflowCommitSha: 'a'.repeat(40),
    },
  }
}
test('reconciliation requires authenticated exact source and artifact identities', () => {
  assert.doesNotThrow(() => validateReconciliationSource(source()))
  for (const mutate of [
    (x) => (x.artifact.id = 8),
    (x) => (x.artifact.expired = true),
    (x) => (x.artifact.digest = 'bad'),
    (x) => (x.artifact.workflow_run.id = 43),
    (x) => (x.artifact.workflow_run.head_sha = 'b'.repeat(40)),
    (x) => (x.run.repository.full_name = 'other/repo'),
    (x) => (x.run.path = 'other.yml'),
    (x) => (x.run.head_branch = 'feature'),
    (x) => (x.run.event = 'pull_request'),
    (x) => (x.manifest.repository = 'other/repo'),
    (x) => (x.manifest.runId = '43'),
    (x) => (x.manifest.workflowCommitSha = 'b'.repeat(40)),
    (x) => (x.manifest.sourceRef = 'refs/heads/pre/test'),
    (x) => (x.artifact.created_at = '2000-01-01T00:00:00Z'),
  ]) {
    const input = source()
    mutate(input)
    assert.throws(() => validateReconciliationSource(input))
  }
})

test('only an exact registry version, tag, hashes and tarball bytes can be APPLIED', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'reconcile-published-'))
  try {
    const bytes = Buffer.from('verified bytes')
    const tarballPath = path.join(root, 'package.tgz')
    await writeFile(tarballPath, bytes)
    const release = {
      name: '@yakit-libs/yakit-ui-icons',
      version: '0.2.6',
      identity: '@yakit-libs/yakit-ui-icons@0.2.6',
      distTag: 'latest',
      tarball: {
        packedBytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    }
    const artifact = { package: release.name, version: release.version }
    const valid = {
      versionExists: true,
      expectedShasum: 'sha',
      shasum: 'sha',
      expectedIntegrity: 'sri',
      integrity: 'sri',
      distTagVersion: release.version,
    }
    const request = async (url) =>
      String(url).endsWith('.tgz')
        ? new Response(bytes)
        : Response.json({
            name: release.name,
            version: release.version,
            dist: { tarball: 'https://registry.npmjs.org/package.tgz' },
          })
    assert.equal(
      await observeExactPublished(release, artifact, tarballPath, {
        record: async () => valid,
        request,
      }),
      'APPLIED',
    )
    for (const patch of [
      { versionExists: false },
      { unknown: true },
      { shasum: 'different' },
      { integrity: 'different' },
      { distTagVersion: '0.2.7' },
    ]) {
      await assert.rejects(
        observeExactPublished(release, artifact, tarballPath, {
          record: async () => ({ ...valid, ...patch }),
          request,
        }),
      )
    }
    await assert.rejects(
      observeExactPublished(release, artifact, tarballPath, {
        record: async () => valid,
        request: async (url) => (String(url).endsWith('.tgz') ? new Response('different bytes') : request(url)),
      }),
      /bytes differ/,
    )
    await assert.rejects(
      observeExactPublished(release, artifact, tarballPath, {
        record: async () => valid,
        request: async () => Response.json({ name: 'wrong', version: release.version }),
      }),
      /identity mismatch/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('read-only job has no publishing authority and uploads receipt only after success', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/publish.yml', import.meta.url), 'utf8')
  const job = workflow.split('  reconcile-published:\n')[1]
  assert.ok(job)
  assert.doesNotMatch(job, /id-token:|environment:|npm publish|always\(\)/)
  assert.match(job, /actions: read/)
  assert.match(job, /contents: read/)
  assert.match(workflow, /inputs.recovery && !inputs.reconciliation_only/)
  const script = await readFile(
    new URL('../../scripts/release/reconcile-published-artifact.mjs', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(script, /execFile|spawn\(|npm publish/)
  assert.match(script, /read-only reconciliation cannot publish/)
  assert.match(script, /reconciliation requires the reviewed main workflow/)
})
