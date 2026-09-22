import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { outlineIconRegistry } from '../../src/icons/registry';
import designUpdates from '../fixtures/icons/reference/outline-design-updates-sep17.json';
import additions from '../fixtures/icons/reference/outline-additions-sep22.json';

const addedIconNames = new Set(
  [...designUpdates.updates, ...additions.updates]
    .filter(({ added }) => added)
    .map(({ exportName }) => exportName),
);

const defectNames = new Set([
  'ArchiveRestoreOutlined',
  'ArrowBigUpOutlined',
  'FileUpOutlined',
  'ExportOutlined',
  'StethoscopeOutlined',
  'AbandonOutlined',
  'Filter2Outlined',
  'Play2Outlined',
  'LogOutOutlined',
  'Link2OffOutlined',
  'Link2Figma28376288Outlined',
  'ArrowsCollapseOutlined',
  'Trash2Outlined',
  'RobotOutlined',
  'CompilationOutlined',
  'Compilation2Outlined',
  'FlowOutlined',
  'ScreenshotOutlined',
  'ScreenShareOutlined',
  'ScreenShareOffOutlined',
  'PositionOutlined',
  'List2Outlined',
  'List1Outlined',
  'PillOutlined',
  'AnnotationCloseOutlined',
  'EngineOutlined',
  'LoadingOutlined',
  'ImportOutlined',
  'ChromeOutlined',
  'RemoteOutlined',
  'PlugsOutlined',
  'LogOutlined',
  'Log2Outlined',
  'LinkoutOutlined',
  'Link2Outlined',
  'BugOutlined',
  'StarOutlined',
  'PaperAirplaneOutlined',
  'EmojiHappyOutlined',
  'EmojiSadOutlined',
  'ThumbUpOutlined',
  'ThumbDownOutlined',
]);
const notebookGroupNames = new Set([
  'NotebookOutlined',
  'Notebook2Outlined',
  'RotateCcwOutlined',
  'FeatherOutlined',
  'HardDriveDownloadOutlined',
  'RotateCcwSquareOutlined',
  'BookMarkedOutlined',
  'BookMarked2Outlined',
  'TimerOutlined',
]);
const roots: Root[] = [];

const render = (node: React.ReactNode) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  flushSync(() => root.render(node));
  return container;
};
const expectNonPlaceholder24pxSvgs = (svgs: SVGSVGElement[]) => {
  for (const svg of svgs) {
    const reachableDrawables = [
      ...svg.querySelectorAll<SVGGraphicsElement>(
        'path, circle, ellipse, line, polyline, polygon, use, rect',
      ),
    ].filter((element) => !element.closest('defs, clipPath, mask'));
    const placeholder = reachableDrawables.find(
      (element) =>
        element.tagName.toLowerCase() === 'rect' &&
        element.getAttribute('width') === '24' &&
        element.getAttribute('height') === '24' &&
        element.getAttribute('fill') === '#D9D9D9',
    );
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(reachableDrawables.length).toBeGreaterThan(0);
    expect(placeholder).toBeUndefined();
  }
};

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount());
  document.body.replaceChildren();
});

describe('Outline remediation visual smoke', () => {
  it('renders exactly 42 remediated existing icons as non-placeholder 24px SVGs', () => {
    const defects = outlineIconRegistry.filter(({ exportName }) => defectNames.has(exportName));
    const container = render(
      <>
        {defects.map(({ Component, exportName }) => (
          <Component key={exportName} />
        ))}
      </>,
    );
    const svgs = [...container.querySelectorAll<SVGSVGElement>('svg')];

    expect(defects).toHaveLength(42);
    expect(svgs).toHaveLength(42);
    expectNonPlaceholder24pxSvgs(svgs);
  });

  it('renders the corrected Notebook and eight added icons as non-placeholder 24px SVGs', () => {
    const notebookGroup = outlineIconRegistry.filter(({ exportName }) =>
      notebookGroupNames.has(exportName),
    );
    const container = render(
      <>
        {notebookGroup.map(({ Component, exportName }) => (
          <Component key={exportName} />
        ))}
      </>,
    );
    const svgs = [...container.querySelectorAll<SVGSVGElement>('svg')];

    expect(notebookGroup).toHaveLength(9);
    expect(svgs).toHaveLength(9);
    expectNonPlaceholder24pxSvgs(svgs);
  });

  it('keeps the 298 frozen controls in the public registry', () => {
    const controls = outlineIconRegistry.filter(
      ({ exportName }) =>
        !defectNames.has(exportName) &&
        !notebookGroupNames.has(exportName) &&
        !addedIconNames.has(exportName) &&
        exportName !== 'LandPlotOutlined',
    );

    expect(controls).toHaveLength(298);
  });
});
