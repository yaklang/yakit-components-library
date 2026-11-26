import { forwardRef } from 'react'

import { type IconComponent, type IconProps } from '../../src'
import * as ColorfulIcons from '../../src/colorful'
import {
  colorfulIconRegistry,
  iconRegistry,
  type ColorfulIconCategory,
  type ColorfulIconPaintMode,
  type IconDefinition,
} from '../../src/registry'

const publicComponents = ColorfulIcons satisfies Record<string, IconComponent>
const colorfulDefinitions = colorfulIconRegistry satisfies IconDefinition<'colorful'>[]
const ExampleComponent = forwardRef<HTMLSpanElement, IconProps>(() => null)

const requiredMetadata: IconDefinition<'colorful'> = {
  Component: ExampleComponent,
  category: 'basic',
  exportName: 'TypeContractColorful',
  family: 'colorful',
  figmaName: 'Basic/Type contract',
  name: 'Basic/Type contract',
  paintMode: 'literal',
  sourceNodeId: '0:0',
  sourceStatus: 'current',
}

// @ts-expect-error Colorful definitions require discovery category metadata.
const missingCategory: IconDefinition<'colorful'> = {
  Component: ExampleComponent,
  exportName: 'MissingCategoryColorful',
  family: 'colorful',
  figmaName: null,
  name: 'MissingCategoryColorful',
  paintMode: 'literal',
  sourceNodeId: '0:1',
  sourceStatus: 'current',
}

// @ts-expect-error Colorful definitions require an explicit paint mode.
const missingPaintMode: IconDefinition<'colorful'> = {
  Component: ExampleComponent,
  category: 'basic',
  exportName: 'MissingPaintModeColorful',
  family: 'colorful',
  figmaName: null,
  name: 'MissingPaintModeColorful',
  sourceNodeId: '0:2',
  sourceStatus: 'current',
}

const consumeDefinition = (definition: IconDefinition) => {
  if (definition.family === 'colorful') {
    const category: ColorfulIconCategory = definition.category
    const paintMode: ColorfulIconPaintMode = definition.paintMode
    void category
    void paintMode
    return
  }

  // @ts-expect-error Monochrome definitions do not expose colorful-only metadata.
  void definition.category
}

const example = <ExampleComponent aria-label="colorful icon" color="#123456" size="1em" />

iconRegistry.forEach(consumeDefinition)
void colorfulDefinitions
void example
void missingCategory
void missingPaintMode
void publicComponents
void requiredMetadata
