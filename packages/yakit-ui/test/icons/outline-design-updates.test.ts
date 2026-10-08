import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import * as Icons from '../../src/icons';
import { outlineIconRegistry } from '../../src/icons/registry';
import updates from '../fixtures/icons/reference/outline-design-updates-sep17.json';

describe('September Figma outline design updates', () => {
  it('includes both changed icons and all six additions', () => {
    expect(updates.updates.map(({ exportName }) => exportName)).toEqual([
      'SparklesOutlined',
      'LightBulbOutlined',
      'HourglassOutlined',
      'GitMergeOutlined',
      'LoaderPinwheelOutlined',
      'FolderArchiveOutlined',
      'FileArchiveOutlined',
      'Sparkles2Outlined',
    ]);
    expect(updates.updates.filter(({ added }) => added)).toHaveLength(6);
  });

  it.each(updates.updates)('preserves exact Figma path geometry for $exportName', (update) => {
    const local = readFileSync(resolve('src/icons/outline', update.file), 'utf8');
    const paths = (svg: string) => [...svg.matchAll(/\bd="([^"]*)"/g)].map((match) => match[1]);
    expect(paths(local)).toEqual(paths(update.assetSvg));
    expect(local).toBe(
      update.componentSvg
        .replaceAll('#353639', 'currentColor')
        .replaceAll('stroke-width="2"', 'stroke-width="1.5"'),
    );
    expect(local).toContain('viewBox="0 0 24 24"');
    if (update.exportName === 'HourglassOutlined')
      expect(local).toContain('transform="translate(4 1)"');
  });

  it.each(updates.updates)(
    'exposes $exportName with adjustable strokes and Storybook metadata',
    (update) => {
      const entry = outlineIconRegistry.find(({ exportName }) => exportName === update.exportName);
      expect(entry?.figmaName).toBe(update.figmaName);
      expect(entry?.Component).toBe(Icons[update.exportName as keyof typeof Icons]);
      for (const strokeWidth of [undefined, 0, 1.5, 2, 3]) {
        const markup = renderToStaticMarkup(
          createElement(entry!.Component, { svgProps: { strokeWidth } }),
        );
        const strokes = [...markup.matchAll(/stroke-width="([^"]*)"/g)].map((match) => match[1]);
        expect(strokes.length).toBeGreaterThan(0);
        expect(new Set(strokes)).toEqual(new Set([String(strokeWidth ?? 1.5)]));
        expect(markup).toContain('stroke="currentColor"');
      }
    },
  );
});
