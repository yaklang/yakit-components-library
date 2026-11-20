import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

import { checkPrivateIcons } from '../../packages/yakit-ui/scripts/check-private-icons.mjs'

test('UI styles resolve the public icon CSS export without sibling source files', async () => {
  const require = createRequire(new URL('../../packages/yakit-ui/package.json', import.meta.url))
  const { build } = await import(pathToFileURL(require.resolve('vite')).href)
  const root = await mkdtemp(path.join(tmpdir(), 'yakit-ui-style-boundary-'))
  try {
    await cp(new URL('../../packages/yakit-ui/src/styles', import.meta.url), path.join(root, 'styles'), {
      recursive: true,
    })
    // Only the published CSS surface is available in this consumer, not icon source files.
    const icons = path.join(root, 'node_modules/@yakit-libs/yakit-ui-icons')
    await mkdir(path.join(icons, 'dist'), { recursive: true })
    await cp(new URL('../../packages/yakit-ui-icons/package.json', import.meta.url), path.join(icons, 'package.json'))
    await cp(new URL('../../packages/yakit-ui-icons/icon.css', import.meta.url), path.join(icons, 'dist/icon.css'))
    await writeFile(path.join(root, 'entry.js'), 'import "./styles/index.css";\n')
    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        cssMinify: false,
        lib: {
          entry: path.join(root, 'entry.js'),
          fileName: 'fixture',
          cssFileName: 'fixture',
          formats: ['es'],
        },
      },
    })
    const output = Array.isArray(result) ? result.flatMap((bundle) => bundle.output) : result.output
    const assets = output.filter((file) => file.type === 'asset' && file.fileName.endsWith('.css'))
    assert.equal(assets.length, 1)
    const css = String(assets[0].source)
    assert.match(css, /:where\(\.anticon\.yakit-icon\)/)
    assert.equal(css.match(/@keyframes yakitIconLoadingSpin_b1a35c158267/g)?.length, 1)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('private UI assets are checked independently and unknown assets fail', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yakit-private-icons-'))
  try {
    for (const folder of ['src/components', 'config/icon-sources'])
      await cp(new URL(`../../packages/yakit-ui/${folder}`, import.meta.url), path.join(root, folder), {
        recursive: true,
      })
    const source = JSON.parse(await readFile(path.join(root, 'config/icon-sources/private.json'), 'utf8'))
    assert.equal(await checkPrivateIcons(root), source.files.length)
    await writeFile(path.join(root, 'src/components/unregistered.svg'), '<svg/>')
    await assert.rejects(checkPrivateIcons(root), /PRIVATE_SVG_UNREGISTERED/)
    await rm(path.join(root, 'src/components/unregistered.svg'))
    await rm(path.join(root, 'src', source.files[0]))
    await assert.rejects(checkPrivateIcons(root), /PRIVATE_SVG_MISSING/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('UI forwards existing public icon entries and depends on the icon package', async () => {
  const read = async (file) => readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const ui = JSON.parse(await read('packages/yakit-ui/package.json'))
  assert.equal(ui.dependencies['@yakit-libs/yakit-ui-icons'], 'workspace:^')
  for (const family of ['', 'outline', 'solid', 'colorful']) {
    const source = await read(`packages/yakit-ui/src/icons/${family ? `${family}/` : ''}index.tsx`)
    assert.match(source, /export \* from ['"]@yakit-libs\/yakit-ui-icons/)
    assert.doesNotMatch(source, /\.svg|createIcon/)
  }
  const icons = JSON.parse(await read('packages/yakit-ui-icons/package.json'))
  assert.equal(icons.dependencies['@yakit-libs/yakit-ui'], undefined)
  assert.equal(icons.dependencies.antd, undefined)
})
