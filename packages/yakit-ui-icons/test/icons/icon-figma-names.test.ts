import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { auditIcons } from '../../scripts/audit-icons.mjs'
import { buildIconNameCatalog } from '../../scripts/icon-name-catalog-core.mjs'
import { readIconInputSync } from '../../scripts/icon-source-documents.mjs'
import { figmaIconNameCatalog } from '../../src/figmaNameCatalog'

import { expectedFigmaNames, iconCounts } from './icon-inventory'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const paths = {
  catalog: resolve(packageRoot, 'src/figmaNameCatalog.ts'),
  icons: resolve(packageRoot, 'src'),
  outlineIndex: resolve(packageRoot, 'src/outline/index.tsx'),
  outlineManifest: resolve(packageRoot, 'config/icon-sources/outline.json#manifest'),
  outlinePlacement: resolve(packageRoot, 'config/icon-sources/outline.json#placement'),
  outlineRaw: resolve(packageRoot, 'config/icon-sources/outline.json#raw'),
  solidIndex: resolve(packageRoot, 'src/solid/index.tsx'),
  solidManifest: resolve(packageRoot, 'config/icon-sources/solid.json#manifest'),
  solidPlacement: resolve(packageRoot, 'config/icon-sources/solid.json#placement'),
  solidRaw: resolve(packageRoot, 'config/icon-sources/solid.json#raw'),
}
const notebookGroupMappings = [
  { exportName: 'NotebookOutlined', figmaName: 'Outline/Notebook', sourceStatus: 'current' },
  {
    exportName: 'Notebook2Outlined',
    figmaName: 'Outline/Notebook 2',
    sourceStatus: 'current',
  },
  {
    exportName: 'RotateCcwOutlined',
    figmaName: 'Outline/RotateCcw',
    sourceStatus: 'current',
  },
  { exportName: 'FeatherOutlined', figmaName: 'Outline/Feather', sourceStatus: 'current' },
  {
    exportName: 'HardDriveDownloadOutlined',
    figmaName: 'Outline/HardDriveDownload',
    sourceStatus: 'current',
  },
  {
    exportName: 'RotateCcwSquareOutlined',
    figmaName: 'Outline/RotateCcwSquare',
    sourceStatus: 'current',
  },
  {
    exportName: 'BookMarkedOutlined',
    figmaName: 'Outline/BookMarked',
    sourceStatus: 'current',
  },
  {
    exportName: 'BookMarked2Outlined',
    figmaName: 'Outline/BookMarked 2',
    sourceStatus: 'current',
  },
  { exportName: 'TimerOutlined', figmaName: 'Outline/Timer', sourceStatus: 'current' },
] as const
const notebookGroupExportNames = new Set<string>(notebookGroupMappings.map(({ exportName }) => exportName))

const loadInputs = () => ({
  outlineIndexSource: readIconInputSync(paths.outlineIndex, 'utf8'),
  outlineManifest: JSON.parse(readIconInputSync(paths.outlineManifest, 'utf8')),
  outlinePlacementProvenance: JSON.parse(readIconInputSync(paths.outlinePlacement, 'utf8')),
  outlineRawProvenance: JSON.parse(readIconInputSync(paths.outlineRaw, 'utf8')),
  solidIndexSource: readIconInputSync(paths.solidIndex, 'utf8'),
  solidManifest: JSON.parse(readIconInputSync(paths.solidManifest, 'utf8')),
  solidPlacementProvenance: JSON.parse(readIconInputSync(paths.solidPlacement, 'utf8')),
  solidRawProvenance: JSON.parse(readIconInputSync(paths.solidRaw, 'utf8')),
})

const runNameAudit = (overrides: Record<string, string> = {}) =>
  auditIcons({
    iconNameCatalogPath: paths.catalog,
    indexPath: paths.outlineIndex,
    manifestPath: paths.outlineManifest,
    outlineNameIndexPath: paths.outlineIndex,
    outlineNameManifestPath: paths.outlineManifest,
    outlineNamePlacementProvenancePath: paths.outlinePlacement,
    outlineNameRawProvenancePath: paths.outlineRaw,
    policyId: 'outline-v1',
    root: paths.icons,
    solidNameIndexPath: paths.solidIndex,
    solidNameManifestPath: paths.solidManifest,
    solidNamePlacementProvenancePath: paths.solidPlacement,
    solidNameRawProvenancePath: paths.solidRaw,
    ...overrides,
  })

describe('Figma icon name catalog', () => {
  it('preserves all inventoried public export mappings in manifest source order', () => {
    const expected = buildIconNameCatalog(loadInputs())
    expect(figmaIconNameCatalog).toEqual(expected)
    expect(figmaIconNameCatalog).toHaveLength(iconCounts.figmaCatalog)
    expect(figmaIconNameCatalog.filter(({ family }) => family === 'outline')).toHaveLength(iconCounts.outline)
    expect(figmaIconNameCatalog.filter(({ family }) => family === 'solid')).toHaveLength(iconCounts.solid)
    expect(new Set(figmaIconNameCatalog.map(({ exportName }) => exportName))).toHaveLength(iconCounts.figmaCatalog)
  })

  it('keeps authoritative full Figma names byte-for-byte except outer whitespace', () => {
    expect(figmaIconNameCatalog.find(({ exportName }) => exportName === 'SpeechToText2Outlined')).toMatchObject({
      figmaName: 'Outline/Speech-to-text2',
      sourceStatus: 'current',
    })
    expect(figmaIconNameCatalog.find(({ exportName }) => exportName === 'CommandOutlined')).toMatchObject({
      figmaName: 'Outline/Command',
      sourceStatus: 'current',
    })
    expect(figmaIconNameCatalog.find(({ exportName }) => exportName === 'NotebookOutlined')).toMatchObject({
      figmaName: 'Outline/Notebook',
      sourceStatus: 'current',
    })
    expect(
      figmaIconNameCatalog
        .filter(({ exportName }) => notebookGroupExportNames.has(exportName))
        .map(({ exportName, figmaName, sourceStatus }) => ({
          exportName,
          figmaName,
          sourceStatus,
        })),
    ).toEqual(notebookGroupMappings)
    expect(figmaIconNameCatalog.find(({ exportName }) => exportName === 'FloatingSolid')).toMatchObject({
      figmaName: 'Solid/Floating',
      sourceStatus: 'supplement',
    })
    const names = figmaIconNameCatalog.flatMap(({ figmaName }) => (figmaName === null ? [] : [figmaName]))
    expect([...names].sort()).toEqual([...expectedFigmaNames].sort())
    expect(new Set(names).size).toBe(new Set(expectedFigmaNames).size)
  })

  it.each([
    ['missing', (inputs: ReturnType<typeof loadInputs>) => inputs.outlineManifest.symbols.pop()],
    [
      'unknown',
      (inputs: ReturnType<typeof loadInputs>) => {
        inputs.solidManifest.symbols[0].exportName = 'UnknownSolid'
      },
    ],
    [
      'duplicate',
      (inputs: ReturnType<typeof loadInputs>) => {
        inputs.solidManifest.symbols[1].name = inputs.solidManifest.symbols[0].name
      },
    ],
  ])('fails closed for a %s mapping mutation', (_label, mutate) => {
    const inputs = loadInputs()
    mutate(inputs)
    expect(() => buildIconNameCatalog(inputs)).toThrow(/FIGMA_NAME_/)
  })

  it('rejects coordinated manifest/catalog name forgery against frozen provenance', async () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'yakit-icon-name-forgery-'))
    try {
      const inputs = loadInputs()
      const originalName = inputs.outlineManifest.symbols[0].name
      inputs.outlineManifest.symbols[0].name = 'Outline/Forged-mail'
      const forgedManifest = resolve(temporaryRoot, 'outline.json')
      const forgedCatalog = resolve(temporaryRoot, 'figmaNameCatalog.ts')
      writeFileSync(forgedManifest, JSON.stringify(inputs.outlineManifest))
      writeFileSync(
        forgedCatalog,
        readIconInputSync(paths.catalog, 'utf8').replace(originalName.trim(), 'Outline/Forged-mail'),
      )
      const result = await runNameAudit({
        iconNameCatalogPath: forgedCatalog,
        outlineNameManifestPath: forgedManifest,
      })
      expect(result.failures.map(({ token }) => token)).toContain('FIGMA_NAME_PROVENANCE_MISMATCH')
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true })
    }
  })

  it('rejects coordinated Outline manifest/catalog reorder against placement order', async () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'yakit-icon-name-order-'))
    try {
      const manifest = loadInputs().outlineManifest
      ;[manifest.symbols[0], manifest.symbols[1]] = [manifest.symbols[1], manifest.symbols[0]]
      const reorderedManifest = resolve(temporaryRoot, 'outline.json')
      writeFileSync(reorderedManifest, JSON.stringify(manifest))
      const result = await runNameAudit({ outlineNameManifestPath: reorderedManifest })
      expect(result.failures.map(({ token }) => token)).toContain('FIGMA_NAME_ORDER_MISMATCH')
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true })
    }
  })

  it.each([
    [
      'raw/placement name disagreement',
      (inputs: ReturnType<typeof loadInputs>) => {
        inputs.outlineRawProvenance.components[0].name = 'Outline/Forged'
      },
    ],
    ['missing raw node', (inputs: ReturnType<typeof loadInputs>) => inputs.solidRawProvenance.components.pop()],
    [
      'extra raw node',
      (inputs: ReturnType<typeof loadInputs>) =>
        inputs.solidRawProvenance.components.push({
          name: 'Solid/Extra',
          nodeId: 'extra:1',
          nodeType: 'COMPONENT',
          svg: '<svg/>',
        }),
    ],
  ])('fails closed for %s in frozen provenance', (_label, mutate) => {
    const inputs = loadInputs()
    mutate(inputs)
    expect(() => buildIconNameCatalog(inputs)).toThrow(/FIGMA_NAME_PROVENANCE_MISMATCH/)
  })

  it('detects a byte-level catalog mutation through the normal audit', async () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'yakit-icon-names-'))
    try {
      const mutatedCatalog = resolve(temporaryRoot, 'figmaNameCatalog.ts')
      writeFileSync(mutatedCatalog, `${readIconInputSync(paths.catalog, 'utf8')}\n`)
      const result = await runNameAudit({ iconNameCatalogPath: mutatedCatalog })
      expect(result.failures.map(({ token }) => token)).toContain('FIGMA_NAME_CATALOG_CHANGED')
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true })
    }
  })
})
