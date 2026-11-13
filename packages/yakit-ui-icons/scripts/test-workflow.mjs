import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { run } from './process.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = (await readdir(path.join(root, 'test/workflow')))
  .filter((file) => file.endsWith('.test.mjs'))
  .sort()
  .map((file) => path.join(root, 'test/workflow', file));
await run(process.execPath, ['--test', ...files], { cwd: root });
