import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  findNodeNextIncompatibleSpecifiers,
  rewriteDeclarationSource,
} from '../../scripts/release/fix-declaration-imports.mjs'

test('declaration rewrite changes only relative module specifiers and is idempotent', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'yakit-declarations-'))
  t.after(() => rm(root, { force: true, recursive: true }))
  const declaration = path.join(root, 'index.d.ts')
  await mkdir(path.join(root, 'components', 'Input'), { recursive: true })
  await writeFile(path.join(root, 'components', 'Input', 'index.d.ts'), 'export {};\n')
  await writeFile(path.join(root, 'shared.d.ts'), 'export {};\n')

  const source = [
    "export * from './components/Input';",
    "export type { InputProps } from './components/Input';",
    "export type InputModule = typeof import('./components/Input');",
    "import shared = require('./shared');",
    "export type Route = './components/Input';",
    "export declare const route: './components/Input';",
    '',
  ].join('\n')
  const once = await rewriteDeclarationSource(declaration, source)
  const twice = await rewriteDeclarationSource(declaration, once)

  assert.match(once, /from '\.\/components\/Input\/index\.js'/)
  assert.match(once, /import\('\.\/components\/Input\/index\.js'\)/)
  assert.match(once, /require\('\.\/shared\.js'\)/)
  assert.match(once, /type Route = '\.\/components\/Input'/)
  assert.match(once, /const route: '\.\/components\/Input'/)
  assert.deepEqual(findNodeNextIncompatibleSpecifiers(declaration, source), [
    './components/Input',
    './components/Input',
    './components/Input',
    './shared',
  ])
  assert.deepEqual(findNodeNextIncompatibleSpecifiers(declaration, once), [])
  assert.equal(twice, once)
})
