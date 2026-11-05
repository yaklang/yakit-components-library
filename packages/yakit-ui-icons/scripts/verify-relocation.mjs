import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(root, 'docs/source-relocation.json'), 'utf8'));
let count = 0;
for (const record of manifest.files) {
  // Current sources may evolve; frozen historical artifacts remain immutable.
  if (
    !record.immutable ||
    !/(?:test\/fixtures|__screenshots__|docs\/icon-history|scripts\/.*\.json)/.test(record.to)
  )
    continue;
  const relative = record.to.replace(/^packages\/yakit-ui-icons\//, '');
  const actual = createHash('sha256')
    .update(readFileSync(path.join(root, relative)))
    .digest('hex');
  if (actual !== record.sha256)
    throw new Error(`Historical artifact changed: ${record.from} -> ${record.to}`);
  count++;
}
console.log(`ICON_HISTORY_VERIFIED ${count} unchanged artifacts`);
