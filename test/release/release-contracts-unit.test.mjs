import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertCredentialFree,
  assertSafePackEntries,
  contentTypeFor,
  resolveStaticAsset,
} from './helpers/release-contracts.mjs'

test('pack allowlist accepts public library files', () => {
  assert.deepEqual(assertSafePackEntries(['package/dist/index.js', 'package/package.json']), [
    'dist/index.js',
    'package.json',
  ])
})

test('pack allowlist rejects credential-bearing package paths', () => {
  assert.throws(() => assertSafePackEntries(['package/.npmrc']), /forbidden package paths/)
})

test('credential scanner rejects a token without disclosing its value', () => {
  const secret = `npm_${'A'.repeat(32)}`
  assert.throws(
    () => assertCredentialFree('fixture.txt', `value=${secret}`),
    (error) => error.message.includes('fixture.txt') && !error.message.includes(secret),
  )
})

test('static asset resolver keeps ordinary assets inside the static root', () => {
  assert.equal(resolveStaticAsset('/tmp/storybook-static', '/assets/index.js'), '/tmp/storybook-static/assets/index.js')
})

test('static asset resolver rejects plain path traversal', () => {
  assert.throws(() => resolveStaticAsset('/tmp/storybook-static', '/../package.json'), /traversal/)
})

test('static asset resolver rejects encoded path traversal', () => {
  assert.throws(() => resolveStaticAsset('/tmp/storybook-static', '/%2e%2e/package.json'), /traversal/)
})

test('static asset resolver rejects backslash path traversal', () => {
  assert.throws(() => resolveStaticAsset('/tmp/storybook-static', '/..\\package.json'), /traversal/)
})

test('static asset resolver rejects malformed URL encoding', () => {
  assert.throws(() => resolveStaticAsset('/tmp/storybook-static', '/%E0%A4%A'), /malformed/)
})

test('MIME resolver returns browser-safe JavaScript and font content types', () => {
  assert.equal(contentTypeFor('manager.js'), 'text/javascript; charset=utf-8')
  assert.equal(contentTypeFor('font.woff2'), 'font/woff2')
})

test('MIME resolver defaults unknown files to application/octet-stream', () => {
  assert.equal(contentTypeFor('asset.bin'), 'application/octet-stream')
})
