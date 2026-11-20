import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build, type Plugin, type PluginOption, type Rollup } from 'vite'
import { describe, expect, it } from 'vitest'

import viteConfig from '../../vite.config'
import vitestConfig from '../../vitest.config'
import { outline as outlineSource } from '../helpers/sources'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const outlineRoot = resolve(packageRoot, 'src/outline')
const fragmentReferencePattern = /(?:url\(\s*#|(?:href|xlink:href)=["']#)([^)'"\s]+)/g

const referencedIds = (source: string) => [...source.matchAll(fragmentReferencePattern)].map((match) => match[1])

describe('Outline raw fragment contract', () => {
  it('uses deterministic source-specific bases for every referenced fragment', () => {
    const files = outlineSource.records.map(({ file }) => file)
    const invalid: string[] = []

    for (const file of files) {
      const source = readFileSync(resolve(outlineRoot, file), 'utf8')
      const fileBase = file.slice(0, -4).replace('-', '')
      for (const id of referencedIds(source)) {
        if (!new RegExp(`^icon_${fileBase}__[A-Za-z][A-Za-z0-9_-]*_\\d+$`).test(id)) {
          invalid.push(`${file}:${id}`)
        }
      }
    }

    expect(invalid).toEqual([])
  })

  it('keeps each referenced fragment owned by its source SVG', () => {
    const files = outlineSource.records.map(({ file }) => file)
    const owners = new Map<string, string>()
    const violations: string[] = []

    for (const file of files) {
      const source = readFileSync(resolve(outlineRoot, file), 'utf8')
      for (const id of new Set(referencedIds(source))) {
        const definitions = [...source.matchAll(new RegExp(`\\bid=["']${id}["']`, 'g'))].length
        if (definitions !== 1) violations.push(`${file}:${id}:definitions=${definitions}`)
        if (owners.has(id)) violations.push(`${file}:${id}:also-owned-by=${owners.get(id)}`)
        owners.set(id, file)
      }
    }

    expect(violations).toEqual([])
  })
})

describe('Shared SVG React transform wiring', () => {
  const fixtureEntry = resolve(packageRoot, 'test/fixtures/icons/transform/entry.ts')
  const pluginName = 'vite-plugin-svgr'

  const collectPlugins = async (options: PluginOption[]): Promise<Plugin[]> => {
    const plugins: Plugin[] = []
    for await (const option of options) {
      if (Array.isArray(option)) plugins.push(...(await collectPlugins(option)))
      else if (option) plugins.push(option)
    }
    return plugins
  }

  const configuredPlugins = async () => ({
    Vite: await collectPlugins(viteConfig.plugins ?? []),
    Vitest: await collectPlugins(vitestConfig.plugins ?? []),
  })

  const compile = async (plugins: Plugin[]) => {
    const result = (await build({
      build: {
        rollupOptions: {
          external: ['react', 'react/jsx-runtime'],
          input: fixtureEntry,
          preserveEntrySignatures: 'strict',
          treeshake: false,
        },
        write: false,
      },
      configFile: false,
      logLevel: 'silent',
      plugins,
    })) as Rollup.RollupOutput
    return result.output
      .filter((entry): entry is Rollup.OutputChunk => entry.type === 'chunk')
      .map(({ code }) => code)
      .join('\n')
  }

  it('installs exactly one shared SVG transform in each real compilation path', async () => {
    const paths = await configuredPlugins()
    for (const [name, plugins] of Object.entries(paths)) {
      expect(
        plugins.filter((plugin): plugin is Plugin => Boolean(plugin) && plugin.name === pluginName),
        name,
      ).toHaveLength(1)
    }
  })

  it('compiles equivalent suffix-only useId semantics through Vite and Vitest', async () => {
    const paths = await configuredPlugins()
    const outputs = await Promise.all(
      Object.values(paths).map((plugins) => compile(plugins.filter((plugin): plugin is Plugin => Boolean(plugin)))),
    )
    const normalize = (source: string) => source.replace(/\s+/g, ' ').trim()
    expect(new Set(outputs.map(normalize))).toHaveLength(1)
    for (const output of outputs) {
      expect(output).toContain('icon_999_1__mask_0__')
      expect(output).toContain('useId')
      expect(output.match(/codePointAt\(0\)/g)).toHaveLength(1)
      expect(output.match(/icon_999_1__mask_0__/g)).toHaveLength(2)
      expect(output).not.toContain('icon_999_1__mask_0"')
    }
  })
})
