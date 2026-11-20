import assert from 'node:assert/strict'
import test from 'node:test'

import { publicationConfirmationTimeout, waitForPublication } from '../../scripts/release/wait-for-publication.mjs'

const release = { identity: '@yakit-libs/yakit-ui-icons@0.3.1' }

function clock() {
  let elapsed = 0
  const waits = []
  return {
    now: () => elapsed,
    wait: async (delay) => {
      waits.push(delay)
      elapsed += delay
    },
    log: () => {},
    waits,
  }
}

test('confirmation has a separate five-minute budget from retry propagation', () => {
  assert.equal(publicationConfirmationTimeout({}), 300_000)
  assert.equal(
    publicationConfirmationTimeout({
      PUBLICATION_REGISTRY_PROPAGATION_WINDOW_MS: '30000',
    }),
    300_000,
  )
  assert.equal(
    publicationConfirmationTimeout({
      PUBLICATION_REGISTRY_CONFIRMATION_TIMEOUT_MS: '120000',
    }),
    120_000,
  )
  for (const value of ['', '0', '-1', 'NaN', 'Infinity', '1.5'])
    assert.throws(
      () =>
        publicationConfirmationTimeout({
          PUBLICATION_REGISTRY_CONFIRMATION_TIMEOUT_MS: value,
        }),
      /positive integer/,
    )
})

test('a publication visible after several minutes is confirmed', async () => {
  const timing = clock()
  const result = await waitForPublication({
    ...timing,
    release,
    observe: async (actual) => {
      assert.equal(actual, release)
      return timing.now() >= 180_000 ? 'APPLIED' : 'NOT_APPLIED'
    },
  })
  assert.equal(result, 'APPLIED')
  assert.ok(timing.now() >= 180_000 && timing.now() < 300_000)
  assert.ok(timing.waits.every((delay) => delay <= 15_000))
})

test('an already-visible publication returns without sleeping', async () => {
  const timing = clock()
  assert.equal(
    await waitForPublication({
      ...timing,
      release,
      observe: async () => 'APPLIED',
    }),
    'APPLIED',
  )
  assert.deepEqual(timing.waits, [])
})

test('the final observation runs at the deadline without oversleeping', async () => {
  for (const finalState of ['APPLIED', 'NOT_APPLIED', 'UNKNOWN']) {
    const timing = clock()
    assert.equal(
      await waitForPublication({
        ...timing,
        release,
        timeoutMs: 25_000,
        observe: async () => (timing.now() >= 25_000 ? finalState : 'NOT_APPLIED'),
      }),
      finalState,
    )
    assert.equal(timing.now(), 25_000)
  }
})

test('registry lookup duration counts against the polling budget', async () => {
  const timing = clock()
  let observations = 0
  assert.equal(
    await waitForPublication({
      ...timing,
      release,
      timeoutMs: 10_000,
      observe: async () => {
        observations++
        await timing.wait(10_000)
        return 'NOT_APPLIED'
      },
    }),
    'NOT_APPLIED',
  )
  assert.equal(observations, 1)
  assert.equal(timing.now(), 10_000)
})

test('integrity and registry errors are not treated as propagation delays', async () => {
  const timing = clock()
  const failure = new Error('exists with a different tarball')
  await assert.rejects(
    waitForPublication({
      ...timing,
      release,
      observe: async () => {
        throw failure
      },
    }),
    (error) => error === failure,
  )
  assert.deepEqual(timing.waits, [])
})
