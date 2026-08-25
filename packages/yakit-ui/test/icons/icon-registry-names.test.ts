import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';

import outlineManifest from '../../scripts/figma-outline-icons-inventory.json';
import solidManifest from '../../scripts/figma-solid-icons-inventory.json';
import {
  assertUniqueFigmaNames,
  buildIconRegistry,
  iconRegistry,
  type IconNameCatalogEntry,
  outlineIconRegistry,
  solidIconRegistry,
} from '../../src/icons/registry';
import type { IconProps } from '../../src/icons/types';

const DummyIcon = (() => null) as ComponentType<IconProps>;
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
});

describe('Figma icon registry name validation', () => {
  it('uses family-specific public component suffixes', () => {
    expect(outlineIconRegistry.every(({ exportName }) => exportName.endsWith('Outlined'))).toBe(
      true,
    );
    expect(solidIconRegistry.every(({ exportName }) => exportName.endsWith('Solid'))).toBe(true);
    expect(solidIconRegistry.some(({ exportName }) => exportName.endsWith('Filled'))).toBe(false);
  });

  it('derives every available Figma name by trimming outer whitespace only', () => {
    const registryByExport = new Map(
      iconRegistry.map((definition) => [definition.exportName, definition]),
    );
    const sources = [
      ...outlineManifest.symbols.map(({ exportName, name }) => ({ exportName, rawName: name })),
      ...solidManifest.symbols.map(({ exportName, name }) => ({ exportName, rawName: name })),
      ...solidManifest.supplementalSources.map(({ exportName, name }) => ({
        exportName,
        rawName: name,
      })),
    ];

    for (const { exportName, rawName } of sources) {
      const expectedName = rawName.trim() || null;
      expect(registryByExport.get(exportName)?.figmaName, exportName).toBe(expectedName);
    }
    expect(
      iconRegistry
        .filter(({ figmaName }) => figmaName === null)
        .map(({ exportName }) => exportName),
    ).toEqual(['CommandOutlined', 'NotebookOutlined']);
  });

  it('keeps 595 non-null full Figma names unique while allowing exactly 94 leaf collisions', () => {
    const fullNames = iconRegistry.flatMap(({ figmaName }) =>
      figmaName === null ? [] : [figmaName],
    );
    const leafOwners = new Map<string, string[]>();
    for (const fullName of fullNames) {
      const leafName = fullName.slice(fullName.indexOf('/') + 1);
      leafOwners.set(leafName, [...(leafOwners.get(leafName) ?? []), fullName]);
    }
    const collisions = [...leafOwners.values()].filter((owners) => owners.length > 1);

    expect(fullNames).toHaveLength(595);
    expect(new Set(fullNames)).toHaveLength(595);
    expect(collisions).toHaveLength(94);
    expect(collisions.every((owners) => owners.length === 2)).toBe(true);
  });

  it('rejects a duplicate full Figma name within one family', () => {
    expect(() =>
      assertUniqueFigmaNames([
        entry('FirstOutlined', 'Outline/shared'),
        entry('SecondOutlined', 'Outline/shared'),
      ]),
    ).toThrow('Duplicate Figma icon name Outline/shared: FirstOutlined and SecondOutlined');
  });

  it('rejects a duplicate full Figma name across families', () => {
    expect(() =>
      assertUniqueFigmaNames([
        entry('FirstOutlined', 'Shared/icon'),
        entry('SecondSolid', 'Shared/icon', 'solid'),
      ]),
    ).toThrow('Duplicate Figma icon name Shared/icon: FirstOutlined and SecondSolid');
  });

  it('rejects a catalog export whose component is missing', () => {
    expect(() =>
      buildIconRegistry({}, [entry('MissingOutlined', 'Outline/missing')], 'outline'),
    ).toThrow('Missing outline icon component for catalog export: MissingOutlined');
  });

  it('rejects a component export that is absent from the catalog', () => {
    expect(() =>
      buildIconRegistry(
        { KnownOutlined: DummyIcon, UnknownOutlined: DummyIcon },
        [entry('KnownOutlined', 'Outline/known')],
        'outline',
      ),
    ).toThrow('Uncatalogued outline icon exports: UnknownOutlined');
  });

  it('rejects a Figma name that still has outer whitespace', () => {
    expect(() =>
      buildIconRegistry(
        { SpacedOutlined: DummyIcon },
        [entry('SpacedOutlined', ' Outline/spaced')],
        'outline',
      ),
    ).toThrow('Untrimmed Figma icon name for SpacedOutlined:  Outline/spaced');
  });

  it('rejects an empty Figma name instead of treating it as an unnamed exception', () => {
    expect(() =>
      buildIconRegistry({ EmptyOutlined: DummyIcon }, [entry('EmptyOutlined', '')], 'outline'),
    ).toThrow('Empty Figma icon name for EmptyOutlined');
  });
});
