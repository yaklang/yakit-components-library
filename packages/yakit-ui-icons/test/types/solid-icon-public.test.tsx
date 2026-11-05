import { solidIconRegistry } from '../../src/registry';
import type { ComponentType } from 'react';

import {
  DownloadFigma12825Solid,
  ImportSolid,
  DragSortSolid,
  FloatingSolid,
  ParkAboveSolid,
  ParkBelowSolid,
  ParkRightSolid,
  ParkLeftSolid,
  PaintbrushSolid,
  PaperAirplaneSolid,
  PillSolid,
  type IconProps,
} from '../../src';
import * as SolidIcons from '../../src/solid';

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
    <DragSortSolid aria-label="drag sort" color="#123456" size={20} />
    <PaperAirplaneSolid color="inherit" size="1em" />
    <PaintbrushSolid className="paintbrush" />
    <PillSolid style={{ color: '#654321' }} />
    <ImportSolid aria-label="import" />
    <FloatingSolid />
    <ParkLeftSolid />
    <ParkRightSolid />
    <ParkAboveSolid />
    <ParkBelowSolid />
    <DownloadFigma12825Solid />
  </>
);

void examples;
void publicComponents;
void registry;
