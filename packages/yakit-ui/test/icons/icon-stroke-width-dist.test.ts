import { resolve } from 'node:path'

import { chromium } from 'playwright'
import React, { type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { describe, expect, it } from 'vitest'

import { readIconInputSync } from '../../../yakit-ui-icons/scripts/icon-source-documents.mjs'
import { readOldiconAssets } from '../../../yakit-ui-icons/scripts/oldicon-assets.mjs'
import { colorful as colorfulSource } from '../../../yakit-ui-icons/test/helpers/sources'
import { outline as outlineSource } from '../../../yakit-ui-icons/test/helpers/sources'
import { solid as solidSource } from '../../../yakit-ui-icons/test/helpers/sources'
import { iconCounts, iconExports } from '../../../yakit-ui-icons/test/icons/icon-inventory'

const oldiconInventory = readOldiconAssets()

const packageRoot = resolve(import.meta.dirname, '../..')
const repositoryRoot = resolve(packageRoot, '../..')
const coreDist = resolve(packageRoot, 'dist')
const dedicatedDist = resolve(repositoryRoot, 'packages/yakit-ui-icons/dist')
const importBuilt = (path: string) => import(/* @vite-ignore */ path)
const builtPath = (root: string, path: string) => new URL(`file://${resolve(root, path)}`).href

const componentEntries = (module: Record<string, unknown>) =>
  Object.entries(module).filter(
    (entry): entry is [string, ComponentType] =>
      typeof entry[1] === 'function' || (typeof entry[1] === 'object' && entry[1] !== null && '$$typeof' in entry[1]),
  )

const expectDefaultWidthMarkup = (name: string, Component: ComponentType) => {
  const markup = renderToStaticMarkup(React.createElement(Component))
  expect(markup, name).toContain('<svg')
  const widths = [
    ...[...markup.matchAll(/\bstroke-width="([^"]+)"/g)].map((match) => match[1]),
    ...[...markup.matchAll(/\bstyle="[^"]*stroke-width:\s*([^;"\s]+)/g)].map((match) => match[1]),
  ]
  const solid = solidSource.records.find((record) => record.exportName === name.split(':').at(-1))
  if (solid) {
    const expected = [...solid.raw.svg.matchAll(/\bstroke-width="([^"]+)"/g)].map((match) => match[1])
    expect(widths, name).toEqual(expected)
    return
  }
  const exportName = name.split(':').at(-1)!
  if (!iconExports.outline.includes(exportName) && exportName !== 'Loading') {
    const colorful = colorfulSource.records.find((r) => r.exportName === exportName)
    const old = oldiconInventory.exports.find((r: { exportName: string }) => r.exportName === exportName)
    const file = colorful?.localFile ?? (old ? `oldicon/${old.assetFile}` : undefined)
    expect(file, name).toBeDefined()
    const source = readIconInputSync(resolve(repositoryRoot, 'packages/yakit-ui-icons/src', file!), 'utf8')
    expect(widths, name).toEqual([
      ...[...source.matchAll(/\bstroke-width="([^"]+)"/g)].map((match) => match[1]),
      ...[...source.matchAll(/\bstyle="[^"]*stroke-width:\s*([^;"\s]+)/g)].map((match) => match[1]),
    ])
    return
  }
  expect(
    widths.filter((width) => width !== '1.5'),
    name,
  ).toEqual([])
}

describe('Built icon stroke-width contract', () => {
  it('keeps both package roots and family compatibility entries aligned', async () => {
    const coreRoot = await importBuilt(builtPath(coreDist, 'index.js'))
    const coreIcons = await importBuilt(builtPath(coreDist, 'icons/index.js'))
    const dedicatedRoot = await importBuilt(builtPath(dedicatedDist, 'index.js'))
    const families = [
      ['outline', iconCounts.outline],
      ['solid', iconCounts.solid],
      ['colorful', iconCounts.colorful],
    ] as const

    expect(Object.keys(coreIcons)).toHaveLength(iconCounts.root)
    expect(Object.keys(coreIcons).sort()).toEqual([...iconExports.root].sort())
    expect(Object.keys(dedicatedRoot)).toEqual(Object.keys(coreIcons))
    expect(componentEntries(coreIcons)).toHaveLength(iconCounts.root)
    expect(componentEntries(dedicatedRoot)).toHaveLength(iconCounts.root)
    expectDefaultWidthMarkup('core-root:AcademicCapOutlined', coreRoot.AcademicCapOutlined)
    for (const [family, count] of families) {
      const core = await importBuilt(builtPath(coreDist, `icons/${family}/index.js`))
      const dedicated = await importBuilt(builtPath(dedicatedDist, `${family}/index.js`))
      expect(Object.keys(core), `core:${family}`).toHaveLength(count)
      expect(Object.keys(core).sort(), `core:${family}`).toEqual([...iconExports[family]].sort())
      expect(Object.keys(dedicated), `dedicated:${family}`).toEqual(Object.keys(core))
    }
    for (const [name, Component] of componentEntries(coreIcons)) {
      expectDefaultWidthMarkup(`core-icons:${name}`, Component)
    }
    for (const [name, Component] of componentEntries(dedicatedRoot)) {
      expectDefaultWidthMarkup(`dedicated-root:${name}`, Component)
    }
  })

  it('renders every dedicated Oldicon barrel and deep entry without CSS', async () => {
    const barrel = await importBuilt(builtPath(dedicatedDist, 'oldicon/index.js'))
    const exportNames = oldiconInventory.exports.map(({ exportName }) => exportName).sort()
    expect(Object.keys(barrel).sort()).toEqual(exportNames)

    for (const exportName of exportNames) {
      const Component = barrel[exportName] as ComponentType
      expectDefaultWidthMarkup(`oldicon-barrel:${exportName}`, Component)
      const deep = await importBuilt(builtPath(dedicatedDist, `oldicon/icons/${exportName}.js`))
      expect(Object.keys(deep)).toEqual([exportName])
      expectDefaultWidthMarkup(`oldicon-deep:${exportName}`, deep[exportName])
    }
  })

  it('renders representative built browser entries with their current source stroke widths', async () => {
    const modulePaths = [
      [coreDist, 'browser/icons/index.js', 'AcademicCapOutlined'],
      [coreDist, 'browser/icons/outline/index.js', 'AcademicCapOutlined'],
      [coreDist, 'browser/icons/solid/index.js', 'FloatingSolid'],
      [coreDist, 'browser/icons/colorful/index.js', 'BugOutlineColorful'],
      [dedicatedDist, 'browser/index.js', 'AcademicCapOutlined'],
      [dedicatedDist, 'browser/outline/index.js', 'AcademicCapOutlined'],
      [dedicatedDist, 'browser/solid/index.js', 'FloatingSolid'],
      [dedicatedDist, 'browser/colorful/index.js', 'BugOutlineColorful'],
      [dedicatedDist, 'browser/oldicon/index.js', 'RocketIcon'],
      [dedicatedDist, 'browser/oldicon/icons/RocketIcon.js', 'RocketIcon'],
    ].map(([root, path, exportName]) => {
      const outline = outlineSource.records.find((row) => row.exportName === exportName)
      const solid = solidSource.records.find((row) => row.exportName === exportName)
      const colorful = colorfulSource.records.find((row) => row.exportName === exportName)
      const old = oldiconInventory.exports.find((row: { exportName: string }) => row.exportName === exportName)
      const file = outline
        ? `outline/${outline.file}`
        : solid
          ? `solid/${solid.file}`
          : (colorful?.localFile ?? `oldicon/${old.assetFile}`)
      return {
        exportName,
        url: `/@fs${resolve(root, path)}`,
        svg: readIconInputSync(resolve(repositoryRoot, 'packages/yakit-ui-icons/src', file), 'utf8'),
      }
    })
    const html = `<!doctype html><div id="root"></div><script type="module">
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      const entries = ${JSON.stringify(modulePaths)};
      const modules = await Promise.all(entries.map(({ url }) => import(url)));
      const components = modules.map((module, index) => module[entries[index].exportName]);
      createRoot(document.getElementById('root')).render(
        React.createElement(React.Fragment, null, ...components.map((Component, index) =>
          React.createElement('div', { 'data-entry': index, key: index }, React.createElement(Component)))));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const widths = (host) => [...host.querySelectorAll('[stroke]')].map((node) => getComputedStyle(node).strokeWidth);
      window.__strokeResult = {
        entries: document.querySelectorAll('[data-entry]').length,
        pairs: entries.map((entry, index) => {
          const raw = document.createElement('div');
          raw.innerHTML = entry.svg;
          document.body.append(raw);
          const pair = { name: entry.exportName, actual: widths(document.querySelector('[data-entry="' + index + '"]')), expected: widths(raw) };
          raw.remove();
          return pair;
        }),
      };
    </script>`
    const server = await createServer({
      configFile: false,
      logLevel: 'silent',
      optimizeDeps: { include: ['react', 'react-dom/client'] },
      plugins: [
        {
          name: 'stroke-width-dist-fixture',
          configureServer(viteServer) {
            viteServer.middlewares.use('/stroke-width-dist.html', async (request, response) => {
              response.setHeader('Content-Type', 'text/html')
              response.end(await viteServer.transformIndexHtml(request.originalUrl ?? '/', html))
            })
          },
        },
      ],
      root: packageRoot,
      server: {
        fs: { allow: [repositoryRoot] },
        host: '127.0.0.1',
        port: 0,
        strictPort: false,
      },
    })
    await server.listen()
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    const browser = await chromium.launch({ executablePath, headless: true })
    try {
      const origin = server.resolvedUrls?.local[0]
      if (!origin) throw new Error('Vite dist fixture did not expose a local URL')
      const page = await browser.newPage({
        deviceScaleFactor: 1,
      })
      await page.goto(new URL('stroke-width-dist.html', origin).href)
      const result = await page.waitForFunction(() => window.__strokeResult).then((value) => value.jsonValue())
      expect(result.entries).toBe(modulePaths.length)
      expect(result.pairs.some((pair: { actual: string[] }) => pair.actual.length > 0)).toBe(true)
      for (const pair of result.pairs) expect(pair.actual, pair.name).toEqual(pair.expected)
    } finally {
      await browser.close()
      await server.close()
    }
  }, 30_000)
})
