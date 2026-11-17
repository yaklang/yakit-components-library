import { createGzip } from 'node:zlib';
import { once } from 'node:events';
import {
  mkdir,
  mkdtemp,
  cp,
  readFile,
  realpath,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

import { build } from 'vite';

const compatibilityRule = ':where(.anticon.yakit-icon)';
const loadingKeyframe = 'yakitIconLoadingSpin_b1a35c158267';

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(absolutePath)));
    else if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

async function gzipSize(source) {
  const chunks = [];
  const gzip = createGzip();
  gzip.on('data', (chunk) => chunks.push(chunk));
  gzip.end(source);
  await once(gzip, 'end');
  return Buffer.concat(chunks).byteLength;
}

async function installPackedView({ fixtureRoot, packageName, packageRoot }) {
  const packageView = path.join(fixtureRoot, 'node_modules', ...packageName.split('/'));
  await mkdir(packageView, { recursive: true });
  await cp(path.join(packageRoot, 'dist'), path.join(packageView, 'dist'), {
    recursive: true,
  });
  await cp(path.join(packageRoot, 'package.json'), path.join(packageView, 'package.json'));

  const require = createRequire(path.join(packageRoot, 'package.json'));
  const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  if (manifest.dependencies?.['@yakit-libs/yakit-ui-icons']) {
    const iconsRoot = path.resolve(
      path.dirname(require.resolve('@yakit-libs/yakit-ui-icons/icon.css')),
      '..',
    );
    const iconsView = path.join(fixtureRoot, 'node_modules/@yakit-libs/yakit-ui-icons');
    await mkdir(iconsView, { recursive: true });
    await cp(path.join(iconsRoot, 'dist'), path.join(iconsView, 'dist'), { recursive: true });
    await cp(path.join(iconsRoot, 'package.json'), path.join(iconsView, 'package.json'));
  }
  const reactRoot = path.dirname(require.resolve('react/package.json'));
  const reactLink = path.join(fixtureRoot, 'node_modules', 'react');
  await symlink(reactRoot, reactLink, process.platform === 'win32' ? 'junction' : 'dir');
}

async function runNodeSsr({ packageName, packageRoot, specifier, exportName }) {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'yakit-icon-node-'));
  try {
    await installPackedView({ fixtureRoot, packageName, packageRoot });

    const corePackage = path.resolve(packageRoot, 'package.json');
    const require = createRequire(corePackage);
    const reactUrl = pathToFileURL(require.resolve('react')).href;
    const reactDomServerUrl = pathToFileURL(require.resolve('react-dom/server')).href;
    const source = [
      `import React from ${JSON.stringify(reactUrl)};`,
      `import { renderToString } from ${JSON.stringify(reactDomServerUrl)};`,
      `import { ${exportName} } from ${JSON.stringify(specifier)};`,
      `const html = renderToString(React.createElement(${exportName}));`,
      `if (!html.includes("<svg")) throw new Error("SSR output does not contain an SVG");`,
      `process.stdout.write(html);`,
    ].join('\n');
    await writeFile(path.join(fixtureRoot, 'ssr.mjs'), source);

    const child = spawn(process.execPath, ['ssr.mjs'], {
      cwd: fixtureRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk));
    child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
    const [exitCode] = await once(child, 'exit');
    if (exitCode !== 0) {
      throw new Error(`Node SSR import failed (${exitCode}): ${stderr || stdout}`);
    }
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}

async function runBrowserBundle({ entries, packageName, packageRoot }) {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'yakit-icon-browser-'));
  try {
    await installPackedView({ fixtureRoot, packageName, packageRoot });

    const imports = entries.map(
      ({ exportName, specifier }, index) =>
        `import { ${exportName} as Icon${index} } from ${JSON.stringify(specifier)};`,
    );
    const references = entries.map((_, index) => `Icon${index}`).join(', ');
    await writeFile(
      path.join(fixtureRoot, 'entry.js'),
      `${imports.join('\n')}\nwindow.__yakitIcons = [${references}];\n`,
    );

    await build({
      build: {
        emptyOutDir: true,
        lib: {
          cssFileName: 'fixture',
          entry: path.join(fixtureRoot, 'entry.js'),
          formats: ['es'],
          name: 'YakitIconCssGateFixture',
        },
        minify: true,
        outDir: path.join(fixtureRoot, 'dist'),
        rollupOptions: {
          external: (id) => id === 'react' || id.startsWith('react/'),
        },
        write: true,
      },
      configFile: false,
      logLevel: 'silent',
      resolve: { conditions: ['browser', 'module', 'import'] },
      root: fixtureRoot,
    });

    const outputFiles = await collectFiles(path.join(fixtureRoot, 'dist'));
    const cssFiles = outputFiles.filter((file) => file.endsWith('.css'));
    if (cssFiles.length !== 1) {
      throw new Error(`browser bundle must emit exactly one CSS asset, found ${cssFiles.length}`);
    }
    const css = await readFile(cssFiles[0], 'utf8');
    const packagedCss = await readFile(path.join(packageRoot, 'dist/icon.css'), 'utf8');
    const packagedRuleCount = packagedCss.split(compatibilityRule).length - 1;
    if (packagedRuleCount < 1 || css.split(compatibilityRule).length - 1 !== packagedRuleCount) {
      throw new Error('browser bundle must contain exactly one compatibility rule block');
    }
    if (css.split(`@keyframes ${loadingKeyframe}`).length - 1 !== 1) {
      throw new Error('browser bundle must contain exactly one Loading keyframe');
    }

    const jsFiles = outputFiles.filter((file) => /\.m?js$/.test(file));
    if (jsFiles.length === 0) {
      throw new Error('browser fixture emitted no JavaScript entry');
    }
    const jsSources = await Promise.all(jsFiles.map((file) => readFile(file)));
    const js = jsSources.reduce((total, source) => total + source.byteLength, 0);
    const gzip = await gzipSize(Buffer.concat(jsSources));
    return { gzip, raw: js };
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}

async function runBrowserSplitBundle({ initial, lazy, packageName, packageRoot }) {
  const fixtureRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), 'yakit-icon-split-')));
  try {
    await installPackedView({ fixtureRoot, packageName, packageRoot });
    await writeFile(
      path.join(fixtureRoot, 'index.html'),
      '<div id="app"></div><script type="module" src="/entry.js"></script>\n',
    );
    await writeFile(
      path.join(fixtureRoot, 'entry.js'),
      [
        `import { ${initial.exportName} } from ${JSON.stringify(initial.specifier)};`,
        `window.__yakitInitialIcon = ${initial.exportName};`,
        'window.__loadYakitLazyIcon = () => import("./lazy.js");',
      ].join('\n'),
    );
    await writeFile(
      path.join(fixtureRoot, 'lazy.js'),
      [
        `import { ${lazy.exportName} } from ${JSON.stringify(lazy.specifier)};`,
        `window.__yakitLazyIcon = ${lazy.exportName};`,
      ].join('\n'),
    );

    const buildResult = await build({
      build: {
        emptyOutDir: true,
        minify: true,
        outDir: path.join(fixtureRoot, 'dist'),
        rollupOptions: {
          external: (id) => id === 'react' || id.startsWith('react/'),
        },
        write: false,
      },
      configFile: false,
      logLevel: 'silent',
      resolve: { conditions: ['browser', 'module', 'import'] },
      root: fixtureRoot,
    });
    const outputs = (Array.isArray(buildResult) ? buildResult : [buildResult]).flatMap(
      (result) => result.output,
    );
    const chunks = outputs.filter((output) => output.type === 'chunk');
    const chunkByFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
    const entryChunk = chunks.find((chunk) => chunk.isEntry);
    if (!entryChunk) throw new Error('split fixture emitted no entry chunk');

    const staticClosure = new Set();
    const visitStatic = (chunk) => {
      if (!chunk || staticClosure.has(chunk.fileName)) return;
      staticClosure.add(chunk.fileName);
      for (const imported of chunk.imports) visitStatic(chunkByFile.get(imported));
    };
    visitStatic(entryChunk);
    const moduleSuffix = (entry) => `/dist/oldicon/icons/${entry.exportName}.js`;
    const chunksContaining = (entry) =>
      chunks.filter((chunk) =>
        Object.keys(chunk.modules).some((id) =>
          id.replaceAll('\\', '/').endsWith(moduleSuffix(entry)),
        ),
      );
    const initialChunks = chunksContaining(initial);
    const lazyChunks = chunksContaining(lazy);
    if (
      initialChunks.length !== 1 ||
      initialChunks.every((chunk) => !staticClosure.has(chunk.fileName))
    ) {
      throw new Error('initial oldicon is missing from the static entry closure');
    }
    if (lazyChunks.length !== 1 || lazyChunks.some((chunk) => staticClosure.has(chunk.fileName))) {
      throw new Error('lazy oldicon leaked into the static entry closure');
    }

    const html = outputs.find(
      (output) => output.type === 'asset' && output.fileName === 'index.html',
    );
    if (!html || typeof html.source !== 'string') {
      throw new Error('split fixture emitted no index.html asset');
    }
    const htmlSource = html.source;
    if (lazyChunks.some((chunk) => htmlSource.includes(chunk.fileName))) {
      throw new Error('lazy oldicon leaked into index.html modulepreload output');
    }
    return {
      initialStaticChunks: initialChunks.map((chunk) => chunk.fileName),
      lazyChunks: lazyChunks.map((chunk) => chunk.fileName),
    };
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
}

function resolveExportContract(exportMap, subpath) {
  if (exportMap[subpath]) return exportMap[subpath];
  for (const [pattern, contract] of Object.entries(exportMap)) {
    const wildcard = pattern.indexOf('*');
    if (wildcard < 0) continue;
    const prefix = pattern.slice(0, wildcard);
    const suffix = pattern.slice(wildcard + 1);
    if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) continue;
    const replacement = subpath.slice(prefix.length, subpath.length - suffix.length);
    return Object.fromEntries(
      Object.entries(contract).map(([condition, target]) => [
        condition,
        target.replace('*', replacement),
      ]),
    );
  }
  return undefined;
}

export async function verifyIconCssGate({ entries, packageName, packageRoot }) {
  const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const failures = [];

  if (
    JSON.stringify(manifest.sideEffects) !== JSON.stringify(['**/*.css', 'dist/browser/**/*.js'])
  ) {
    failures.push('sideEffects must contain only CSS and browser facade patterns');
  }

  const forwarding = Boolean(manifest.dependencies?.['@yakit-libs/yakit-ui-icons']);
  let css = await readFile(path.join(packageRoot, 'dist/icon.css'), 'utf8');
  if (forwarding) {
    if (css.trim() !== '@import "@yakit-libs/yakit-ui-icons/icon.css";')
      failures.push('UI icon.css must forward to the icon package stylesheet');
    const require = createRequire(path.join(packageRoot, 'package.json'));
    css = await readFile(require.resolve('@yakit-libs/yakit-ui-icons/icon.css'), 'utf8');
  }
  if (
    !css.includes(compatibilityRule) ||
    !css.includes('--yakit-icon-default-color') ||
    !css.includes(loadingKeyframe)
  ) {
    failures.push('dist/icon.css is missing compatibility rules or the Loading keyframe');
  }

  for (const { specifier, subpath } of entries) {
    const contract = resolveExportContract(manifest.exports ?? {}, subpath);
    if (!contract?.browser || !contract?.import || !contract?.types) {
      failures.push(`${subpath} must expose types, browser, and import conditions`);
      continue;
    }
    const browserSource = await readFile(path.join(packageRoot, contract.browser), 'utf8');
    if (
      (!forwarding && !browserSource.includes('icon.css')) ||
      !browserSource.includes('export * from')
    ) {
      failures.push(`${subpath} browser facade must import icon.css and re-export runtime JS`);
    }
    const runtimeSource = await readFile(path.join(packageRoot, contract.import), 'utf8');
    if (forwarding && !runtimeSource.includes('@yakit-libs/yakit-ui-icons')) {
      failures.push(`${subpath} UI runtime must forward to the public icon package`);
    }
    if (/\.css["']/.test(runtimeSource)) {
      failures.push(`${subpath} Node import fallback must not import CSS`);
    }
    if (specifier !== (subpath === '.' ? packageName : `${packageName}/${subpath.slice(2)}`)) {
      failures.push(`${subpath} fixture specifier does not match the package export`);
    }
  }

  if (failures.length === 0) {
    try {
      await Promise.all(entries.map((entry) => runNodeSsr({ packageName, packageRoot, ...entry })));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  let bundleEvidence;
  let splitEvidence;
  if (failures.length === 0) {
    try {
      await runBrowserBundle({ entries, packageName, packageRoot });
      const singleIcon = await runBrowserBundle({
        entries: [entries.find(({ subpath }) => subpath.endsWith('outline')) ?? entries[0]],
        packageName,
        packageRoot,
      });
      if (singleIcon.raw > 15_000 || singleIcon.gzip > 5_000) {
        failures.push(
          `single-icon JS exceeds budget: ${singleIcon.raw} raw / ${singleIcon.gzip} gzip`,
        );
      }
      bundleEvidence = singleIcon;
      const aggregateOldicons = entries.filter(({ subpath }) => subpath === './oldicon');
      if (aggregateOldicons.length >= 2) {
        splitEvidence = await runBrowserSplitBundle({
          initial: aggregateOldicons[0],
          lazy: aggregateOldicons[1],
          packageName,
          packageRoot,
        });
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (failures.length === 0 && bundleEvidence) {
    console.log(
      `${packageName} CSS gate verified: one CSS asset, Node SSR CSS-free, ` +
        `single-icon JS ${bundleEvidence.raw} raw / ${bundleEvidence.gzip} gzip.`,
    );
    if (splitEvidence) {
      console.log(
        `${packageName} oldicon split gate verified: ` +
          `${splitEvidence.initialStaticChunks.length} initial / ` +
          `${splitEvidence.lazyChunks.length} lazy chunk(s).`,
      );
    }
  }

  return failures;
}
