import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format } from 'prettier';

import { parseSvg } from '../scripts/audit-icons.mjs';

const configRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(configRoot, '..');
const outlineRoot = resolve(packageRoot, 'src/outline');
const outputPath = resolve(configRoot, 'iconStrokeContract.generated.ts');

export function sourceFixedFillDispositions(records) {
  return new Map(
    records
      .filter(
        (record) =>
          record.production?.geometry === 'source' &&
          record.production?.strokeMode === 'fixed-fill',
      )
      .map((record) => [
        record.file,
        'Explicit Figma source sync: filled contours have no adjustable stroke.',
      ]),
  );
}

const coupledCutoutFiles = new Set(['14203-193724.svg', '38678-28634.svg']);
const definitionElements = new Set([
  'clipPath',
  'defs',
  'linearGradient',
  'mask',
  'pattern',
  'radialGradient',
]);
const supportedWidthElements = new Set([
  'circle',
  'ellipse',
  'g',
  'line',
  'path',
  'polygon',
  'polyline',
  'rect',
]);
const sha256 = (source) => createHash('sha256').update(source).digest('hex');

function styleStrokeWidth(style) {
  const declarations = String(style ?? '').split(';');
  const matches = declarations
    .map((declaration) => declaration.split(':'))
    .filter(([name]) => name?.trim().toLowerCase() === 'stroke-width');
  if (matches.length > 1) throw new Error('ICON_STROKE_DUPLICATE_STYLE_WIDTH');
  return matches[0]?.slice(1).join(':').trim();
}

function effectiveStroke(node, inheritedStroke) {
  const inlineStroke = String(node.attributes.get('style') ?? '')
    .split(';')
    .map((declaration) => declaration.split(':'))
    .filter(([name]) => name?.trim().toLowerCase() === 'stroke')
    .at(-1)
    ?.slice(1)
    .join(':')
    .trim();
  const declared = inlineStroke ?? node.attributes.get('stroke');
  if (declared === undefined || ['inherit', 'unset'].includes(declared.trim().toLowerCase()))
    return inheritedStroke;
  return declared.trim().toLowerCase() === 'initial' ? 'none' : declared;
}

function hasPaintedWidthConsumer(node, stroke) {
  if (node.name !== 'g' && supportedWidthElements.has(node.name))
    return stroke.trim().toLowerCase() !== 'none';
  return node.children.some(
    (child) =>
      !child.attributes.has('stroke-width') &&
      styleStrokeWidth(child.attributes.get('style')) === undefined &&
      hasPaintedWidthConsumer(child, effectiveStroke(child, stroke)),
  );
}

function collectTargets(root, file, coupledCutouts) {
  const targets = [];
  const walk = (node, locator, ancestors, inheritedStroke = 'none') => {
    const stroke = effectiveStroke(node, inheritedStroke);
    const inlineWidth = styleStrokeWidth(node.attributes.get('style'));
    if (node.name === 'style')
      throw new Error(`ICON_STROKE_STYLE_ELEMENT_UNSUPPORTED: outline/${file}`);
    const declarations = [
      ...(node.attributes.has('stroke-width')
        ? [{ sourceDefault: node.attributes.get('stroke-width'), surface: 'attribute' }]
        : []),
      ...(inlineWidth !== undefined ? [{ sourceDefault: inlineWidth, surface: 'style' }] : []),
    ];
    if (declarations.length > 0 && !supportedWidthElements.has(node.name))
      throw new Error(`ICON_STROKE_ELEMENT_UNSUPPORTED: outline/${file}:${node.name}`);

    if (declarations.length > 0 && !hasPaintedWidthConsumer(node, stroke))
      throw new Error(`ICON_STROKE_NONPAINTING_WIDTH_UNSUPPORTED: outline/${file}:${node.name}`);

    const inDefinition = ancestors.some((ancestor) => definitionElements.has(ancestor));
    let role = 'adjustable-primary';
    if (inDefinition) {
      role = 'fixed-definition';
      if (coupledCutouts.has(file) && ancestors.includes('mask')) role = 'coupled-cutout';
    }
    for (const declaration of declarations) {
      targets.push({
        element: node.name,
        expectedMatches: 1,
        locator,
        role,
        sourceDefault: declaration.sourceDefault,
        surface: declaration.surface,
      });
    }
    node.children.forEach((child, index) =>
      walk(child, [...locator, index], [...ancestors, node.name], stroke),
    );
  };
  walk(root, [], []);
  return targets;
}

export function generateIconStrokeContract(
  root = outlineRoot,
  { coupledCutouts = coupledCutoutFiles, fixedFill, sources } = {},
) {
  const files = (sources ? [...sources.keys()] : readdirSync(root))
    .filter((file) => file.endsWith('.svg'))
    .sort();
  if (!fixedFill) {
    const source = JSON.parse(
      readFileSync(resolve(root, '../../config/icon-sources/outline.json'), 'utf8'),
    );
    fixedFill = sourceFixedFillDispositions(
      source.records.filter((record) => files.includes(record.file)),
    );
  }
  const entries = {};
  for (const file of files) {
    const source = sources ? sources.get(file) : readFileSync(resolve(root, file), 'utf8');
    const targets = collectTargets(parseSvg(source), file, coupledCutouts);
    if (targets.length === 0) {
      const reason = fixedFill.get(file);
      if (!reason) throw new Error(`ICON_STROKE_FILL_DISPOSITION_MISSING: outline/${file}`);
      entries[file] = {
        classification: 'fixed-fill',
        file,
        reason,
        sha256: sha256(source),
        targets: [],
      };
      continue;
    }
    if (fixedFill.has(file))
      throw new Error(`ICON_STROKE_FIXED_FILL_NOW_HAS_WIDTH: outline/${file}`);
    entries[file] = { classification: 'adjustable', file, sha256: sha256(source), targets };
  }
  for (const file of fixedFill.keys()) {
    if (!entries[file]) throw new Error(`ICON_STROKE_DISPOSITION_ORPHAN: outline/${file}`);
  }
  return entries;
}

export async function serializeIconStrokeContract(entries) {
  return format(
    `/* This file is generated by config/generateIconStrokeContract.mjs. */\nimport type { IconStrokeContract } from './iconStrokeContract';\n\nexport const outlineStrokeContract = ${JSON.stringify(entries)} as const satisfies Record<string, IconStrokeContract>;\n`,
    { parser: 'typescript', printWidth: 100, singleQuote: true },
  );
}

export async function writeIconStrokeContract() {
  writeFileSync(outputPath, await serializeIconStrokeContract(generateIconStrokeContract()));
}

export async function checkIconStrokeContract(root = outlineRoot, target = outputPath, options) {
  const entries = generateIconStrokeContract(root, options);
  const expected = await serializeIconStrokeContract(entries);
  const actual = readFileSync(target, 'utf8');
  if (actual !== expected)
    throw new Error('ICON_STROKE_CONTRACT_STALE: run generateIconStrokeContract.mjs --write');
  return { files: Object.keys(entries).length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--write')) await writeIconStrokeContract();
  else if (process.argv.includes('--check')) await checkIconStrokeContract();
  else throw new Error('Pass --check or --write.');
}
