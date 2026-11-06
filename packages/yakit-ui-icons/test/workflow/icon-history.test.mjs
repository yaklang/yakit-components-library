import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { verifyRelocation } from '../../scripts/verify-relocation.mjs';

test('history verification allows maintained configuration changes but rejects frozen evidence drift', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yakit-icon-history-'));
  const files = [
    'scripts/outline-geometry-overrides.json',
    'scripts/figma-basic-icons-inventory.json',
    'src/outline/example.svg',
    'test/fixtures/icons/reference/review.json',
    'test/components/__screenshots__/example.png',
    'docs/icon-history/review.md',
  ];
  const original = 'frozen migration bytes';
  try {
    await mkdir(path.join(root, 'docs'), { recursive: true });
    await writeFile(
      path.join(root, 'docs/source-relocation.json'),
      JSON.stringify({
        files: files.map((file) => ({
          from: `packages/yakit-ui/${file}`,
          to: `packages/yakit-ui-icons/${file}`,
          immutable: true,
          sha256: createHash('sha256').update(original).digest('hex'),
        })),
      }),
    );
    for (const file of files) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), original);
    }
    assert.equal(verifyRelocation(root), 3);
    for (const file of files.slice(0, 3)) await writeFile(path.join(root, file), 'current source');
    assert.equal(verifyRelocation(root), 3);
    for (const file of files.slice(3)) {
      await writeFile(path.join(root, file), 'unexpected drift');
      assert.throws(() => verifyRelocation(root), /Historical artifact changed/);
      await writeFile(path.join(root, file), original);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
