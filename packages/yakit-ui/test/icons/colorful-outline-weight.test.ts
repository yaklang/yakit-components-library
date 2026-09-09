import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { chromium } from 'playwright';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import * as Icons from '../../src/icons/colorful';
import corrections from '../fixtures/icons/reference/colorful-outline-weight.json';

const names = [
  'SpaceEngine',
  'ComprehensiveDirectoryScan',
  'DataComparison',
  'DnsLog',
  'TcpPortLog',
  'Report',
  'PortScan',
  'CodeAudit',
  'RuleManagement',
];
const digest = (source: string) => createHash('sha256').update(source).digest('hex');

describe('colorful outline visual weight corrections', () => {
  it('pins the reviewed sources without replacing original provenance', () => {
    expect(corrections.map(({ name }) => name).sort()).toEqual(names.toSorted());
    for (const correction of corrections) {
      const source = readFileSync(
        resolve(import.meta.dirname, '../../src', correction.file),
        'utf8',
      );
      expect(source, correction.name).toBe(correction.svg);
      expect(digest(source)).toBe(correction.sha256);
      expect(digest(correction.originalSvg)).toBe(correction.originalSha256);
    }
  });

  it('renders unit-width contours and keeps the DNS glyph counter open', async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const measurements = await page.evaluate(
        async (sources) => {
          const scale = 32;
          const results = [];
          for (const { name, svg, probe } of sources) {
            const image = new Image();
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 24 * scale;
            const context = canvas.getContext('2d')!;
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let thickness = 0;
            for (let step = Math.floor(probe.from * scale); step < probe.to * scale; step++) {
              const fixed = Math.floor(probe.at * scale);
              const x = probe.axis === 'x' ? step : fixed;
              const y = probe.axis === 'x' ? fixed : step;
              thickness += pixels[(y * canvas.width + x) * 4 + 3] / 255 / scale;
            }
            results.push({ name, thickness });
          }
          return results;
        },
        corrections.flatMap(({ name, probe, originalSvg }) => {
          const Component = Icons[`${name}OutlineColorful` as keyof typeof Icons];
          const markup = renderToStaticMarkup(createElement(Component));
          const svg = markup.slice(markup.indexOf('<svg'), markup.indexOf('</svg>') + 6);
          return [
            { name, svg, probe },
            { name: `original:${name}`, svg: originalSvg, probe },
          ];
        }),
      );
      for (const { name, thickness } of measurements) {
        if (name.startsWith('original:')) {
          expect(thickness, name).toBeGreaterThan(name === 'original:DnsLog' ? 0.1 : 1.4);
        } else {
          expect(thickness, name).toBeCloseTo(name === 'DnsLog' ? 0 : 1, 1);
        }
      }
    } finally {
      await browser.close();
    }
  });
});
