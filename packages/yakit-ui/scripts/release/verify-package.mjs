import { access, lstat, readFile, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { verifyIconCssGate } from '../../../yakit-ui-icons/scripts/verify-css-gate.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
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

if (failures.length > 0) {
  console.error('yakit-ui package outputs are not ready:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('Run "pnpm --filter @yakit-libs/yakit-ui build:package" before packing.');
  process.exitCode = 1;
} else {
  console.log('yakit-ui package outputs verified.');
}
