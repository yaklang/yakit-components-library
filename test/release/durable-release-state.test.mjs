import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  INBOX_STATES,
  assertPublishableArtifact,
  atomicWriteJsonCas,
  beginInboxOperation,
  createOutboxRecord,
  enqueueOutboxOperation,
  finishInboxOperation,
  payloadHash,
  readRevisionedJson,
} from '../../scripts/release/durable-release-state.mjs'

test('atomic state writes use revision-aware compare-and-swap', async () => {
  const file = path.join(await mkdtemp(path.join(tmpdir(), 'release-state-')), 'state.json')
  await atomicWriteJsonCas(file, 0, { value: 'first' })
  await assert.rejects(() => atomicWriteJsonCas(file, 0, { value: 'stale' }), /CAS revision mismatch/)
  assert.deepEqual(await readRevisionedJson(file), {
    value: 'first',
    revision: 1,
  })
})

test('concurrent CAS writers cannot both commit the same revision', async () => {
  const file = path.join(await mkdtemp(path.join(tmpdir(), 'release-cas-race-')), 'state.json')
  const results = await Promise.allSettled([
    atomicWriteJsonCas(file, 0, { writer: 'a' }),
    atomicWriteJsonCas(file, 0, { writer: 'b' }),
  ])
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1)
  assert.equal((await readRevisionedJson(file)).revision, 1)
})

test('durable inbox skips success and reconciles interrupted processing', async () => {
  const file = path.join(await mkdtemp(path.join(tmpdir(), 'release-inbox-')), 'inbox.json')
  const record = createOutboxRecord({
    operation: 'publish',
    packageName: '@yakit-libs/yakit-ui',
    version: '1.2.3',
  })
  assert.equal((await beginInboxOperation(file, record)).decision, 'EXECUTE')
  const processing = await readRevisionedJson(file)
  assert.equal(processing.records[record.idempotencyKey].payloadHash, record.payloadHash)
  assert.equal((await beginInboxOperation(file, record)).decision, 'RECONCILE_REQUIRED')
  await finishInboxOperation(file, record.idempotencyKey, {
    status: INBOX_STATES.AMBIGUOUS,
  })
  assert.equal((await beginInboxOperation(file, record)).decision, 'RECONCILE_REQUIRED')
})

test('transactional outbox persists idempotent intent and rejects identity conflicts', async () => {
  const file = path.join(await mkdtemp(path.join(tmpdir(), 'release-outbox-')), 'outbox.json')
  const record = createOutboxRecord({
    operation: 'publish',
    packageName: '@yakit-libs/yakit-ui-icons',
    version: '2.0.0',
    payload: { sha256: 'a' },
  })
  await enqueueOutboxOperation(file, record)
  await enqueueOutboxOperation(file, structuredClone(record))
  assert.equal(record.payloadHash, payloadHash({ sha256: 'a' }))
  await assert.rejects(
    () => enqueueOutboxOperation(file, { ...record, payload: { sha256: 'b' } }),
    /payload hash mismatch/,
  )
})

test('durable inbox quarantines an event id reused with another payload', async () => {
  const file = path.join(await mkdtemp(path.join(tmpdir(), 'release-inbox-conflict-')), 'inbox.json')
  const record = createOutboxRecord({
    operation: 'metadata',
    packageName: '@yakit-libs/yakit-ui',
    version: '1.2.3',
    payload: { tag: 'v1' },
  })
  await beginInboxOperation(file, record)
  const conflicting = createOutboxRecord({
    operation: 'metadata',
    packageName: '@yakit-libs/yakit-ui',
    version: '1.2.3',
    payload: { tag: 'v2' },
  })
  await assert.rejects(() => beginInboxOperation(file, conflicting), /inbox identity conflict/)
})

test('payload hash is key-order stable and rejects values JSON cannot preserve', () => {
  assert.equal(payloadHash({ a: 1, b: [true, null] }), payloadHash({ b: [true, null], a: 1 }))
  assert.throws(() => payloadHash({ value: undefined }), /only JSON values/)
  assert.throws(() => payloadHash({ value: Number.NaN }), /finite JSON numbers/)
  const cyclic = {}
  cyclic.self = cyclic
  assert.throws(() => payloadHash(cyclic), /must not be cyclic/)
})

test('impact probe artifacts can never enter publish or recovery', () => {
  assert.throws(() => assertPublishableArtifact({ kind: 'impact-probe', nonPublishable: true }), /non-publishable/)
  assert.doesNotThrow(() =>
    assertPublishableArtifact({
      releaseIdentity: '@yakit-libs/yakit-ui@1.2.3',
    }),
  )
})
