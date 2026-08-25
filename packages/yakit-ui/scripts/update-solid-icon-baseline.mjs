import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  canonicalizeSvg,
  collectPaintSemantics,
  paintSemanticsSha256,
  parseIconIndex,
  parseSvg,
} from './audit-icons.mjs';
import {
  canonicalJson,
  getIconAuditPolicy,
  policyDigest,
  sortedPublicMapping,
} from './icon-audit-contracts.mjs';

const sha256 = (source) => createHash('sha256').update(source).digest('hex');

function parseArguments(argv) {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--replace-existing') {
      result.set('replace-existing', 'true');
      continue;
    }
    if (!key.startsWith('--') || index + 1 >= argv.length)
      throw new Error(`expected --key value, received ${key}`);
    result.set(key.slice(2), argv[++index]);
  }
  for (const required of ['review-id', 'reviewed-by'])
    if (!result.get(required)) throw new Error(`missing required --${required}`);
  if (process.env.CI) throw new Error('baseline updates are prohibited in CI');
  return result;
}

function reachableDrawableCount(source) {
  const definitions = new Set([
    'clippath',
    'defs',
    'filter',
    'lineargradient',
    'mask',
    'marker',
    'pattern',
    'radialgradient',
    'symbol',
  ]);
  const drawables = new Set([
    'circle',
    'ellipse',
    'image',
    'line',
    'path',
    'polygon',
    'polyline',
    'rect',
    'text',
    'use',
  ]);
  let count = 0;
  const walk = (node, insideDefinition = false) => {
    const nextInsideDefinition = insideDefinition || definitions.has(node.name.toLowerCase());
    if (!nextInsideDefinition && drawables.has(node.name.toLowerCase())) count += 1;
    node.children.forEach((child) => walk(child, nextInsideDefinition));
  };
  walk(parseSvg(source));
  return count;
}

function evidenceRows(provenance) {
  return provenance.targetSymbols ?? provenance.symbols ?? provenance.currentSymbols ?? [];
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const policy = getIconAuditPolicy('solid-v1');
  const rawPath = path.resolve(
    args.get('figma-raw-provenance') ??
      path.join(packageRoot, 'test/fixtures/icons/reference/figma-solid-raw-provenance-v1.json'),
  );
  const placementPath = path.resolve(
    args.get('placement-provenance') ??
      path.join(
        packageRoot,
        'test/fixtures/icons/reference/figma-solid-placement-provenance-v1.json',
      ),
  );
  const prechangePath = path.resolve(
    args.get('prechange-baseline') ??
      path.join(
        packageRoot,
        'test/fixtures/icons/reference/solid-local-prechange-controls-v1.json',
      ),
  );
  const output = path.resolve(
    args.get('output') ?? path.join(packageRoot, 'scripts/figma-solid-icons-inventory.json'),
  );
  const [rawText, placementText, prechangeText, indexSource] = await Promise.all([
    readFile(rawPath, 'utf8'),
    readFile(placementPath, 'utf8'),
    readFile(prechangePath, 'utf8'),
    readFile(path.join(packageRoot, 'src/icons/solid/index.tsx'), 'utf8'),
  ]);
  const raw = JSON.parse(rawText);
  const placement = JSON.parse(placementText);
  JSON.parse(prechangeText);
  if (
    raw.fileKey !== policy.fileKey ||
    raw.frameNodeId !== policy.frameNodeId ||
    placement.fileKey !== policy.fileKey ||
    placement.frameNodeId !== policy.frameNodeId
  )
    throw new Error('solid provenance identity is invalid');
  const targetEvidence = evidenceRows(placement);
  const targetIds = targetEvidence.map((entry) => entry.nodeId ?? entry.exportedSourceNodeId);
  if (
    policyDigest(targetIds) !== policy.targetOrderSha256 ||
    policyDigest([...targetIds].sort()) !== policy.targetMembershipSha256
  )
    throw new Error('solid target membership/order differs from immutable solid-v1 policy');
  const rawTargetIds = (raw.components ?? []).map(({ nodeId }) => nodeId);
  if (
    policyDigest(rawTargetIds) !== policy.targetOrderSha256 ||
    policyDigest([...rawTargetIds].sort()) !== policy.targetMembershipSha256
  )
    throw new Error('solid raw target membership/order differs from immutable solid-v1 policy');
  const supplementEvidence = placement.supplementalSources ?? [];
  const supplementIds = supplementEvidence.map(
    ({ nodeId, exportedSourceNodeId }) => nodeId ?? exportedSourceNodeId,
  );
  if (
    canonicalJson(supplementIds) !==
      canonicalJson(policy.supplementalSources.map(({ nodeId }) => nodeId)) ||
    canonicalJson((raw.supplementalComponents ?? []).map(({ nodeId }) => nodeId)) !==
      canonicalJson(policy.supplementalSources.map(({ nodeId }) => nodeId))
  )
    throw new Error('solid supplements differ from immutable solid-v1 policy');
  const rawComponents = new Map(
    [...(raw.components ?? []), ...(raw.supplementalComponents ?? [])].map((entry) => [
      entry.nodeId,
      entry,
    ]),
  );
  const parsedIndex = parseIconIndex(indexSource);
  if (parsedIndex.exports.size !== policy.expectedCounts.publicExports)
    throw new Error(`solid public export count must be ${policy.expectedCounts.publicExports}`);
  const exportByFile = new Map(
    [...parsedIndex.exports].map(([exportName, file]) => [file, exportName]),
  );
  const createRecord = async (evidence, scopeRole) => {
    const nodeId = evidence.nodeId ?? evidence.exportedSourceNodeId;
    const file = `${nodeId.replace(':', '-')}.svg`;
    const localFile = `solid/${file}`;
    const localSource = await readFile(path.join(packageRoot, 'src/icons', localFile), 'utf8');
    const figma = rawComponents.get(nodeId);
    if (!figma?.svg) throw new Error(`Figma raw SVG missing: ${nodeId}`);
    const normalizedOptions = {
      ignoreUnreferencedIds: true,
      normalizeForegroundPaint: true,
    };
    const figmaNormalizedAstSha256 = sha256(canonicalizeSvg(figma.svg, normalizedOptions));
    const localNormalizedAstSha256 = sha256(canonicalizeSvg(localSource, normalizedOptions));
    const geometryOptions = { geometryOnly: true, ignoreUnreferencedIds: true };
    const figmaGeometrySha256 = sha256(canonicalizeSvg(figma.svg, geometryOptions));
    const localGeometrySha256 = sha256(canonicalizeSvg(localSource, geometryOptions));
    if (figmaNormalizedAstSha256 !== localNormalizedAstSha256)
      throw new Error(`normalized AST mismatch: ${localFile}`);
    if (figmaGeometrySha256 !== localGeometrySha256)
      throw new Error(`geometry mismatch: ${localFile}`);
    const paintOptions = { normalizeFigmaPrimary: true };
    const paintRows = collectPaintSemantics(localSource, paintOptions);
    const figmaPaintSemanticsSha256 = paintSemanticsSha256(figma.svg, paintOptions);
    const localPaintSemanticsSha256 = paintSemanticsSha256(localSource, paintOptions);
    if (figmaPaintSemanticsSha256 !== localPaintSemanticsSha256)
      throw new Error(`paint semantics mismatch: ${localFile}`);
    return {
      nodeId,
      name: evidence.name ?? figma.name ?? null,
      localFile,
      exportName: exportByFile.get(file) ?? null,
      scopeRole,
      figmaRawSvgSha256: sha256(figma.svg),
      localRawSvgSha256: sha256(localSource),
      figmaNormalizedAstSha256,
      localNormalizedAstSha256,
      normalizedAstSha256: localNormalizedAstSha256,
      figmaGeometrySha256,
      localGeometrySha256,
      geometrySha256: localGeometrySha256,
      figmaPaintSemanticsSha256,
      localPaintSemanticsSha256,
      minimumDrawableCount: reachableDrawableCount(figma.svg),
      paintRoles: [...new Set(paintRows.map(({ role }) => role))].sort(),
    };
  };
  const symbols = [];
  for (const evidence of targetEvidence) symbols.push(await createRecord(evidence, 'target'));
  const supplementalSources = [];
  for (const evidence of supplementEvidence)
    supplementalSources.push(await createRecord(evidence, 'supplement'));
  const publicExports = [...symbols, ...supplementalSources].map(
    ({ nodeId, localFile, exportName, scopeRole }) => ({
      nodeId,
      localFile,
      exportName,
      scopeRole,
    }),
  );
  if (publicExports.some(({ exportName }) => !exportName))
    throw new Error('solid source is missing a public export');
  if (policyDigest(sortedPublicMapping(publicExports)) !== policy.publicMappingSha256)
    throw new Error('solid public mapping differs from immutable solid-v1 policy');
  const manifest = {
    schemaVersion: 'figma-solid-icons-inventory-v1',
    complete: true,
    provenanceComplete: true,
    completenessScope:
      '251 direct Solid frame components plus four explicit public compatibility supplements',
    policyId: policy.id,
    variant: policy.variant,
    fileKey: policy.fileKey,
    frameNodeId: policy.frameNodeId,
    policyDigestAlgorithmVersion: policy.policyDigestAlgorithmVersion,
    idHygieneAlgorithmVersion: policy.idHygieneAlgorithmVersion,
    paintSemanticsAlgorithmVersion: policy.paintSemanticsAlgorithmVersion,
    paintComparisonNormalizationVersion: policy.paintComparisonNormalizationVersion,
    expectedCounts: policy.expectedCounts,
    targetMembershipSha256: policy.targetMembershipSha256,
    targetOrderSha256: policy.targetOrderSha256,
    publicMappingSha256: policy.publicMappingSha256,
    sourceEvidence: {
      timestampFree: true,
      figmaRawProvenanceSha256: sha256(rawText),
      placementProvenanceSha256: sha256(placementText),
      prechangeBaselineSha256: sha256(prechangeText),
      prechangeBaselinePath: policy.prechangeBaselinePath,
    },
    updateProvenance: {
      reviewId: args.get('review-id'),
      reviewedBy: args.get('reviewed-by'),
      updater: 'scripts/update-solid-icon-baseline.mjs',
    },
    symbols,
    supplementalSources,
    publicExports,
    orphanSources: [],
    knownNamingDebt: [
      {
        exportName: 'DownloadFigma12825Solid',
        disposition: 'public-name-preserved-shopping-cart-geometry',
      },
    ],
  };
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, {
    flag: args.has('replace-existing') ? 'w' : 'wx',
  });
  console.log(
    `SOLID_BASELINE_UPDATED ${path.relative(process.cwd(), output)} ${sha256(canonicalJson(manifest))}`,
  );
}

main().catch((error) => {
  console.error(`SOLID_BASELINE_UPDATE_ERROR ${error.message}`);
  process.exitCode = 2;
});
