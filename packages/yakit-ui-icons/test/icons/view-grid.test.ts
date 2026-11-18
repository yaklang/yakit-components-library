import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ViewGridOutlined } from '../../src/outline';
import { outline as outline } from '../helpers/sources';

describe('Outline/view-grid Figma contract', () => {
  it('preserves current source geometry when rendering', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../src/outline/1-2355.svg'),
      'utf8',
    );
    const rendered = renderToStaticMarkup(createElement(ViewGridOutlined));
    const raw = outline.records.find((row) => row.nodeId === '1:2355')!.raw.svg;
    const figmaPaths = [...raw.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1]);
    for (const svg of [source, rendered]) {
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).toContain('fill="none"');
      expect([...svg.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1])).toEqual(figmaPaths);
      expect([...svg.matchAll(/\bstroke-width="([^"]+)"/g)].map((match) => match[1])).toEqual(
        Array(figmaPaths.length).fill('1.5'),
      );
    }
  });
});
