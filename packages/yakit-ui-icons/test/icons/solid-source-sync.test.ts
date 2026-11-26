import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { canonicalizeSvg, inspectSvg } from '../../scripts/audit-icons.mjs'
import { planSourceImport } from '../../scripts/import-icon-sources.mjs'
import { renderImportedSvg } from '../../scripts/update-icons.mjs'
import { solid as source } from '../helpers/sources'

const updatedNames = ['ParkLeftSolid', 'ParkRightSolid', 'ParkBelowSolid', 'ParkAboveSolid', 'ImportSolid']
const updated = source.records.filter((record) => updatedNames.includes(record.exportName))
const canonical = (svg: string) =>
  canonicalizeSvg(svg.replaceAll('#353639', 'currentColor'), { ignoreUnreferencedIds: true })

describe('Solid source synchronization', () => {
  it('keeps all five public names and matches the raw export without normalizing stroke width', () => {
    expect(updated.map((r) => r.exportName).sort()).toEqual([...updatedNames].sort())
    for (const record of updated) {
      const svg = readFileSync(resolve(import.meta.dirname, '../../src/solid', record.file), 'utf8')
      expect(canonical(svg), record.exportName).toBe(canonical(record.raw.svg))
      expect(renderImportedSvg(record, 'solid')).toBe(svg)
    }
  })

  it.each(['0', '1', '2', '3', '4', '2.25'])(
    'preserves Solid source stroke-width=%s while Outline remains normalized',
    (width) => {
      const svg = `<svg width="20" height="20" viewBox="0 0 20 20"><path d="M2 2L18 18" stroke="#353639" stroke-width="${width}"/></svg>`
      const record = { nodeId: '999:1', raw: { svg } }
      const solid = renderImportedSvg(record, 'solid')
      expect(solid).toContain(`stroke-width="${width}"`)
      expect(
        inspectSvg({
          manifest: {},
          source: solid,
          relativePath: 'solid/999-1.svg',
          variant: 'solid',
        }),
      ).toEqual([])
      if (width !== '0') expect(renderImportedSvg(record, 'outline')).toContain('stroke-width="1.5"')
    },
  )

  it('imports the updated Import icon as two filled paths', async () => {
    const root = mkdtempSync(resolve(tmpdir(), 'solid-import-'))
    try {
      const record = updated.find((r) => r.exportName === 'ImportSolid')!
      const svgPath = resolve(root, 'import.svg')
      writeFileSync(svgPath, record.raw.svg + '\n')
      const plan = await planSourceImport({
        schemaVersion: 1,
        icons: [
          {
            url: `https://www.figma.com/design/${source.fileKey}/Icons?node-id=${record.nodeId.replace(':', '-')}`,
            family: 'solid',
            name: record.name,
            nodeType: 'COMPONENT',
            width: 20,
            height: 20,
            svgPath,
          },
        ],
      })
      const raw = plan.changes.get(`config/icon-sources/${record.svgFile}`).after
      expect(raw.match(/<path\b/g)).toHaveLength(2)
      expect(renderImportedSvg({ ...record, raw: { svg: raw } }, 'solid')).not.toMatch(/<(?:mask|defs)\b|stroke-width=/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
