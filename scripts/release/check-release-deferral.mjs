#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { assertDeferredReleaseScope, validateDeferralPolicy } from './release-deferrals.mjs'

const root = path.resolve(import.meta.dirname, '../..')
const require = createRequire(import.meta.url)
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'))

export function verifyDeferralPlan({ policy, config, packages, versionPlan, publishPlan }) {
  validateDeferralPolicy(policy)
  for (const deferred of policy.deferred) {
    if (!config.ignore?.includes(deferred.package))
      throw new Error(`${deferred.package} must remain in Changesets ignore`)
    if (packages[deferred.package]?.version !== deferred.version)
      throw new Error(`${deferred.package} must remain at ${deferred.version}`)
  }
  for (const release of policy.releases)
    if (config.ignore?.includes(release.name)) throw new Error(`${release.name} must not be ignored`)

  if (publishPlan !== undefined) {
    if (publishPlan?.version !== 1 || !Array.isArray(publishPlan.plan))
      throw new Error('unsupported Changesets publish plan')
    const releases = publishPlan.plan.flat().filter((item) => item.kind === 'publish')
    assertDeferredReleaseScope(policy, releases)
    for (const release of releases)
      if (packages[release.name]?.version !== release.version)
        throw new Error(`${release.name} manifest differs from publish plan`)
    return { phase: 'publish', releases: policy.releases }
  }

  if (!Array.isArray(versionPlan?.releases)) throw new Error('unsupported Changesets version plan')
  const releases = versionPlan.releases
    .filter((item) => item.type !== 'none')
    .map((item) => ({ name: item.name, version: item.newVersion }))
  if (releases.length > 0) {
    assertDeferredReleaseScope(policy, releases)
    return { phase: 'version', releases }
  }
  // Version Packages has already consumed the Changesets. Keep checking the
  // manifests so the version PR and later main CI do not require a new Changeset.
  assertDeferredReleaseScope(
    policy,
    policy.releases.map(({ name }) => ({
      name,
      version: packages[name]?.version,
    })),
  )
  return { phase: 'versioned', releases: policy.releases }
}

export async function checkReleaseDeferral({ directory = root, publishPlan } = {}) {
  let policy
  try {
    policy = await readJson(path.join(directory, 'scripts/release/release-deferral-policy.json'))
  } catch (error) {
    if (error.code === 'ENOENT') return { phase: 'no-deferral' }
    throw error
  }
  validateDeferralPolicy(policy)
  const config = await readJson(path.join(directory, '.changeset/config.json'))
  const packages = {}
  for (const name of [policy.releases[0].name, policy.deferred[0].package])
    packages[name] = await readJson(path.join(directory, 'packages', name.split('/').at(-1), 'package.json'))
  for (const deferred of policy.deferred)
    if (!(await readFile(path.join(directory, deferred.followUpPath), 'utf8')).trim())
      throw new Error('deferred package follow-up record is empty')

  let versionPlan = { releases: [] }
  const changesets = await readdir(path.join(directory, '.changeset'))
  if (publishPlan === undefined && changesets.some((file) => file.endsWith('.md') && file !== 'README.md')) {
    const temporary = await mkdtemp(path.join(tmpdir(), 'yakit-deferral-plan-'))
    try {
      const output = path.join(temporary, 'plan.json')
      execFileSync(process.execPath, [require.resolve('@changesets/cli/bin.js'), 'status', '--output', output], {
        cwd: directory,
        stdio: 'pipe',
      })
      versionPlan = await readJson(output)
    } finally {
      await rm(temporary, { recursive: true, force: true })
    }
  }
  const result = verifyDeferralPlan({
    policy,
    config,
    packages,
    versionPlan,
    publishPlan,
  })
  // Scope follows the explicit release plan. Input fingerprints are generated
  // by publish impact verification, not maintained as developer approvals.
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const args = process.argv.slice(2)
  if (args.length !== 0 && (args.length !== 2 || args[0] !== '--publish-plan'))
    throw new Error('Usage: check-release-deferral.mjs [--publish-plan <file>]')
  const publishPlan = args.length ? await readJson(path.resolve(args[1])) : undefined
  console.log(JSON.stringify(await checkReleaseDeferral({ publishPlan }), null, 2))
}
