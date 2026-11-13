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

describe('Outline icon paint semantics in Chromium', { timeout: 15000 }, () => {
  it('preserves default, color prop, style precedence, and explicit inheritance', async () => {
    const page = await browser.newPage();
    await page.goto(fixtureUrl);
    await page.getByTestId('sun-default').waitFor();
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

  it('preserves the native white overdraw on dark and transparent backgrounds', async () => {
    const page = await browser.newPage();
    await page.goto(fixtureUrl);
    await page.getByTestId('sun-default').waitFor();
    const results = await page.evaluate(() => {
      const inspect = (testId: string) => {
        const host = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)!;
        const svg = host.querySelector('svg')!;
        const white = svg.querySelector<SVGPathElement>('path[stroke="white"]')!;
        const strokes = [...svg.querySelectorAll<SVGPathElement>('path[stroke="currentColor"]')];
        return {
          background: getComputedStyle(host).backgroundColor,
          masks: svg.querySelectorAll('mask').length,
          whiteStroke: getComputedStyle(white).stroke,
          whiteWidth: getComputedStyle(white).strokeWidth,
          foreground: strokes.map((path) => getComputedStyle(path).stroke),
          foregroundWidths: strokes.map((path) => getComputedStyle(path).strokeWidth),
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
      expect(result.masks).toBe(0);
      expect(result.whiteStroke).toBe('rgb(255, 255, 255)');
      expect(result.whiteWidth).toBe('1.5px');
      expect(new Set(result.foreground)).toEqual(new Set(['rgb(243, 244, 246)']));
      expect(new Set(result.foregroundWidths)).toEqual(new Set(['1.5px']));
    }
    expect(results.starDark.background).toBe('rgb(17, 24, 39)');
    expect(results.rocketDark.background).toBe('rgb(17, 24, 39)');
    expect(results.starTransparent.background).toBe('rgba(0, 0, 0, 0)');
    expect(results.rocketTransparent.background).toBe('rgba(0, 0, 0, 0)');
    await page.close();
  });

  it('keeps DataCompare secondary strokes at half opacity for default, custom and inherited colors', async () => {
    const page = await browser.newPage();
    await page.goto(fixtureUrl);
    await page.getByTestId('sun-default').waitFor();
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
        const relativePath = svg.querySelector<SVGPathElement>('path[opacity="0.5"][stroke]')!;
        return {
          base: toHex(getComputedStyle(svg).color),
          opacity: getComputedStyle(relativePath).opacity,
          secondary: toHex(getComputedStyle(relativePath).stroke),
        };
      };
      return {
        default: inspect('data-compare-default'),
        custom: inspect('data-compare-custom'),
        inherit: inspect('data-compare-inherit'),
        supported: CSS.supports('color', 'rgb(from currentColor r g b)'),
      };
    });

    expect(results.default).toEqual({ base: '#353639', opacity: '0.5', secondary: '#353639' });
    expect(results.custom).toEqual({ base: '#123456', opacity: '0.5', secondary: '#123456' });
    expect(results.inherit).toEqual({ base: '#0A0A0A', opacity: '0.5', secondary: '#0A0A0A' });
    await page.close();
  });
});
