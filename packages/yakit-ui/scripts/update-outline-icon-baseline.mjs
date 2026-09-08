import { reviewedOutlineGeometry } from './outline-geometry-overrides.mjs';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalizeSvg, invalidStrokeWidths, parseSvg } from './audit-icons.mjs';
import { getIconAuditPolicy } from './icon-audit-contracts.mjs';

const sha256 = (source) => createHash('sha256').update(source).digest('hex');
const DATA_COMPARE_RELATIVE_CURRENT_COLOR =
  'rgb(from currentColor calc(r + 139) calc(g + 144) calc(b + 152))';

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--replace-existing') {
      values.set('replace-existing', 'true');
      continue;
    }
    if (!key.startsWith('--') || index + 1 >= argv.length)
      throw new Error(`expected --key value, received ${key}`);
    values.set(key.slice(2), argv[++index]);
  }
  for (const required of ['source-inventory', 'prechange-baseline', 'review-id', 'reviewed-by']) {
    if (!values.get(required)) throw new Error(`missing required --${required}`);
  }
  if (process.env.CI) throw new Error('baseline updates are prohibited in CI');
  return values;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

function exportMap(indexSource) {
  const imports = new Map(
    [...indexSource.matchAll(/import\s+(\w+)Svg\s+from\s+'\.\/(.+?\.svg)\?react';/g)].map(
      (match) => [match[1], match[2]],
    ),
  );
  const result = new Map();
  for (const match of indexSource.matchAll(
    /export\s+const\s+(\w+)\s*=\s*createIcon\(\s*(\w+)Svg\s*,/g,
  )) {
    const file = imports.get(match[2]);
    if (file) result.set(file, match[1]);
  }
  return result;
}

function semanticPaintExceptions(source, relativePath) {
  const result = [];
  const references = new Set(
    [...source.matchAll(/url\(\s*#([^\s)]+)\s*\)/g)].map((match) => match[1]),
  );
  const walk = (node, definitionId) => {
    const name = node.name.toLowerCase();
    const nextDefinitionId = ['clippath', 'mask'].includes(name)
      ? (node.attributes.get('id') ?? definitionId)
      : definitionId;
    if (nextDefinitionId && references.has(nextDefinitionId)) {
      for (const attribute of ['color', 'fill', 'stroke']) {
        const value = node.attributes.get(attribute);
        if (value && value !== 'none' && value !== 'currentColor' && !value.startsWith('url(')) {
          result.push({
            path: relativePath,
            definitionId: nextDefinitionId,
            attribute,
            value,
            reason: `${name} paint participates in referenced ${nextDefinitionId} semantics`,
          });
        }
      }
      const style = node.attributes.get('style');
      for (const declaration of style?.split(';') ?? []) {
        const separator = declaration.indexOf(':');
        if (separator < 1) continue;
        const attribute = declaration.slice(0, separator).trim().toLowerCase();
        const value = declaration.slice(separator + 1).trim();
        if (
          ['color', 'fill', 'stroke'].includes(attribute) &&
          value !== 'none' &&
          value !== 'currentColor' &&
          !value.startsWith('url(')
        )
          result.push({
            path: relativePath,
            definitionId: nextDefinitionId,
            attribute,
            value,
            reason: `${name} style paint participates in referenced ${nextDefinitionId} semantics`,
          });
      }
    }
    node.children.forEach((child) => walk(child, nextDefinitionId));
  };
  walk(parseSvg(source), undefined);
  return result;
}

async function main() {
  const policy = getIconAuditPolicy('outline-v1');
  const args = parseArguments(process.argv.slice(2));
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const sourceInventoryPath = path.resolve(args.get('source-inventory'));
  const prechangePath = path.resolve(args.get('prechange-baseline'));
  const figmaRawProvenancePath = path.resolve(
    args.get('figma-raw-provenance') ??
      path.join(packageRoot, 'test/fixtures/icons/reference/figma-outline-raw-provenance-v1.json'),
  );
  const placementProvenancePath = path.resolve(
    args.get('placement-provenance') ??
      path.join(
        packageRoot,
        'test/fixtures/icons/reference/figma-outline-placement-provenance-v1.json',
      ),
  );
  const output = path.resolve(
    args.get('output') ?? path.join(packageRoot, 'scripts/figma-outline-icons-inventory.json'),
  );
  const basicManifestPath = path.join(packageRoot, 'scripts/figma-basic-icons-inventory.json');
  const [
    sourceInventoryText,
    prechangeText,
    indexSource,
    basicManifestText,
    figmaRawProvenanceText,
    placementProvenanceText,
  ] = await Promise.all([
    readFile(sourceInventoryPath, 'utf8'),
    readFile(prechangePath, 'utf8'),
    readFile(path.join(packageRoot, 'src/icons/outline/index.tsx'), 'utf8'),
    readFile(basicManifestPath, 'utf8'),
    readFile(figmaRawProvenancePath, 'utf8'),
    readFile(placementProvenancePath, 'utf8'),
  ]);
  const sourceInventory = JSON.parse(sourceInventoryText);
  const prechange = JSON.parse(prechangeText);
  const figmaRawProvenance = JSON.parse(figmaRawProvenanceText);
  const placementProvenance = JSON.parse(placementProvenanceText);
  if (
    figmaRawProvenance.fileKey !== 'QWct5XE0Bg0bNDQ93eYgEw' ||
    figmaRawProvenance.frameNodeId !== '46824:1930' ||
    figmaRawProvenance.components?.length !== 350 ||
    figmaRawProvenance.instances?.length !== 3
  )
    throw new Error('Figma raw provenance identity/counts are invalid');
  const figmaComponents = new Map(
    figmaRawProvenance.components.map((component) => [component.nodeId, component]),
  );
  const figmaInstances = new Map(
    figmaRawProvenance.instances.map((instance) => [instance.placementNodeId, instance]),
  );
  if (
    placementProvenance.fileKey !== figmaRawProvenance.fileKey ||
    placementProvenance.frameNodeId !== figmaRawProvenance.frameNodeId ||
    placementProvenance.currentSymbols?.length !== 350 ||
    placementProvenance.placements?.length !== 353
  )
    throw new Error('Figma placement provenance identity/counts are invalid');
  const placementSourceIds = new Set(
    placementProvenance.currentSymbols.map(({ exportedSourceNodeId }) => exportedSourceNodeId),
  );
  if (
    placementSourceIds.size !== 350 ||
    [...figmaComponents.keys()].some((nodeId) => !placementSourceIds.has(nodeId))
  )
    throw new Error('Figma placement/raw component sets differ');
  const exportsByFile = exportMap(indexSource);
  const prechangeByNode = new Map(
    prechange.exports.map((entry) => [entry.exportedSourceNodeId, entry]),
  );
  if (sourceInventory.currentSymbols?.length !== 350 || sourceInventory.placements?.length !== 353)
    throw new Error('source inventory must contain exactly 350 symbols and 353 placements');
  const instances = placementProvenance.placements.filter(
    ({ nodeType }) => nodeType === 'instance',
  );
  if (instances.length !== 3)
    throw new Error(
      `source inventory must contain exactly 3 instances, received ${instances.length}`,
    );
  const placements = placementProvenance.placements.map((placement) => {
    if (!placement.placementNodeId || !placement.exportedSourceNodeId)
      throw new Error(
        `placement provenance incomplete: ${placement.placementNodeId ?? '<unknown>'}`,
      );
    if (placement.nodeType === 'instance') {
      const instance = figmaInstances.get(placement.placementNodeId);
      if (!instance || instance.mainComponentId !== placement.exportedSourceNodeId)
        throw new Error(`instance main component unresolved: ${placement.placementNodeId}`);
      return {
        ...placement,
        mainComponentId: instance.mainComponentId,
        mainComponentIdStatus: 'resolved',
        overrideHash: sha256(canonicalJson(placement.overridePayload)),
        overrideHashStatus: 'captured',
      };
    } else {
      if (!figmaComponents.has(placement.exportedSourceNodeId))
        throw new Error(`symbol component missing: ${placement.placementNodeId}`);
      return {
        ...placement,
        mainComponentId: placement.exportedSourceNodeId,
        mainComponentIdStatus: 'self_symbol',
        overrideHash: sha256(canonicalJson(placement.overridePayload)),
        overrideHashStatus: 'captured',
      };
    }
  });

  const symbols = [];
  const paintExceptions = [];
  for (const symbol of placementProvenance.currentSymbols) {
    const file = `${symbol.exportedSourceNodeId.replace(':', '-')}.svg`;
    const localSource = await readFile(path.join(packageRoot, 'src/icons/outline', file), 'utf8');
    if (invalidStrokeWidths(localSource).length > 0)
      throw new Error(`stroke-width policy mismatch: ${file}`);
    const figmaRawSource = figmaComponents.get(symbol.exportedSourceNodeId)?.svg;
    if (!figmaRawSource) throw new Error(`Figma raw SVG missing: ${symbol.exportedSourceNodeId}`);
    const relativeCurrentColorValue =
      symbol.exportedSourceNodeId === '45035:1908'
        ? DATA_COMPARE_RELATIVE_CURRENT_COLOR
        : undefined;
    const figmaNormalizedAstSha256 = sha256(
      canonicalizeSvg(figmaRawSource, {
        normalizeForegroundPaint: true,
        normalizeSemanticErase: true,
        normalizeStrokeWidth: true,
        relativeCurrentColorValue,
        semanticEraseSourceId: symbol.exportedSourceNodeId,
      }),
    );
    const localNormalizedAstSha256 = sha256(
      canonicalizeSvg(localSource, {
        normalizeForegroundPaint: true,
        normalizeSemanticErase: true,
        normalizeStrokeWidth: true,
        relativeCurrentColorValue,
        semanticEraseSourceId: symbol.exportedSourceNodeId,
      }),
    );
    const figmaGeometrySha256 = sha256(
      canonicalizeSvg(figmaRawSource, {
        geometryOnly: true,
        normalizeSemanticErase: true,
        normalizeStrokeWidth: true,
        relativeCurrentColorValue,
        semanticEraseSourceId: symbol.exportedSourceNodeId,
      }),
    );
    const localGeometrySha256 = sha256(
      canonicalizeSvg(localSource, {
        geometryOnly: true,
        normalizeSemanticErase: true,
        normalizeStrokeWidth: true,
        relativeCurrentColorValue,
        semanticEraseSourceId: symbol.exportedSourceNodeId,
      }),
    );
    const geometryReviewId = reviewedOutlineGeometry({
      exportedSourceNodeId: symbol.exportedSourceNodeId,
      file,
      figmaRawSvgSha256: sha256(figmaRawSource),
      localRawSvgSha256: sha256(localSource),
      figmaNormalizedAstSha256,
      localNormalizedAstSha256,
      figmaGeometrySha256,
      localGeometrySha256,
    });
    if (!geometryReviewId && figmaNormalizedAstSha256 !== localNormalizedAstSha256)
      throw new Error(`normalized AST mismatch: ${file}`);
    if (!geometryReviewId && figmaGeometrySha256 !== localGeometrySha256)
      throw new Error(`geometry mismatch: ${file}`);
    const previous = prechangeByNode.get(symbol.exportedSourceNodeId);
    symbols.push({
      ...symbol,
      ...(geometryReviewId ? { geometryReviewId } : {}),
      file,
      exportName: exportsByFile.get(file) ?? null,
      disposition:
        previous?.classification === 'defect'
          ? 'repaired'
          : symbol.exportedSourceNodeId === '46174:9893'
            ? 'added-canonical-source'
            : 'matching',
      figmaRawSvgSha256: sha256(figmaRawSource),
      figmaRawSvgStatus: 'captured-canonical-source',
      localRawSvgSha256: sha256(localSource),
      figmaNormalizedAstSha256,
      localNormalizedAstSha256,
      normalizedAstSha256: localNormalizedAstSha256,
      figmaGeometrySha256,
      localGeometrySha256,
      geometrySha256: localGeometrySha256,
    });
    paintExceptions.push(...semanticPaintExceptions(localSource, `outline/${file}`));
  }
  const missingExports = symbols.filter(({ exportName }) => !exportName).map(({ file }) => file);
  if (missingExports.length > 0)
    throw new Error(`missing public exports: ${missingExports.join(', ')}`);
  if (exportsByFile.size !== 350)
    throw new Error(`public export count must be 350, received ${exportsByFile.size}`);
  const manifest = {
    schemaVersion: 'figma-outline-icons-inventory-v1',
    complete: true,
    provenanceComplete: true,
    completenessScope:
      'complete 353-placement, 350 Plugin API raw component SVG, and exact 3-instance override provenance',
    variant: 'outline',
    fileKey: 'QWct5XE0Bg0bNDQ93eYgEw',
    frameNodeId: '46824:1930',
    frameName: 'outline',
    frameSize: { height: 1779, width: 457 },
    expectedCounts: { currentSymbols: 350, instances: 3, placements: 353, publicExports: 350 },
    strokeWidthPolicy: policy.strokeWidthPolicy,
    sourceEvidence: {
      ...sourceInventory.sourceEvidence,
      sourceInventorySha256: sha256(sourceInventoryText),
      prechangeBaselineSha256: sha256(prechangeText),
      basicManifestSha256: sha256(basicManifestText),
      figmaRawProvenanceSha256: sha256(figmaRawProvenanceText),
      placementProvenanceSha256: sha256(placementProvenanceText),
    },
    updateProvenance: {
      reviewId: args.get('review-id'),
      reviewedBy: args.get('reviewed-by'),
      updater: 'scripts/update-outline-icon-baseline.mjs',
    },
    placements,
    relativeCurrentColorExceptions: [
      {
        exportedSourceNodeId: '45035:1908',
        path: 'outline/45035-1908.svg',
        attribute: 'color',
        value: DATA_COMPARE_RELATIVE_CURRENT_COLOR,
        strategy: 'relative-currentColor-secondary-role-v1',
        reason:
          'preserves the canonical #C0C6D1 secondary paint as a deterministic offset from currentColor',
      },
    ],
    semanticEraseNormalizations: ['14203:193724', '38678:28634'].map((exportedSourceNodeId) => ({
      exportedSourceNodeId,
      strategy: 'luminance-mask-overdraw-v1',
    })),
    symbols,
    instanceVerification: placements.filter(({ nodeType }) => nodeType === 'instance'),
    legacySources: [],
    paintExceptions,
  };
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, {
    flag: args.has('replace-existing') ? 'w' : 'wx',
  });
  console.log(
    `OUTLINE_BASELINE_UPDATED ${path.relative(process.cwd(), output)} ${sha256(JSON.stringify(manifest))}`,
  );
}

main().catch((error) => {
  console.error(`OUTLINE_BASELINE_UPDATE_ERROR ${error.message}`);
  process.exitCode = 2;
});
