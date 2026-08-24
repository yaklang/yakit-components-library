import { access, lstat, readFile, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const requiredFiles = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/index.css',
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
if (manifest.publishConfig?.access !== 'public') {
  failures.push('publishConfig.access must be public');
}
if (manifest.publishConfig?.registry !== 'https://registry.npmjs.org/') {
  failures.push('publishConfig.registry must be https://registry.npmjs.org/');
}
if (manifest.license !== 'MIT') {
  failures.push('license must be MIT');
}
for (const includedPath of ['dist', 'storybook-static', 'README.md', 'LICENSE']) {
  if (!manifest.files?.includes(includedPath)) {
    failures.push(`files must include ${includedPath}`);
  }
}

if (failures.length > 0) {
  console.error('yakit-ui package outputs are not ready:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('Run "pnpm --filter @yakit-libs/yakit-ui build:package" before packing.');
  process.exitCode = 1;
} else {
  console.log('yakit-ui package outputs verified.');
}
