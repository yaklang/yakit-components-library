import type { ComponentType } from 'react';

import { outlineIconNameCatalog, solidIconNameCatalog } from './figmaNameCatalog';
import * as OutlineIcons from './outline';
import * as SolidIcons from './solid';
import type { IconProps } from './types';

export type IconFamily = 'outline' | 'solid';
export type IconSourceStatus =
  | 'current'
  | 'supplement'
  | 'unnamed-in-figma'
  | 'legacy-non-current-figma';

export interface IconDefinition<TFamily extends IconFamily = IconFamily> {
  Component: ComponentType<IconProps>;
  exportName: string;
  family: TFamily;
  figmaName: string | null;
  name: string;
  sourceNodeId: string;
  sourceStatus: IconSourceStatus;
}

export interface IconNameCatalogEntry<TFamily extends IconFamily = IconFamily> {
  exportName: string;
  family: TFamily;
  figmaName: string | null;
  sourceNodeId: string;
  sourceStatus: IconSourceStatus;
}

export const assertUniqueFigmaNames = (catalog: readonly IconNameCatalogEntry[]) => {
  const owners = new Map<string, string>();
  for (const entry of catalog) {
    if (entry.figmaName === null) continue;
    const owner = owners.get(entry.figmaName);
    if (owner) {
      throw new Error(
        `Duplicate Figma icon name ${entry.figmaName}: ${owner} and ${entry.exportName}`,
      );
    }
    owners.set(entry.figmaName, entry.exportName);
  }
};

export const buildIconRegistry = <TFamily extends IconFamily>(
  icons: Record<string, ComponentType<IconProps>>,
  catalog: readonly IconNameCatalogEntry[],
  family: TFamily,
): IconDefinition<TFamily>[] => {
  const components = new Map(Object.entries(icons));
  const catalogNames = new Set<string>();

  const definitions = catalog.map((entry) => {
    if (entry.family !== family) {
      throw new Error(
        `Icon catalog family mismatch for ${entry.exportName}: expected ${family}, received ${entry.family}`,
      );
    }
    if (catalogNames.has(entry.exportName)) {
      throw new Error(`Duplicate ${family} icon catalog export: ${entry.exportName}`);
    }
    catalogNames.add(entry.exportName);

    const Component = components.get(entry.exportName);
    if (!Component) {
      throw new Error(`Missing ${family} icon component for catalog export: ${entry.exportName}`);
    }
    if (entry.figmaName !== null && entry.figmaName.trim() !== entry.figmaName) {
      throw new Error(`Untrimmed Figma icon name for ${entry.exportName}: ${entry.figmaName}`);
    }
    if (entry.figmaName === '') {
      throw new Error(`Empty Figma icon name for ${entry.exportName}`);
    }

    return {
      ...entry,
      Component,
      family,
      name: entry.figmaName ?? entry.exportName,
    };
  });

  const extraExports = [...components.keys()].filter((exportName) => !catalogNames.has(exportName));
  if (extraExports.length > 0) {
    throw new Error(`Uncatalogued ${family} icon exports: ${extraExports.join(', ')}`);
  }

  return definitions;
};

assertUniqueFigmaNames([...outlineIconNameCatalog, ...solidIconNameCatalog]);

/** Figma's 24 × 24, 2px-stroke icon set. */
export const outlineIconRegistry = buildIconRegistry<'outline'>(
  OutlineIcons,
  outlineIconNameCatalog,
  'outline',
);

/** Figma's 20 × 20 filled icon set. */
export const solidIconRegistry = buildIconRegistry<'solid'>(
  SolidIcons,
  solidIconNameCatalog,
  'solid',
);

/** All Figma-originated icons that are currently included in this package. */
export const iconRegistry = [...outlineIconRegistry, ...solidIconRegistry];
