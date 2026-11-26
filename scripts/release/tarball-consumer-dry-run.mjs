#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

const execute = promisify(execFile)
const root = path.resolve(import.meta.dirname, '../..')
const packageDirectory = path.join(root, 'packages/yakit-ui')
const iconsPackageDirectory = path.join(root, 'packages/yakit-ui-icons')

function credentialFreeEnvironment() {
  const environment = { ...process.env }
  for (const name of Object.keys(environment)) {
    if (/token|auth|userconfig|globalconfig/i.test(name)) delete environment[name]
  }
  environment.npm_config_audit = 'false'
  environment.npm_config_fund = 'false'
  environment.npm_config_registry = 'https://registry.npmjs.org/'
  environment.npm_config_ignore_scripts = 'true'
  return environment
}

const packDirectory = await mkdtemp(path.join(tmpdir(), 'yakit-ui-pack-dry-run-'))
try {
  await execute(process.execPath, ['scripts/release/verify-package.mjs'], {
    cwd: packageDirectory,
    env: credentialFreeEnvironment(),
  })
  await execute('pnpm', ['pack', '--json', '--pack-destination', packDirectory], {
    cwd: packageDirectory,
    env: credentialFreeEnvironment(),
    maxBuffer: 16 * 1024 * 1024,
  })
  await execute('pnpm', ['pack', '--json', '--pack-destination', packDirectory], {
    cwd: iconsPackageDirectory,
    env: credentialFreeEnvironment(),
    maxBuffer: 16 * 1024 * 1024,
  })
  const { stdout } = await execute(
    process.execPath,
    [path.join(root, 'scripts/release/verify-tarball-consumer.mjs'), packDirectory],
    {
      cwd: root,
      env: credentialFreeEnvironment(),
      maxBuffer: 16 * 1024 * 1024,
    },
  )
  process.stdout.write(stdout)
} finally {
  await rm(packDirectory, { force: true, recursive: true })
}
