import { createHash } from 'node:crypto'
import { appendFileSync } from 'node:fs'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const PLAN_DIRECTORY_PREFIX = 'changeset-publish-plan-'
const PLAN_FILENAME = 'publish-plan.json'

function fail(message) {
  throw new Error(`PUBLISH_PLAN_TRANSPORT: ${message}`)
}

function validatePublishPlan(raw) {
  let document
  try {
    document = JSON.parse(raw)
  } catch {
    fail('publish plan is not valid JSON')
  }
  if (
    typeof document !== 'object' ||
    document === null ||
    !Number.isInteger(document.version) ||
    document.version < 1 ||
    !Array.isArray(document.plan) ||
    document.plan.length === 0
  ) {
    fail('publish plan must contain a positive version and non-empty plan')
  }
  return document
}

function sha256(raw) {
  return createHash('sha256').update(raw).digest('hex')
}

async function planCandidates(runnerTemp) {
  const entries = await readdir(runnerTemp, { withFileTypes: true })
  const candidates = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(PLAN_DIRECTORY_PREFIX)) continue
    const candidate = join(runnerTemp, entry.name, PLAN_FILENAME)
    try {
      const metadata = await stat(candidate)
      if (metadata.isFile()) candidates.push(candidate)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  return candidates.sort()
}

export async function exportPublishPlan(runnerTemp, outputFile) {
  if (!runnerTemp) fail('runner temp directory is required')
  if (!outputFile) fail('GITHUB_OUTPUT is required')
  const candidates = await planCandidates(resolve(runnerTemp))
  if (candidates.length !== 1) fail(`expected exactly one publish plan, found ${candidates.length}`)
  const raw = await readFile(candidates[0], 'utf8')
  validatePublishPlan(raw)
  const encoded = Buffer.from(raw, 'utf8').toString('base64')
  const digest = sha256(raw)
  appendFileSync(outputFile, `publish-plan-base64=${encoded}\n`)
  appendFileSync(outputFile, `publish-plan-sha256=${digest}\n`)
  return { digest, raw }
}

export async function restorePublishPlan(encoded, expectedDigest, outputPath) {
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) fail('publish plan output is not canonical base64')
  if (!/^[a-f0-9]{64}$/.test(expectedDigest ?? '')) fail('publish plan SHA-256 is invalid')
  const raw = Buffer.from(encoded, 'base64').toString('utf8')
  if (Buffer.from(raw, 'utf8').toString('base64') !== encoded) fail('publish plan output is not canonical base64')
  validatePublishPlan(raw)
  if (sha256(raw) !== expectedDigest) fail('publish plan SHA-256 mismatch')
  const destination = resolve(outputPath)
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, raw, { encoding: 'utf8', flag: 'wx' })
  return destination
}

async function main() {
  const [mode, path] = process.argv.slice(2)
  if (mode === 'export') {
    await exportPublishPlan(path, process.env.GITHUB_OUTPUT)
    return
  }
  if (mode === 'restore') {
    if (!path) fail('restore output path is required')
    await restorePublishPlan(process.env.PUBLISH_PLAN_BASE64, process.env.PUBLISH_PLAN_SHA256, path)
    return
  }
  fail('usage: publish-plan-job-output.mjs <export RUNNER_TEMP|restore OUTPUT>')
}

const invokedDirectly = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (invokedDirectly) await main()
