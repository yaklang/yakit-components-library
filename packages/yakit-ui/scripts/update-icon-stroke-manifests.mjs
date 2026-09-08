import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { canonicalizeSvg, paintSemanticsSha256 } from './audit-icons.mjs';
import { ICON_STROKE_WIDTH_POLICY } from './icon-audit-contracts.mjs';
import { normalizeSvgStrokeWidth } from './icon-stroke-width.mjs';

const MANIFEST_PATHS = Object.freeze({
  colorful: 'scripts/figma-colorful-icons-inventory.json',
  outline: 'scripts/figma-outline-icons-inventory.json',
  solid: 'scripts/figma-solid-icons-inventory.json',
});
const RAW_PROVENANCE_PATHS = Object.freeze({
  outline: 'test/fixtures/icons/reference/figma-outline-raw-provenance-v1.json',
  solid: 'test/fixtures/icons/reference/figma-solid-raw-provenance-v1.json',
});
const DATA_COMPARE_RELATIVE_CURRENT_COLOR =
  'rgb(from currentColor calc(r + 139) calc(g + 144) calc(b + 152))';

const sha256 = (source) => createHash('sha256').update(source).digest('hex');

async function readJson(packageRoot, relativePath) {
  return JSON.parse(await readFile(path.join(packageRoot, relativePath), 'utf8'));
}

async function sourceFrom(sourcesMap, packageRoot, relativePath) {
  const normalized = relativePath.replace(/^src\//, '');
  const source =
    sourcesMap.get(normalized) ??
    sourcesMap.get(`src/${normalized}`) ??
    sourcesMap.get(relativePath);
  return normalizeSvgStrokeWidth(
    source ?? (await readFile(path.join(packageRoot, 'src', normalized), 'utf8')),
  );
}

function formattedJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function rawSourcesByNode(provenance) {
  return new Map(
    [...(provenance.components ?? []), ...(provenance.supplementalComponents ?? [])].map(
      (record) => [record.nodeId, record.svg],
    ),
  );
}

function outlineCanonicalOptions(sourceNodeId, geometryOnly = false) {
  return {
    geometryOnly,
    normalizeForegroundPaint: !geometryOnly,
    normalizeSemanticErase: true,
    normalizeStrokeWidth: true,
    relativeCurrentColorValue:
      sourceNodeId === '45035:1908' ? DATA_COMPARE_RELATIVE_CURRENT_COLOR : undefined,
    semanticEraseSourceId: sourceNodeId,
  };
}

async function planOutlineManifest(packageRoot, sourcesMap) {
  const [manifest, provenance] = await Promise.all([
    readJson(packageRoot, MANIFEST_PATHS.outline),
    readJson(packageRoot, RAW_PROVENANCE_PATHS.outline),
  ]);
  const figmaByNode = rawSourcesByNode(provenance);
  const symbols = await Promise.all(
    manifest.symbols.map(async (record) => {
      const localSource = await sourceFrom(sourcesMap, packageRoot, `icons/outline/${record.file}`);
      const figmaSource = figmaByNode.get(record.exportedSourceNodeId);
      if (!figmaSource)
        throw new Error(`FIGMA_RAW_SOURCE_MISSING: outline/${record.exportedSourceNodeId}`);
      const figmaNormalizedAstSha256 = sha256(
        canonicalizeSvg(figmaSource, outlineCanonicalOptions(record.exportedSourceNodeId)),
      );
      const localNormalizedAstSha256 = sha256(
        canonicalizeSvg(localSource, outlineCanonicalOptions(record.exportedSourceNodeId)),
      );
      const figmaGeometrySha256 = sha256(
        canonicalizeSvg(figmaSource, outlineCanonicalOptions(record.exportedSourceNodeId, true)),
      );
      const localGeometrySha256 = sha256(
        canonicalizeSvg(localSource, outlineCanonicalOptions(record.exportedSourceNodeId, true)),
      );
      if (figmaNormalizedAstSha256 !== localNormalizedAstSha256)
        throw new Error(`NORMALIZED_AST_MISMATCH: outline/${record.file}`);
      if (figmaGeometrySha256 !== localGeometrySha256)
        throw new Error(`GEOMETRY_MISMATCH: outline/${record.file}`);
      return {
        ...record,
        localRawSvgSha256: sha256(localSource),
        figmaNormalizedAstSha256,
        localNormalizedAstSha256,
        normalizedAstSha256: localNormalizedAstSha256,
        figmaGeometrySha256,
        localGeometrySha256,
        geometrySha256: localGeometrySha256,
      };
    }),
  );
  return {
    ...manifest,
    strokeWidthPolicy: ICON_STROKE_WIDTH_POLICY,
    updateProvenance: {
      reviewId: 'icon-stroke-width-1',
      reviewedBy: 'codex',
      updater: 'scripts/update-icon-stroke-manifests.mjs',
    },
    symbols,
  };
}

async function planSolidManifest(packageRoot, sourcesMap) {
  const [manifest, provenance] = await Promise.all([
    readJson(packageRoot, MANIFEST_PATHS.solid),
    readJson(packageRoot, RAW_PROVENANCE_PATHS.solid),
  ]);
  const figmaByNode = rawSourcesByNode(provenance);
  const updateRecord = async (record) => {
    const localSource = await sourceFrom(sourcesMap, packageRoot, `icons/${record.localFile}`);
    const figmaSource = figmaByNode.get(record.nodeId);
    if (!figmaSource) throw new Error(`FIGMA_RAW_SOURCE_MISSING: solid/${record.nodeId}`);
    const normalizedOptions = {
      ignoreUnreferencedIds: true,
      normalizeForegroundPaint: true,
      normalizeStrokeWidth: true,
    };
    const geometryOptions = {
      geometryOnly: true,
      ignoreUnreferencedIds: true,
      normalizeStrokeWidth: true,
    };
    const paintOptions = { normalizeFigmaPrimary: true, normalizeStrokeWidth: true };
    const figmaNormalizedAstSha256 = sha256(canonicalizeSvg(figmaSource, normalizedOptions));
    const localNormalizedAstSha256 = sha256(canonicalizeSvg(localSource, normalizedOptions));
    const figmaGeometrySha256 = sha256(canonicalizeSvg(figmaSource, geometryOptions));
    const localGeometrySha256 = sha256(canonicalizeSvg(localSource, geometryOptions));
    const figmaPaintSemanticsSha256 = paintSemanticsSha256(figmaSource, paintOptions);
    const localPaintSemanticsSha256 = paintSemanticsSha256(localSource, paintOptions);
    if (figmaNormalizedAstSha256 !== localNormalizedAstSha256)
      throw new Error(`NORMALIZED_AST_MISMATCH: ${record.localFile}`);
    if (figmaGeometrySha256 !== localGeometrySha256)
      throw new Error(`GEOMETRY_MISMATCH: ${record.localFile}`);
    if (figmaPaintSemanticsSha256 !== localPaintSemanticsSha256)
      throw new Error(`PAINT_SEMANTICS_MISMATCH: ${record.localFile}`);
    return {
      ...record,
      localRawSvgSha256: sha256(localSource),
      figmaNormalizedAstSha256,
      localNormalizedAstSha256,
      normalizedAstSha256: localNormalizedAstSha256,
      figmaGeometrySha256,
      localGeometrySha256,
      geometrySha256: localGeometrySha256,
      figmaPaintSemanticsSha256,
      localPaintSemanticsSha256,
    };
  };
  const symbols = await Promise.all(manifest.symbols.map(updateRecord));
  const supplementalSources = await Promise.all(manifest.supplementalSources.map(updateRecord));
  return {
    ...manifest,
    strokeWidthPolicy: ICON_STROKE_WIDTH_POLICY,
    updateProvenance: {
      reviewId: 'icon-stroke-width-1',
      reviewedBy: 'codex',
      updater: 'scripts/update-icon-stroke-manifests.mjs',
    },
    symbols,
    supplementalSources,
  };
}

async function planColorfulManifest(packageRoot, sourcesMap) {
  const manifest = await readJson(packageRoot, MANIFEST_PATHS.colorful);
  const rows = await Promise.all(
    manifest.rows.map(async (record) => {
      if (record.rowDisposition !== 'canonical-new') return record;
      const localFile = record.localFile.replace(/^src\/icons\//, '');
      const localSource = await sourceFrom(sourcesMap, packageRoot, `icons/${localFile}`);
      return { ...record, normalizedSvgSha256: sha256(localSource) };
    }),
  );
  const { schemaVersion, policyId, evidenceVersion, ...rest } = manifest;
  delete rest.strokeWidthPolicy;
  return {
    schemaVersion,
    policyId,
    strokeWidthPolicy: ICON_STROKE_WIDTH_POLICY,
    evidenceVersion,
    ...rest,
    rows,
  };
}

export async function planIconStrokeManifests(packageRoot, sourcesMap) {
  if (!(sourcesMap instanceof Map)) throw new TypeError('sourcesMap must be a Map');
  const [outline, solid, colorful] = await Promise.all([
    planOutlineManifest(packageRoot, sourcesMap),
    planSolidManifest(packageRoot, sourcesMap),
    planColorfulManifest(packageRoot, sourcesMap),
  ]);
  return new Map([
    [MANIFEST_PATHS.outline, formattedJson(outline)],
    [MANIFEST_PATHS.solid, formattedJson(solid)],
    [MANIFEST_PATHS.colorful, formattedJson(colorful)],
  ]);
}
