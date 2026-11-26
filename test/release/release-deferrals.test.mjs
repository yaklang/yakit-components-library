import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  buildDeferredImpact,
  hashDeferralPolicy,
  validateDeferredImpact,
  verifyDeferredRegistryBaseline,
} from '../../scripts/release/release-deferrals.mjs'

const UI = '@yakit-libs/yakit-ui'
const ICONS = '@yakit-libs/yakit-ui-icons'
const hash = (character) => character.repeat(64)
const revision = 'a'.repeat(40)

function policy() {
  return {
    schemaId: 'yakit-ui-release-deferral/v1',
    releases: [{ name: ICONS, version: '0.2.4' }],
    deferred: [
      {
        package: UI,
        version: '0.2.3',
        baseRevision: revision,
        headSourceHash: hash('2'),
        headLockHash: hash('4'),
        headToolchainHash: hash('6'),
        headConfigHash: hash('8'),
        reason: 'The UI package release follows its independent review path.',
        followUpPath: 'docs/releases/yakit-ui-follow-up.md',
        distTag: 'latest',
        integrity: 'sha512-Zml4dHVyZQ==',
        sha256: hash('d'),
      },
    ],
  }
}

function probe() {
  return {
    package: UI,
    kind: 'impact-probe',
    nonPublishable: true,
    baseRevision: revision,
    headRevision: 'b'.repeat(40),
    sourceHash: hash('1'),
    baseSourceHash: hash('0'),
    headSourceHash: hash('2'),
    lockHash: hash('3'),
    baseLockHash: hash('0'),
    headLockHash: hash('4'),
    toolchainHash: hash('5'),
    baseToolchainHash: hash('0'),
    headToolchainHash: hash('6'),
    configHash: hash('7'),
    baseConfigHash: hash('0'),
    headConfigHash: hash('8'),
    snapshotHash: hash('9'),
    toolchainIdentityHash: hash('a'),
    packageSnapshotHashes: { base: hash('b'), head: hash('c') },
    toolchainIdentity: {
      node: 'v24.12.0',
      pnpm: '10.34.5',
      os: { platform: 'linux', release: 'fixture', arch: 'x64' },
    },
  }
}

function evidence() {
  return buildDeferredImpact(policy(), [probe()])
}

test('builds and validates exact version-bound deferred impact evidence', () => {
  const value = evidence()
  assert.equal(
    validateDeferredImpact(value, {
      releases: [
        {
          name: ICONS,
          version: '0.2.4',
          distTag: 'latest',
          tarball: { filename: 'icons.tgz' },
        },
      ],
      compatibilityBaselineSet: [
        {
          package: UI,
          version: '0.2.3',
          distTag: 'latest',
          integrity: 'sha512-Zml4dHVyZQ==',
          sha256: hash('d'),
          filename: 'baseline-ui.tgz',
        },
      ],
      headRevision: 'b'.repeat(40),
    }),
    value,
  )
})

test('policy hashing is stable across recursive object key order', () => {
  const original = policy()
  const reordered = {
    deferred: [
      {
        reason: original.deferred[0].reason,
        version: original.deferred[0].version,
        package: original.deferred[0].package,
        followUpPath: original.deferred[0].followUpPath,
        sha256: original.deferred[0].sha256,
        integrity: original.deferred[0].integrity,
        distTag: original.deferred[0].distTag,
        headConfigHash: original.deferred[0].headConfigHash,
        headToolchainHash: original.deferred[0].headToolchainHash,
        headLockHash: original.deferred[0].headLockHash,
        headSourceHash: original.deferred[0].headSourceHash,
        baseRevision: original.deferred[0].baseRevision,
      },
    ],
    releases: [{ version: '0.2.4', name: ICONS }],
    schemaId: original.schemaId,
  }
  assert.equal(hashDeferralPolicy(original), hashDeferralPolicy(reordered))
})

test('fails closed for missing or fabricated evidence fields', () => {
  assert.throws(() => validateDeferredImpact(null), /must be an object/)
  assert.throws(() => validateDeferredImpact({ ...evidence(), approved: true }), /unsupported or missing fields/)
  assert.throws(
    () =>
      validateDeferredImpact({
        ...evidence(),
        policy: { ...policy(), approval: 'fabricated' },
      }),
    /unsupported or missing fields/,
  )
})

test('rejects tampered policy hash and source bindings', () => {
  assert.throws(() => validateDeferredImpact({ ...evidence(), policySha256: hash('f') }), /policy hash mismatch/)
  const sourceDrift = probe()
  sourceDrift.headSourceHash = hash('d')
  assert.throws(() => validateDeferredImpact(buildEvidence(policy(), [sourceDrift])), /headSourceHash mismatch/)
})

test('rejects unknown, overlapping, duplicate, and incomplete package sets', () => {
  const unknown = policy()
  unknown.deferred[0].package = '@example/unknown'
  assert.throws(() => buildDeferredImpact(unknown, [probe()]), /unsupported/)

  const overlap = policy()
  overlap.deferred[0].package = ICONS
  assert.throws(() => buildDeferredImpact(overlap, [probe()]), /cover all/)

  const extraRelease = policy()
  extraRelease.releases.push({ name: UI, version: '0.2.3' })
  assert.throws(() => buildDeferredImpact(extraRelease, [probe()]), /exactly one release/)
})

test('rejects invalid versions, revisions, hashes, and follow-up paths', () => {
  for (const mutate of [
    (value) => (value.releases[0].version = 'v0.2.4'),
    (value) => (value.deferred[0].version = 'latest'),
    (value) => (value.deferred[0].baseRevision = 'HEAD'),
    (value) => (value.deferred[0].headLockHash = 'short'),
    (value) => (value.deferred[0].followUpPath = '../follow-up.md'),
    (value) => (value.deferred[0].distTag = 'next'),
    (value) => (value.deferred[0].integrity = 'sha256-bad'),
    (value) => (value.deferred[0].sha256 = 'short'),
  ]) {
    const invalid = policy()
    mutate(invalid)
    assert.throws(() => buildDeferredImpact(invalid, [probe()]))
  }
})

test('rejects extra, wrong-package, and publishable deferred probes', () => {
  assert.throws(() => buildDeferredImpact(policy(), [probe(), probe()]), /exactly one impact probe/)
  const wrongPackage = probe()
  wrongPackage.package = ICONS
  assert.throws(() => buildDeferredImpact(policy(), [wrongPackage]), /package mismatch/)
  const publishable = { ...probe(), tarball: 'candidate.tgz' }
  assert.throws(() => buildDeferredImpact(policy(), [publishable]), /publishable artifact fields/)
  for (const field of ['integrity', 'recovery']) {
    const contaminated = { ...probe(), [field]: 'forbidden' }
    assert.throws(() => buildDeferredImpact(policy(), [contaminated]), /artifact or recovery fields/)
  }
})

test('rejects wrong release, baseline, and head revision contexts', () => {
  const value = evidence()
  assert.throws(
    () =>
      validateDeferredImpact(value, {
        releases: [{ name: ICONS, version: '0.2.5' }],
      }),
    /release context/,
  )
  assert.throws(
    () =>
      validateDeferredImpact(value, {
        compatibilityBaselineSet: [
          {
            package: UI,
            version: '0.2.2',
            distTag: 'latest',
            integrity: 'sha512-Zml4dHVyZQ==',
            sha256: hash('d'),
          },
        ],
      }),
    /baseline context/,
  )
  assert.throws(
    () =>
      validateDeferredImpact(value, {
        compatibilityBaselineSet: [
          {
            package: UI,
            version: '0.2.3',
            distTag: 'latest',
            integrity: 'sha512-Zml4dHVyZQ==',
            sha256: hash('d'),
          },
          { package: ICONS, version: '0.2.4' },
        ],
      }),
    /exactly one counterpart/,
  )
  assert.throws(() => validateDeferredImpact(value, { headRevision: 'c'.repeat(40) }), /headRevision mismatch/)

  for (const [field, replacement] of [
    ['distTag', 'next'],
    ['integrity', 'sha512-dGFtcGVyZWQ='],
    ['sha256', hash('e')],
  ]) {
    assert.throws(
      () =>
        validateDeferredImpact(value, {
          compatibilityBaselineSet: [
            {
              package: UI,
              version: '0.2.3',
              distTag: 'latest',
              integrity: 'sha512-Zml4dHVyZQ==',
              sha256: hash('d'),
              [field]: replacement,
            },
          ],
        }),
      /baseline context/,
    )
  }
})

test('rejects incomplete runtime and snapshot probe identities', () => {
  const noRuntime = probe()
  delete noRuntime.toolchainIdentity.os.arch
  assert.throws(() => buildDeferredImpact(policy(), [noRuntime]), /runtime identity is incomplete/)
  const noSnapshot = probe()
  noSnapshot.packageSnapshotHashes.head = 'bad'
  assert.throws(() => buildDeferredImpact(policy(), [noSnapshot]), /runtime identity is incomplete/)
})

function buildEvidence(deferralPolicy, probes) {
  return {
    policy: deferralPolicy,
    policySha256: hashDeferralPolicy(deferralPolicy),
    probes,
  }
}

function registryFixture() {
  const bytes = Buffer.from('reviewed yakit-ui baseline')
  const value = policy()
  value.deferred[0].sha256 = createHash('sha256').update(bytes).digest('hex')
  value.deferred[0].integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`
  const tarball = 'https://registry.npmjs.org/@yakit-libs/yakit-ui/-/yakit-ui-0.2.3.tgz'
  const metadata = {
    'dist-tags': { latest: '0.2.3' },
    versions: {
      '0.2.3': {
        name: UI,
        version: '0.2.3',
        dist: { integrity: value.deferred[0].integrity, tarball },
      },
    },
  }
  return { bytes, metadata, policy: value, tarball }
}

function registryFetch(fixture, { metadataOk = true, tarballOk = true } = {}) {
  const calls = []
  const fetch = async (url) => {
    calls.push(url)
    if (url === fixture.tarball)
      return {
        ok: tarballOk,
        arrayBuffer: async () => fixture.bytes,
      }
    return {
      ok: metadataOk,
      json: async () => fixture.metadata,
    }
  }
  return { calls, fetch }
}

test('verifies the deferred baseline against exact public registry bytes', async () => {
  const fixture = registryFixture()
  const mock = registryFetch(fixture)
  assert.deepEqual(
    await verifyDeferredRegistryBaseline(fixture.policy, { name: ICONS, version: '0.2.4' }, mock.fetch),
    [
      {
        package: UI,
        version: '0.2.3',
        distTag: 'latest',
        integrity: fixture.policy.deferred[0].integrity,
        sha256: fixture.policy.deferred[0].sha256,
      },
    ],
  )
  assert.deepEqual(mock.calls, [`https://registry.npmjs.org/${encodeURIComponent(UI)}`, fixture.tarball])
})

test('registry verification rejects latest drift, altered bytes, and failed requests', async () => {
  const latestDrift = registryFixture()
  latestDrift.metadata['dist-tags'].latest = '0.2.4'
  await assert.rejects(
    verifyDeferredRegistryBaseline(
      latestDrift.policy,
      { name: ICONS, version: '0.2.4' },
      registryFetch(latestDrift).fetch,
    ),
    /latest version changed/,
  )

  const altered = registryFixture()
  altered.bytes = Buffer.from('tampered baseline')
  await assert.rejects(
    verifyDeferredRegistryBaseline(altered.policy, { name: ICONS, version: '0.2.4' }, registryFetch(altered).fetch),
    /tarball digest mismatch/,
  )

  for (const options of [{ metadataOk: false }, { tarballOk: false }]) {
    const failure = registryFixture()
    await assert.rejects(
      verifyDeferredRegistryBaseline(
        failure.policy,
        { name: ICONS, version: '0.2.4' },
        registryFetch(failure, options).fetch,
      ),
      /request failed/,
    )
  }
})

test('non-matching release identities do not apply or fetch historical policy', async () => {
  let called = false
  const result = await verifyDeferredRegistryBaseline(policy(), { name: ICONS, version: '0.2.5' }, async () => {
    called = true
    throw new Error('must not fetch')
  })
  assert.deepEqual(result, [])
  assert.equal(called, false)
})

function intentPolicy() {
  const value = policy()
  value.schemaId = 'yakit-ui-release-deferral/v2'
  for (const field of ['headSourceHash', 'headLockHash', 'headToolchainHash', 'headConfigHash'])
    delete value.deferred[0][field]
  return value
}

test('v2 records generated fingerprints without requiring policy updates', () => {
  const intent = intentPolicy()
  const changed = probe()
  changed.headSourceHash = hash('e')
  const value = buildDeferredImpact(intent, [changed])
  assert.equal(
    validateDeferredImpact(value, {
      releases: intent.releases,
      headRevision: changed.headRevision,
    }),
    value,
  )
  assert.throws(
    () =>
      validateDeferredImpact(value, {
        releases: [{ name: UI, version: '0.2.3' }],
      }),
    /release context/,
  )
  assert.throws(() => validateDeferredImpact({ ...value, policySha256: hash('f') }), /policy hash mismatch/)
  assert.throws(() => buildDeferredImpact(intent, [{ ...changed, headSourceHash: 'short' }]), /incomplete/)
  assert.throws(() => buildDeferredImpact(intent, [{ ...changed, tarball: 'ui.tgz' }]), /publishable artifact fields/)
  const stale = intentPolicy()
  stale.deferred[0].headSourceHash = hash('e')
  assert.throws(() => buildDeferredImpact(stale, [changed]), /unsupported or missing fields/)
})
