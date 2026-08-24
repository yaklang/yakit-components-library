import type { ComponentType } from 'react';

import {
  DownloadFigma12825Filled,
  FigmaIcon16035380989Filled,
  FigmaIcon2281144183Filled,
  FigmaIcon4936115787Filled,
  FigmaIcon4936115788Filled,
  FigmaIcon4936115789Filled,
  FigmaIcon4936115790Filled,
  PaintbrushFilled,
  PaperAirplaneFilled,
  PillFilled,
  solidIconRegistry,
  type IconProps,
} from '../../src';
import * as SolidIcons from '../../src/icons/solid';

const publicComponents = SolidIcons satisfies Record<string, ComponentType<IconProps>>;
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
    <FigmaIcon2281144183Filled aria-label="drag sort" color="#123456" size={20} />
    <PaperAirplaneFilled color="inherit" size="1em" />
    <PaintbrushFilled className="paintbrush" />
    <PillFilled style={{ color: '#654321' }} />
    <FigmaIcon16035380989Filled aria-label="import" />
    <FigmaIcon4936115787Filled />
    <FigmaIcon4936115790Filled />
    <FigmaIcon4936115789Filled />
    <FigmaIcon4936115788Filled />
    <DownloadFigma12825Filled />
  </>
);

void examples;
void publicComponents;
void registry;
