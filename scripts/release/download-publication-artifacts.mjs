#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

function requiredEnvironment(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function defaultRequest(repository, artifact, token) {
  return fetch(`https://api.github.com/repos/${repository}/actions/artifacts/${encodeURIComponent(artifact.id)}/zip`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
    },
    redirect: 'follow',
  })
}

async function extractZip(bytes, artifact, outputRoot) {
  const zipPath = path.join(outputRoot, `.artifact-${artifact.id}.zip`)
  const target = path.join(outputRoot, artifact.name)
  await writeFile(zipPath, bytes, { flag: 'wx' })
  try {
    const entries = execFileSync('unzip', ['-Z1', zipPath], {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean)
    if (
      entries.length === 0 ||
      entries.some((entry) =>
        entry
          .replaceAll('\\', '/')
          .split('/')
          .some((part) => part === '..'),
      ) ||
      entries.some((entry) => path.isAbsolute(entry))
    )
      throw new Error(`publication artifact ${artifact.id} has unsafe paths`)
    await mkdir(target, { recursive: false })
    execFileSync('unzip', ['-q', zipPath, '-d', target], {
      stdio: 'inherit',
    })
  } finally {
    await rm(zipPath, { force: true })
  }
}

export async function downloadPublicationArtifacts({
  inventory,
  outputRoot,
  repository,
  token,
  request = defaultRequest,
  extract = extractZip,
}) {
  if (inventory?.schemaId !== 'yakit-ui-publication-artifact-inventory/v1' || !Array.isArray(inventory?.artifacts))
    throw new Error('publication artifact inventory is invalid')
  if (inventory.repository !== repository) throw new Error('publication artifact inventory repository mismatch')
  await mkdir(outputRoot, { recursive: true })
  for (const artifact of inventory.artifacts) {
    const response = await request(repository, artifact, token)
    if (!response.ok)
      throw new Error(`publication artifact ${artifact.id} download failed with HTTP ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`
    if (digest !== artifact.digest) throw new Error(`publication artifact ${artifact.id} digest mismatch`)
    await extract(bytes, artifact, outputRoot)
  }
  return { downloaded: inventory.artifacts.map((artifact) => artifact.id) }
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)

if (invokedDirectly) {
  const inventoryPath = path.resolve(process.argv[2] ?? '')
  const outputRoot = path.resolve(process.argv[3] ?? '')
  if (!process.argv[2] || !process.argv[3])
    throw new Error('Usage: download-publication-artifacts.mjs <inventory-json> <output-root>')
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'))
  const result = await downloadPublicationArtifacts({
    inventory,
    outputRoot,
    repository: requiredEnvironment('GITHUB_REPOSITORY'),
    token: requiredEnvironment('GITHUB_TOKEN'),
  })
  console.log(JSON.stringify(result, null, 2))
}
