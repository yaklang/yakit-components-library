import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { canonicalizeSvg, paintSemanticsSha256 } from './audit-icons.mjs';
import { ICON_STROKE_WIDTH_POLICY, SOLID_STROKE_WIDTH_POLICY } from './icon-audit-contracts.mjs';
import { normalizeSvgStrokeWidth } from './icon-stroke-width.mjs';

const MANIFEST_PATHS = Object.freeze({
  colorful: 'config/icon-sources/colorful.json#manifest',
  outline: 'config/icon-sources/outline.json#manifest',
  solid: 'config/icon-sources/solid.json#manifest',
});
const RAW_PROVENANCE_PATHS = Object.freeze({
  outline: 'config/icon-sources/outline.json#raw',
  solid: 'config/icon-sources/solid.json#raw',
});

const sha256 = (source) => createHash('sha256').update(source).digest('hex');

function readJson(packageRoot, relativePath, documents) {
  if (documents?.has(relativePath)) return structuredClone(documents.get(relativePath));
  throw new Error(`ICON_DOCUMENT_REQUIRED: ${relativePath}`);
}

function sourceFrom(sourcesMap, packageRoot, relativePath) {
  const normalized = relativePath.replace(/^src\//, '');
  const source =
    sourcesMap.get(normalized) ??
    sourcesMap.get(`src/${normalized}`) ??
    sourcesMap.get(relativePath);
  const svg =
    source ??
    readFileSync(path.join(packageRoot, 'src', normalized.replace(/^icons\//, '')), 'utf8');
  return normalized.replace(/^icons\//, '').startsWith('outline/')
    ? normalizeSvgStrokeWidth(svg)
    : svg;
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
    semanticEraseSourceId: sourceNodeId,
  };
}

function planOutlineManifest(packageRoot, sourcesMap, documents) {
  const [manifest, provenance] = [
    readJson(packageRoot, MANIFEST_PATHS.outline, documents),
    readJson(packageRoot, RAW_PROVENANCE_PATHS.outline, documents),
  ];
  const figmaByNode = rawSourcesByNode(provenance);
  const symbols = manifest.symbols.map((record) => {
    const localSource = sourceFrom(sourcesMap, packageRoot, `icons/outline/${record.file}`);
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
      figmaRawSvgSha256: sha256(figmaSource),
      localRawSvgSha256: sha256(localSource),
      figmaNormalizedAstSha256,
      localNormalizedAstSha256,
      normalizedAstSha256: localNormalizedAstSha256,
      figmaGeometrySha256,
      localGeometrySha256,
      geometrySha256: localGeometrySha256,
    };
  });
  return {
    ...manifest,
    strokeWidthPolicy: ICON_STROKE_WIDTH_POLICY,
    symbols,
  };
}

function planSolidManifest(packageRoot, sourcesMap, documents) {
  const [manifest, provenance] = [
    readJson(packageRoot, MANIFEST_PATHS.solid, documents),
    readJson(packageRoot, RAW_PROVENANCE_PATHS.solid, documents),
  ];
  const figmaByNode = rawSourcesByNode(provenance);
  const updateRecord = (record) => {
    const localSource = sourceFrom(sourcesMap, packageRoot, `icons/${record.localFile}`);
    const figmaSource = figmaByNode.get(record.nodeId);
    if (!figmaSource) throw new Error(`FIGMA_RAW_SOURCE_MISSING: solid/${record.nodeId}`);
    const normalizedOptions = {
      ignoreUnreferencedIds: true,
      normalizeForegroundPaint: true,
      normalizeStrokeWidth: false,
    };
    const geometryOptions = {
      geometryOnly: true,
      ignoreUnreferencedIds: true,
      normalizeStrokeWidth: false,
    };
    const paintOptions = { normalizeFigmaPrimary: true, normalizeStrokeWidth: false };
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
      figmaRawSvgSha256: sha256(figmaSource),
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
  const symbols = manifest.symbols.map(updateRecord);
  const supplementalSources = manifest.supplementalSources.map(updateRecord);
  return {
    ...manifest,
    strokeWidthPolicy: SOLID_STROKE_WIDTH_POLICY,
    symbols,
    supplementalSources,
  };
}

function planColorfulManifest(packageRoot, sourcesMap, documents) {
  const manifest = readJson(packageRoot, MANIFEST_PATHS.colorful, documents);
  const rows = manifest.rows.map((record) => {
    if (record.rowDisposition !== 'canonical-new') return record;
    const localFile = record.localFile.replace(/^src\//, '');
    const localSource = sourceFrom(sourcesMap, packageRoot, `icons/${localFile}`);
    return { ...record, normalizedSvgSha256: sha256(localSource) };
  });
  const { schemaVersion, policyId, evidenceVersion, ...rest } = manifest;
  delete rest.strokeWidthPolicy;
  return {
    schemaVersion,
    policyId,
    strokeWidthPolicy: { strategy: 'preserve-source-stroke-v1' },
    evidenceVersion,
    ...rest,
    rows,
  };
}

export function deriveIconStrokeManifests(packageRoot, sourcesMap, documents) {
  if (!(sourcesMap instanceof Map)) throw new TypeError('sourcesMap must be a Map');
  const [outline, solid, colorful] = [
    planOutlineManifest(packageRoot, sourcesMap, documents),
    planSolidManifest(packageRoot, sourcesMap, documents),
    planColorfulManifest(packageRoot, sourcesMap, documents),
  ];
  return new Map([
    [MANIFEST_PATHS.outline, formattedJson(outline)],
    [MANIFEST_PATHS.solid, formattedJson(solid)],
    [MANIFEST_PATHS.colorful, formattedJson(colorful)],
  ]);
}

export async function planIconStrokeManifests(packageRoot, sourcesMap, documents) {
  if (!documents) {
    const { buildIconDocuments } = await import('./icon-source-documents.mjs');
    documents = buildIconDocuments(packageRoot);
  }
  return deriveIconStrokeManifests(packageRoot, sourcesMap, documents);
}
