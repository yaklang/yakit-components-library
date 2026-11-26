#!/usr/bin/env node

import { appendFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { findPackageTarball } from './verify-pack-directory.mjs'
import { validateVerificationManifest } from './verification-manifest.mjs'

const root = path.resolve(import.meta.dirname, '../..')
const verifiedDirectory = path.join(root, '.release/verified')
const manifest = JSON.parse(await readFile(path.join(verifiedDirectory, 'verification-manifest.json'), 'utf8'))
const tarballPaths = Object.fromEntries(
  await Promise.all(manifest.releaseSet.map(async (name) => [name, await findPackageTarball(verifiedDirectory, name)])),
)
await validateVerificationManifest(manifest, {
  evidenceDirectory: verifiedDirectory,
  repository: process.env.GITHUB_REPOSITORY,
  workflowCommitSha: process.env.GITHUB_SHA,
  runId: process.env.GITHUB_RUN_ID,
  sourceRef: process.env.GITHUB_REF,
  packArtifactId: process.env.PACK_ARTIFACT_ID,
  expectedPackages: manifest.releaseSet,
  tarballPaths,
})

const primary = manifest.releases[0]
const outputs = {
  'commit-sha': manifest.workflowCommitSha,
  'release-set': JSON.stringify(manifest.releaseSet),
  'release-matrix': JSON.stringify({
    include: manifest.releases.map((entry) => ({
      package: entry.name,
      version: entry.version,
      distTag: entry.distTag,
      tag: entry.metadata.tag,
    })),
  }),
  'package-version': primary.version,
  'dist-tag': primary.distTag,
  'tag-name': primary.metadata.tag,
}
if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    Object.entries(outputs)
      .map(([name, value]) => `${name}=${value}`)
      .join('\n') + '\n',
  )
}
console.log(JSON.stringify(outputs, null, 2))
