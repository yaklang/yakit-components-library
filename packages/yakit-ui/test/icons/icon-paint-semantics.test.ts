import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, type Browser } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
let browser: Browser;
let server: ViteDevServer;
let fixtureUrl: string;

beforeAll(async () => {
  server = await createServer({
    configFile: resolve(packageRoot, 'vite.config.ts'),
    logLevel: 'silent',
    root: resolve(packageRoot, 'test'),
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  await server.listen();
  const origin = server.resolvedUrls?.local[0];
  if (!origin) throw new Error('Vite test server did not expose a local URL');
  fixtureUrl = new URL('icons/fixtures/icon-paint-semantics.html', origin).href;
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    headless: true,
  });
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

describe('Outline icon paint semantics in Chromium', () => {
  it('preserves default, color prop, style precedence, and explicit inheritance', async () => {
    const page = await browser.newPage();
    await page.goto(fixtureUrl);
    const colors = await page.evaluate(() => {
      const color = (testId: string) =>
        getComputedStyle(document.querySelector<SVGSVGElement>(`[data-testid="${testId}"]`)!).color;
      return {
        ear: [color('ear-default'), color('ear-custom'), color('ear-style'), color('ear-inherit')],
        rocketStyle: color('rocket-style'),
        sun: [color('sun-default'), color('sun-custom'), color('sun-style'), color('sun-inherit')],
      };
    });

    expect(colors.sun).toEqual([
      'rgb(10, 10, 10)',
      'rgb(18, 52, 86)',
      'rgb(101, 67, 33)',
      'rgb(12, 34, 56)',
    ]);
    expect(colors.ear).toEqual(colors.sun);
    expect(colors.rocketStyle).toBe('rgb(101, 67, 33)');
    await page.close();
  });

  it('uses owned luminance masks and currentColor slashes on dark and transparent backgrounds', async () => {
    const page = await browser.newPage();
    await page.goto(fixtureUrl);
    const results = await page.evaluate(() => {
      const inspect = (testId: string) => {
        const host = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)!;
        const svg = host.querySelector('svg')!;
        const mask = svg.querySelector('mask')!;
        const maskedGroup = svg.querySelector<SVGGElement>('g[mask]')!;
        const reference = maskedGroup.getAttribute('mask')?.match(/^url\(#(.+)\)$/)?.[1];
        const foregroundWhite = [...svg.querySelectorAll<SVGElement>('[color], [fill], [stroke]')]
          .filter((element) => !element.closest('defs'))
          .some((element) =>
            ['color', 'fill', 'stroke'].some(
              (attribute) => element.getAttribute(attribute)?.toLowerCase() === 'white',
            ),
          );
        const slash = [...svg.querySelectorAll<SVGPathElement>('path')].find(
          (path) => !path.closest('defs') && !path.closest('g[mask]'),
        );
        return {
          background: getComputedStyle(host).backgroundColor,
          foregroundWhite,
          maskId: mask.id,
          maskPaint: mask.querySelector('path')?.getAttribute('stroke'),
          maskType: mask.getAttribute('mask-type'),
          ownedReference: reference === mask.id,
          slashPaint: slash?.getAttribute('stroke'),
          slashStroke: slash ? getComputedStyle(slash).stroke : null,
        };
      };
      return {
        rocketDark: inspect('rocket-dark'),
        rocketTransparent: inspect('rocket-transparent'),
        starDark: inspect('star-dark'),
        starTransparent: inspect('star-transparent'),
      };
    });

    for (const result of Object.values(results)) {
      expect(result.foregroundWhite).toBe(false);
      expect(result.maskPaint).toBe('black');
      expect(result.maskType).toBe('luminance');
      expect(result.ownedReference).toBe(true);
      expect(result.slashPaint).toBe('currentColor');
      expect(result.slashStroke).toBe('rgb(243, 244, 246)');
    }
    expect(results.starDark.background).toBe('rgb(17, 24, 39)');
    expect(results.rocketDark.background).toBe('rgb(17, 24, 39)');
    expect(results.starTransparent.background).toBe('rgba(0, 0, 0, 0)');
    expect(results.rocketTransparent.background).toBe('rgba(0, 0, 0, 0)');
    expect(new Set(Object.values(results).map(({ maskId }) => maskId)).size).toBe(4);
    await page.close();
  });

  it('keeps DataCompare relative-currentColor behavior with a monochrome fallback', async () => {
    const page = await browser.newPage();
    await page.goto(fixtureUrl);
    const results = await page.evaluate(() => {
      const toHex = (color: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext('2d')!;
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return `#${[...context.getImageData(0, 0, 1, 1).data]
          .slice(0, 3)
          .map((channel) => channel.toString(16).padStart(2, '0'))
          .join('')}`.toUpperCase();
      };
      const inspect = (testId: string) => {
        const svg = document.querySelector<SVGSVGElement>(`[data-testid="${testId}"]`)!;
        const relativePath = svg.querySelector<SVGPathElement>('path[color^="rgb(from"]')!;
        return {
          base: toHex(getComputedStyle(svg).color),
          formula: relativePath.getAttribute('color'),
          relative: toHex(getComputedStyle(relativePath).color),
        };
      };
      return {
        default: inspect('data-compare-default'),
        custom: inspect('data-compare-custom'),
        inherit: inspect('data-compare-inherit'),
        supported: CSS.supports('color', 'rgb(from currentColor r g b)'),
      };
    });

    const formula = 'rgb(from currentColor calc(r + 139) calc(g + 144) calc(b + 152))';
    expect(browser.version()).toMatch(/^151\./);
    expect(results.supported).toBe(true);
    expect(results.default).toEqual({ base: '#353639', formula, relative: '#C0C6D1' });
    expect(results.custom).toEqual({ base: '#123456', formula, relative: '#9DC4EE' });
    expect(results.inherit).toEqual({ base: '#0A0A0A', formula, relative: '#959AA2' });
    // Browsers without relative-color syntax ignore the element-level declaration, so
    // currentColor remains a safe monochrome compatibility fallback outside this pinned gate.
    await page.close();
  });
});
