import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { readIconInputSync } from '../../scripts/icon-source-documents.mjs';

import { iconCounts } from './icon-inventory';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const trackedRoots = [
  resolve(packageRoot, 'scripts/audit-icons.mjs'),
  resolve(packageRoot, 'scripts/icon-audit-contracts.mjs'),
  resolve(packageRoot, 'config/icon-sources/solid.json'),
  resolve(packageRoot, 'src/icons/solid'),
  resolve(packageRoot, 'src/icons/solid/index.tsx'),
  resolve(packageRoot, 'config/icon-sources/solid.json'),
  resolve(packageRoot, 'config/icon-sources/solid.json'),
  resolve(packageRoot, 'test/fixtures/icons/reference/solid-local-prechange-controls-v1.json'),
];
const snapshot = () => {
  const result: Record<string, string> = {};
  const visit = (entry: string) => {
    if (statSync(entry).isDirectory()) {
      for (const child of readdirSync(entry).sort()) visit(resolve(entry, child));
      return;
    }
    result[relative(packageRoot, entry)] = sha256(readIconInputSync(entry));
  };
  trackedRoots.forEach(visit);
  return result;
};
const runAudit = () => {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/audit-icons.mjs',
      '--check',
      '--policy',
      'solid-v1',
      '--manifest',
      'config/icon-sources/solid.json#manifest',
      '--index',
      'src/icons/solid/index.tsx',
      '--figma-raw-provenance',
      'config/icon-sources/solid.json#raw',
      '--placement-provenance',
      'config/icon-sources/solid.json#placement',
    ],
    {
      cwd: packageRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require=${resolve(
          packageRoot,
          'test/icons/helpers/deny-network.cjs',
        )}`.trim(),
      },
    },
  );
  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
};

describe('Solid audit determinism and read-only behavior', () => {
  let before: Record<string, string>;
  let after: Record<string, string>;
  let first: ReturnType<typeof runAudit>;
  let second: ReturnType<typeof runAudit>;

  beforeAll(() => {
    before = snapshot();
    first = runAudit();
    second = runAudit();
    after = snapshot();
  });

  it('passes without network access', () => {
    expect(first).toEqual({ status: 0, stderr: '', stdout: `AUDIT_OK ${iconCounts.solid}\n` });
  });

  it('emits byte-identical timestamp-free output on consecutive runs', () => {
    expect(second).toEqual(first);
    expect(`${first.stdout}\n${first.stderr}`).not.toMatch(/\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });

  it('does not mutate source, manifest, policy, or evidence inputs', () => {
    expect(after).toEqual(before);
  });
});
