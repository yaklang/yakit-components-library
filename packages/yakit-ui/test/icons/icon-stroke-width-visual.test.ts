import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';

import { loadingStrokeWidthDefault } from '../../scripts/icon-stroke-width.mjs';
import before from '../fixtures/icons/stroke-width-1/before.json';
import contract from '../fixtures/icons/stroke-width-1/render-contract.json';
import visualWeightReviews from '../fixtures/icons/reference/visual-weight-v2/reviews.json';

const root = process.cwd();
const reportRoot = resolve(root, 'test-results/icons/stroke-width-1');
const widthOnlyOracle = (source: string) =>
  source.replace(/stroke-width=(['"])[^'"]+\1/g, 'stroke-width="1"');

describe('current unit-width independent pixel oracle', () => {
  it('matches every changed SVG and Loading exactly, including risk samples at multiple sizes', async () => {
    const records = before.assets.map((record) => {
      const actual = readFileSync(resolve(root, 'src', record.afterPath), 'utf8');
      const review = visualWeightReviews.reviews.find(
        (item) => record.afterPath === `icons/outline/${item.file}`,
      );
      if (review) {
        expect(review.status).toBe('promoted');
        expect(review.reviewVerdict).toBe('pass');
        expect(review.oldSourceSha256).toBe(record.afterSha256);
        expect(createHash('sha256').update(actual).digest('hex')).toBe(
          review.candidateSourceSha256,
        );
      }
      return {
        name: record.sourcePath,
        expected: review ? review.serializedSvg : widthOnlyOracle(record.beforeSvg),
        actual,
        original: record.beforeSvg,
      };
    });
    const loadingSource = readFileSync(resolve(root, 'src/icons/loading/index.tsx'), 'utf8');
    const loadingWidth = loadingStrokeWidthDefault(loadingSource);
    expect(loadingWidth).toBe('1');
    const loadingD = /d="([^"]+)"/.exec(loadingSource)?.[1];
    records.push({
      name: 'icons/loading/index.tsx',
      original: before.loadingBeforeSvg,
      expected: widthOnlyOracle(before.loadingBeforeSvg),
      actual: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="${loadingD}" stroke="currentColor" stroke-width="${loadingWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    });
    expect(records).toHaveLength(544);
    const browser = await chromium.launch({
      executablePath: contract.renderer.browserExecutablePath,
      headless: true,
    });
    try {
      expect(browser.version()).toBe(contract.renderer.browserVersion);
      const page = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: { width: 1100, height: 800 },
      });
      const risks = [
        ...records.filter(({ name }) => name.startsWith('icons/solid/')),
        ...records.filter(({ original }) => /stroke-width="0\./.test(original)).slice(0, 8),
        ...records.filter(({ original }) => /<mask|<linearGradient/.test(original)).slice(0, 4),
        ...records.filter(({ name }) => name.startsWith('icons/oldicon/')).slice(0, 4),
        ...records.filter(({ name }) => name.startsWith('icons/outline/')).slice(0, 4),
        records[records.length - 1],
      ];
      const uniqueRisks = [...new Map(risks.map((row) => [row.name, row])).values()];
      const measurements = await page.evaluate(
        async ({ records, risks }) => {
          const raster = async (source: string, size: number | null, background: string) => {
            const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
            if (svg.nodeName === 'parsererror') throw new Error('SVG parse failure');
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            const box = (svg.getAttribute('viewBox') ?? '0 0 24 24').split(/[\s,]+/).map(Number);
            const width = Number(svg.getAttribute('width')) || box[2] || 24;
            const height = Number(svg.getAttribute('height')) || box[3] || 24;
            svg.setAttribute('style', `${svg.getAttribute('style') ?? ''};color:#353639`);
            const image = new Image();
            const loaded = new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () => reject(new Error('SVG raster failure'));
            });
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
            await loaded;
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(size ?? width);
            canvas.height = Math.ceil(size ? (size * height) / width : height);
            const context = canvas.getContext('2d')!;
            context.fillStyle = background;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            return context.getImageData(0, 0, canvas.width, canvas.height).data;
          };
          const results = [];
          const compare = async (
            record: (typeof records)[number],
            size: number | null,
            background: string,
          ) => {
            const expected = await raster(record.expected, size, background);
            const actual = await raster(record.actual, size, background);
            if (expected.length !== actual.length)
              throw new Error(`Raster dimensions changed: ${record.name}`);
            let differingChannels = 0;
            for (let i = 0; i < expected.length; i++)
              if (expected[i] !== actual[i]) differingChannels++;
            return { name: record.name, size: size ?? 'native', background, differingChannels };
          };
          for (const record of records) results.push(await compare(record, null, '#f8f9fa'));
          for (const record of risks)
            for (const size of [16, 20, 24, 32])
              for (const background of ['#ffffff', '#202124'])
                results.push(await compare(record, size, background));
          return results;
        },
        { records, risks: uniqueRisks },
      );
      mkdirSync(reportRoot, { recursive: true });
      writeFileSync(
        resolve(reportRoot, 'measurements.json'),
        `${JSON.stringify(
          {
            schemaVersion: 1,
            algorithm: 'independent-width-only-pixel-oracle-v1',
            renderer: contract.renderer,
            deviceScaleFactor: 1,
            measurements,
          },
          null,
          2,
        )}\n`,
      );
      expect(measurements.filter(({ differingChannels }) => differingChannels !== 0)).toEqual([]);
      await page.setContent(
        '<body style="margin:0;background:#f8f9fa;font:12px sans-serif"><main></main></body>',
      );
      await page.evaluate(async (risks) => {
        const main = document.querySelector('main')!;
        main.setAttribute(
          'style',
          'display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px',
        );
        for (const record of risks) {
          const card = document.createElement('section');
          card.setAttribute('style', 'border:1px solid #ccc;padding:8px;overflow:hidden');
          const title = document.createElement('div');
          title.textContent = record.name.split('/').slice(-2).join('/');
          title.style.overflowWrap = 'anywhere';
          card.append(title);
          const pixels: Uint8ClampedArray[] = [];
          for (const [label, source] of [
            ['Before', record.original],
            ['Width 1', record.actual],
          ]) {
            const holder = document.createElement('div');
            holder.setAttribute(
              'style',
              'display:inline-flex;align-items:center;width:48%;height:80px;gap:4px;color:#353639',
            );
            const caption = document.createElement('small');
            caption.textContent = label;
            const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('style', `${svg.getAttribute('style') ?? ''};color:#353639`);
            // Separate images isolate duplicate fragment IDs between before/after samples.
            const image = new Image(48, 48);
            const loaded = new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () => reject(new Error('Contact sheet image failed'));
            });
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
            await loaded;
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 48;
            const context = canvas.getContext('2d')!;
            context.drawImage(image, 0, 0, 48, 48);
            pixels.push(context.getImageData(0, 0, 48, 48).data);
            holder.append(caption, image);
            card.append(holder);
          }
          const diff = document.createElement('canvas');
          diff.width = diff.height = 48;
          diff.title = 'Red pixels show before-to-after differences';
          const context = diff.getContext('2d')!;
          const difference = context.createImageData(48, 48);
          for (let i = 0; i < difference.data.length; i += 4) {
            if ([0, 1, 2, 3].some((channel) => pixels[0][i + channel] !== pixels[1][i + channel])) {
              difference.data[i] = 230;
              difference.data[i + 3] = 255;
            }
          }
          context.putImageData(difference, 0, 0);
          card.append('Difference ', diff);
          main.append(card);
        }
      }, uniqueRisks);
      await page.screenshot({ path: resolve(reportRoot, 'before-after.png'), fullPage: true });
    } finally {
      await browser.close();
    }
  }, 120000);
});
