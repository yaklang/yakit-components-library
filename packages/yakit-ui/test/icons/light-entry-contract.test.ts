import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

import React from 'react'
import { renderToString } from 'react-dom/server'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

const packageRoot = process.cwd()
const require = createRequire(import.meta.url)
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
  exports: Record<string, string | { import?: string; types?: string }>
}

const lightSubpaths = ['./icons', './icons/outline', './icons/solid', './icons/colorful'] as const
const forbiddenRuntimeReferences = [
  'antd',
  '@ant-design/cssinjs',
  '@emotion/react',
  'react-dom',
  'classnames',
  '@yakit-libs/color',
] as const

function exportTarget(subpath: string, condition: 'import' | 'types') {
  const declaration = packageJson.exports[subpath]
  const target = typeof declaration === 'string' ? declaration : declaration?.[condition]
  expect(target, `${subpath} must declare an ${condition} target`).toBeTypeOf('string')
  return resolve(packageRoot, target as string)
}

function collectRelativeModuleGraph(entry: string) {
  const pending = [entry]
  const visited = new Set<string>()

  while (pending.length > 0) {
    const current = pending.pop()
    if (!current || visited.has(current)) continue
    visited.add(current)

    const source = readFileSync(current, 'utf8')
    const relativeImports = source.matchAll(/(?:from\s*|import\s*\(|export\s+\*\s+from\s*)["'](\.{1,2}\/[^"']+)["']/g)
    for (const match of relativeImports) {
      const specifier = match[1]
      if (!specifier) continue
      const base = resolve(dirname(current), specifier)
      const declarationCandidates = current.endsWith('.d.ts')
        ? [base.replace(/\.js$/, '.d.ts'), `${base}.d.ts`, resolve(base, 'index.d.ts')]
        : []
      const candidate = [...declarationCandidates, base, `${base}.js`, resolve(base, 'index.js')].find(
        (path) => existsSync(path) && statSync(path).isFile(),
      )
      expect(candidate, `relative import ${specifier} from ${current} must resolve`).toBeTruthy()
      if (candidate) pending.push(candidate)
    }
  }

  return [...visited]
}

function isReactElementType(value: unknown): value is React.ElementType {
  return typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value)
}

describe('Published lightweight icon entries', () => {
  it.each([...lightSubpaths, './icons/registry'])(
    'publishes readable JavaScript and type targets for %s',
    (subpath) => {
      expect(existsSync(exportTarget(subpath, 'import'))).toBe(true)
      expect(existsSync(exportTarget(subpath, 'types'))).toBe(true)
    },
  )

  it('rejects undeclared icon deep imports', () => {
    const errorCode = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        "import('@yakit-libs/yakit-ui/icons/createIcon').catch((error) => process.stdout.write(error.code ?? ''))",
      ],
      { cwd: packageRoot, encoding: 'utf8' },
    )

    expect(errorCode).toBe('ERR_PACKAGE_PATH_NOT_EXPORTED')
  })

  it.each(lightSubpaths)('%s excludes component-only runtime dependencies', (subpath) => {
    const graph = collectRelativeModuleGraph(exportTarget(subpath, 'import'))
    const source = graph.map((file) => readFileSync(file, 'utf8')).join('\n')

    for (const dependency of forbiddenRuntimeReferences) {
      expect(source, `${subpath} must not reference ${dependency}`).not.toContain(dependency)
    }
  })

  it.each(lightSubpaths)('%s excludes components and registry modules', (subpath) => {
    const graph = collectRelativeModuleGraph(exportTarget(subpath, 'import'))
    const normalizedPaths = graph.map((file) => file.replaceAll('\\', '/'))

    expect(normalizedPaths.some((file) => file.includes('/components/'))).toBe(false)
    expect(normalizedPaths.some((file) => /\/registry(?:\.[cm]?js)?$/.test(file))).toBe(false)
  })

  it.each(lightSubpaths)('%s type graph excludes component-only declarations', (subpath) => {
    const graph = collectRelativeModuleGraph(exportTarget(subpath, 'types'))
    const normalizedPaths = graph.map((file) => file.replaceAll('\\', '/'))
    const source = graph.map((file) => readFileSync(file, 'utf8')).join('\n')

    expect(normalizedPaths.some((file) => file.includes('/components/'))).toBe(false)
    expect(normalizedPaths.some((file) => /\/registry\.d\.ts$/.test(file))).toBe(false)
    for (const dependency of forbiddenRuntimeReferences) {
      expect(source, `${subpath} types must not reference ${dependency}`).not.toContain(dependency)
    }
  })

  it('keeps root icon, registry, and component exports compatible', async () => {
    const root = (await import(exportTarget('.', 'import'))) as Record<string, unknown>

    expect(isReactElementType(root.HomeOutlined)).toBe(true)
    expect(isReactElementType(root.HomeSolid)).toBe(true)
    expect(root.outlineIconRegistry).toBeInstanceOf(Array)
    expect(root.solidIconRegistry).toBeInstanceOf(Array)
    expect(root.Button).toBeTruthy()
  })

  it('server-renders icons from every lightweight family entry', async () => {
    const icons = await import(exportTarget('./icons', 'import'))
    const outline = await import(exportTarget('./icons/outline', 'import'))
    const solid = await import(exportTarget('./icons/solid', 'import'))
    const colorful = await import(exportTarget('./icons/colorful', 'import'))
    const ColorfulIcon = Object.values(colorful).find(isReactElementType)

    expect(isReactElementType(ColorfulIcon)).toBe(true)
    const markup = renderToString(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(icons.HomeOutlined),
        React.createElement(outline.HomeOutlined),
        React.createElement(solid.HomeSolid),
        ColorfulIcon ? React.createElement(ColorfulIcon) : null,
      ),
    )

    expect(markup.match(/<svg/g)).toHaveLength(4)
  })

  it('resolves lightweight icon types in NodeNext mode', () => {
    const tsc = require.resolve('typescript/bin/tsc')

    expect(() =>
      execFileSync(process.execPath, [tsc, '-p', 'test/types/tsconfig.nodenext.json'], {
        cwd: packageRoot,
        stdio: 'pipe',
      }),
    ).not.toThrow()
  })

  it('tree-shakes a single icon below the lightweight bundle budget', async () => {
    const entry = exportTarget('./icons', 'import')
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        minify: 'esbuild',
        write: false,
        lib: { entry, formats: ['es'] },
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
                return `export { HomeOutlined } from ${JSON.stringify(entry)};`
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
    expect(code).not.toContain('AcademicCapOutlined')
    expect(code).not.toContain('HomeSolid')
    expect(code).not.toMatch(/(?:outlineIconRegistry|solidIconRegistry|iconRegistry)/)
    for (const dependency of forbiddenRuntimeReferences) {
      expect(code, `single-icon bundle must not reference ${dependency}`).not.toContain(dependency)
    }
  })

  it('tree-shakes one fragment-bearing colorful icon without pulling sibling artwork', async () => {
    const entry = exportTarget('./icons/colorful', 'import')
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        minify: 'esbuild',
        write: false,
        lib: { entry, formats: ['es'] },
        rollupOptions: {
          external: (id) => id === 'react' || id.startsWith('react/'),
          input: 'virtual:single-colorful-icon-consumer',
          plugins: [
            {
              name: 'single-colorful-icon-consumer',
              resolveId(id) {
                return id === 'virtual:single-colorful-icon-consumer' ? id : null
              },
              load(id) {
                if (id !== 'virtual:single-colorful-icon-consumer') return null
                return `export { EdgeBrowserColorful } from ${JSON.stringify(entry)};`
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
    expect(code).toContain('EdgeBrowserColorful')
    expect(code).toContain('useId')
    expect(code).not.toContain('ChromeBrowserColorful')
    expect(code).not.toContain('MitmPrimaryMenuColorful')
    expect(code).not.toMatch(/(?:colorfulIconRegistry|iconRegistry)/)
  })
})
