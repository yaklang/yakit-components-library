import { access, lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  findRemovedUiRuntimeReferences,
  REMOVED_UI_RUNTIMES,
  scanRemovedUiRuntimesInTrees,
} from '../../../../scripts/release/removed-ui-runtime-scan.mjs';
import { findNodeNextIncompatibleSpecifiers } from './fix-declaration-imports.mjs';
import { verifyIconCssGate } from '../../../yakit-ui-icons/scripts/verify-css-gate.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryRoot = path.resolve(packageRoot, '../..');
const requiredFiles = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/index.css',
  'dist/icon.css',
  'dist/browser/icons/index.js',
  'dist/browser/icons/outline/index.js',
  'dist/browser/icons/solid/index.js',
  'dist/browser/icons/colorful/index.js',
  'dist/icons/colorful/index.js',
  'dist/icons/colorful/index.d.ts',
  'dist/bin/yakit-ui-storybook.mjs',
  'storybook-static/index.html',
  'README.md',
  'LICENSE',
];

const failures = [];
for (const relativePath of requiredFiles) {
  const absolutePath = path.join(packageRoot, relativePath);
  try {
    await access(absolutePath, constants.R_OK);
    const stat = await lstat(absolutePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      failures.push(`${relativePath} must be a regular file`);
    }
    const resolved = await realpath(absolutePath);
    if (!resolved.startsWith(`${packageRoot}${path.sep}`)) {
      failures.push(`${relativePath} resolves outside the package`);
    }
  } catch {
    failures.push(`${relativePath} is missing or unreadable`);
  }
}

const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
const expected = {
  name: '@yakit-libs/yakit-ui',
  bin: './dist/bin/yakit-ui-storybook.mjs',
  css: './dist/index.css',
};
if (manifest.name !== expected.name || manifest.private === true) {
  failures.push(`package must be the public ${expected.name} package`);
}

if (manifest.bin?.['yakit-ui-storybook'] !== expected.bin) {
  failures.push(`bin.yakit-ui-storybook must be ${expected.bin}`);
}
if (manifest.exports?.['./style.css'] !== expected.css) {
  failures.push(`exports["./style.css"] must be ${expected.css}`);
}
if (manifest.exports?.['./icons/icon.css'] !== './dist/icon.css') {
  failures.push('exports["./icons/icon.css"] must expose dist/icon.css');
}
if (JSON.stringify(manifest.sideEffects) !== JSON.stringify(['**/*.css', 'dist/browser/**/*.js'])) {
  failures.push('sideEffects must contain only CSS and browser facade patterns');
}
if (
  manifest.exports?.['./icons/colorful']?.import !== './dist/icons/colorful/index.js' ||
  manifest.exports?.['./icons/colorful']?.types !== './dist/icons/colorful/index.d.ts'
) {
  failures.push('exports["./icons/colorful"] must expose JavaScript and declarations');
}
if (manifest.publishConfig?.access !== 'public') {
  failures.push('publishConfig.access must be public');
}
if (manifest.publishConfig?.registry !== 'https://registry.npmjs.org/') {
  failures.push('publishConfig.registry must be https://registry.npmjs.org/');
}
if (manifest.license !== 'MIT') {
  failures.push('license must be MIT');
}
if (manifest.dependencies?.['@yakit-libs/color'] !== '1.4.1') {
  failures.push('@yakit-libs/color must be pinned to 1.4.1');
}
if (manifest.dependencies?.antd !== '^6.6.7') {
  failures.push('antd must be declared as the ^6.6.7 runtime dependency');
}
for (const dependencyType of [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'devDependencies',
]) {
  for (const name of REMOVED_UI_RUNTIMES) {
    if (manifest[dependencyType]?.[name]) {
      failures.push(`${name} must not be declared in ${dependencyType}`);
    }
  }
}
for (const includedPath of ['dist', 'storybook-static', 'README.md', 'LICENSE']) {
  if (!manifest.files?.includes(includedPath)) {
    failures.push(`files must include ${includedPath}`);
  }
}

try {
  const css = await readFile(path.join(packageRoot, expected.css), 'utf8');
  if (
    !css.includes('--Colors-Use-Neutral-Text-1-Title') ||
    !css.includes(':root') ||
    !/\[data-theme=(?:dark|"dark")\]/.test(css)
  ) {
    failures.push('dist/index.css must include the generated light and dark color 1.4.1 tokens');
  }
} catch {
  failures.push('dist/index.css color token contract is unreadable');
}

failures.push(
  ...(await verifyIconCssGate({
    entries: [
      {
        exportName: 'MailOutlined',
        specifier: '@yakit-libs/yakit-ui/icons',
        subpath: './icons',
      },
      {
        exportName: 'MailOutlined',
        specifier: '@yakit-libs/yakit-ui/icons/outline',
        subpath: './icons/outline',
      },
      {
        exportName: 'MailSolid',
        specifier: '@yakit-libs/yakit-ui/icons/solid',
        subpath: './icons/solid',
      },
      {
        exportName: 'MitmPrimaryMenuColorful',
        specifier: '@yakit-libs/yakit-ui/icons/colorful',
        subpath: './icons/colorful',
      },
    ],
    packageName: '@yakit-libs/yakit-ui',
    packageRoot,
  })),
);

try {
  const findings = await scanRemovedUiRuntimesInTrees([
    path.join(packageRoot, '.storybook'),
    path.join(packageRoot, 'config'),
    path.join(packageRoot, 'dist'),
    path.join(packageRoot, 'src'),
    path.join(packageRoot, 'storybook-static'),
  ]);
  for (const finding of findings) {
    failures.push(
      `${path.relative(packageRoot, finding.file)} resolves removed UI runtimes: ${finding.runtimes.join(', ')}`,
    );
  }
} catch {
  failures.push('source, config, dist, and Storybook removed-runtime scan could not be completed');
}

for (const sourceFile of [
  path.join(packageRoot, 'package.json'),
  path.join(packageRoot, 'vite.config.ts'),
  path.join(packageRoot, 'vitest.config.ts'),
  path.join(packageRoot, 'vitest.node.config.ts'),
  path.join(packageRoot, 'vitest.react18.config.ts'),
  path.join(repositoryRoot, 'package.json'),
]) {
  try {
    const runtimes = findRemovedUiRuntimeReferences(await readFile(sourceFile, 'utf8'));
    if (runtimes.length > 0) {
      failures.push(
        `${path.relative(repositoryRoot, sourceFile)} contains removed UI runtime tokens: ${runtimes.join(', ')}`,
      );
    }
  } catch {
    failures.push(`${path.relative(repositoryRoot, sourceFile)} removed-runtime scan failed`);
  }
}

try {
  const declarationFiles = [];
  const collectDeclarations = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await collectDeclarations(absolute);
      else if (entry.isFile() && entry.name.endsWith('.d.ts')) declarationFiles.push(absolute);
    }
  };
  await collectDeclarations(path.join(packageRoot, 'dist'));
  for (const declaration of declarationFiles) {
    const source = await readFile(declaration, 'utf8');
    const incompatible = findNodeNextIncompatibleSpecifiers(declaration, source);
    if (incompatible.length > 0) {
      failures.push(
        `${path.relative(packageRoot, declaration)} contains NodeNext-incompatible relative specifiers: ${incompatible.join(', ')}`,
      );
    }
  }
} catch {
  failures.push('dist declaration NodeNext scan could not be completed');
}

if (failures.length > 0) {
  console.error('yakit-ui package outputs are not ready:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('Run "pnpm --filter @yakit-libs/yakit-ui build:package" before packing.');
  process.exitCode = 1;
} else {
  console.log('yakit-ui package outputs verified.');
}
