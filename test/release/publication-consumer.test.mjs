import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { payloadHash } from '../../scripts/release/durable-release-state.mjs'
import { waitForPublication } from '../../scripts/release/wait-for-publication.mjs'
import {
  BOUND_PRIVATE_PROVENANCE_REJECTION_SCHEMA,
  PRIVATE_PROVENANCE_REJECTION_SCHEMA,
} from '../../scripts/release/private-provenance-recovery.mjs'
import {
  createRegistryAbsenceObservation,
  createPublicationOutbox,
  dispatchPreparedPublication,
  preparePublicationAttempt,
  validatePublicationOutbox,
} from '../../scripts/release/publication-consumer.mjs'

const now = Date.parse('2026-08-31T00:00:00.000Z')
const manifest = {
  repository: 'yaklang/yakit-components-library',
  workflowCommitSha: 'a'.repeat(40),
  runId: '42',
  packArtifact: { id: '7' },
  releases: [
    {
      name: '@yakit-libs/yakit-ui',
      version: '2.0.0',
      identity: '@yakit-libs/yakit-ui@2.0.0',
      distTag: 'latest',
      tarball: {
        filename: 'yakit-libs-yakit-ui-2.0.0.tgz',
        sha256: 'b'.repeat(64),
        integrity: `sha512-${Buffer.from('fixture').toString('base64')}`,
        packedBytes: 123,
      },
    },
  ],
}

async function directory(prefix) {
  return mkdtemp(path.join(tmpdir(), prefix))
}

function inventory(artifacts = []) {
  return {
    schemaId: 'yakit-ui-publication-artifact-inventory/v1',
    schemaVersion: 1,
    repository: manifest.repository,
    sourceRunId: manifest.runId,
    enumeratedArtifactCount: artifacts.length,
    relevantArtifactCount: artifacts.length,
    artifacts,
  }
}

function artifact(id, name, digestCharacter, workflowRunId = '42') {
  return {
    id: String(id),
    name,
    digest: `sha256:${digestCharacter.repeat(64)}`,
    workflowRunId,
    producerPath: '.github/workflows/publish.yml',
    createdAt: '2026-08-31T00:00:00.000Z',
  }
}

async function artifactDirectory(root, name) {
  const target = path.join(root, name)
  await mkdir(target)
  return target
}

test('immutable publication outbox binds exact tarball identity', () => {
  const outbox = createPublicationOutbox(manifest)
  assert.doesNotThrow(() => validatePublicationOutbox(outbox, manifest))
  outbox.records[Object.keys(outbox.records)[0]].payload.sha256 = 'c'.repeat(64)
  assert.throws(() => validatePublicationOutbox(outbox, manifest), /publication outbox record/)
})

test('prepare persists PROCESSING intent before dispatch can publish', async () => {
  const intent = await directory('yakit-publish-intent-')
  const outbox = createPublicationOutbox(manifest)
  const result = await preparePublicationAttempt({
    manifest,
    outbox,
    outboxSha256: 'd'.repeat(64),
    stateDirectory: intent,
    priorArtifactInventory: inventory(),
    attemptId: '42:1',
    observe: async () => 'NOT_APPLIED',
    now,
  })
  assert.deepEqual(result.pending, ['@yakit-libs/yakit-ui'])
  const lifecycle = JSON.parse(await readFile(path.join(intent, 'lifecycle-snapshot.json'), 'utf8'))
  const inbox = JSON.parse(await readFile(path.join(intent, 'consumer-inbox.json'), 'utf8'))
  assert.equal(lifecycle.phase, 'INTENT')
  assert.equal(lifecycle.releases[0].publishStatus, 'publishing')
  assert.equal(Object.values(inbox.records)[0].status, 'PROCESSING')
})

test('dispatch consumes durable intent and writes a registry-confirmed receipt', async () => {
  const intent = await directory('yakit-publish-dispatch-intent-')
  const receipt = await directory('yakit-publish-dispatch-receipt-')
  const outbox = createPublicationOutbox(manifest)
  await preparePublicationAttempt({
    manifest,
    outbox,
    outboxSha256: 'e'.repeat(64),
    stateDirectory: intent,
    priorArtifactInventory: inventory(),
    attemptId: '42:1',
    observe: async () => 'NOT_APPLIED',
    now,
  })
  const observations = ['NOT_APPLIED', 'APPLIED']
  let publishes = 0
  const result = await dispatchPreparedPublication({
    manifest,
    outbox,
    outboxSha256: 'e'.repeat(64),
    intentDirectory: intent,
    receiptDirectory: receipt,
    intentArtifactIdentity: {
      id: '101',
      digest: `sha256:${'a'.repeat(64)}`,
    },
    observe: async () => observations.shift(),
    publish: async () => {
      publishes += 1
    },
    now: now + 1,
  })
  assert.equal(publishes, 1)
  assert.deepEqual(result.published, ['@yakit-libs/yakit-ui'])
  const lifecycle = JSON.parse(await readFile(path.join(receipt, 'lifecycle-snapshot.json'), 'utf8'))
  assert.equal(lifecycle.phase, 'RECEIPT')
  assert.equal(lifecycle.durableIntentArtifact.id, '101')
  assert.equal(lifecycle.releases[0].publishStatus, 'published')
})

test('missing receipt cannot authorize immediate replay from registry absence', async () => {
  const priorRoot = await directory('yakit-publish-missing-receipt-root-')
  const intentName = 'yakit-ui-publish-intent-42-1'
  const firstIntent = await artifactDirectory(priorRoot, intentName)
  const blockedIntent = await directory('yakit-publish-blocked-intent-')
  const outbox = createPublicationOutbox(manifest)
  await preparePublicationAttempt({
    manifest,
    outbox,
    outboxSha256: 'f'.repeat(64),
    stateDirectory: firstIntent,
    priorArtifactInventory: inventory(),
    attemptId: '42:1',
    observe: async () => 'NOT_APPLIED',
    now,
  })
  await assert.rejects(
    () =>
      preparePublicationAttempt({
        manifest,
        outbox,
        outboxSha256: 'f'.repeat(64),
        stateDirectory: blockedIntent,
        priorStateRoot: priorRoot,
        priorArtifactInventory: inventory([artifact('101', intentName, 'a')]),
        attemptId: '42:2',
        observe: async () => 'NOT_APPLIED',
        now: now + 60_000,
      }),
    /UNKNOWN because its durable success receipt is missing/,
  )
})

test('inventoried state must be downloaded exactly once with matching run identity', async () => {
  const priorRoot = await directory('yakit-publish-incomplete-root-')
  const nextIntent = await directory('yakit-publish-incomplete-intent-')
  const outbox = createPublicationOutbox(manifest)
  await assert.rejects(
    () =>
      preparePublicationAttempt({
        manifest,
        outbox,
        outboxSha256: '0'.repeat(64),
        stateDirectory: nextIntent,
        priorStateRoot: priorRoot,
        priorArtifactInventory: inventory([artifact('101', 'yakit-ui-recovery-intent-42-99-1', 'a', '99')]),
        attemptId: '100:1',
        observe: async () => 'NOT_APPLIED',
        now,
      }),
    /must contain exactly one lifecycle snapshot/,
  )
})

test('connection-lost AMBIGUOUS receipt can never authorize replay', async () => {
  const priorRoot = await directory('yakit-publish-ambiguous-root-')
  const intentName = 'yakit-ui-publish-intent-42-1'
  const receiptName = 'yakit-ui-publish-receipt-42-1'
  const intent = await artifactDirectory(priorRoot, intentName)
  const receipt = await artifactDirectory(priorRoot, receiptName)
  const unauthorizedRetry = await directory('yakit-publish-unauthorized-retry-')
  const operatorAuthorizedRetry = await directory('yakit-publish-operator-authorized-retry-')
  const outbox = createPublicationOutbox(manifest)
  await preparePublicationAttempt({
    manifest,
    outbox,
    outboxSha256: '1'.repeat(64),
    stateDirectory: intent,
    priorArtifactInventory: inventory(),
    attemptId: '42:1',
    observe: async () => 'NOT_APPLIED',
    now,
  })
  await assert.rejects(
    () =>
      dispatchPreparedPublication({
        manifest,
        outbox,
        outboxSha256: '1'.repeat(64),
        intentDirectory: intent,
        receiptDirectory: receipt,
        intentArtifactIdentity: {
          id: '101',
          digest: `sha256:${'a'.repeat(64)}`,
        },
        observe: async () => 'NOT_APPLIED',
        publish: async () => {
          throw new Error('connection lost after request')
        },
        now: now + 1,
      }),
    /publication outcome is ambiguous/,
  )
  const inbox = JSON.parse(await readFile(path.join(receipt, 'consumer-inbox.json'), 'utf8'))
  assert.equal(Object.values(inbox.records)[0].status, 'AMBIGUOUS')
  const priorInventory = inventory([artifact('101', intentName, 'a'), artifact('102', receiptName, 'b')])
  await assert.rejects(
    () =>
      preparePublicationAttempt({
        manifest,
        outbox,
        outboxSha256: '1'.repeat(64),
        stateDirectory: unauthorizedRetry,
        priorStateRoot: priorRoot,
        priorArtifactInventory: priorInventory,
        attemptId: '42:2',
        observe: async () => 'NOT_APPLIED',
        now: now + 60_000,
      }),
    /requires an explicit producer-authenticated retry decision/,
  )
  await assert.rejects(
    () =>
      preparePublicationAttempt({
        manifest,
        outbox,
        outboxSha256: '1'.repeat(64),
        stateDirectory: operatorAuthorizedRetry,
        priorStateRoot: priorRoot,
        priorArtifactInventory: priorInventory,
        retryAuthorizationRequest: {
          authorized: true,
          intentArtifactId: '101',
          receiptArtifactId: '102',
        },
        attemptId: '99:1',
        observe: async (release) => createRegistryAbsenceObservation(release, now + 60_000),
        now: now + 60_000,
      }),
    /AMBIGUOUS is never retry authority/,
  )

  const reconciledIntent = await directory('yakit-publish-registry-applied-reconciliation-')
  const reconciled = await preparePublicationAttempt({
    manifest,
    outbox,
    outboxSha256: '1'.repeat(64),
    stateDirectory: reconciledIntent,
    priorStateRoot: priorRoot,
    priorArtifactInventory: priorInventory,
    attemptId: '99:2',
    observe: async () => 'APPLIED',
    now: now + 60_000,
  })
  assert.deepEqual(reconciled, {
    pending: [],
    published: ['@yakit-libs/yakit-ui'],
  })
  const reconciledInbox = JSON.parse(await readFile(path.join(reconciledIntent, 'consumer-inbox.json'), 'utf8'))
  const reconciledLifecycle = JSON.parse(await readFile(path.join(reconciledIntent, 'lifecycle-snapshot.json'), 'utf8'))
  assert.equal(Object.values(reconciledInbox.records)[0].status, 'SUCCEEDED')
  assert.equal(Object.values(reconciledInbox.records)[0].observation, 'APPLIED')
  assert.equal(reconciledLifecycle.releases[0].publishStatus, 'published')
  assert.equal(reconciledLifecycle.releases[0].recoveryStatus, 'reconciled')

  const receiptInboxPath = path.join(receipt, 'consumer-inbox.json')
  const conflictedInbox = JSON.parse(await readFile(receiptInboxPath, 'utf8'))
  Object.values(conflictedInbox.records)[0].payloadHash = 'f'.repeat(64)
  await writeFile(receiptInboxPath, `${JSON.stringify(conflictedInbox, null, 2)}\n`)
  const conflictedIntent = await directory('yakit-publish-inbox-conflict-')
  await assert.rejects(
    () =>
      preparePublicationAttempt({
        manifest,
        outbox,
        outboxSha256: '1'.repeat(64),
        stateDirectory: conflictedIntent,
        priorStateRoot: priorRoot,
        priorArtifactInventory: priorInventory,
        attemptId: '99:3',
        observe: async () => 'APPLIED',
        now: now + 60_000,
      }),
    /inbox identity conflict/,
  )
})

test('exact private provenance incident evidence resolves ambiguous and unattempted packages once', async () => {
  const coupledManifest = structuredClone(manifest)
  coupledManifest.releases.push({
    name: '@yakit-libs/yakit-ui-icons',
    version: '2.0.0',
    identity: '@yakit-libs/yakit-ui-icons@2.0.0',
    distTag: 'latest',
    tarball: {
      filename: 'yakit-libs-yakit-ui-icons-2.0.0.tgz',
      sha256: 'c'.repeat(64),
      integrity: `sha512-${Buffer.from('icons fixture').toString('base64')}`,
      packedBytes: 45,
    },
  })
  const outbox = createPublicationOutbox(coupledManifest)
  const outboxSha256 = '3'.repeat(64)
  const priorRoot = await directory('yakit-private-provenance-root-')
  const intentName = 'yakit-ui-publish-intent-42-1'
  const receiptName = 'yakit-ui-publish-receipt-42-1'
  const intent = await artifactDirectory(priorRoot, intentName)
  const receipt = await artifactDirectory(priorRoot, receiptName)
  await preparePublicationAttempt({
    manifest: coupledManifest,
    outbox,
    outboxSha256,
    stateDirectory: intent,
    priorArtifactInventory: inventory(),
    attemptId: '42:1',
    observe: async () => 'NOT_APPLIED',
    now,
  })
  await assert.rejects(
    () =>
      dispatchPreparedPublication({
        manifest: coupledManifest,
        outbox,
        outboxSha256,
        intentDirectory: intent,
        receiptDirectory: receipt,
        intentArtifactIdentity: {
          id: '101',
          digest: `sha256:${'a'.repeat(64)}`,
        },
        observe: async () => 'NOT_APPLIED',
        publish: async () => {
          throw new Error('npm publish exact.tgz --provenance failed with E422')
        },
        now: now + 1,
      }),
    /publication outcome is ambiguous/,
  )
  const priorInventory = inventory([artifact('101', intentName, 'a'), artifact('102', receiptName, 'b')])
  const resolutionPayload = {
    schemaId: PRIVATE_PROVENANCE_REJECTION_SCHEMA,
    schemaVersion: 1,
    repository: {
      name: coupledManifest.repository,
      visibility: 'private',
    },
    sourceRunId: coupledManifest.runId,
    workflowCommitSha: coupledManifest.workflowCommitSha,
    rejectionObservedAt: new Date(now + 1).toISOString(),
    npmErrorCode: 'E422',
    failureReason: 'PRIVATE_SOURCE_REPOSITORY_PROVENANCE_UNSUPPORTED',
    failureReleaseIdentity: coupledManifest.releases[0].identity,
    releaseIdentities: coupledManifest.releases.map((release) => release.identity),
    resolvedOutcomes: Object.fromEntries(
      coupledManifest.releases.map((release, index) => [
        release.identity,
        index === 0 ? 'NOT_APPLIED' : 'NOT_ATTEMPTED',
      ]),
    ),
    logSha256: 'd'.repeat(64),
    sourceArtifactEvidence: {
      intent: {
        id: '101',
        digest: `sha256:${'a'.repeat(64)}`,
      },
      receipt: {
        id: '102',
        digest: `sha256:${'b'.repeat(64)}`,
      },
    },
  }
  const resolution = {
    ...resolutionPayload,
    evidenceHash: payloadHash(resolutionPayload),
  }
  const boundPayload = {
    schemaId: BOUND_PRIVATE_PROVENANCE_REJECTION_SCHEMA,
    schemaVersion: 1,
    resolution,
    resolutionSha256: 'e'.repeat(64),
    resolutionArtifact: {
      id: '900',
      digest: `sha256:${'f'.repeat(64)}`,
      workflowRunId: '99',
    },
  }
  const definitiveNoApplyEvidence = {
    ...boundPayload,
    evidenceHash: payloadHash(boundPayload),
  }
  const retry = await directory('yakit-private-provenance-retry-')
  const retryAt = now + 60_000
  const prepared = await preparePublicationAttempt({
    manifest: coupledManifest,
    outbox,
    outboxSha256,
    stateDirectory: retry,
    priorStateRoot: priorRoot,
    priorArtifactInventory: priorInventory,
    retryAuthorizationRequest: {
      authorized: true,
      definitiveNoApplyEvidence,
      intentArtifactId: '101',
      receiptArtifactId: '102',
    },
    attemptId: '99:1',
    observe: async (release) => createRegistryAbsenceObservation(release, retryAt),
    now: retryAt,
  })
  assert.deepEqual(
    prepared.pending,
    coupledManifest.releases.map((release) => release.name),
  )
  const lifecycle = JSON.parse(await readFile(path.join(retry, 'lifecycle-snapshot.json'), 'utf8'))
  assert.equal(lifecycle.authorizedRetryDecision.definitiveNoApplyEvidence.resolutionArtifact.id, '900')
})

test('definitely not attempted receipt needs fresh exact registry evidence', async () => {
  const priorRoot = await directory('yakit-publish-not-attempted-root-')
  const intentName = 'yakit-ui-publish-intent-42-1'
  const receiptName = 'yakit-ui-publish-receipt-42-1'
  const intent = await artifactDirectory(priorRoot, intentName)
  const receipt = await artifactDirectory(priorRoot, receiptName)
  const outbox = createPublicationOutbox(manifest)
  await preparePublicationAttempt({
    manifest,
    outbox,
    outboxSha256: '2'.repeat(64),
    stateDirectory: intent,
    priorArtifactInventory: inventory(),
    attemptId: '42:1',
    observe: async () => 'NOT_APPLIED',
    now,
  })
  await assert.rejects(
    () =>
      dispatchPreparedPublication({
        manifest,
        outbox,
        outboxSha256: '2'.repeat(64),
        intentDirectory: intent,
        receiptDirectory: receipt,
        intentArtifactIdentity: {
          id: '101',
          digest: `sha256:${'a'.repeat(64)}`,
        },
        observe: async () => 'NOT_APPLIED',
        publish: async () => {
          const error = new Error('npm process could not be started')
          error.publicationOutcome = 'NOT_ATTEMPTED'
          throw error
        },
        now,
      }),
    /publication was definitively not applied/,
  )
  const receiptInbox = JSON.parse(await readFile(path.join(receipt, 'consumer-inbox.json'), 'utf8'))
  assert.equal(Object.values(receiptInbox.records)[0].status, 'FAILED')
  assert.equal(Object.values(receiptInbox.records)[0].sideEffectOutcome, 'NOT_ATTEMPTED')
  const priorInventory = inventory([artifact('101', intentName, 'a'), artifact('102', receiptName, 'b')])
  const authorization = {
    authorized: true,
    intentArtifactId: '101',
    receiptArtifactId: '102',
  }

  const staleRetry = await directory('yakit-publish-stale-retry-')
  await assert.rejects(
    () =>
      preparePublicationAttempt({
        manifest,
        outbox,
        outboxSha256: '2'.repeat(64),
        stateDirectory: staleRetry,
        priorStateRoot: priorRoot,
        priorArtifactInventory: priorInventory,
        retryAuthorizationRequest: authorization,
        attemptId: '99:1',
        observe: async (release) => createRegistryAbsenceObservation(release, now + 60_000),
        now: now + 400_001,
      }),
    /registry absence evidence is stale/,
  )

  for (const [label, observation] of [
    ['missing', async () => 'NOT_APPLIED'],
    [
      'unknown',
      async (release) => {
        const { evidenceHash: _discarded, ...payload } = createRegistryAbsenceObservation(release, now + 60_000)
        payload.result = 'UNKNOWN'
        return { ...payload, evidenceHash: payloadHash(payload) }
      },
    ],
    [
      'mismatched',
      async (release) => {
        const { evidenceHash: _discarded, ...payload } = createRegistryAbsenceObservation(release, now + 60_000)
        payload.version = '9.9.9'
        return { ...payload, evidenceHash: payloadHash(payload) }
      },
    ],
  ]) {
    const invalidRetry = await directory(`yakit-publish-${label}-observation-retry-`)
    await assert.rejects(
      () =>
        preparePublicationAttempt({
          manifest,
          outbox,
          outboxSha256: '2'.repeat(64),
          stateDirectory: invalidRetry,
          priorStateRoot: priorRoot,
          priorArtifactInventory: priorInventory,
          retryAuthorizationRequest: authorization,
          attemptId: '99:1',
          observe: observation,
          now: now + 60_000,
        }),
      /registry absence evidence identity or hash is invalid/,
    )
  }

  const tamperedRetry = await directory('yakit-publish-tampered-retry-')
  await assert.rejects(
    () =>
      preparePublicationAttempt({
        manifest,
        outbox,
        outboxSha256: '2'.repeat(64),
        stateDirectory: tamperedRetry,
        priorStateRoot: priorRoot,
        priorArtifactInventory: priorInventory,
        retryAuthorizationRequest: authorization,
        attemptId: '99:1',
        observe: async (release) => ({
          ...createRegistryAbsenceObservation(release, now + 60_000),
          expectedSha256: 'f'.repeat(64),
        }),
        now: now + 60_000,
      }),
    /identity or hash is invalid/,
  )

  const authorizedRetry = await directory('yakit-publish-authorized-retry-')
  const authorized = await preparePublicationAttempt({
    manifest,
    outbox,
    outboxSha256: '2'.repeat(64),
    stateDirectory: authorizedRetry,
    priorStateRoot: priorRoot,
    priorArtifactInventory: priorInventory,
    retryAuthorizationRequest: authorization,
    attemptId: '99:1',
    observe: async (release) => createRegistryAbsenceObservation(release, now + 60_000),
    now: now + 60_000,
  })
  assert.deepEqual(authorized.pending, ['@yakit-libs/yakit-ui'])
  const lifecycle = JSON.parse(await readFile(path.join(authorizedRetry, 'lifecycle-snapshot.json'), 'utf8'))
  const decision = lifecycle.authorizedRetryDecision
  assert.equal(decision.priorAttemptId, '42:1')
  assert.match(decision.intentEvidence.lifecycleSha256, /^[0-9a-f]{64}$/)
  assert.match(decision.receiptEvidence.lifecycleSha256, /^[0-9a-f]{64}$/)
  assert.match(decision.registryAbsenceEvidence[0].evidenceHash, /^[0-9a-f]{64}$/)
  assert.equal(decision.registryAbsenceEvidence[0].packageName, '@yakit-libs/yakit-ui')
})

for (const becomesVisible of [true, false]) {
  test(`delayed registry confirmation ${becomesVisible ? 'succeeds' : 'stays ambiguous'} with only one publish request`, async () => {
    const intent = await directory('yakit-delayed-intent-')
    const receipt = await directory('yakit-delayed-receipt-')
    const outbox = createPublicationOutbox(manifest)
    const common = { manifest, outbox, outboxSha256: 'd'.repeat(64), now }
    await preparePublicationAttempt({
      ...common,
      stateDirectory: intent,
      priorArtifactInventory: inventory(),
      attemptId: '42:1',
      observe: async () => 'NOT_APPLIED',
    })
    let elapsed = 0
    let publishes = 0
    const dispatch = dispatchPreparedPublication({
      ...common,
      intentDirectory: intent,
      receiptDirectory: receipt,
      intentArtifactIdentity: { id: '1', digest: `sha256:${'a'.repeat(64)}` },
      observe: async () => 'NOT_APPLIED',
      observeAfterPublish: (release) =>
        waitForPublication({
          release,
          observe: async () => (becomesVisible && elapsed >= 180_000 ? 'APPLIED' : 'NOT_APPLIED'),
          now: () => elapsed,
          wait: async (delay) => {
            elapsed += delay
          },
          log: () => {},
        }),
      publish: async () => {
        publishes++
      },
    })
    if (becomesVisible) {
      assert.deepEqual((await dispatch).published, [manifest.releases[0].name])
    } else {
      await assert.rejects(dispatch, /publication outcome is ambiguous/)
      assert.equal(elapsed, 300_000)
    }
    assert.equal(publishes, 1)
    const inbox = JSON.parse(await readFile(path.join(receipt, 'consumer-inbox.json'), 'utf8'))
    const record = Object.values(inbox.records)[0]
    assert.equal(record.status, becomesVisible ? 'SUCCEEDED' : 'AMBIGUOUS')
    assert.equal(record.reconciled, becomesVisible)
  })
}

test('read-only APPLIED reconciliation closes an ambiguous receipt without a publication side effect', async () => {
  const root = await directory('yakit-applied-reconciliation-')
  const initial = await artifactDirectory(root, 'yakit-ui-publish-intent-42-1')
  const receipt = await artifactDirectory(root, 'yakit-ui-publish-receipt-42-1')
  const outbox = createPublicationOutbox(manifest)
  const common = { manifest, outbox, outboxSha256: 'd'.repeat(64), now }
  await preparePublicationAttempt({
    ...common,
    stateDirectory: initial,
    priorArtifactInventory: inventory(),
    attemptId: '42:1',
    observe: async () => 'NOT_APPLIED',
  })
  await assert.rejects(
    dispatchPreparedPublication({
      ...common,
      intentDirectory: initial,
      receiptDirectory: receipt,
      intentArtifactIdentity: { id: '1', digest: `sha256:${'a'.repeat(64)}` },
      observe: async () => 'NOT_APPLIED',
      observeAfterPublish: async () => 'UNKNOWN',
      publish: async () => {},
    }),
    /ambiguous/,
  )
  const priorArtifactInventory = inventory([
    artifact(1, 'yakit-ui-publish-intent-42-1', 'a'),
    artifact(2, 'yakit-ui-publish-receipt-42-1', 'b'),
  ])
  const recovered = await directory('yakit-reconciled-intent-')
  const result = await preparePublicationAttempt({
    ...common,
    stateDirectory: recovered,
    priorStateRoot: root,
    priorArtifactInventory,
    attemptId: '43:1',
    observe: async () => 'APPLIED',
  })
  assert.deepEqual(result.pending, [])
  const final = await directory('yakit-reconciled-receipt-')
  let publishes = 0
  await dispatchPreparedPublication({
    ...common,
    intentDirectory: recovered,
    receiptDirectory: final,
    intentArtifactIdentity: { id: '3', digest: `sha256:${'c'.repeat(64)}` },
    observe: async () => 'APPLIED',
    publish: async () => {
      publishes++
      throw new Error('forbidden')
    },
  })
  assert.equal(publishes, 0)
  const state = JSON.parse(await readFile(path.join(final, 'lifecycle-snapshot.json'), 'utf8'))
  const inbox = JSON.parse(await readFile(path.join(final, 'consumer-inbox.json'), 'utf8'))
  assert.equal(state.sourceRunId, '42')
  assert.equal(state.phase, 'RECEIPT')
  assert.equal(state.releases[0].publishStatus, 'published')
  assert.equal(Object.values(inbox.records)[0].status, 'SUCCEEDED')
})
