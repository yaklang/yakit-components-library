import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(import.meta.dirname, '../..')
const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'))

function iconEntry(subpath: string) {
  return resolve(packageRoot, manifest.exports[subpath].import)
}

const forbiddenComponentDependencies = [
  'antd',
  '@ant-design/cssinjs',
  '@emotion/react',
  'react-dom',
  'classnames',
  '@yakit-libs/color',
] as const
function collectRelativeModuleGraph(entry: string) {
  const pending = [entry]
  const visited = new Set<string>()

  while (pending.length > 0) {
    const current = pending.pop()
    if (!current || visited.has(current)) continue
    visited.add(current)

    const source = readFileSync(current, 'utf8')
    for (const match of source.matchAll(/(?:from\s*|import\s*\(|export\s+\*\s+from\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
      const specifier = match[1]
      if (!specifier) continue
      const base = resolve(dirname(current), specifier)
      const candidate = [base, `${base}.js`, resolve(base, 'index.js')].find(
        (path) => existsSync(path) && statSync(path).isFile(),
      )
      expect(candidate, `relative import ${specifier} from ${current} must resolve`).toBeTruthy()
      if (candidate) pending.push(candidate)
    }
  }

  return [...visited]
}

describe('Built icon entry points', () => {
  it.each(['.', './outline', './solid', './colorful'])(
    '%s keeps component dependencies out and retains the default color fallback',
    (subpath) => {
      const graph = collectRelativeModuleGraph(iconEntry(subpath))
      const source = graph.map((file) => readFileSync(file, 'utf8')).join('\n')

      expect(graph.some((file) => file.replaceAll('\\', '/').includes('/components/'))).toBe(false)
      for (const dependency of forbiddenComponentDependencies) {
        expect(source, `${subpath} must not reference ${dependency}`).not.toContain(dependency)
      }
      expect(source).toContain('var(--Colors-Use-Neutral-Text-1-Title, #353639)')
    },
  )

  it('renders an overridden stroke width from the built root entry', async () => {
    const { HomeOutlined } = await import('@yakit-libs/yakit-ui-icons')
    const svg = renderToStaticMarkup(createElement(HomeOutlined, { svgProps: { strokeWidth: 3 } }))
    const widths = [...svg.matchAll(/\bstroke-width="([^"]+)"/g)].map((match) => match[1])
    expect(new Set(widths)).toEqual(new Set(['3']))
  })

  it.each([
    {
      name: 'HomeOutlined',
      subpath: '.',
      required: ['HomeOutlined'],
      excluded: ['AcademicCapOutlined', 'HomeSolid'],
    },
    {
      name: 'EdgeBrowserColorful',
      subpath: './colorful',
      required: ['EdgeBrowserColorful', 'useId'],
      excluded: ['ChromeBrowserColorful', 'MitmPrimaryMenuColorful'],
    },
  ])(
    'bundles only $name from $subpath within the single-icon budget',
    async ({ name, subpath, required, excluded }) => {
      const entry = iconEntry(subpath)
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        build: {
          lib: { entry, formats: ['es'] },
          minify: 'esbuild',
          write: false,
          rollupOptions: {
            external: (id) => id === 'react' || id.startsWith('react/'),
            input: 'virtual:single-icon-consumer',
            plugins: [
              {
                name: 'single-icon-consumer',
                resolveId(id) {
                  return id === 'virtual:single-icon-consumer' ? id : null
                },
                load(id) {
                  if (id !== 'virtual:single-icon-consumer') return null
                  return `export { ${name} } from ${JSON.stringify(entry)};`
                },
              },
            ],
          },
        },
      })
      const outputs = Array.isArray(result) ? result.flatMap(({ output }) => output) : result.output
      const code = outputs
        .filter((output) => output.type === 'chunk')
        .map((output) => output.code)
        .join('\n')

      expect(Buffer.byteLength(code)).toBeLessThanOrEqual(15_000)
      expect(gzipSync(code).byteLength).toBeLessThanOrEqual(5_000)
      for (const token of required) expect(code).toContain(token)
      for (const token of [...excluded, ...forbiddenComponentDependencies]) expect(code).not.toContain(token)
      expect(code).not.toMatch(/(?:outlineIconRegistry|solidIconRegistry|colorfulIconRegistry|iconRegistry)/)
    },
  )
})
