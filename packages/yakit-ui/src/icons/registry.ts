import type { ComponentType } from 'react';

import * as OutlineIcons from './outline';
import * as SolidIcons from './solid';
import type { IconProps } from './types';

export interface IconDefinition {
  Component: ComponentType<IconProps>;
  name: string;
}

const toDefinitions = (icons: Record<string, ComponentType<IconProps>>): IconDefinition[] =>
  Object.entries(icons).map(([name, Component]) => ({ Component, name }));

/** Figma's 24 × 24, 2px-stroke icon set. */
export const outlineIconRegistry = toDefinitions(OutlineIcons).sort((left, right) =>
  left.name.localeCompare(right.name),
);

/** Figma's 20 × 20 filled icon set. */
export const solidIconRegistry = toDefinitions(SolidIcons).sort((left, right) =>
  left.name.localeCompare(right.name),
);

/** All Figma-originated icons that are currently included in this package. */
export const iconRegistry = [...outlineIconRegistry, ...solidIconRegistry];
