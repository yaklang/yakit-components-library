import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { chromium } from 'playwright';
import { createServer } from 'vite';

const packageRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(packageRoot, '../..');
const outputRoot = resolve(
  packageRoot,
  'test/fixtures/icons/reference/stroke-runtime-prechange-v1',
);
const renderContractPath = resolve(
  packageRoot,
  'test/fixtures/icons/stroke-width-1/render-contract.json',
);
const sourceIdentityPath = resolve(
  repositoryRoot,
  '.omx/evidence/icon-stroke-adjustable/start-worktree.json',
);
const renderContract = JSON.parse(readFileSync(renderContractPath, 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const fileSha256 = (path) => sha256(readFileSync(path));
const run = (command, args, cwd = repositoryRoot) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const iconSourcePaths = [
  ...walk(resolve(packageRoot, 'src/icons')).filter((path) =>
    /(?:\.svg|\/loading\/index\.tsx)$/.test(path),
  ),
  resolve(packageRoot, 'config/svgReactTransform.ts'),
].sort();

mkdirSync(outputRoot, { recursive: true });

const server = await createServer({
  configFile: resolve(packageRoot, 'vite.config.ts'),
  logLevel: 'silent',
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
  executablePath: renderContract.renderer.browserExecutablePath,
  headless: true,
});

try {
  if (browser.version() !== renderContract.renderer.browserVersion) {
    throw new Error(
      `Renderer mismatch: expected ${renderContract.renderer.browserVersion}, received ${browser.version()}`,
    );
  }
  const origin = server.resolvedUrls?.local[0];
  if (!origin) throw new Error('Vite did not expose a local URL');

  const page = await browser.newPage({
    deviceScaleFactor: renderContract.raster.deviceScaleFactor,
    viewport: { height: 1100, width: 1280 },
  });
  await page.goto(new URL('fixtures/icons/icon-adjustable-baseline.html', origin).href);
  await page.waitForFunction(
    () => globalThis.document.documentElement.dataset.baselineReady === 'true',
  );

  const atlas = page.locator('#atlas');
  const records = await atlas.locator('[data-icon-name]').evaluateAll((cells) =>
    cells.map((cell) => {
      const svg = cell.querySelector('svg');
      if (!svg) throw new Error(`Missing SVG for ${cell.getAttribute('data-icon-name')}`);
      const cellRect = cell.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      return {
        atlas: {
          height: cellRect.height,
          width: cellRect.width,
          x: cellRect.x,
          y: cellRect.y,
        },
        family: cell.getAttribute('data-family'),
        name: cell.getAttribute('data-icon-name'),
        serializedSvg: svg.outerHTML,
        svgBounds: {
          height: svgRect.height,
          width: svgRect.width,
          x: svgRect.x - cellRect.x,
          y: svgRect.y - cellRect.y,
        },
      };
    }),
  );

  const familyCounts = Object.fromEntries(
    [...new Set(records.map(({ family }) => family))].map((family) => [
      family,
      records.filter((record) => record.family === family).length,
    ]),
  );
  const expectedCounts = { colorful: 296, loading: 1, oldicon: 380, outline: 359, solid: 255 };
  if (
    Object.entries(expectedCounts).some(
      ([family, expectedCount]) => familyCounts[family] !== expectedCount,
    )
  ) {
    throw new Error(
      `Public export inventory mismatch: ${JSON.stringify(familyCounts)} != ${JSON.stringify(expectedCounts)}`,
    );
  }

  const atlasPng = await atlas.screenshot({ animations: 'disabled', caret: 'hide' });
  const atlasPath = resolve(outputRoot, 'atlas.png');
  writeFileSync(atlasPath, atlasPng);
  const rgbaDigests = await page.evaluate(
    async ({ atlasBase64, recordRects }) => {
      const image = new globalThis.Image();
      image.src = `data:image/png;base64,${atlasBase64}`;
      await image.decode();
      const canvas = globalThis.document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas 2D context unavailable');
      context.drawImage(image, 0, 0);

      const digest = async (bytes) => {
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return [...new Uint8Array(hash)]
          .map((value) => value.toString(16).padStart(2, '0'))
          .join('');
      };
      const results = [];
      for (const rect of recordRects) {
        const rgba = context.getImageData(rect.x, rect.y, rect.width, rect.height).data;
        results.push(await digest(rgba));
      }
      return results;
    },
    {
      atlasBase64: atlasPng.toString('base64'),
      recordRects: records.map(({ atlas }) => atlas),
    },
  );

  const sourceFiles = Object.fromEntries(
    iconSourcePaths.map((path) => [relative(repositoryRoot, path), fileSha256(path)]),
  );
  const capturedAt = new Date().toISOString();
  const manifest = {
    schemaVersion: 'icon-adjustable-runtime-prechange-v1',
    immutable: true,
    capturedAt,
    inventory: {
      assetCount: 1278,
      familyCounts,
      publicExportCount: records.length,
    },
    renderer: renderContract.renderer,
    raster: {
      atlas: {
        background: '#F8F9FA',
        cellSize: 32,
        color: '#353639',
        deviceScaleFactor: renderContract.raster.deviceScaleFactor,
        file: 'atlas.png',
        sha256: sha256(atlasPng),
      },
      rgbaEncoding: 'unpremultiplied-sRGB RGBA, one 32x32 atlas cell per export',
    },
    provenance: {
      captureCommand:
        "PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node scripts/capture-icon-adjustable-baseline.mjs",
      captureScript: {
        path: relative(repositoryRoot, import.meta.filename),
        sha256: fileSha256(import.meta.filename),
      },
      fixtureEntry: {
        path: 'packages/yakit-ui/test/fixtures/icons/icon-adjustable-baseline-entry.tsx',
        sha256: fileSha256(
          resolve(packageRoot, 'test/fixtures/icons/icon-adjustable-baseline-entry.tsx'),
        ),
      },
      git: {
        dirtyDiffSha256: sha256(run('git', ['diff', '--binary'])),
        head: run('git', ['rev-parse', 'HEAD']),
      },
      lockfile: {
        path: 'pnpm-lock.yaml',
        sha256: fileSha256(resolve(repositoryRoot, 'pnpm-lock.yaml')),
      },
      packageVersions: {
        node: process.version,
        playwright: renderContract.renderer.playwrightVersion,
        pnpm: run('pnpm', ['--version']),
        vite: run('pnpm', ['exec', 'vite', '--version'], packageRoot),
      },
      renderContract: {
        path: relative(repositoryRoot, renderContractPath),
        sha256: fileSha256(renderContractPath),
      },
      sourceFiles,
      sourceFilesDigest: sha256(JSON.stringify(sourceFiles)),
      sourceIdentity: {
        path: relative(repositoryRoot, sourceIdentityPath),
        sha256: fileSha256(sourceIdentityPath),
      },
      transform: {
        path: 'packages/yakit-ui/config/svgReactTransform.ts',
        sha256: fileSha256(resolve(packageRoot, 'config/svgReactTransform.ts')),
      },
      viteConfig: {
        path: 'packages/yakit-ui/vite.config.ts',
        sha256: fileSha256(resolve(packageRoot, 'vite.config.ts')),
      },
    },
    records: records.map((record, index) => ({
      atlas: record.atlas,
      family: record.family,
      name: record.name,
      rgbaSha256: rgbaDigests[index],
      serializedSvg: record.serializedSvg,
      serializedSvgSha256: sha256(record.serializedSvg),
      svgBounds: record.svgBounds,
    })),
  };
  const manifestPath = resolve(outputRoot, 'manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    resolve(outputRoot, 'README.md'),
    `# Icon adjustable runtime pre-change baseline v1\n\n` +
      `Immutable runtime baseline captured before adjustable-stroke product edits.\n\n` +
      `- Captured: ${capturedAt}\n` +
      `- Public exports: ${records.length}\n` +
      `- Families: ${JSON.stringify(familyCounts)}\n` +
      `- Renderer: ${renderContract.renderer.browserProduct} ${browser.version()}\n` +
      `- Atlas SHA-256: ${sha256(atlasPng)}\n` +
      `- Manifest SHA-256: ${fileSha256(manifestPath)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        atlas: relative(repositoryRoot, atlasPath),
        atlasSha256: sha256(atlasPng),
        familyCounts,
        manifest: relative(repositoryRoot, manifestPath),
        manifestSha256: fileSha256(manifestPath),
        publicExportCount: records.length,
        renderer: browser.version(),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.close();
}
