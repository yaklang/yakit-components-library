import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd(), process.argv[2] ?? 'src/icons');
const rows = [];

for (const variant of ['outline', 'solid']) {
  const dir = path.join(root, variant);
  let names = [];
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith('.svg')).sort();
  } catch {
    continue;
  }
  for (const name of names) {
    const filePath = path.join(dir, name);
    const source = await readFile(filePath, 'utf8');
    rows.push({
      path: path.relative(root, filePath),
      variant,
      bytes: Buffer.byteLength(source),
      hasLavenderBackdrop: source.includes('E7E7F5'),
      hasFrameBackdrop: source.includes('F8F9FA'),
      empty: !/<(?:path|circle|rect|ellipse|polygon|polyline|line|g)\b/.test(source),
    });
  }
}

const failures = rows.filter((row) => row.hasLavenderBackdrop || row.hasFrameBackdrop || row.empty);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: 'local SVG audit; Figma baseline unavailable through configured proxy',
  total: rows.length,
  failures: failures.length,
  rows,
};

const output = path.resolve(process.cwd(), 'scripts/icon-inventory.json');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Audited ${rows.length} SVG icons; failures: ${failures.length}`);
if (failures.length) {
  for (const row of failures) console.error(row.path);
  process.exitCode = 1;
}
