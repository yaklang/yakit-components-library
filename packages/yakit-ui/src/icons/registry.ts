import { colorfulIconNameCatalog } from './colorful/catalog.js';
import * as ColorfulIcons from './colorful/index.js';
import type { ColorfulIconCategory, ColorfulIconPaintMode } from './colorful/types.js';
import { outlineIconNameCatalog, solidIconNameCatalog } from './figmaNameCatalog.js';
import * as OutlineIcons from './outline/index.js';
import * as SolidIcons from './solid/index.js';
import type { IconComponent } from './types.js';

export type IconFamily = 'outline' | 'solid' | 'colorful';
export type { ColorfulIconCategory, ColorfulIconPaintMode } from './colorful/types.js';
export type IconSourceStatus =
  | 'current'
  | 'supplement'
  | 'unnamed-in-figma'
  | 'legacy-non-current-figma';

interface IconDefinitionBase<TFamily extends IconFamily> {
  Component: IconComponent;
  exportName: string;
  family: TFamily;
  figmaName: string | null;
  name: string;
  sourceNodeId: string;
  sourceStatus: IconSourceStatus;
}

interface ColorfulIconMetadata {
  category: ColorfulIconCategory;
  paintMode: ColorfulIconPaintMode;
}

export type IconDefinition<TFamily extends IconFamily = IconFamily> = TFamily extends 'colorful'
  ? IconDefinitionBase<'colorful'> & ColorfulIconMetadata
  : IconDefinitionBase<TFamily>;

interface IconNameCatalogEntryBase<TFamily extends IconFamily> {
  exportName: string;
  family: TFamily;
  figmaName: string | null;
  sourceNodeId: string;
  sourceStatus: IconSourceStatus;
}

export type IconNameCatalogEntry<TFamily extends IconFamily = IconFamily> =
  TFamily extends 'colorful'
    ? IconNameCatalogEntryBase<'colorful'> & ColorfulIconMetadata
    : IconNameCatalogEntryBase<TFamily>;

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
  icons: Record<string, IconComponent>,
  catalog: readonly IconNameCatalogEntry[],
  family: TFamily,
): IconDefinition<TFamily>[] => {
  const components = new Map(Object.entries(icons));
  const catalogNames = new Set<string>();
  const catalogSourceNodeIds = new Set<string>();

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
    if (catalogSourceNodeIds.has(entry.sourceNodeId)) {
      throw new Error(`Duplicate ${family} icon source node: ${entry.sourceNodeId}`);
    }
    catalogSourceNodeIds.add(entry.sourceNodeId);

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

  // Runtime family validation above establishes the conditional generic branch.
  return definitions as IconDefinition<TFamily>[];
};

assertUniqueFigmaNames([...outlineIconNameCatalog, ...solidIconNameCatalog]);

/** 24 × 24 Outline icons: default stroke width 1, with independent filled details. */
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

/** Figma's multicolor, brand, status, avatar, and other literal-paint icon sets. */
export const colorfulIconRegistry: IconDefinition<'colorful'>[] = buildIconRegistry<'colorful'>(
  ColorfulIcons,
  colorfulIconNameCatalog,
  'colorful',
);

/** All Figma-originated icons that are currently included in this package. */
export const iconRegistry: IconDefinition[] = [
  ...outlineIconRegistry,
  ...solidIconRegistry,
  ...colorfulIconRegistry,
];
