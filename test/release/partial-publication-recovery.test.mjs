import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertRecoveryPlanAllowed,
  classifyPublicationState,
  primaryPackageNameForSchema,
} from '../../scripts/release/recover-partial-publication.mjs'

const artifacts = [
  { package: '@yakit-libs/yakit-ui', version: '0.2.0' },
  { package: '@yakit-libs/yakit-ui-icons', version: '0.2.0' },
]

test('recovery preserves the package identity encoded by each evidence schema', () => {
  assert.equal(primaryPackageNameForSchema(1), 'yakit-ui')
  assert.equal(primaryPackageNameForSchema(2), '@yakit-libs/yakit-ui')
  assert.equal(primaryPackageNameForSchema(3), '@yakit-libs/yakit-ui')
})

test('partial recovery selects only the missing exact verified package', () => {
  assert.deepEqual(
    classifyPublicationState(artifacts, {
      '@yakit-libs/yakit-ui': {
        distTagVersion: '0.2.0',
        expectedShasum: 'core-hash',
        shasum: 'core-hash',
        versionExists: true,
      },
      '@yakit-libs/yakit-ui-icons': {
        distTagVersion: null,
        expectedShasum: 'icons-hash',
        shasum: null,
        versionExists: false,
      },
    }),
    {
      missing: ['@yakit-libs/yakit-ui-icons'],
      published: ['@yakit-libs/yakit-ui'],
    },
  )
})

test('partial recovery may advance a dist-tag to a missing verified version', () => {
  assert.deepEqual(
    classifyPublicationState(artifacts, {
      '@yakit-libs/yakit-ui': {
        distTagVersion: '0.2.0',
        expectedShasum: 'core-hash',
        shasum: 'core-hash',
        versionExists: true,
      },
      '@yakit-libs/yakit-ui-icons': {
        distTagVersion: '0.1.0',
        expectedShasum: 'icons-hash',
        shasum: null,
        versionExists: false,
      },
    }),
    {
      missing: ['@yakit-libs/yakit-ui-icons'],
      published: ['@yakit-libs/yakit-ui'],
    },
  )
})

test('partial recovery rejects moving a dist-tag back to a missing version', () => {
  assert.throws(
    () =>
      classifyPublicationState(artifacts, {
        '@yakit-libs/yakit-ui': {
          distTagVersion: '0.2.0',
          expectedShasum: 'core-hash',
          shasum: 'core-hash',
          versionExists: true,
        },
        '@yakit-libs/yakit-ui-icons': {
          distTagVersion: '0.3.0',
          expectedShasum: 'icons-hash',
          shasum: null,
          versionExists: false,
        },
      }),
    /dist-tag cannot be moved backward/,
  )
})

test('partial recovery compares numeric prerelease identifiers numerically', () => {
  const prereleaseArtifacts = [artifacts[0], { package: '@yakit-libs/yakit-ui-icons', version: '1.0.0-beta.10' }]
  assert.deepEqual(
    classifyPublicationState(prereleaseArtifacts, {
      '@yakit-libs/yakit-ui': {
        distTagVersion: '0.2.0',
        expectedShasum: 'core-hash',
        shasum: 'core-hash',
        versionExists: true,
      },
      '@yakit-libs/yakit-ui-icons': {
        distTagVersion: '1.0.0-beta.2',
        expectedShasum: 'icons-hash',
        shasum: null,
        versionExists: false,
      },
    }),
    {
      missing: ['@yakit-libs/yakit-ui-icons'],
      published: ['@yakit-libs/yakit-ui'],
    },
  )
})

test('partial recovery does not replace a stable tag with a prerelease', () => {
  const prereleaseArtifacts = [artifacts[0], { package: '@yakit-libs/yakit-ui-icons', version: '1.0.0-rc.1' }]
  assert.throws(
    () =>
      classifyPublicationState(prereleaseArtifacts, {
        '@yakit-libs/yakit-ui': {
          distTagVersion: '0.2.0',
          expectedShasum: 'core-hash',
          shasum: 'core-hash',
          versionExists: true,
        },
        '@yakit-libs/yakit-ui-icons': {
          distTagVersion: '1.0.0',
          expectedShasum: 'icons-hash',
          shasum: null,
          versionExists: false,
        },
      }),
    /dist-tag cannot be moved backward/,
  )
})

test('legacy v1 evidence allows metadata recovery for an existing package', () => {
  assert.doesNotThrow(() =>
    assertRecoveryPlanAllowed(1, {
      missing: [],
      published: ['yakit-ui'],
    }),
  )
})

test('legacy v1 evidence cannot publish a missing package', () => {
  assert.throws(
    () =>
      assertRecoveryPlanAllowed(1, {
        missing: ['yakit-ui'],
        published: [],
      }),
    /schema-v1 evidence cannot initiate publication/,
  )
})

test('legacy v2 evidence cannot initiate a new publication', () => {
  assert.throws(
    () =>
      assertRecoveryPlanAllowed(2, {
        missing: ['@yakit-libs/yakit-ui-icons'],
        published: ['@yakit-libs/yakit-ui'],
      }),
    /schema-v2 evidence cannot initiate publication/,
  )
})

test('partial recovery never republishes already verified packages', () => {
  assert.deepEqual(
    classifyPublicationState(artifacts, {
      '@yakit-libs/yakit-ui': {
        distTagVersion: '0.2.0',
        expectedShasum: 'core-hash',
        shasum: 'core-hash',
        versionExists: true,
      },
      '@yakit-libs/yakit-ui-icons': {
        distTagVersion: '0.2.0',
        expectedShasum: 'icons-hash',
        shasum: 'icons-hash',
        versionExists: true,
      },
    }),
    {
      missing: [],
      published: ['@yakit-libs/yakit-ui', '@yakit-libs/yakit-ui-icons'],
    },
  )
})

test('partial recovery fails closed when an existing version has another tarball', () => {
  assert.throws(
    () =>
      classifyPublicationState(artifacts, {
        '@yakit-libs/yakit-ui': {
          distTagVersion: '0.2.0',
          expectedShasum: 'verified-core-hash',
          shasum: 'different-core-hash',
          versionExists: true,
        },
        '@yakit-libs/yakit-ui-icons': {
          distTagVersion: null,
          expectedShasum: 'icons-hash',
          shasum: null,
          versionExists: false,
        },
      }),
    /exists with a different tarball/,
  )
})

test('registry reconciliation binds npm SRI as well as the legacy shasum', () => {
  assert.throws(
    () =>
      classifyPublicationState([artifacts[0]], {
        '@yakit-libs/yakit-ui': {
          distTagVersion: '0.2.0',
          expectedIntegrity: 'sha512-expected',
          integrity: 'sha512-other',
          expectedShasum: 'core-hash',
          shasum: 'core-hash',
          versionExists: true,
        },
      }),
    /different registry integrity/,
  )
})

test('partial recovery fails closed when the verified dist-tag has moved', () => {
  assert.throws(
    () =>
      classifyPublicationState(artifacts, {
        '@yakit-libs/yakit-ui': {
          distTagVersion: '0.1.0',
          expectedShasum: 'core-hash',
          shasum: 'core-hash',
          versionExists: true,
        },
        '@yakit-libs/yakit-ui-icons': {
          distTagVersion: null,
          expectedShasum: 'icons-hash',
          shasum: null,
          versionExists: false,
        },
      }),
    /dist-tag does not match the verified version/,
  )
})

test('partial recovery handles independent package versions in deterministic order', () => {
  const independent = [
    { package: '@yakit-libs/yakit-ui', version: '1.2.3' },
    { package: '@yakit-libs/yakit-ui-icons', version: '2.0.0' },
  ]
  assert.deepEqual(
    classifyPublicationState(independent, {
      '@yakit-libs/yakit-ui': {
        versionExists: true,
        expectedShasum: 'ui',
        shasum: 'ui',
        distTagVersion: '1.2.3',
      },
      '@yakit-libs/yakit-ui-icons': {
        versionExists: false,
        expectedShasum: 'icons',
        shasum: null,
        distTagVersion: '1.9.0',
      },
    }),
    {
      missing: ['@yakit-libs/yakit-ui-icons'],
      published: ['@yakit-libs/yakit-ui'],
    },
  )
})

test('partial recovery fails closed on ambiguous registry state', () => {
  assert.throws(
    () =>
      classifyPublicationState([artifacts[0]], {
        '@yakit-libs/yakit-ui': { unknown: true },
      }),
    /ambiguous; reconciliation required/,
  )
})
