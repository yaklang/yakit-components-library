#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../..')
const workspaceRoots = ['apps', 'packages']
const expectedPublicPackages = ['@yakit-libs/yakit-ui', '@yakit-libs/yakit-ui-icons']
const failures = []
const packages = []

async function inspectPackage(directory) {
  const manifestPath = path.join(directory, 'package.json')
  let manifest
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }

  const relativePath = path.relative(root, manifestPath)
  const publishable = manifest.private !== true
  packages.push({
    name: manifest.name,
    path: relativePath,
    private: manifest.private === true,
  })

  if (publishable && !expectedPublicPackages.includes(manifest.name)) {
    failures.push(`${relativePath}: only ${expectedPublicPackages.join(' and ')} may be non-private`)
  }
  if (expectedPublicPackages.includes(manifest.name) && manifest.private === true) {
    failures.push(`${relativePath}: ${manifest.name} must remain publishable`)
  }

  const nestedLockfile = path.join(path.dirname(manifestPath), 'pnpm-lock.yaml')
  try {
    await readFile(nestedLockfile, 'utf8')
    failures.push(`${path.relative(root, nestedLockfile)}: nested workspace lockfiles are forbidden`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

for (const workspaceRoot of workspaceRoots) {
  const absoluteRoot = path.join(root, workspaceRoot)
  let entries
  try {
    entries = await readdir(absoluteRoot, { withFileTypes: true })
  } catch (error) {
    if (workspaceRoot === 'apps' && error?.code === 'ENOENT') continue
    throw error
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    await inspectPackage(path.join(absoluteRoot, entry.name))
  }
}

await inspectPackage(path.join(root, 'storybook'))

const publishableNames = packages.filter((item) => !item.private).map((item) => item.name)
if (JSON.stringify([...publishableNames].sort()) !== JSON.stringify([...expectedPublicPackages].sort())) {
  failures.push(
    `publishable workspace set must be exactly ${JSON.stringify(expectedPublicPackages)}, got ${JSON.stringify(publishableNames)}`,
  )
}

if (failures.length > 0) {
  console.error('Workspace publication boundary failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(JSON.stringify({ publishablePackages: publishableNames, workspacePackages: packages }, null, 2))
