import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { chromium } from 'playwright';
import { createServer } from 'vite';
import { describe, expect, it } from 'vitest';

import { outline as outlineSource } from '../../../yakit-ui-icons/test/helpers/sources';
import type {} from '../../../yakit-ui-icons/test/fixtures/icons/icon-adjustable-consumer-entry';
import { outlineStrokeContract } from '../../../yakit-ui-icons/config/iconStrokeContract.generated';

const repairedNames = outlineSource.records
  .filter(
    ({ file }) =>
      outlineStrokeContract[file as keyof typeof outlineStrokeContract]?.classification ===
      'adjustable',
  )
  .map(({ exportName }) => exportName);

const packageRoot = resolve(import.meta.dirname, '../..');
const repositoryRoot = resolve(packageRoot, '../..');
const builtUrl = (root: string, path: string) => new URL(`file://${resolve(root, path)}`).href;
const inspectBuiltEntry = (url: string) => {
  const probe = `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    const module = await import(${JSON.stringify(url)});
    const names = ['HomeOutlined', ...${JSON.stringify(repairedNames)}, ...(module.Loading ? ['Loading'] : [])];
    const result = Object.fromEntries(names.map((name) => {
      const markup = renderToStaticMarkup(
        React.createElement(module[name], { svgProps: { strokeWidth: 3 } }),
      );
      const widths = [...markup.matchAll(/\\bstroke-width="([^"]+)"/g)].map((match) => match[1]);
      return [name, widths];
    }));
    process.stdout.write(JSON.stringify(result));
  `;
  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '--eval', probe], {
      cwd: packageRoot,
      encoding: 'utf8',
    }),
  ) as Record<string, string[]>;
};

describe('adjustable icon built consumer contract', () => {
  it('keeps core and dedicated package entries adjustable without CSS', async () => {
    const entries = [
      [resolve(packageRoot, 'dist'), 'index.js'],
      [resolve(packageRoot, 'dist'), 'icons/index.js'],
      [resolve(packageRoot, 'dist'), 'icons/outline/index.js'],
      [resolve(repositoryRoot, 'packages/yakit-ui-icons/dist'), 'index.js'],
      [resolve(repositoryRoot, 'packages/yakit-ui-icons/dist'), 'outline/index.js'],
    ] as const;

    for (const [root, path] of entries) {
      const result = inspectBuiltEntry(builtUrl(root, path));
      for (const [name, strokeWidths] of Object.entries(result)) {
        expect(new Set(strokeWidths), `${path}:${name}`).toEqual(new Set(['3']));
      }
    }
  });

  it('applies attribute and style overrides through built browser entries', async () => {
    const modulePaths = [
      [
        resolve(packageRoot, 'dist'),
        'browser/icons/index.js',
        ['HomeOutlined', 'Loading', ...repairedNames],
      ],
      [
        resolve(packageRoot, 'dist'),
        'browser/icons/outline/index.js',
        ['HomeOutlined', ...repairedNames],
      ],
      [
        resolve(repositoryRoot, 'packages/yakit-ui-icons/dist'),
        'browser/index.js',
        ['HomeOutlined', 'Loading', ...repairedNames],
      ],
      [
        resolve(repositoryRoot, 'packages/yakit-ui-icons/dist'),
        'browser/outline/index.js',
        ['HomeOutlined', ...repairedNames],
      ],
    ].map(([root, path, names]) => ({
      names,
      path,
      url: `/@fs${resolve(root as string, path as string)}`,
    }));
    const html = `<!doctype html><div id="root"></div>
      <script>window.__adjustableEntries = ${JSON.stringify(modulePaths)}</script>
      <script type="module" src="/@fs${resolve(repositoryRoot, 'packages/yakit-ui-icons/test/fixtures/icons/icon-adjustable-consumer-entry.ts')}"></script>`;
    const server = await createServer({
      configFile: false,
      logLevel: 'silent',
      // Dynamic built entries are outside the initial HTML scan. Prebundle their
      // React dependencies up front so discovery cannot reload a completed probe.
      optimizeDeps: {
        noDiscovery: true,
        include: ['react', 'react-dom/client', 'react/jsx-runtime'],
      },
      plugins: [
        {
          name: 'icon-adjustable-built-browser-fixture',
          configureServer(viteServer) {
            viteServer.middlewares.use(
              '/icon-adjustable-consumer.html',
              async (request, response) => {
                response.setHeader('Content-Type', 'text/html');
                response.end(await viteServer.transformIndexHtml(request.originalUrl ?? '/', html));
              },
            );
          },
        },
      ],
      root: packageRoot,
      server: {
        fs: { allow: [repositoryRoot] },
        host: '127.0.0.1',
        port: 0,
        strictPort: false,
      },
    });
    await server.listen();
    const browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      headless: true,
    });
    try {
      const origin = server.resolvedUrls?.local[0];
      if (!origin) throw new Error('Vite built browser fixture did not expose a local URL');
      const page = await browser.newPage();
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const requestErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('response', (response) => {
        if (response.status() >= 400) requestErrors.push(`${response.status()}:${response.url()}`);
      });
      await page.goto(new URL('icon-adjustable-consumer.html', origin).href);
      const results = await page
        .waitForFunction(() => window.__adjustableResult, undefined, { timeout: 15_000 })
        .then((value) => value.jsonValue())
        .catch(async (error) => {
          throw new Error(
            `${String(error)}; page errors: ${pageErrors.join(' | ')}; console errors: ${consoleErrors.join(' | ')}; requests: ${requestErrors.join(' | ')}; body: ${await page.locator('body').innerHTML()}`,
          );
        });
      if (!results) throw new Error('Built browser fixture did not return adjustable icon results');
      expect(results).toHaveLength(
        modulePaths.reduce((total, entry) => total + entry.names.length * 3, 0),
      );
      for (const result of results) {
        const expected =
          result.caseId === 'zero' ? '0px' : result.caseId === 'three' ? '3px' : '2px';
        expect(
          result.widths.length,
          `${result.entry}:${result.name}:${result.caseId}`,
        ).toBeGreaterThan(0);
        expect(new Set(result.widths), `${result.entry}:${result.name}:${result.caseId}`).toEqual(
          new Set([expected]),
        );
      }
    } finally {
      await browser.close();
      await server.close();
    }
  }, 30_000);
});
