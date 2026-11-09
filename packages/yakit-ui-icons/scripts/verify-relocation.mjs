import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function verifyRelocation(root = fileURLToPath(new URL('..', import.meta.url))) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'docs/source-relocation.json'), 'utf8'));
  let count = 0;
  for (const record of manifest.files) {
    // Current sources may evolve; frozen historical artifacts remain immutable.
    if (
      !record.immutable ||
      !/^packages\/yakit-ui-icons\/(?:test\/fixtures\/|test\/.*\/__screenshots__\/|docs\/icon-history\/)/.test(
        record.to,
      )
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
  return count;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(`ICON_HISTORY_VERIFIED ${verifyRelocation()} unchanged artifacts`);
}
