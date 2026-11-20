#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../..')
const configPath = path.join(root, '.changeset/config.json')
const preStatePath = path.join(root, '.changeset/pre.json')
const config = JSON.parse(await readFile(configPath, 'utf8'))

function currentBranch() {
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME
  return execFileSync('git', ['branch', '--show-current'], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
}

async function readPreState() {
  try {
    return JSON.parse(await readFile(preStatePath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

const branch = currentBranch()
const preState = await readPreState()
const failures = []

if (branch === 'main') {
  if (config.baseBranch !== 'main') failures.push(`main requires changesets baseBranch=main, got ${config.baseBranch}`)
  if (preState) failures.push('main must not contain .changeset/pre.json')
} else if (branch.startsWith('pre/')) {
  const tag = branch.slice('pre/'.length)
  if (!tag || tag.includes('/')) failures.push(`prerelease branch must be pre/<tag>, got ${branch}`)
  if (!preState) {
    failures.push(`${branch} must commit pnpm changeset pre enter ${tag} state`)
  } else {
    if (preState.mode !== 'pre') failures.push(`pre.json mode must be pre, got ${preState.mode}`)
    if (preState.tag !== tag) failures.push(`pre.json tag ${preState.tag} does not match branch tag ${tag}`)
  }
  if (config.baseBranch !== branch)
    failures.push(`${branch} requires changesets baseBranch=${branch}, got ${config.baseBranch}`)
} else if (process.argv.includes('--allow-feature')) {
  console.log(JSON.stringify({ branch, mode: 'feature-no-publish' }, null, 2))
  process.exit(0)
} else {
  failures.push(`release workflow only accepts main or prepared pre/<tag>, got ${branch}`)
}

if (failures.length > 0) {
  console.error('Release state validation failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  JSON.stringify(
    {
      branch,
      mode: branch === 'main' ? 'stable' : 'prerelease',
      tag: preState?.tag ?? 'latest',
    },
    null,
    2,
  ),
)
