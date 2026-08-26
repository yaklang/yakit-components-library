import { createHash } from 'node:crypto';

export const COLORFUL_SCHEMA_VERSION = 'colorful-inventory-v1';
export const COLORFUL_POLICY_ID = 'colorful-v1';

export const ROW_DISPOSITIONS = Object.freeze([
  'canonical-new',
  'reuse-existing',
  'duplicate-colorful',
  'excluded',
]);
export const PUBLIC_EXPOSURES = Object.freeze([
  'canonical',
  'semantic-alias',
  'provenance-only',
  'existing-family',
  'excluded',
]);
export const COLORFUL_PAINT_MODES = Object.freeze(['literal', 'mixed', 'currentColor']);
export const COLORFUL_ICON_CATEGORIES = Object.freeze([
  'primary-function-menu',
  'secondary-menu',
  'basic',
  'yakit-logo',
  'penetration-logo',
  'ai-model',
  'avatar',
  'plugin-source',
  'risk-level',
  'log-task-node',
  'file-type',
  'browser',
  'operating-system',
  'social-media',
  'coding',
  'cursor',
]);
export const COLORFUL_GROUP_POLICY = Object.freeze([
  Object.freeze({ category: 'primary-function-menu', nodeId: '37150:33924', rowCount: 22 }),
  Object.freeze({ category: 'secondary-menu', nodeId: '37151:13894', rowCount: 25 }),
  Object.freeze({ category: 'basic', nodeId: '37202:12895', rowCount: 82 }),
  Object.freeze({ category: 'yakit-logo', nodeId: '37154:12454', rowCount: 24 }),
  Object.freeze({ category: 'penetration-logo', nodeId: '46336:19565', rowCount: 6 }),
  Object.freeze({ category: 'ai-model', nodeId: '38803:60728', rowCount: 28 }),
  Object.freeze({ category: 'avatar', nodeId: '37202:11692', rowCount: 9 }),
  Object.freeze({ category: 'plugin-source', nodeId: '37154:11668', rowCount: 5 }),
  Object.freeze({ category: 'risk-level', nodeId: '37152:11621', rowCount: 6 }),
  Object.freeze({ category: 'log-task-node', nodeId: '37153:13463', rowCount: 30 }),
  Object.freeze({ category: 'file-type', nodeId: '37154:11749', rowCount: 8 }),
  Object.freeze({ category: 'browser', nodeId: '37155:19557', rowCount: 7 }),
  Object.freeze({ category: 'operating-system', nodeId: '44537:34387', rowCount: 6 }),
  Object.freeze({ category: 'social-media', nodeId: '44554:2134', rowCount: 8 }),
  Object.freeze({ category: 'coding', nodeId: '37155:20075', rowCount: 25 }),
  Object.freeze({ category: 'cursor', nodeId: '37151:14445', rowCount: 5 }),
]);

const ALLOWED_STATE_PAIRS = new Set([
  'canonical-new/canonical',
  'reuse-existing/existing-family',
  'duplicate-colorful/semantic-alias',
  'duplicate-colorful/provenance-only',
  'excluded/excluded',
]);

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

export function colorfulDigest(value) {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function fail(code, message) {
  throw new Error(`${code}: ${message}`);
}

function requireString(row, field) {
  if (typeof row[field] !== 'string' || row[field].trim() === '')
    fail('INVENTORY_ROW_INVALID', `${row.rowId ?? '<unknown>'} requires ${field}`);
}

function rejectField(row, field) {
  if (row[field] !== undefined)
    fail('INVENTORY_ROW_INVALID', `${row.rowId} must not declare ${field}`);
}

export const colorfulComponentNodeId = (row) => row.componentNodeId ?? row.nodeId;
export const colorfulLocalFile = (row) => row.localFile?.replace(/^src\/icons\//, '');

export function validateColorfulRow(row, { requireProvenance = false } = {}) {
  if (!row || typeof row !== 'object' || Array.isArray(row))
    fail('INVENTORY_ROW_INVALID', 'each row must be an object');
  for (const field of ['groupNodeId', 'figmaName', 'category', 'rowDisposition', 'publicExposure'])
    requireString(row, field);
  const componentNodeId = colorfulComponentNodeId(row);
  const rowId = row.rowId ?? `${row.groupNodeId}/${componentNodeId}`;
  if (!/^\d+:\d+$/.test(row.groupNodeId) || !/^\d+:\d+$/.test(componentNodeId ?? ''))
    fail('INVENTORY_ROW_INVALID', `${rowId} contains an invalid Figma node id`);
  if (!ROW_DISPOSITIONS.includes(row.rowDisposition))
    fail('INVENTORY_ROW_INVALID', `${row.rowId} has unknown rowDisposition`);
  if (!PUBLIC_EXPOSURES.includes(row.publicExposure))
    fail('INVENTORY_ROW_INVALID', `${row.rowId} has unknown publicExposure`);
  if (!COLORFUL_ICON_CATEGORIES.includes(row.category))
    fail('INVENTORY_ROW_INVALID', `${row.rowId} has unknown category`);
  if (
    row.sourceStatus !== undefined &&
    !['current', 'supplement', 'unnamed-in-figma', 'legacy-non-current-figma'].includes(
      row.sourceStatus,
    )
  )
    fail('INVENTORY_ROW_INVALID', `${rowId} has unknown sourceStatus`);
  if (!ALLOWED_STATE_PAIRS.has(`${row.rowDisposition}/${row.publicExposure}`))
    fail(
      'ROW_EXPOSURE_STATE_INVALID',
      `${row.rowId} uses ${row.rowDisposition}/${row.publicExposure}`,
    );

  if (row.rowDisposition === 'canonical-new') {
    for (const field of ['localFile', 'exportName', 'paintMode']) requireString(row, field);
    if (!COLORFUL_PAINT_MODES.includes(row.paintMode))
      fail('INVENTORY_ROW_INVALID', `${row.rowId} has unknown paintMode`);
    const localFile = colorfulLocalFile(row);
    if (!localFile?.startsWith('colorful/') || !localFile.endsWith('.svg'))
      fail('INVENTORY_ROW_INVALID', `${rowId} has an invalid colorful localFile`);
    if (!row.exportName.endsWith('Colorful'))
      fail('INVENTORY_ROW_INVALID', `${row.rowId} exportName must end in Colorful`);
    if (requireProvenance) {
      if (row.fileKey !== 'QWct5XE0Bg0bNDQ93eYgEw')
        fail('FIGMA_PROVENANCE_INVALID', `${rowId} has an unexpected file key`);
      for (const field of ['rawSvgSha256', 'normalizedSvgSha256'])
        if (!/^[a-f0-9]{64}$/.test(row[field] ?? ''))
          fail('FIGMA_PROVENANCE_INVALID', `${rowId} requires ${field}`);
      if (!Number.isFinite(row.width) || row.width <= 0 || !Number.isFinite(row.height) || row.height <= 0)
        fail('FIGMA_PROVENANCE_INVALID', `${rowId} requires positive dimensions`);
      if (Number.isNaN(Date.parse(row.retrievedAt ?? '')))
        fail('FIGMA_PROVENANCE_INVALID', `${rowId} requires retrievedAt`);
      if (
        typeof row.sourceUrl !== 'string' ||
        !row.sourceUrl.includes('figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/') ||
        !row.sourceUrl.includes(componentNodeId.replace(':', '-'))
      )
        fail('FIGMA_PROVENANCE_INVALID', `${rowId} requires a stable node URL`);
    }
  } else {
    rejectField(row, 'localFile');
    rejectField(row, 'paintMode');
  }

  if (row.publicExposure === 'semantic-alias') {
    requireString(row, 'exportName');
    requireString(row, 'canonicalComponentNodeId');
    if (!row.exportName.endsWith('Colorful'))
      fail('INVENTORY_ROW_INVALID', `${row.rowId} alias exportName must end in Colorful`);
  }
  if (row.publicExposure === 'provenance-only') {
    requireString(row, 'canonicalComponentNodeId');
    rejectField(row, 'exportName');
  }
  if (row.publicExposure === 'existing-family') {
    requireString(row, 'existingFamily');
    requireString(row, 'existingExportName');
    if (!['outline', 'solid'].includes(row.existingFamily))
      fail('INVENTORY_ROW_INVALID', `${row.rowId} has invalid existingFamily`);
    rejectField(row, 'exportName');
  }
  if (row.publicExposure === 'excluded') {
    requireString(row, 'exclusionReason');
    rejectField(row, 'exportName');
  }
  return row;
}

const countValues = (rows, field, values) =>
  Object.fromEntries(values.map((value) => [value, rows.filter((row) => row[field] === value).length]));

export function validateColorfulInventory(
  inventory,
  {
    expectedGroupCount = 16,
    expectedRowCount = 296,
    requireFrozenClassification = false,
    requireProvenance = false,
  } = {},
) {
  if (inventory?.schemaVersion !== COLORFUL_SCHEMA_VERSION)
    fail('ALGORITHM_VERSION_UNSUPPORTED', `expected ${COLORFUL_SCHEMA_VERSION}`);
  if (inventory?.policyId !== COLORFUL_POLICY_ID)
    fail('POLICY_CONTRACT_MISMATCH', `expected ${COLORFUL_POLICY_ID}`);
  if (!Array.isArray(inventory.groups) || !Array.isArray(inventory.rows))
    fail('INVENTORY_SCHEMA_INVALID', 'groups and rows must be arrays');

  const groupIds = inventory.groups.map((group) => group.nodeId);
  if (new Set(groupIds).size !== groupIds.length)
    fail('INVENTORY_GROUP_DUPLICATE', 'group node ids must be unique');
  if (groupIds.length !== expectedGroupCount)
    fail('INVENTORY_COUNT_MISMATCH', `expected ${expectedGroupCount} groups, received ${groupIds.length}`);
  if (inventory.rows.length !== expectedRowCount)
    fail('INVENTORY_COUNT_MISMATCH', `expected ${expectedRowCount} rows, received ${inventory.rows.length}`);
  if (expectedGroupCount === 16 && expectedRowCount === 296) {
    const expectedGroups = new Map(COLORFUL_GROUP_POLICY.map((group) => [group.nodeId, group]));
    for (const group of inventory.groups) {
      const expected = expectedGroups.get(group.nodeId);
      if (!expected || expected.category !== group.category || expected.rowCount !== group.expectedRowCount)
        fail('GROUP_MEMBERSHIP_MISMATCH', group.nodeId);
    }
    if (inventory.groups.some((group) => !expectedGroups.has(group.nodeId)))
      fail('GROUP_MEMBERSHIP_MISMATCH', 'unexpected group');
  }

  const rowIds = new Set();
  const componentNodeIds = new Set();
  const exportNames = new Set();
  const localFiles = new Set();
  for (const row of inventory.rows) {
    validateColorfulRow(row, { requireProvenance });
    if (!groupIds.includes(row.groupNodeId))
      fail('INVENTORY_GROUP_UNKNOWN', `${row.rowId} points to ${row.groupNodeId}`);
    const componentNodeId = colorfulComponentNodeId(row);
    const rowId = row.rowId ?? `${row.groupNodeId}/${componentNodeId}`;
    if (rowIds.has(rowId)) fail('INVENTORY_ROW_DUPLICATE', rowId);
    if (componentNodeIds.has(componentNodeId))
      fail('INVENTORY_COMPONENT_DUPLICATE', componentNodeId);
    rowIds.add(rowId);
    componentNodeIds.add(componentNodeId);
    if (row.exportName) {
      if (exportNames.has(row.exportName)) fail('PUBLIC_EXPORT_DUPLICATE', row.exportName);
      exportNames.add(row.exportName);
    }
    if (row.localFile) {
      const localFile = colorfulLocalFile(row);
      if (localFiles.has(localFile)) fail('CANONICAL_SOURCE_DUPLICATE', localFile);
      localFiles.add(localFile);
    }
  }
  const canonicalNodeIds = new Set(
    inventory.rows
      .filter((row) => row.rowDisposition === 'canonical-new')
      .map(colorfulComponentNodeId),
  );
  for (const row of inventory.rows)
    if (
      ['semantic-alias', 'provenance-only'].includes(row.publicExposure) &&
      !canonicalNodeIds.has(row.canonicalComponentNodeId)
    )
      fail('CANONICAL_TARGET_UNKNOWN', `${row.rowId}: ${row.canonicalComponentNodeId}`);
  for (const group of inventory.groups) {
    if (group.expectedRowCount === undefined) continue;
    const actual = inventory.rows.filter((row) => row.groupNodeId === group.nodeId).length;
    if (actual !== group.expectedRowCount)
      fail('INVENTORY_COUNT_MISMATCH', `${group.nodeId} expected ${group.expectedRowCount}, received ${actual}`);
  }

  const rowDispositionCounts = countValues(inventory.rows, 'rowDisposition', ROW_DISPOSITIONS);
  const publicExposureCounts = countValues(inventory.rows, 'publicExposure', PUBLIC_EXPOSURES);
  const colorfulCanonicalAssetCount = rowDispositionCounts['canonical-new'];
  const colorfulPublicExportCount =
    publicExposureCounts.canonical + publicExposureCounts['semantic-alias'];
  const publicMapping = inventory.rows
    .filter((row) => ['canonical', 'semantic-alias'].includes(row.publicExposure))
    .map((row) => {
      const componentNodeId = colorfulComponentNodeId(row);
      return {
        canonicalComponentNodeId: row.canonicalComponentNodeId ?? componentNodeId,
        componentNodeId,
        exportName: row.exportName,
        publicExposure: row.publicExposure,
      };
    })
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
  const existingFamilyReuseMapping = inventory.rows
    .filter((row) => row.publicExposure === 'existing-family')
    .map((row) => ({
      componentNodeId: colorfulComponentNodeId(row),
      existingExportName: row.existingExportName,
      existingFamily: row.existingFamily,
    }))
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));

  const summary = Object.freeze({
    colorfulCanonicalAssetCount,
    colorfulPublicExportCount,
    existingFamilyReuseMappingDigest: colorfulDigest(existingFamilyReuseMapping),
    publicExposureCounts,
    publicMappingDigest: colorfulDigest(publicMapping),
    rowDispositionCounts,
  });
  if (
    requireFrozenClassification &&
    canonicalJson(inventory.frozenClassification) !== canonicalJson(summary)
  )
    fail('POLICY_CONTRACT_MISMATCH', 'frozen classification differs from reviewed rows');
  return summary;
}
