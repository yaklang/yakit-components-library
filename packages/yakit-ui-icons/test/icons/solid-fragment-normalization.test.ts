import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const solidRoot = resolve(packageRoot, 'src/solid')
const files = readdirSync(solidRoot)
  .filter((file) => file.endsWith('.svg'))
  .sort()
const referencePattern =
  /url\(\s*#([^)'"\s]+)\s*\)|(?:href|xlink:href)=["']#([^"']+)["']|aria-(?:labelledby|describedby)=["']([^"']+)["']/g

const references = (source: string) =>
  [...source.matchAll(referencePattern)].flatMap((match) =>
    (match[1] ?? match[2] ?? match[3] ?? '').split(/\s+/).filter(Boolean),
  )

describe('Solid raw fragment normalization', () => {
  it('removes presentation IDs and retains only source-owned referenced IDs', () => {
    const owners = new Map<string, string>()
    const fragmentFiles: string[] = []

    for (const file of files) {
      const source = readFileSync(resolve(solidRoot, file), 'utf8')
      const ids = [...source.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1])
      const refs = references(source)
      const fileBase = file.slice(0, -4).replaceAll('-', '_')
      if (ids.length > 0) fragmentFiles.push(file)

      expect(new Set(refs), file).toEqual(new Set(ids))
      for (const id of ids) {
        expect(id, `${file}:${id}`).toMatch(
          new RegExp(`^icon_(?:${fileBase}|${fileBase.replaceAll('_', '')})__[A-Za-z][A-Za-z0-9_]*_\\d+$`),
        )
        expect(owners.has(id), `${file}:${id}`).toBe(false)
        owners.set(id, file)
      }
    }

    expect(fragmentFiles).toEqual(['1-2967.svg', '22425-254718.svg'])
    expect(owners.size).toBe(2)
  })
})
