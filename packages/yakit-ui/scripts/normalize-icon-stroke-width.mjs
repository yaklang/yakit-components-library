import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFile as execFileCallback } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile, unlink, mkdtemp, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  loadingStrokeWidthDefault,
  normalizeSvgStrokeWidth,
  svgStrokeWidths,
} from './icon-stroke-width.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = 'test/fixtures/icons/stroke-width-1/before.json';
const loadingPath = 'src/icons/loading/index.tsx';
const visualWeightReviews = JSON.parse(
  readFileSync(
    new URL('../test/fixtures/icons/reference/visual-weight-v2/reviews.json', import.meta.url),
    'utf8',
  ),
);
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const execFile = promisify(execFileCallback);
const manifestPaths = new Set([
  'scripts/figma-colorful-icons-inventory.json',
  'scripts/figma-outline-icons-inventory.json',
  'scripts/figma-solid-icons-inventory.json',
]);

function targetPath(root, relativePath, kind) {
  if (
    path.isAbsolute(relativePath) ||
    relativePath.split('/').includes('..') ||
    (kind === 'change' && !relativePath.startsWith('src/') && !manifestPaths.has(relativePath)) ||
    (kind === 'remove' && !/^src\/icons\/oldicon\/assets\/[a-f0-9]{64}\.svg$/.test(relativePath))
  )
    throw new Error(`MIGRATION_PATH_OUT_OF_SCOPE: ${relativePath}`);
  return path.join(root, ...relativePath.split('/'));
}

async function currentCommit(root) {
  const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  const commit = stdout.trim();
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('CAPTURE_COMMIT_INVALID');
  return commit;
}

export async function svgFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory())
      result.push(...(await svgFiles(path.join(directory, entry.name), relative)));
    else if (entry.isFile() && entry.name.endsWith('.svg')) result.push(relative);
  }
  return result.sort();
}

async function fileHashes(directory, prefix = '') {
  const hashes = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory())
      Object.assign(hashes, await fileHashes(path.join(directory, entry.name), relative));
    else if (entry.isFile())
      hashes[relative] = sha256(await readFile(path.join(directory, entry.name)));
  }
  return hashes;
}

/** Freeze exact inputs once, before migrating. These bytes are the independent test oracle's inputs. */
export async function captureStrokeWidthInputs(root = packageRoot, options = {}) {
  const baselineCommit = options.baselineCommit ?? (await currentCommit(root));
  if (!/^[a-f0-9]{40}$/.test(baselineCommit)) throw new Error('CAPTURE_COMMIT_INVALID');
  const sourceInventory = await svgFiles(path.join(root, 'src'));
  const assets = [];
  for (const sourcePath of sourceInventory) {
    const beforeSvg = await readFile(path.join(root, 'src', sourcePath), 'utf8');
    const afterSvg = normalizeSvgStrokeWidth(beforeSvg);
    if (afterSvg === beforeSvg) continue;
    const afterSha256 = sha256(afterSvg);
    const afterPath = sourcePath.startsWith('icons/oldicon/assets/')
      ? `icons/oldicon/assets/${afterSha256}.svg`
      : sourcePath;
    assets.push({ sourcePath, beforeSha256: sha256(beforeSvg), beforeSvg, afterPath, afterSha256 });
  }
  const oldicon = JSON.parse(
    await readFile(path.join(root, 'src/icons/oldicon/inventory.json'), 'utf8'),
  );
  const loadingBeforeSource = await readFile(path.join(root, loadingPath), 'utf8');
  const loadingD = /d="([^"]+)"/.exec(loadingBeforeSource)?.[1];
  if (!loadingD || !loadingBeforeSource.includes('strokeWidth={2}'))
    throw new Error('CAPTURE_REQUIRES_PRECHANGE_LOADING');
  const loadingBeforeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="${loadingD}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const result = {
    schemaVersion: 1,
    baselineCommit,
    algorithm: 'frozen-source-width-only-oracle-v1',
    assets,
    sourceInventory,
    loadingBeforeSource,
    loadingBeforeSvg,
    oldiconExports: oldicon.exports.map(({ exportName, sourceKeys }) => ({
      exportName,
      sourceKeys,
    })),
    oldiconSourceIdentity: oldicon.entries.map(
      ({ sourceFile, sourceName, exportName, canonicalArtworkSha256, sourceSvgSha256 }) => ({
        sourceFile,
        sourceName,
        exportName,
        canonicalArtworkSha256,
        sourceSvgSha256,
      }),
    ),
    provenanceHashes: await fileHashes(
      path.join(root, 'test/fixtures/icons/reference'),
      'test/fixtures/icons/reference',
    ),
  };
  await mkdir(path.dirname(path.join(root, fixturePath)), { recursive: true });
  await writeFile(path.join(root, fixturePath), `${JSON.stringify(result, null, 2)}\n`, {
    flag: 'wx',
  });
  return { captured: assets.length, scanned: sourceInventory.length, fixturePath };
}

export async function checkIconStrokeWidths(root = packageRoot) {
  const files = await svgFiles(path.join(root, 'src'));
  const errors = [];
  try {
    const frozen = JSON.parse(await readFile(path.join(root, fixturePath), 'utf8'));
    const migrated = new Map(
      frozen.assets.map(({ sourcePath, afterPath }) => [sourcePath, afterPath]),
    );
    const expected = new Set(frozen.sourceInventory.map((file) => migrated.get(file) ?? file));
    for (const file of files)
      if (!expected.has(file)) errors.push(`${file}: source is not registered in ${fixturePath}`);
    for (const file of expected)
      if (!files.includes(file)) errors.push(`${file}: registered source is missing`);
  } catch (error) {
    errors.push(`${fixturePath}: ${error.message}`);
  }
  for (const file of files) {
    try {
      const source = await readFile(path.join(root, 'src', file), 'utf8');
      normalizeSvgStrokeWidth(source);
      for (const { tag, value } of svgStrokeWidths(source))
        if (value !== '1') errors.push(`${file}: ${tag} stroke-width=${value}`);
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
    }
  }
  const loading = await readFile(path.join(root, loadingPath), 'utf8');
  if (loadingStrokeWidthDefault(loading) !== '1')
    errors.push(`${loadingPath}: expected strokeWidth={1}`);
  if (errors.length) throw new Error(`ICON_STROKE_WIDTH_INVALID\n${errors.join('\n')}`);
  return { svgFiles: files.length, loading: 1, violations: 0 };
}

export async function planStrokeWidthMigration(root = packageRoot) {
  const { planOldiconStrokeWidth } = await import('./oldicon-stroke-width.mjs');
  const { planIconStrokeManifests } = await import('./update-icon-stroke-manifests.mjs');
  const frozen = JSON.parse(await readFile(path.join(root, fixturePath), 'utf8'));
  const files = await svgFiles(path.join(root, 'src'));
  const fileSet = new Set(files);
  const sourceMap = new Map();
  const changes = new Map();
  const removed = [];
  await validateFrozenMigrationInputs(root, frozen, fileSet);
  for (const record of frozen.assets) {
    const file = fileSet.has(record.sourcePath) ? record.sourcePath : record.afterPath;
    const current = await readFile(path.join(root, 'src', file), 'utf8');
    sourceMap.set(file, normalizeSvgStrokeWidth(current));
  }
  for (const file of files) {
    if (sourceMap.has(file)) continue;
    const current = await readFile(path.join(root, 'src', file), 'utf8');
    sourceMap.set(file, normalizeSvgStrokeWidth(current));
  }
  for (const file of files) {
    const current = await readFile(path.join(root, 'src', file), 'utf8');
    const normalized = sourceMap.get(file);
    if (!file.startsWith('icons/oldicon/') && current !== normalized)
      changes.set(`src/${file}`, normalized);
  }
  const oldiconRoot = 'src/icons/oldicon';
  const inventory = JSON.parse(
    await readFile(path.join(root, oldiconRoot, 'inventory.json'), 'utf8'),
  );
  const oldAssets = new Map(
    await Promise.all(
      files
        .filter((file) => file.startsWith('icons/oldicon/assets/'))
        .map(async (file) => [
          file.slice('icons/oldicon/'.length),
          await readFile(path.join(root, 'src', file), 'utf8'),
        ]),
    ),
  );
  const oldicon = planOldiconStrokeWidth(inventory, oldAssets);
  for (const [file, svg] of oldicon.assets) {
    if (oldAssets.get(file) !== svg) changes.set(`${oldiconRoot}/${file}`, svg);
  }
  for (const file of oldAssets.keys())
    if (!oldicon.assets.has(file)) removed.push(`${oldiconRoot}/${file}`);
  for (const entry of inventory.exports) {
    const next = oldicon.inventory.exports.find(
      ({ exportName }) => exportName === entry.exportName,
    );
    if (next.assetFile === entry.assetFile) continue;
    const file = `${oldiconRoot}/icons/${entry.exportName}.tsx`;
    const current = await readFile(path.join(root, file), 'utf8');
    if (!current.includes(entry.assetFile)) throw new Error(`OLDICON_IMPORT_DRIFT: ${file}`);
    changes.set(file, current.replace(entry.assetFile, next.assetFile));
  }
  const { format, resolveConfig } = await import('prettier');
  const inventoryPath = `${oldiconRoot}/inventory.json`;
  const inventoryText = await format(JSON.stringify(oldicon.inventory), {
    ...(await resolveConfig(path.join(root, inventoryPath))),
    filepath: path.join(root, inventoryPath),
  });
  if (inventoryText !== (await readFile(path.join(root, inventoryPath), 'utf8')))
    changes.set(inventoryPath, inventoryText);
  const loading = await readFile(path.join(root, loadingPath), 'utf8');
  const nextLoading = loading.replace('strokeWidth={2}', 'strokeWidth={1}');
  if (loading !== nextLoading) changes.set(loadingPath, nextLoading);
  for (const [file, text] of await planIconStrokeManifests(root, sourceMap))
    if (text !== (await readFile(path.join(root, file), 'utf8'))) changes.set(file, text);
  return { changes, removed };
}

export async function validateFrozenMigrationInputs(root, frozen, files) {
  const fileSet = files instanceof Set ? files : new Set(files);
  for (const record of frozen.assets) {
    const file = fileSet.has(record.sourcePath) ? record.sourcePath : record.afterPath;
    const current = await readFile(path.join(root, 'src', file), 'utf8');
    const currentSha256 = sha256(current);
    if ([record.beforeSha256, record.afterSha256].includes(currentSha256)) continue;
    // A later geometry review may replace the exact normalized source pair.
    const reviewed = visualWeightReviews.reviews.some(
      (review) =>
        file === `icons/outline/${review.file}` &&
        visualWeightReviews.approvedFiles.includes(review.file) &&
        review.status === 'promoted' &&
        review.reviewVerdict === 'pass' &&
        review.oldSourceSha256 === record.afterSha256 &&
        review.candidateSourceSha256 === currentSha256,
    );
    if (!reviewed) throw new Error(`MIGRATION_INPUT_DRIFT: ${file}`);
  }
}

export async function applyStrokeWidthMigrationPlan(
  root,
  { changes, removed },
  { stagingParent = tmpdir() } = {},
) {
  if (!changes.size && !removed.length) return;
  for (const file of changes.keys()) targetPath(root, file, 'change');
  for (const file of removed) targetPath(root, file, 'remove');
  const staging = await mkdtemp(path.join(stagingParent, 'icon-stroke-width-'));
  try {
    for (const [file, source] of changes) {
      const staged = targetPath(staging, file, 'change');
      await mkdir(path.dirname(staged), { recursive: true });
      await writeFile(staged, source);
    }
    for (const file of changes.keys()) {
      const target = targetPath(root, file, 'change');
      await mkdir(path.dirname(target), { recursive: true });
      await rename(targetPath(staging, file, 'change'), target);
    }
    // Only obsolete content-addressed assets, proven absent from the final inventory, are removed.
    for (const file of removed) await unlink(targetPath(root, file, 'remove'));
  } finally {
    await rm(staging, { force: true, recursive: true });
  }
}

export async function runStrokeWidthMigration(args, root = packageRoot, options = {}) {
  if (args.length > 1 || args.some((arg) => !['--check', '--write', '--capture'].includes(arg)))
    throw new Error('Usage: normalize-icon-stroke-width.mjs [--check|--write|--capture]');
  if (args.includes('--capture')) return captureStrokeWidthInputs(root);
  if (args.includes('--check')) return checkIconStrokeWidths(root);
  const { changes, removed } = await (options.planMigration ?? planStrokeWidthMigration)(root);
  if (args.includes('--write'))
    await applyStrokeWidthMigrationPlan(root, { changes, removed }, options);
  return {
    mode: args.includes('--write') ? 'write' : 'dry-run',
    changedFiles: changes.size,
    removedFiles: removed.length,
    paths: [...changes.keys()].sort(),
    removed,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runStrokeWidthMigration(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
