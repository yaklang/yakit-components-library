import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { pnpmInvocation, run } from '../../scripts/process.mjs'

test('tool launch preserves paths with spaces and passes arguments without a shell', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'icon process space '))
  try {
    const cli = path.join(root, 'pnpm.cjs')
    const value = 'space & $value ; literal'
    await writeFile(cli, `if (process.argv[2] !== ${JSON.stringify(value)}) process.exit(3);`)
    await run(...pnpmInvocation([value], cli))
    assert.throws(() => pnpmInvocation([], ''), /pnpm/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
