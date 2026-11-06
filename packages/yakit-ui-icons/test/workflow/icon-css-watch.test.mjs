import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));

function nextBuild(watcher, change = async () => {}) {
  return new Promise((resolve, reject) => {
    const finish = (error) => {
      clearTimeout(timer);
      watcher.off('event', onEvent);
      if (error) reject(error);
      else resolve();
    };
    const onEvent = (event) => {
      if (event.code === 'ERROR') finish(event.error);
      if (event.code === 'END') finish();
    };
    const timer = setTimeout(() => finish(new Error('Icon watch rebuild timed out')), 10_000);
    watcher.on('event', onEvent);
    Promise.resolve().then(change).catch(finish);
  });
}

test('icon watch rebuilds CSS changes and retains them through source rebuilds', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yakit-icon-css-watch-'));
  let watcher;
  try {
    await cp(path.join(packageRoot, 'config'), path.join(root, 'config'), { recursive: true });
    await cp(path.join(packageRoot, 'vite.config.ts'), path.join(root, 'vite.config.ts'));
    await symlink(path.join(packageRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
    await writeFile(
      path.join(root, 'package.json'),
      '{"name":"icon-watch-fixture","type":"module"}',
    );
    for (const file of [
      'index.tsx',
      'registry.ts',
      'outline/index.tsx',
      'solid/index.tsx',
      'colorful/index.tsx',
      'oldicon/index.tsx',
      'oldicon/icons/Example.tsx',
    ]) {
      const target = path.join(root, 'src', file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, 'export const version = 1;\n');
    }
    const cssPath = path.join(root, 'icon.css');
    const initialCss = await readFile(path.join(packageRoot, 'icon.css'), 'utf8');
    await writeFile(cssPath, initialCss);
    watcher = await build({
      root,
      configFile: path.join(root, 'vite.config.ts'),
      logLevel: 'silent',
      build: { watch: {}, emptyOutDir: false },
    });
    await nextBuild(watcher);
    const readOutput = () => readFile(path.join(root, 'dist/icon.css'), 'utf8');
    assert.equal(await readOutput(), initialCss);

    const updatedCss = `${initialCss}\n.yakit-icon { --watch-probe: updated; }\n`;
    await nextBuild(watcher, () => writeFile(cssPath, updatedCss));
    assert.equal(await readOutput(), updatedCss);

    await nextBuild(watcher, () =>
      writeFile(path.join(root, 'src/outline/index.tsx'), 'export const version = 2;\n'),
    );
    assert.equal(await readOutput(), updatedCss);
    assert.match(await readFile(path.join(root, 'dist/outline/index.js'), 'utf8'), /= 2/);
  } finally {
    await watcher?.close();
    await rm(root, { recursive: true, force: true });
  }
});
