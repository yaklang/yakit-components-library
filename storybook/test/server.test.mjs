import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { contentTypeFor, parseArgs, resolveAssetPath } from '../serve.mjs'

const staticRoot = () => realpathSync(mkdtempSync(join(tmpdir(), 'yakit-storybook-')))

test('launcher arguments default to loopback port 6006 without opening a browser', () => {
  assert.deepEqual(parseArgs([]), { host: '127.0.0.1', open: false, port: 6006 })
})

test('launcher arguments accept explicit host port and open options', () => {
  assert.deepEqual(parseArgs(['--host', 'localhost', '--port=7007', '--open']), {
    host: 'localhost',
    open: true,
    port: 7007,
  })
})

test('launcher arguments reject ports outside the TCP range', () => {
  assert.throws(() => parseArgs(['--port', '65536']), /port must be an integer/)
})

test('launcher arguments reject an option without its value', () => {
  assert.throws(() => parseArgs(['--host']), /requires a value/)
})

test('launcher arguments reject unknown options', () => {
  assert.throws(() => parseArgs(['--root', '/tmp']), /unknown option/)
})

test('launcher recognizes a symlinked entry path as the executable module', () => {
  const root = staticRoot()
  const launcher = join(root, 'storybook-launcher.mjs')
  symlinkSync(fileURLToPath(new URL('../serve.mjs', import.meta.url)), launcher)
  const result = spawnSync(process.execPath, [launcher, '--help'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Usage: node serve.mjs/)
})

test('asset resolver returns an existing static file', async () => {
  const root = staticRoot()
  mkdirSync(join(root, 'assets'))
  const file = join(root, 'assets', 'manager.js')
  writeFileSync(file, 'export {};')
  assert.deepEqual(await resolveAssetPath(root, '/assets/manager.js'), { file, status: 200 })
})

test('asset resolver falls back to index for a Storybook client route', async () => {
  const root = staticRoot()
  const index = join(root, 'index.html')
  writeFileSync(index, '<!doctype html>')
  assert.deepEqual(await resolveAssetPath(root, '/story/button--primary'), {
    file: index,
    status: 200,
  })
})

test('asset resolver rejects encoded traversal before reading a file', async () => {
  const root = staticRoot()
  assert.deepEqual(await resolveAssetPath(root, '/%2e%2e/package.json'), { status: 400 })
})

test('asset resolver rejects malformed URL encoding before reading a file', async () => {
  const root = staticRoot()
  assert.deepEqual(await resolveAssetPath(root, '/%E0%A4%A'), { status: 400 })
})

test('asset resolver rejects a symlink escaping the static root', async () => {
  const base = staticRoot()
  const root = join(base, 'static')
  mkdirSync(root)
  const outside = join(base, 'outside.txt')
  writeFileSync(outside, 'private')
  symlinkSync(outside, join(root, 'escape.txt'))
  assert.deepEqual(await resolveAssetPath(root, '/escape.txt'), { status: 403 })
})

test('asset resolver reports a missing file with an extension as not found', async () => {
  const root = staticRoot()
  assert.deepEqual(await resolveAssetPath(root, '/assets/missing.js'), { status: 404 })
})

test('content type resolver identifies Storybook JavaScript modules', () => {
  assert.equal(contentTypeFor('/static/preview.mjs'), 'text/javascript; charset=utf-8')
})

test('content type resolver uses a safe default for unknown files', () => {
  assert.equal(contentTypeFor('/static/blob.unknown'), 'application/octet-stream')
})
