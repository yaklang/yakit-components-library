import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { outlineIconRegistry } from '../../src/icons/registry';

const defectNames = new Set([
  'ArchiveRestoreOutlined',
  'ArrowBigUpOutlined',
  'FileUpOutlined',
  'FigmaIcon2017756Outlined',
  'StethoscopeOutlined',
  'FigmaIcon22915169930Outlined',
  'FigmaIcon2338925Outlined',
  'Play2Outlined',
  'FigmaIcon28011794Outlined',
  'Link2OffOutlined',
  'Link2Figma28376288Outlined',
  'ArrowsOutlined',
  'Trash2Outlined',
  'RobotOutlined',
  'FigmaIcon34227111184Outlined',
  'FigmaIcon34227111185Outlined',
  'FigmaIcon348196674Outlined',
  'FigmaIcon35020585Outlined',
  'ScreenShareOutlined',
  'ScreenShareOffOutlined',
  'PositionOutlined',
  'List2Outlined',
  'List1Outlined',
  'PillOutlined',
  'AnnotationCloseOutlined',
  'FigmaIcon4866167279Outlined',
  'FigmaIcon5237120699Outlined',
  'FigmaIcon6480193584Outlined',
  'ChromeOutlined',
  'FigmaIcon6708131177Outlined',
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
const roots: Root[] = [];

const render = (node: React.ReactNode) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  flushSync(() => root.render(node));
  return container;
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
  });

  it('keeps the 298 frozen controls in the public registry', () => {
    const controls = outlineIconRegistry.filter(
      ({ exportName }) =>
        !defectNames.has(exportName) &&
        exportName !== 'NotebookOutlined' &&
        exportName !== 'LandPlotOutlined',
    );

    expect(controls).toHaveLength(298);
  });
});
