import { createHash } from 'node:crypto';
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COLORFUL_GROUP_POLICY,
  COLORFUL_POLICY_ID,
  COLORFUL_SCHEMA_VERSION,
  colorfulLocalFile,
  validateColorfulInventory,
} from './colorful-icon-contracts.mjs';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = path.resolve(PACKAGE_ROOT, '../..');
const DEFAULT_INPUTS = [
  '.omx/state/colorful-assets-brands-small.json',
  '.omx/state/colorful-assets-basic-log.json',
  '.omx/state/colorful-assets-primary-secondary-ai-coding.json',
];

function fail(code, message) {
  throw new Error(`${code}: ${message}`);
}

function inputs(args) {
  const values = [];
  for (let index = 0; index < args.length; index += 1)
    if (args[index] === '--input') values.push(path.resolve(REPOSITORY_ROOT, args[++index]));
  return values.length > 0 ? values : DEFAULT_INPUTS.map((input) => path.resolve(REPOSITORY_ROOT, input));
}

const compareNodeIds = (left, right) => {
  const [leftPage, leftNode] = left.split(':').map(Number);
  const [rightPage, rightNode] = right.split(':').map(Number);
  return leftPage - rightPage || leftNode - rightNode;
};

const structuralSvgDigest = (svg) =>
  createHash('sha256')
    .update(
      svg
        .replace(/icon_\d+__/g, 'icon_SOURCE__')
        .replace(/>\s+</g, '><')
        .trim(),
      'utf8',
    )
    .digest('hex');

function normalizePartialRow(row, policyByGroup) {
  const groupNodeId = row.groupNodeId ?? row.groupId;
  const componentNodeId = row.componentNodeId ?? row.nodeId;
  const policy = policyByGroup.get(groupNodeId);
  if (!policy) fail('INVENTORY_GROUP_UNKNOWN', `${componentNodeId ?? '<unknown>'} points to ${groupNodeId}`);
  const localFile = row.localFile
    ?.replace(/^packages\/yakit-ui\//, '')
    .replace(/^src\/icons\//, '');
  return {
    ...row,
    category: policy.category,
    componentNodeId,
    groupNodeId,
    localFile,
    publicExposure: row.publicExposure ?? 'canonical',
    rowDisposition: row.rowDisposition ?? 'canonical-new',
    rowId: row.rowId ?? `${groupNodeId}/${componentNodeId}`,
  };
}

export async function classifyColorfulDuplicates(
  rows,
  readSource = (localFile) => readFile(path.join(PACKAGE_ROOT, 'src/icons', localFile), 'utf8'),
) {
  const owners = new Map();
  const classified = [];
  for (const row of rows) {
    if (row.rowDisposition !== 'canonical-new') {
      classified.push(row);
      continue;
    }
    const localFile = colorfulLocalFile(row);
    const svg = await readSource(localFile);
    const key = `${row.width}x${row.height}:${row.paintMode}:${structuralSvgDigest(svg)}`;
    const owner = owners.get(key);
    if (!owner) {
      owners.set(key, row);
      classified.push(row);
      continue;
    }
    const duplicate = {
      ...row,
      canonicalComponentNodeId: owner.componentNodeId,
      duplicateEvidenceDigest: key,
      publicExposure: 'semantic-alias',
      rowDisposition: 'duplicate-colorful',
    };
    delete duplicate.localFile;
    delete duplicate.paintMode;
    classified.push(duplicate);
  }
  return classified;
}

export async function mergeColorfulInventories(inputPaths) {
  const partials = await Promise.all(
    inputPaths.map(async (input) => JSON.parse(await readFile(input, 'utf8'))),
  );
  const policyOrder = new Map(COLORFUL_GROUP_POLICY.map((group, index) => [group.nodeId, index]));
  const policyByGroup = new Map(COLORFUL_GROUP_POLICY.map((group) => [group.nodeId, group]));
  const normalizedRows = partials
    .flatMap((partial) => partial.rows ?? [])
    .map((row) => normalizePartialRow(row, policyByGroup))
    .sort(
      (left, right) =>
        policyOrder.get(left.groupNodeId) - policyOrder.get(right.groupNodeId) ||
        compareNodeIds(left.componentNodeId, right.componentNodeId),
    );
  const rows = await classifyColorfulDuplicates(normalizedRows);
  const seenNodes = new Set();
  const seenExports = new Set();
  for (const row of rows) {
    if (seenNodes.has(row.componentNodeId)) fail('INVENTORY_COMPONENT_DUPLICATE', row.componentNodeId);
    if (row.exportName && seenExports.has(row.exportName)) fail('PUBLIC_EXPORT_DUPLICATE', row.exportName);
    seenNodes.add(row.componentNodeId);
    if (row.exportName) seenExports.add(row.exportName);
  }
  const groups = COLORFUL_GROUP_POLICY.map(({ category, nodeId, rowCount }) => ({
    category,
    expectedRowCount: rowCount,
    name:
      partials
        .flatMap((partial) => partial.groups ?? [])
        .find((group) => (group.nodeId ?? group.groupId) === nodeId)?.name ?? category,
    nodeId,
  }));
  const inventory = {
    schemaVersion: COLORFUL_SCHEMA_VERSION,
    policyId: COLORFUL_POLICY_ID,
    evidenceVersion: 'figma-colorful-context-assets-v1',
    fileKey: 'QWct5XE0Bg0bNDQ93eYgEw',
    groups,
    rows,
  };
  const summary = validateColorfulInventory(inventory, { requireProvenance: true });
  inventory.frozenClassification = summary;
  return inventory;
}

async function pruneUndeclaredSources(inventory) {
  const sourceRoot = path.join(PACKAGE_ROOT, 'src/icons/colorful');
  const expected = new Set(
    inventory.rows
      .filter((row) => row.rowDisposition === 'canonical-new')
      .map((row) => path.basename(colorfulLocalFile(row))),
  );
  const removed = [];
  for (const entry of await readdir(sourceRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.svg') || expected.has(entry.name)) continue;
    await unlink(path.join(sourceRoot, entry.name));
    removed.push(entry.name);
  }
  return removed.sort();
}

async function main(args = process.argv.slice(2)) {
  const inventory = await mergeColorfulInventories(inputs(args));
  const output = path.join(PACKAGE_ROOT, 'scripts/figma-colorful-icons-inventory.json');
  const source = `${JSON.stringify(inventory, null, 2)}\n`;
  if (args.includes('--write')) await writeFile(output, source);
  else if ((await readFile(output, 'utf8').catch(() => null)) !== source)
    fail('COLORFUL_INVENTORY_DRIFT', path.relative(PACKAGE_ROOT, output));
  const removed = args.includes('--prune') ? await pruneUndeclaredSources(inventory) : [];
  process.stdout.write(
    `COLORFUL_INVENTORY_OK ${inventory.rows.length} ${inventory.frozenClassification.colorfulPublicExportCount} ${removed.length}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
