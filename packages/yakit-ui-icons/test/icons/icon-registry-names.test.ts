import type { ComponentType } from 'react'
import { describe, expect, it } from 'vitest'

import colorfulProject from '../../config/icon-project/colorful.json'
import outlineProject from '../../config/icon-project/outline.json'
import solidProject from '../../config/icon-project/solid.json'
import colorfulSource from '../../config/icon-sources/colorful.json'
import outlineSource from '../../config/icon-sources/outline.json'
import solidSource from '../../config/icon-sources/solid.json'
import {
  assertUniqueFigmaNames,
  buildIconRegistry,
  colorfulIconRegistry,
  iconRegistry,
  type IconNameCatalogEntry,
  outlineIconRegistry,
  solidIconRegistry,
} from '../../src/registry'
import type { IconProps } from '../../src/types'

function sourceNames(
  source: { records: { nodeId: string; name: string }[] },
  project: { records: Record<string, { exportName: string }> },
) {
  return source.records.map(({ nodeId, name }) => ({ nodeId, name, exportName: project.records[nodeId].exportName }))
}

const DummyIcon = (() => null) as ComponentType<IconProps>
const entry = (
  exportName: string,
  figmaName: string | null,
  family: 'outline' | 'solid' = 'outline',
): IconNameCatalogEntry => ({
  exportName,
  family,
  figmaName,
  sourceNodeId: exportName,
  sourceStatus: 'current',
})

describe('Figma icon registry name validation', () => {
  it('uses family-specific public component suffixes', () => {
    expect(outlineIconRegistry.every(({ exportName }) => exportName.endsWith('Outlined'))).toBe(true)
    expect(solidIconRegistry.every(({ exportName }) => exportName.endsWith('Solid'))).toBe(true)
    expect(colorfulIconRegistry.every(({ exportName }) => exportName.endsWith('Colorful'))).toBe(true)
  })

  it('derives every available Figma name by trimming outer whitespace only', () => {
    const registryByExport = new Map(iconRegistry.map((definition) => [definition.exportName, definition]))
    const sources = [...sourceNames(outlineSource, outlineProject), ...sourceNames(solidSource, solidProject)]
    for (const { exportName, name } of sources) {
      const expectedName = name.trim() || null
      expect(registryByExport.get(exportName)?.figmaName, exportName).toBe(expectedName)
    }
    expect(iconRegistry.filter(({ figmaName }) => figmaName === null).map(({ exportName }) => exportName)).toEqual([])
  })

  it('preserves the two distinct source icons named Outline/variable', () => {
    const names = new Map<string, string[]>()
    for (const { figmaName, exportName } of [...outlineIconRegistry, ...solidIconRegistry]) {
      if (figmaName !== null) names.set(figmaName, [...(names.get(figmaName) ?? []), exportName])
    }
    expect([...names].filter(([, owners]) => owners.length > 1)).toEqual([
      ['Outline/variable', ['VariableOutlined', 'Variable2Outlined']],
    ])
    const variables = outlineIconRegistry.filter(({ figmaName }) => figmaName === 'Outline/variable')
    expect(variables.map(({ exportName, sourceNodeId }) => ({ exportName, sourceNodeId }))).toEqual([
      { exportName: 'VariableOutlined', sourceNodeId: '1:2331' },
      { exportName: 'Variable2Outlined', sourceNodeId: '22971:301511' },
    ])
    expect(variables.every(({ Component }) => Boolean(Component))).toBe(true)
    expect(variables[0].Component).not.toBe(variables[1].Component)
  })

  it('maps all inventoried colorful rows by unique export and source identity while preserving raw Figma names', () => {
    const publicRows = sourceNames(colorfulSource, colorfulProject)
    const registryByExport = new Map(colorfulIconRegistry.map((definition) => [definition.exportName, definition]))

    expect(publicRows).toHaveLength(Object.keys(colorfulProject.records).length)
    expect(colorfulIconRegistry).toHaveLength(publicRows.length)
    expect(new Set(colorfulIconRegistry.map(({ exportName }) => exportName))).toHaveLength(colorfulIconRegistry.length)
    expect(new Set(colorfulIconRegistry.map(({ sourceNodeId }) => sourceNodeId))).toHaveLength(
      colorfulIconRegistry.length,
    )
    for (const row of publicRows) {
      expect(registryByExport.get(row.exportName), row.exportName).toMatchObject({
        figmaName: row.name,
        sourceNodeId: row.nodeId,
      })
    }
    expect(publicRows.filter(({ name }) => name === 'Basic/Solid/Web Fuzzer')).toHaveLength(2)
  })

  it('rejects a duplicate full Figma name within one family', () => {
    expect(() =>
      assertUniqueFigmaNames([entry('FirstOutlined', 'Outline/shared'), entry('SecondOutlined', 'Outline/shared')]),
    ).toThrow('Duplicate Figma icon name Outline/shared: FirstOutlined and SecondOutlined')
  })

  it('rejects a duplicate full Figma name across families', () => {
    expect(() =>
      assertUniqueFigmaNames([entry('FirstOutlined', 'Shared/icon'), entry('SecondSolid', 'Shared/icon', 'solid')]),
    ).toThrow('Duplicate Figma icon name Shared/icon: FirstOutlined and SecondSolid')
  })

  it('rejects a catalog export whose component is missing', () => {
    expect(() => buildIconRegistry({}, [entry('MissingOutlined', 'Outline/missing')], 'outline')).toThrow(
      'Missing outline icon component for catalog export: MissingOutlined',
    )
  })

  it('rejects duplicate source nodes even when export and Figma names differ', () => {
    expect(() =>
      buildIconRegistry(
        { FirstOutlined: DummyIcon, SecondOutlined: DummyIcon },
        [
          entry('FirstOutlined', 'Outline/first'),
          { ...entry('SecondOutlined', 'Outline/second'), sourceNodeId: 'FirstOutlined' },
        ],
        'outline',
      ),
    ).toThrow('Duplicate outline icon source node: FirstOutlined')
  })

  it('rejects a component export that is absent from the catalog', () => {
    expect(() =>
      buildIconRegistry(
        { KnownOutlined: DummyIcon, UnknownOutlined: DummyIcon },
        [entry('KnownOutlined', 'Outline/known')],
        'outline',
      ),
    ).toThrow('Uncatalogued outline icon exports: UnknownOutlined')
  })

  it('rejects a Figma name that still has outer whitespace', () => {
    expect(() =>
      buildIconRegistry({ SpacedOutlined: DummyIcon }, [entry('SpacedOutlined', ' Outline/spaced')], 'outline'),
    ).toThrow('Untrimmed Figma icon name for SpacedOutlined:  Outline/spaced')
  })

  it('rejects an empty Figma name instead of treating it as an unnamed exception', () => {
    expect(() => buildIconRegistry({ EmptyOutlined: DummyIcon }, [entry('EmptyOutlined', '')], 'outline')).toThrow(
      'Empty Figma icon name for EmptyOutlined',
    )
  })
})
