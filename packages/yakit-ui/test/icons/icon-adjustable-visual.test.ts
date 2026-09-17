import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { chromium } from 'playwright';
import { createServer } from 'vite';
import { describe, expect, it } from 'vitest';

import reviewedCellCapture from '../fixtures/icons/adjustable-stroke/reviewed-cell-capture.json';
import reviewedRasterExceptions from '../fixtures/icons/adjustable-stroke/reviewed-raster-exceptions.json';
import designUpdates from '../fixtures/icons/reference/outline-design-updates-sep17.json';
import baseline from '../fixtures/icons/reference/stroke-runtime-prechange-v1/manifest.json';
import visualWeightReviews from '../fixtures/icons/reference/visual-weight-v2/reviews.json';

const packageRoot = resolve(import.meta.dirname, '../..');
const repositoryRoot = resolve(packageRoot, '../..');
const baselineRoot = resolve(
  packageRoot,
  'test/fixtures/icons/reference/stroke-runtime-prechange-v1',
);
const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const canonicalizeInstanceIds = (svg: string) =>
  svg.replace(/__[0-9a-f_]+(?=["')])/g, '__INSTANCE');
const reviewedException = (family: string | null, name: string | null) =>
  reviewedRasterExceptions.exceptions.find(
    (exception) => exception.family === family && exception.name === name,
  );

describe('adjustable icon pre-change runtime baseline', () => {
  it('matches reviewed visual targets and preserves all other default runtime pixels', async () => {
    const atlasPath = resolve(baselineRoot, baseline.raster.atlas.file);
    expect(sha256(readFileSync(atlasPath))).toBe(baseline.raster.atlas.sha256);
    expect(baseline.inventory).toEqual({
      assetCount: 1278,
      familyCounts: { colorful: 296, loading: 1, oldicon: 380, outline: 350, solid: 255 },
      publicExportCount: 1282,
    });
    expect(new Set(baseline.records.map(({ family, name }) => `${family}:${name}`)).size).toBe(
      1282,
    );

    const plugsOutlineEntry = `/@fs${resolve(packageRoot, 'src/icons/outline/index.tsx')}`;
    const plugsEvidenceHtml = `<!doctype html><body style="margin:0"><div id="cell" style="align-items:center;background:#F8F9FA;color:#353639;display:flex;height:32px;justify-content:center;overflow:hidden;width:32px"></div><script type="module">
      import React from 'react'; import { createRoot } from 'react-dom/client'; import { PlugsOutlined } from ${JSON.stringify(plugsOutlineEntry)};
      createRoot(document.getElementById('cell')).render(React.createElement(PlugsOutlined,{size:24}));
      requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.dataset.ready='true'));
    </script>`;
    const server = await createServer({
      configFile: resolve(packageRoot, 'vite.config.ts'),
      logLevel: 'silent',
      plugins: [
        {
          name: 'icon-adjustable-plugs-evidence',
          configureServer(viteServer) {
            viteServer.middlewares.use(
              '/icon-adjustable-plugs-evidence.html',
              async (request, response) => {
                response.setHeader('Content-Type', 'text/html');
                response.end(
                  await viteServer.transformIndexHtml(
                    request.originalUrl ?? '/',
                    plugsEvidenceHtml,
                  ),
                );
              },
            );
          },
        },
      ],
      root: resolve(packageRoot, 'test'),
      server: {
        fs: { allow: [repositoryRoot] },
        host: '127.0.0.1',
        port: 0,
        strictPort: false,
      },
    });
    await server.listen();
    const browser = await chromium.launch({
      executablePath: baseline.renderer.browserExecutablePath,
      headless: true,
    });
    try {
      expect(browser.version()).toBe(baseline.renderer.browserVersion);
      const origin = server.resolvedUrls?.local[0];
      if (!origin) throw new Error('Vite did not expose a local URL');
      const page = await browser.newPage({
        deviceScaleFactor: baseline.raster.atlas.deviceScaleFactor,
        viewport: { height: 1100, width: 1280 },
      });
      await page.goto(new URL('fixtures/icons/icon-adjustable-baseline.html', origin).href);
      await page.waitForFunction(() => document.documentElement.dataset.baselineReady === 'true');
      // Restore the frozen atlas positions; additions have their own Figma geometry checks.
      await page.evaluate(
        (names) => {
          for (const cell of document.querySelectorAll('[data-family="outline"]'))
            if (names.includes(cell.getAttribute('data-icon-name') ?? '')) cell.remove();
        },
        designUpdates.updates.filter(({ added }) => added).map(({ exportName }) => exportName),
      );
      const atlas = page.locator('#atlas');
      const actualRecords = await atlas.locator('[data-icon-name]').evaluateAll((cells) =>
        cells.map((cell) => ({
          family: cell.getAttribute('data-family'),
          name: cell.getAttribute('data-icon-name'),
          serializedSvg: cell.querySelector('svg')?.outerHTML ?? '',
        })),
      );
      const actualAtlas = await atlas.screenshot({ animations: 'disabled', caret: 'hide' });
      const cellCaptureIndex = baseline.records.findIndex(
        ({ family, name }) => `${family}:${name}` === reviewedCellCapture.identity,
      );
      expect(cellCaptureIndex).toBeGreaterThanOrEqual(0);
      expect(reviewedCellCapture.reviewVerdict).toBe('renderer-capture-variance-confirmed');
      expect(reviewedCellCapture.browser.actualVersion).toBe(browser.version());
      expect(sha256(readFileSync(resolve(repositoryRoot, reviewedCellCapture.source.path)))).toBe(
        reviewedCellCapture.source.sha256,
      );
      expect(sha256(actualRecords[cellCaptureIndex].serializedSvg)).toBe(
        reviewedCellCapture.frozen.serializedSvgSha256,
      );
      expect(baseline.records[cellCaptureIndex].rgbaSha256).toBe(
        reviewedCellCapture.frozen.rgbaSha256,
      );
      // Chrome's whole-atlas compositor varies for this unchanged path. A cell capture
      // at the same position must still match every frozen pixel, without tolerance.
      const reviewedCellPng = await atlas
        .locator('[data-icon-name]')
        .nth(cellCaptureIndex)
        .screenshot({ animations: 'disabled', caret: 'hide' });
      const actualRgba = await page.evaluate(
        async ({
          actualAtlasBase64,
          baselineAtlasBase64,
          rects,
          cellCaptureIndex,
          reviewedCellBase64,
        }) => {
          const loadImage = async (base64: string) => {
            const image = new Image();
            image.src = `data:image/png;base64,${base64}`;
            await image.decode();
            return image;
          };
          const [image, baselineImage, reviewedCellImage] = await Promise.all([
            loadImage(actualAtlasBase64),
            loadImage(baselineAtlasBase64),
            loadImage(reviewedCellBase64),
          ]);
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Canvas 2D context unavailable');
          context.drawImage(image, 0, 0);
          const baselineCanvas = document.createElement('canvas');
          baselineCanvas.width = baselineImage.naturalWidth;
          baselineCanvas.height = baselineImage.naturalHeight;
          const baselineContext = baselineCanvas.getContext('2d', { willReadFrequently: true });
          if (!baselineContext) throw new Error('Baseline canvas 2D context unavailable');
          baselineContext.drawImage(baselineImage, 0, 0);
          const reviewedCellCanvas = document.createElement('canvas');
          reviewedCellCanvas.width = reviewedCellImage.naturalWidth;
          reviewedCellCanvas.height = reviewedCellImage.naturalHeight;
          const reviewedCellContext = reviewedCellCanvas.getContext('2d');
          if (!reviewedCellContext) throw new Error('Reviewed cell canvas unavailable');
          reviewedCellContext.drawImage(reviewedCellImage, 0, 0);
          const digest = async (bytes: Uint8ClampedArray) => {
            const hash = await crypto.subtle.digest('SHA-256', bytes);
            return [...new Uint8Array(hash)]
              .map((value) => value.toString(16).padStart(2, '0'))
              .join('');
          };
          return Promise.all(
            rects.map(async ({ height, width, x, y }, index) => {
              const actual =
                index === cellCaptureIndex
                  ? reviewedCellContext.getImageData(0, 0, width, height).data
                  : context.getImageData(x, y, width, height).data;
              const expected = baselineContext.getImageData(x, y, width, height).data;
              let changedChannels = 0;
              let maxChannelDelta = 0;
              const changed: Array<{
                actual: number;
                channel: number;
                expected: number;
                x: number;
                y: number;
              }> = [];
              for (let index = 0; index < actual.length; index += 1) {
                const delta = Math.abs(actual[index] - expected[index]);
                if (delta > 0) {
                  changedChannels += 1;
                  if (changed.length < 8) {
                    changed.push({
                      actual: actual[index],
                      channel: index % 4,
                      expected: expected[index],
                      x: Math.floor((index / 4) % width),
                      y: Math.floor(index / 4 / width),
                    });
                  }
                }
                maxChannelDelta = Math.max(maxChannelDelta, delta);
              }
              return { changed, changedChannels, maxChannelDelta, sha256: await digest(actual) };
            }),
          );
        },
        {
          actualAtlasBase64: actualAtlas.toString('base64'),
          cellCaptureIndex,
          reviewedCellBase64: reviewedCellPng.toString('base64'),
          baselineAtlasBase64: readFileSync(atlasPath).toString('base64'),
          rects: baseline.records.map(({ atlas }) => atlas),
        },
      );

      const plugsIndex = baseline.records.findIndex(
        ({ family, name }) => family === 'outline' && name === 'PlugsOutlined',
      );
      const plugsPage = await browser.newPage({
        deviceScaleFactor: baseline.raster.atlas.deviceScaleFactor,
        viewport: { height: 64, width: 64 },
      });
      await plugsPage.goto(new URL('icon-adjustable-plugs-evidence.html', origin).href);
      await plugsPage.waitForFunction(() => document.documentElement.dataset.ready === 'true');
      const plugsCell = plugsPage.locator('#cell');
      const currentPlugsMarkup = await plugsCell.evaluate((cell) => ({
        contents: cell.innerHTML,
        svg: cell.querySelector('svg')?.outerHTML ?? '',
      }));
      const frozenPlugsSvg = baseline.records[plugsIndex].serializedSvg;
      expect(currentPlugsMarkup.svg, 'Plugs frozen/current serialized SVG').toBe(frozenPlugsSvg);
      const currentPlugsPng = await plugsCell.screenshot();
      await plugsCell.evaluate(
        (cell, contents) => {
          cell.innerHTML = contents;
        },
        currentPlugsMarkup.contents.replace(currentPlugsMarkup.svg, frozenPlugsSvg),
      );
      await plugsPage.evaluate(
        () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
      );
      const frozenPlugsPng = await plugsCell.screenshot();
      const plugsSideBySideRgba = await plugsPage.evaluate(
        async ([currentBase64, frozenBase64]) => {
          const digest = async (base64: string) => {
            const image = new Image();
            image.src = `data:image/png;base64,${base64}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) throw new Error('Plugs comparison canvas unavailable');
            context.drawImage(image, 0, 0);
            const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
            const hash = await crypto.subtle.digest('SHA-256', rgba);
            return [...new Uint8Array(hash)]
              .map((value) => value.toString(16).padStart(2, '0'))
              .join('');
          };
          return Promise.all([digest(currentBase64), digest(frozenBase64)]);
        },
        [currentPlugsPng.toString('base64'), frozenPlugsPng.toString('base64')],
      );
      expect(plugsSideBySideRgba[0], 'Plugs frozen/current same-position RGBA').toBe(
        plugsSideBySideRgba[1],
      );
      await plugsPage.close();

      expect(actualRecords.map(({ family, name }) => `${family}:${name}`)).toEqual(
        baseline.records.map(({ family, name }) => `${family}:${name}`),
      );
      const targetRgba = await page.evaluate(
        async (targets) => {
          return Promise.all(
            targets.map(async (base64) => {
              const image = new Image();
              image.src = `data:image/png;base64,${base64}`;
              await image.decode();
              const canvas = document.createElement('canvas');
              canvas.width = image.width;
              canvas.height = image.height;
              const context = canvas.getContext('2d');
              if (!context) throw new Error('Target canvas unavailable');
              context.drawImage(image, 0, 0);
              const rgba = context.getImageData(0, 0, image.width, image.height).data;
              const digest = await crypto.subtle.digest('SHA-256', rgba);
              return [...new Uint8Array(digest)]
                .map((byte) => byte.toString(16).padStart(2, '0'))
                .join('');
            }),
          );
        },
        visualWeightReviews.reviews.map((review) =>
          readFileSync(
            resolve(
              packageRoot,
              'test/fixtures/icons/reference/visual-weight-v2',
              review.targetPng.path,
            ),
          ).toString('base64'),
        ),
      );
      const svgMismatches: string[] = [];
      const pixelMismatches: string[] = [];
      for (const [index, expected] of baseline.records.entries()) {
        if (expected.family === 'outline' && expected.name === 'BugOutlined') continue;
        const identity = `${expected.family}:${expected.name}`;
        const designUpdate =
          expected.family === 'outline'
            ? designUpdates.updates.find(({ exportName }) => exportName === expected.name)
            : undefined;
        if (designUpdate) {
          const paths = (svg: string) =>
            [...svg.matchAll(/\bd="([^"]*)"/g)].map((match) => match[1]);
          expect(paths(actualRecords[index].serializedSvg), identity).toEqual(
            paths(designUpdate.assetSvg),
          );
          expect(paths(expected.serializedSvg), identity).toEqual(
            paths(designUpdate.previousLocalSvg!),
          );
          continue;
        }
        const targetIndex =
          expected.family === 'outline'
            ? visualWeightReviews.reviews.findIndex((review) => review.exportName === expected.name)
            : -1;
        if (targetIndex >= 0) {
          const review = visualWeightReviews.reviews[targetIndex];
          expect(review.status, identity).toBe('promoted');
          expect(
            sha256(readFileSync(resolve(packageRoot, 'src/icons/outline', review.file))),
            identity,
          ).toBe(review.candidateSourceSha256);
          expect(canonicalizeInstanceIds(actualRecords[index].serializedSvg), identity).toBe(
            canonicalizeInstanceIds(review.serializedSvg),
          );
          expect(targetRgba[targetIndex], `${identity}: target PNG`).toBe(review.rgbaSha256);
          expect(actualRgba[index].sha256, `${identity}: reviewed default pixels`).toBe(
            review.rgbaSha256,
          );
          continue;
        }
        if (
          canonicalizeInstanceIds(actualRecords[index].serializedSvg) !==
          canonicalizeInstanceIds(expected.serializedSvg)
        ) {
          svgMismatches.push(identity);
        }
        if (actualRgba[index].sha256 !== expected.rgbaSha256) {
          const reviewed = reviewedException(expected.family, expected.name);
          const sourceSha256 = reviewed
            ? sha256(readFileSync(resolve(repositoryRoot, reviewed.sourcePath)))
            : undefined;
          const changedPixelsMatch =
            reviewed?.changed.length === actualRgba[index].changed.length &&
            reviewed.changed.every((change, changeIndex) => {
              const actualChange = actualRgba[index].changed[changeIndex];
              return (
                change.actual === actualChange.actual &&
                change.channel === actualChange.channel &&
                change.expected === actualChange.expected &&
                change.x === actualChange.x &&
                change.y === actualChange.y
              );
            });
          if (
            !reviewed ||
            reviewed.sourceSha256 !== sourceSha256 ||
            reviewed.baselineRgbaSha256 !== expected.rgbaSha256 ||
            reviewed.repeatedRgbaSha256 !== actualRgba[index].sha256 ||
            reviewed.changedChannels !== actualRgba[index].changedChannels ||
            reviewed.maxChannelDelta !== actualRgba[index].maxChannelDelta ||
            !changedPixelsMatch
          ) {
            pixelMismatches.push(`${identity}:${JSON.stringify(actualRgba[index])}`);
          }
        }
      }
      expect(svgMismatches, 'unexpected default serialized SVG changes').toEqual([]);
      expect(pixelMismatches, 'unexpected default raster changes').toEqual([]);
    } finally {
      await browser.close();
      await server.close();
    }
  }, 60_000);
});
