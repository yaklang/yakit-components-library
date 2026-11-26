import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('icons package build enables the shared createIcon pure annotation transform', async () => {
  const config = await readFile('packages/yakit-ui-icons/vite.config.ts', 'utf8')
  const transform = await readFile('packages/yakit-ui-icons/config/svgReactTransform.ts', 'utf8')
  assert.match(config, /createIconPureAnnotationPlugin\(\)/)
  assert.match(transform, /\/\* @__PURE__ \*\/ createIcon\(/)
  assert.match(transform, /icons\[\/\\\\\]/)
  assert.match(transform, /oldicon\[\/\\\\\]icons/)
})
