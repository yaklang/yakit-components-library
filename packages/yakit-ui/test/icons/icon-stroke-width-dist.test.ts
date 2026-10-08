import { resolve } from 'node:path';

import { chromium } from 'playwright';
import React, { type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { describe, expect, it } from 'vitest';

import oldiconInventory from '../../src/icons/oldicon/inventory.json';
import renderContract from '../fixtures/icons/stroke-width-1/render-contract.json';

const packageRoot = resolve(import.meta.dirname, '../..');
const repositoryRoot = resolve(packageRoot, '../..');
const coreDist = resolve(packageRoot, 'dist');
const dedicatedDist = resolve(repositoryRoot, 'packages/yakit-ui-icons/dist');
const importBuilt = (path: string) => import(/* @vite-ignore */ path);
const builtPath = (root: string, path: string) => new URL(`file://${resolve(root, path)}`).href;

const componentEntries = (module: Record<string, unknown>) =>
  Object.entries(module).filter(
    (entry): entry is [string, ComponentType] =>
      typeof entry[1] === 'function' ||
      (typeof entry[1] === 'object' && entry[1] !== null && '$$typeof' in entry[1]),
  );

const expectDefaultWidthMarkup = (name: string, Component: ComponentType) => {
  const markup = renderToStaticMarkup(React.createElement(Component));
  expect(markup, name).toContain('<svg');
  const widths = [
    ...[...markup.matchAll(/\bstroke-width="([^"]+)"/g)].map((match) => match[1]),
    ...[...markup.matchAll(/\bstyle="[^"]*stroke-width:\s*([^;"\s]+)/g)].map((match) => match[1]),
  ];
  expect(
    widths.filter((width) => width !== '1.5'),
    name,
  ).toEqual([]);
};

describe('Built icon stroke-width contract', () => {
  it('keeps both package roots and family compatibility entries aligned', async () => {
    const coreRoot = await importBuilt(builtPath(coreDist, 'index.js'));
    const coreIcons = await importBuilt(builtPath(coreDist, 'icons/index.js'));
    const dedicatedRoot = await importBuilt(builtPath(dedicatedDist, 'index.js'));
    const families = [
      ['outline', 359],
      ['solid', 256],
      ['colorful', 296],
    ] as const;

    expect(Object.keys(coreIcons)).toHaveLength(912);
    expect(Object.keys(dedicatedRoot)).toEqual(Object.keys(coreIcons));
    expect(componentEntries(coreIcons)).toHaveLength(912);
    expect(componentEntries(dedicatedRoot)).toHaveLength(912);
    expectDefaultWidthMarkup('core-root:AcademicCapOutlined', coreRoot.AcademicCapOutlined);
    for (const [family, count] of families) {
      const core = await importBuilt(builtPath(coreDist, `icons/${family}/index.js`));
      const dedicated = await importBuilt(builtPath(dedicatedDist, `${family}/index.js`));
      expect(Object.keys(core), `core:${family}`).toHaveLength(count);
      expect(Object.keys(dedicated), `dedicated:${family}`).toEqual(Object.keys(core));
    }
    for (const [name, Component] of componentEntries(coreIcons)) {
      expectDefaultWidthMarkup(`core-icons:${name}`, Component);
    }
    for (const [name, Component] of componentEntries(dedicatedRoot)) {
      expectDefaultWidthMarkup(`dedicated-root:${name}`, Component);
    }
  });

  it('renders every dedicated Oldicon barrel and deep entry without CSS', async () => {
    const barrel = await importBuilt(builtPath(dedicatedDist, 'oldicon/index.js'));
    const exportNames = oldiconInventory.exports.map(({ exportName }) => exportName).sort();
    expect(Object.keys(barrel).sort()).toEqual(exportNames);

    for (const exportName of exportNames) {
      const Component = barrel[exportName] as ComponentType;
      expectDefaultWidthMarkup(`oldicon-barrel:${exportName}`, Component);
      const deep = await importBuilt(builtPath(dedicatedDist, `oldicon/icons/${exportName}.js`));
      expect(Object.keys(deep)).toEqual([exportName]);
      expectDefaultWidthMarkup(`oldicon-deep:${exportName}`, deep[exportName]);
    }
  });

  it('renders representative built browser entries at computed stroke-width 1.5', async () => {
    const modulePaths = [
      [coreDist, 'browser/icons/index.js', 'AcademicCapOutlined'],
      [coreDist, 'browser/icons/outline/index.js', 'AcademicCapOutlined'],
      [coreDist, 'browser/icons/solid/index.js', 'FloatingSolid'],
      [coreDist, 'browser/icons/colorful/index.js', 'BugOutlineColorful'],
      [dedicatedDist, 'browser/index.js', 'AcademicCapOutlined'],
      [dedicatedDist, 'browser/outline/index.js', 'AcademicCapOutlined'],
      [dedicatedDist, 'browser/solid/index.js', 'FloatingSolid'],
      [dedicatedDist, 'browser/colorful/index.js', 'BugOutlineColorful'],
      [dedicatedDist, 'browser/oldicon/index.js', 'RocketIcon'],
      [dedicatedDist, 'browser/oldicon/icons/RocketIcon.js', 'RocketIcon'],
    ].map(([root, path, exportName]) => ({
      exportName,
      url: `/@fs${resolve(root, path)}`,
    }));
    const html = `<!doctype html><div id="root"></div><script type="module">
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      const entries = ${JSON.stringify(modulePaths)};
      const modules = await Promise.all(entries.map(({ url }) => import(url)));
      const components = modules.map((module, index) => module[entries[index].exportName]);
      createRoot(document.getElementById('root')).render(
        React.createElement(React.Fragment, null, ...components.map((Component, index) =>
          React.createElement('div', { 'data-entry': index, key: index }, React.createElement(Component)))));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.__strokeResult = {
        entries: document.querySelectorAll('[data-entry]').length,
        widths: [...document.querySelectorAll('[stroke]')].map((node) => getComputedStyle(node).strokeWidth),
      };
    </script>`;
    const server = await createServer({
      configFile: false,
      logLevel: 'silent',
      optimizeDeps: { include: ['react', 'react-dom/client'] },
      plugins: [
        {
          name: 'stroke-width-dist-fixture',
          configureServer(viteServer) {
            viteServer.middlewares.use('/stroke-width-dist.html', async (request, response) => {
              response.setHeader('Content-Type', 'text/html');
              response.end(await viteServer.transformIndexHtml(request.originalUrl ?? '/', html));
            });
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
    const executablePath = renderContract.renderer.browserExecutablePath;
    expect(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH).toBe(executablePath);
    const browser = await chromium.launch({ executablePath, headless: true });
    try {
      expect(browser.version()).toBe(renderContract.renderer.browserVersion);
      const origin = server.resolvedUrls?.local[0];
      if (!origin) throw new Error('Vite dist fixture did not expose a local URL');
      const page = await browser.newPage({
        deviceScaleFactor: renderContract.raster.deviceScaleFactor,
      });
      await page.goto(new URL('stroke-width-dist.html', origin).href);
      const result = await page
        .waitForFunction(() => window.__strokeResult)
        .then((value) => value.jsonValue());
      expect(result.entries).toBe(modulePaths.length);
      expect(result.widths.length).toBeGreaterThan(0);
      expect(new Set(result.widths)).toEqual(new Set(['1.5px']));
    } finally {
      await browser.close();
      await server.close();
    }
  }, 30_000);
});
