import type { ComponentType } from 'react';

import {
  DownloadFigma12825Solid,
  FigmaIcon16035380989Solid,
  FigmaIcon2281144183Solid,
  FigmaIcon4936115787Solid,
  FigmaIcon4936115788Solid,
  FigmaIcon4936115789Solid,
  FigmaIcon4936115790Solid,
  PaintbrushSolid,
  PaperAirplaneSolid,
  PillSolid,
  solidIconRegistry,
  type IconProps,
} from '../../src';
import * as SolidIcons from '../../src/icons/solid';

const publicComponents = SolidIcons satisfies Record<string, ComponentType<IconProps>>;
// @ts-expect-error The legacy Filled suffix is intentionally not part of the public API.
void SolidIcons.HomeFilled;
const registry = solidIconRegistry satisfies Array<{
  Component: ComponentType<IconProps>;
  exportName: string;
  family: 'solid';
  figmaName: string | null;
  name: string;
  sourceNodeId: string;
  sourceStatus: 'current' | 'supplement' | 'unnamed-in-figma' | 'legacy-non-current-figma';
}>;

const examples = (
  <>
    <FigmaIcon2281144183Solid aria-label="drag sort" color="#123456" size={20} />
    <PaperAirplaneSolid color="inherit" size="1em" />
    <PaintbrushSolid className="paintbrush" />
    <PillSolid style={{ color: '#654321' }} />
    <FigmaIcon16035380989Solid aria-label="import" />
    <FigmaIcon4936115787Solid />
    <FigmaIcon4936115790Solid />
    <FigmaIcon4936115789Solid />
    <FigmaIcon4936115788Solid />
    <DownloadFigma12825Solid />
  </>
);

void examples;
void publicComponents;
void registry;
