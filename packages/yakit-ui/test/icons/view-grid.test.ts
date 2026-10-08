import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { OutlineViewGridIcon } from '../../src/icons/oldicon';
import { ViewGridOutlined } from '../../src/icons/outline';

// Figma QWct5XE0Bg0bNDQ93eYgEw, node 1:2355, read on October 8, 2026.
const figmaPaths = [
  'M4 6C4 4.89543 4.89543 4 6 4H8C9.10457 4 10 4.89543 10 6V8C10 9.10457 9.10457 10 8 10H6C4.89543 10 4 9.10457 4 8V6Z',
  'M14 6C14 4.89543 14.8954 4 16 4H18C19.1046 4 20 4.89543 20 6V8C20 9.10457 19.1046 10 18 10H16C14.8954 10 14 9.10457 14 8V6Z',
  'M4 16C4 14.8954 4.89543 14 6 14H8C9.10457 14 10 14.8954 10 16V18C10 19.1046 9.10457 20 8 20H6C4.89543 20 4 19.1046 4 18V16Z',
  'M14 16C14 14.8954 14.8954 14 16 14H18C19.1046 14 20 14.8954 20 16V18C20 19.1046 19.1046 20 18 20H16C14.8954 20 14 19.1046 14 18V16Z',
];

describe('Outline/view-grid Figma contract', () => {
  it('preserves the four hollow Figma cells in the source and rendered icon', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../src/icons/outline/1-2355.svg'),
      'utf8',
    );
    const rendered = renderToStaticMarkup(createElement(ViewGridOutlined));
    const legacy = renderToStaticMarkup(createElement(OutlineViewGridIcon));
    for (const svg of [source, rendered, legacy]) {
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).toContain('fill="none"');
      expect([...svg.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1])).toEqual(figmaPaths);
      expect([...svg.matchAll(/\bstroke-width="([^"]+)"/g)].map((match) => match[1])).toEqual(
        Array(4).fill('1.5'),
      );
    }
  });
});
