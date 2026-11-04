// In-memory views of the canonical source records. These documents are never persisted.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalJson, policyDigest, sortedPublicMapping } from './icon-audit-contracts.mjs';
import { readIconSources, sourceCounts, sourceFiles } from './icon-source-data.mjs';
import { validateColorfulInventory } from './colorful-icon-contracts.mjs';
import { deriveIconStrokeManifests } from './update-icon-stroke-manifests.mjs';

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const manifestPath = (family) => `config/icon-sources/${family}.json#manifest`;
export const evidencePath = (family, kind) => `config/icon-sources/${family}.json#${kind}`;
export const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const fail = (message) => {
  throw new Error(message);
};

export function monochromeDocuments(source) {
  const { family, fileKey, records } = source;
  const raw = { ...source.rawMetadata, fileKey };
  const placement = { ...source.placementMetadata, fileKey };
  const manifest = { ...source.metadata, fileKey, expectedCounts: sourceCounts(source) };
  const rawRecord = (r) => ({ nodeId: r.nodeId, name: r.name, ...r.raw });
  const placementRecord = (r) => ({
    [family === 'outline' ? 'exportedSourceNodeId' : 'nodeId']: r.nodeId,
    name: r.name,
    ...r.placement,
  });
  const symbol = (r) => ({
    [family === 'outline' ? 'exportedSourceNodeId' : 'nodeId']: r.nodeId,
    name: r.name,
    ...r.metadata,
    ...(family === 'outline'
      ? { file: r.file }
      : { localFile: `solid/${r.file}`, scopeRole: r.scopeRole }),
    exportName: r.exportName,
    figmaRawSvgSha256: sha256(r.raw.svg),
  });
  if (family === 'outline') {
    raw.components = records.map(rawRecord);
    placement.currentSymbols = records.map(placementRecord);
    placement.placements = records.flatMap((r) =>
      r.placements.map((p) => ({
        ...p,
        name: p.nodeType === 'instance' ? (p.instanceName ?? r.name) : r.name,
        exportedSourceNodeId: r.nodeId,
      })),
    );
    placement.counts = {
      placements: placement.placements.length,
      currentSymbols: records.length,
      instances: sourceCounts(source).instances,
    };
    manifest.placements = placement.placements.map((p) => ({
      ...p,
      mainComponentIdStatus:
        p.nodeType === 'component'
          ? 'self_symbol'
          : p.mainComponentIdStatus === 'verified-via-plugin-api'
            ? 'resolved'
            : p.mainComponentIdStatus,
      overrideHash: sha256(canonicalJson(p.overridePayload ?? null)),
      overrideHashStatus: 'captured',
    }));
    manifest.instanceVerification = manifest.placements.filter((p) => p.nodeType === 'instance');
    manifest.symbols = records.map(symbol);
    raw.frame = {
      ...raw.frame,
      placementCount: placement.placements.length,
      componentCount: records.length,
      instanceCount: sourceCounts(source).instances,
    };
  } else {
    const targets = records.filter((r) => r.scopeRole === 'target');
    const supplements = records.filter((r) => r.scopeRole === 'supplement');
    raw.components = targets.map(rawRecord);
    raw.supplementalComponents = supplements.map(rawRecord);
    placement.placements = records.flatMap((r) =>
      (r.placements ?? []).map((p) => ({ ...p, name: r.name, exportedSourceNodeId: r.nodeId })),
    );
    placement.counts = {
      placements: placement.placements.length,
      currentSymbols: targets.length,
      instances: 0,
      supplementalSources: supplements.length,
    };
    placement.targetSymbols = targets.map(placementRecord);
    placement.currentSymbols = placement.targetSymbols;
    placement.supplementalSources = supplements.map(placementRecord);
    manifest.symbols = targets.map(symbol);
    manifest.supplementalSources = supplements.map(symbol);
    manifest.publicExports = records.map((r) => ({
      nodeId: r.nodeId,
      localFile: `solid/${r.file}`,
      exportName: r.exportName,
      scopeRole: r.scopeRole,
    }));
    const ids = targets.map((r) => r.nodeId);
    manifest.targetMembershipSha256 = policyDigest([...ids].sort());
    manifest.targetOrderSha256 = policyDigest(ids);
    manifest.publicMappingSha256 = policyDigest(sortedPublicMapping(manifest.publicExports));
    raw.targetOrderSha256 = manifest.targetOrderSha256;
    placement.targetOrderSha256 = manifest.targetOrderSha256;
    raw.frame = { ...raw.frame, placementCount: targets.length, componentCount: targets.length };
  }
  manifest.completenessScope =
    'Registered source records; does not assert a complete remote Figma frame scan';
  manifest.sourceEvidence = {
    ...manifest.sourceEvidence,
    figmaRawProvenanceSha256: sha256(jsonText(raw)),
    placementProvenanceSha256: sha256(jsonText(placement)),
  };
  if (family === 'outline')
    manifest.sourceEvidence.sourceInventorySha256 = sha256(jsonText(placement));
  return new Map([
    [manifestPath(family), manifest],
    [evidencePath(family, 'raw'), raw],
    [evidencePath(family, 'placement'), placement],
  ]);
}
export function oldiconInventory(source, assets) {
  const entries = source.records
    .flatMap((r) => {
      const hash = sha256(assets.get(`oldicon/${r.assetFile}`));
      if (r.assetFile !== `assets/${hash}.svg`) fail(`OLDICON_ASSET_HASH_MISMATCH: ${r.assetFile}`);
      return r.sources.map((s) => ({
        ...s,
        assetFile: r.assetFile,
        assetSha256: hash,
        artworkSha256: hash,
      }));
    })
    .sort((a, b) =>
      `${a.sourceFile}\0${a.sourceName}`.localeCompare(`${b.sourceFile}\0${b.sourceName}`),
    );
  const exports = [...new Set(entries.map((r) => r.exportName))]
    .sort((a, b) => a.localeCompare(b))
    .map((exportName) => {
      const rows = entries.filter((r) => r.exportName === exportName);
      if (new Set(rows.map((r) => r.assetFile)).size !== 1)
        fail(`OLDICON_EXPORT_ASSET_CONFLICT: ${exportName}`);
      return {
        assetFile: rows[0].assetFile,
        artworkSha256: rows[0].artworkSha256,
        exportName,
        sourceKeys: rows.map((r) => `${r.sourceFile}::${r.sourceName}`).sort(),
      };
    });
  return {
    ...source.metadata,
    totals: {
      artworks: source.records.length,
      exports: exports.length,
      repairedSourcePaths: entries.filter((r) => r.repairs?.length).length,
      sourceNames: new Set(entries.map((r) => r.sourceName)).size,
      sourcePaths: entries.length,
    },
    entries,
    exports,
  };
}

export function colorfulDocument(source, assets) {
  const colorful = {
    ...source.metadata,
    fileKey: source.fileKey,
    groups: source.groups.map((g) => ({
      ...g,
      expectedRowCount: source.records.filter((r) => r.groupNodeId === g.nodeId).length,
    })),
    rows: source.records.map((r) => {
      const { rawSvg } = r;
      const row = Object.fromEntries(
        Object.entries(r).filter(([key]) => !['rawSvg', 'production', 'evidence'].includes(key)),
      );
      return {
        ...row,
        ...(r.production?.paintReplacements
          ? { projectPaintBindings: Object.values(r.production.paintReplacements) }
          : {}),
        fileKey: source.fileKey,
        componentNodeId: r.nodeId,
        groupId: r.groupNodeId,
        rowId: `${r.groupNodeId}/${r.nodeId}`,
        ...(r.localFile
          ? {
              rawSvgSha256: rawSvg ? sha256(rawSvg) : r.rawSvgSha256,
              normalizedSvgSha256: sha256(assets.get(r.localFile)),
            }
          : {}),
      };
    }),
  };
  colorful.frozenClassification = validateColorfulInventory(colorful, {
    expectedGroupCount: colorful.groups.length,
    expectedRowCount: colorful.rows.length,
    requireProvenance: true,
  });
  return colorful;
}

export function buildIconDocuments(root = packageRoot, options = {}) {
  const sources = options.sources ?? readIconSources(pathToFileURL(`${root}/config/icon-sources/`));
  const assets =
    options.assets ??
    new Map(
      Object.values(sources)
        .flatMap(sourceFiles)
        .filter((file) => file.endsWith('.svg'))
        .map((file) => [file, readFileSync(path.join(root, 'src/icons', file), 'utf8')]),
    );
  const documents = new Map([
    ...monochromeDocuments(sources.outline),
    ...monochromeDocuments(sources.solid),
    [manifestPath('colorful'), colorfulDocument(sources.colorful, assets)],
    [manifestPath('oldicon'), oldiconInventory(sources.oldicon, assets)],
  ]);
  const manifests = deriveIconStrokeManifests(
    root,
    new Map([...assets].map(([file, svg]) => [`icons/${file}`, svg])),
    documents,
  );
  for (const [key, value] of manifests) documents.set(key, JSON.parse(value));
  return documents;
}

// A #manifest/#raw/#placement selector requests a projection of one source file.
// Ordinary paths remain supported for explicit, independent audit fixtures.
export function readIconInputSync(input, encoding) {
  const value = input instanceof URL ? fileURLToPath(input) + input.hash : String(input);
  const match =
    /^(.*)[/\\]config[/\\]icon-sources[/\\](outline|solid|colorful|oldicon)\.json#(manifest|raw|placement)$/.exec(
      path.resolve(value),
    );
  if (!match) return readFileSync(input, encoding);
  const [, root, family, kind] = match;
  let document;
  if (kind !== 'manifest') {
    const source = JSON.parse(
      readFileSync(path.join(root, 'config/icon-sources', `${family}.json`), 'utf8'),
    );
    document = monochromeDocuments(source).get(evidencePath(family, kind));
  } else if (family === 'oldicon') {
    const source = JSON.parse(
      readFileSync(path.join(root, 'config/icon-sources/oldicon.json'), 'utf8'),
    );
    const assets = new Map(
      sourceFiles(source).map((file) => [
        file,
        readFileSync(path.join(root, 'src/icons', file), 'utf8'),
      ]),
    );
    document = oldiconInventory(source, assets);
  } else document = buildIconDocuments(root).get(manifestPath(family));
  if (!document) throw new Error(`ICON_DOCUMENT_UNKNOWN: ${family}#${kind}`);
  const text = jsonText(document);
  return encoding
    ? Buffer.from(text).toString(typeof encoding === 'string' ? encoding : encoding.encoding)
    : Buffer.from(text);
}
export async function readIconInput(input, encoding) {
  return readIconInputSync(input, encoding);
}
