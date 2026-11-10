import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readIconSources, sourceExports } from './icon-source-data.mjs';
import {
  applyChanges,
  jsonText,
  packageRoot,
  renderImportedSvg,
  validateSources,
} from './update-icons.mjs';
import { parseSvg, collectPaintSemantics } from './audit-icons.mjs';
import {
  generateIconStrokeContract,
  sourceFixedFillDispositions,
} from '../config/generateIconStrokeContract.mjs';
import { inspectFragmentGraph } from './colorful-fragments.mjs';

export function parseFigmaUrl(value) {
  const url = new URL(value);
  const match = /^\/(?:design|file)\/([A-Za-z0-9]+)(?:\/|$)/.exec(url.pathname);
  const nodeId = url.searchParams.get('node-id')?.replace('-', ':');
  if (
    url.protocol !== 'https:' ||
    !['figma.com', 'www.figma.com'].includes(url.hostname) ||
    !match ||
    !/^\d+:\d+$/.test(nodeId ?? '')
  )
    throw new Error(`FIGMA_NODE_URL_INVALID: ${value}`);
  return { fileKey: match[1], nodeId };
}
export function suggestExportName(name, family) {
  const suffix = { outline: 'Outlined', solid: 'Solid', colorful: 'Colorful' }[family];
  const words = name
    .trim()
    .replace(/^(?:outline|solid|colorful)\//i, '')
    .split(/[\s/_-]+/);
  if (!suffix || words.some((word) => !/^[A-Za-z][A-Za-z0-9]*$/.test(word)))
    throw new Error(`ICON_EXPORT_NAME_REQUIRED: ${name}`);
  const base = words.map((word) => word[0].toUpperCase() + word.slice(1)).join('');
  return base.endsWith(suffix) ? base : `${base}${suffix}`;
}
function required(value, message) {
  if (!value) throw new Error(message);
}
function drawables(svg) {
  let count = 0;
  const visit = (node) => {
    if (['defs', 'mask', 'clipPath', 'pattern', 'marker', 'symbol'].includes(node.name)) return;
    if (
      ['path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'use'].includes(
        node.name,
      )
    )
      count++;
    node.children.forEach(visit);
  };
  visit(parseSvg(svg));
  return count;
}
export async function planSourceImport(input, root = packageRoot) {
  required(
    input?.schemaVersion === 1 && Array.isArray(input.icons) && input.icons.length,
    'ICON_IMPORT_SCHEMA_INVALID',
  );
  const sources = readIconSources(pathToFileURL(`${root}/config/icon-sources/`));
  const before = new Map(Object.keys(sources).map((family) => [family, jsonText(sources[family])]));
  const seen = new Set();
  const report = [];
  for (const icon of input.icons) {
    required(
      icon.preserveSourceGeometry === undefined || typeof icon.preserveSourceGeometry === 'boolean',
      'ICON_SOURCE_GEOMETRY_INVALID',
    );
    required(
      icon.syncProduction === undefined || typeof icon.syncProduction === 'boolean',
      'ICON_SYNC_PRODUCTION_INVALID',
    );
    const { fileKey, nodeId } = parseFigmaUrl(icon.url);
    required(
      icon.dimensionsSource === undefined || ['node', 'svg-export'].includes(icon.dimensionsSource),
      `ICON_DIMENSIONS_SOURCE_INVALID: ${nodeId}`,
    );
    required(!seen.has(`${fileKey}/${nodeId}`), `ICON_IMPORT_NODE_DUPLICATE: ${nodeId}`);
    seen.add(`${fileKey}/${nodeId}`);
    let owner;
    let existing;
    for (const source of Object.values(sources))
      if (source.fileKey === fileKey) {
        const found = source.records.find((r) => r.nodeId === nodeId);
        if (found) {
          owner = source.family;
          existing = found;
        }
      }
    const family = icon.family ?? owner;
    required(
      ['outline', 'solid', 'colorful'].includes(family),
      `ICON_IMPORT_FAMILY_REQUIRED: ${nodeId}`,
    );
    required(!owner || owner === family, `ICON_FAMILY_CHANGE_REQUIRES_MIGRATION: ${nodeId}`);
    const source = sources[family];
    required(source.fileKey === fileKey, `ICON_FILE_KEY_MISMATCH: ${nodeId}`);
    required(
      typeof icon.name === 'string' && icon.name.trim() && typeof icon.nodeType === 'string',
      `ICON_NODE_METADATA_MISSING: ${nodeId}`,
    );
    required(
      Number.isFinite(icon.width) &&
        icon.width > 0 &&
        Number.isFinite(icon.height) &&
        icon.height > 0,
      `ICON_DIMENSIONS_MISSING: ${nodeId}`,
    );
    // Instance resolution cannot be inferred from a flattened download.
    required(
      icon.nodeType.toUpperCase() !== 'INSTANCE',
      `ICON_INSTANCE_CANONICAL_SOURCE_REQUIRED: ${nodeId}`,
    );
    required(
      typeof icon.svgPath === 'string' && path.isAbsolute(icon.svgPath),
      `ICON_SVG_PATH_REQUIRED: ${nodeId}`,
    );
    const svg = await readFile(icon.svgPath, 'utf8');
    const parsed = parseSvg(svg);
    const svgWidth = Number(parsed.attributes.get('width'));
    const svgHeight = Number(parsed.attributes.get('height'));
    required(
      svgWidth === icon.width && svgHeight === icon.height,
      `ICON_SVG_DIMENSIONS_MISMATCH: ${nodeId}`,
    );
    if (family === 'outline' || family === 'solid') {
      const size = family === 'outline' ? 24 : 20;
      required(
        icon.width === size &&
          icon.height === size &&
          parsed.attributes.get('viewBox') === `0 0 ${size} ${size}`,
        `ICON_${family.toUpperCase()}_VIEWPORT_INVALID: ${nodeId}`,
      );
    }
    const exportName =
      existing?.exportName ?? icon.exportName ?? suggestExportName(icon.name, family);
    required(
      !existing || !icon.exportName || icon.exportName === existing.exportName,
      `ICON_EXPORT_RENAME_REQUIRES_MIGRATION: ${nodeId}`,
    );
    required(
      /^[A-Za-z_$][\w$]*$/.test(exportName) &&
        exportName.endsWith({ outline: 'Outlined', solid: 'Solid', colorful: 'Colorful' }[family]),
      `ICON_EXPORT_NAME_INVALID: ${nodeId}`,
    );
    if (!existing)
      required(
        !Object.values(sources).some((s) => sourceExports(s).includes(exportName)),
        `ICON_EXPORT_DUPLICATE: ${exportName}`,
      );
    // An identical fetch must not add timestamps or replace a legacy normalization recipe.
    const oldSvg = existing?.raw?.svg ?? existing?.rawSvg;
    if (
      existing &&
      (!icon.syncProduction || existing.production) &&
      (!icon.preserveSourceGeometry || existing.production?.geometry === 'source') &&
      oldSvg === svg &&
      (existing.name ?? existing.figmaName) === icon.name &&
      JSON.stringify(icon.paintReplacements ?? existing.production?.paintReplacements) ===
        JSON.stringify(existing.production?.paintReplacements) &&
      JSON.stringify(icon.evidence ?? existing.evidence) === JSON.stringify(existing.evidence) &&
      (!Number.isFinite(icon.x) ||
        (family === 'colorful'
          ? existing.x === icon.x
          : existing.placements?.some((p) => p.nodeType !== 'instance' && p.x === icon.x))) &&
      (!Number.isFinite(icon.y) ||
        (family === 'colorful'
          ? existing.y === icon.y
          : existing.placements?.some((p) => p.nodeType !== 'instance' && p.y === icon.y)))
    ) {
      report.push({ nodeId, exportName, status: 'unchanged' });
      continue;
    }
    const production = {
      strategy: 'figma-svg-v1',
      ...(icon.preserveSourceGeometry || existing?.production?.geometry === 'source'
        ? {
            geometry: 'source',
            ...(family === 'outline' && !/\bstroke\s*=\s*["'](?!none["'])/i.test(svg)
              ? { strokeMode: 'fixed-fill' }
              : {}),
          }
        : {}),
      ...(icon.paintReplacements
        ? { paintReplacements: icon.paintReplacements }
        : existing?.production?.paintReplacements
          ? { paintReplacements: existing.production.paintReplacements }
          : {}),
    };
    let record;
    if (family === 'colorful') {
      required(
        !existing || existing.rowDisposition === 'canonical-new',
        `ICON_ALIAS_IMPORT_REQUIRES_CANONICAL_SOURCE: ${nodeId}`,
      );
      const groupNodeId = existing?.groupNodeId ?? icon.groupNodeId;
      const group = source.groups.find((g) => g.nodeId === groupNodeId);
      required(
        group && (!icon.category || icon.category === group.category),
        `ICON_COLORFUL_GROUP_REQUIRED: ${nodeId}`,
      );
      record = {
        ...existing,
        nodeId,
        figmaName: icon.name,
        ...(Number.isFinite(icon.x) ? { x: icon.x } : {}),
        ...(Number.isFinite(icon.y) ? { y: icon.y } : {}),
        exportName,
        localFile: existing?.localFile ?? `colorful/${nodeId.replace(':', '-')}.svg`,
        groupNodeId,
        category: group.category,
        rowDisposition: 'canonical-new',
        publicExposure: 'canonical',
        paintMode: icon.paintReplacements ? 'mixed' : (existing?.paintMode ?? 'literal'),
        sourceStatus: 'current',
        width: icon.width,
        height: icon.height,
        componentWidth: icon.width,
        componentHeight: icon.height,
        assetIntrinsicWidth: svgWidth,
        assetIntrinsicHeight: svgHeight,
        assetViewBox: parsed.attributes.get('viewBox'),
        sourceUrl: icon.url,
        retrievedAt: icon.retrievedAt ?? new Date().toISOString(),
        acquisitionStatus: 'figma-developer-mcp-node-export',
        rawSvg: svg,
        production,
      };
    } else {
      required(
        icon.nodeType.toUpperCase() === 'COMPONENT',
        `ICON_COMPONENT_SOURCE_REQUIRED: ${nodeId}`,
      );
      record = {
        ...existing,
        nodeId,
        name: icon.name,
        exportName,
        file: existing?.file ?? `${nodeId.replace(':', '-')}.svg`,
        scopeRole: existing?.scopeRole ?? 'target',
        metadata: {
          ...(existing?.metadata ?? {}),
          ...(family === 'outline'
            ? {
                width: icon.width,
                height: icon.height,
                nodeType: 'component',
                disposition: existing?.metadata?.disposition ?? 'added',
                figmaRawSvgStatus: 'captured-canonical-source',
              }
            : {}),
        },
        raw: {
          nodeType: icon.nodeType,
          svg,
          source: { tool: 'figma-developer-mcp', url: icon.url },
        },
        placement: {
          ...(existing?.placement ?? {}),
          width: icon.width,
          height: icon.height,
          nodeType: family === 'outline' ? 'component' : icon.nodeType,
        },
        production,
      };
      if (family === 'outline')
        record.placements = existing?.placements ?? [
          {
            placementNodeId: nodeId,
            nodeType: 'component',
            width: icon.width,
            height: icon.height,
            mainComponentId: nodeId,
            mainComponentIdStatus: 'canonical-source-self',
            sourceResolution: 'component-self',
            overridePayload: null,
            overrideHash: null,
            overrideHashStatus: 'pending-updater-canonical-sha256',
          },
        ];
    }
    if (family === 'solid')
      record.placements = existing?.placements ?? [
        {
          placementNodeId: nodeId,
          nodeType: 'component',
          width: icon.width,
          height: icon.height,
          mainComponentId: nodeId,
          mainComponentIdStatus: 'canonical-source-self',
          sourceResolution: 'component-self',
          overridePayload: null,
          overrideHash: null,
          overrideHashStatus: 'not-applicable',
        },
      ];
    if (record.placements)
      record.placements = record.placements.map((placement) =>
        placement.nodeType === 'instance'
          ? placement
          : {
              ...placement,
              width: icon.width,
              height: icon.height,
              ...(Number.isFinite(icon.x) ? { x: icon.x } : {}),
              ...(Number.isFinite(icon.y) ? { y: icon.y } : {}),
            },
      );
    if (icon.dimensionsSource) record.dimensionsSource = icon.dimensionsSource;
    if (family === 'colorful' && icon.dimensionsSource === 'svg-export') {
      delete record.componentWidth;
      delete record.componentHeight;
    }
    if (icon.evidence !== undefined) record.evidence = icon.evidence;
    if (family === 'colorful' && icon.evidence?.themePaintBindings)
      record.themePaintBindings = icon.evidence.themePaintBindings;
    const normalized = renderImportedSvg(record, family);
    if (family === 'outline' && production.geometry === 'source') {
      // The current source is no longer the historical reconstructed geometry.
      // Frozen reviews remain in their independent evidence files.
      delete record.metadata.geometryReviewId;
      const foregroundPaints = [];
      const visit = (node, insideDefinition = false) => {
        const inDefinition =
          insideDefinition ||
          ['defs', 'mask', 'clipPath', 'pattern', 'marker', 'symbol'].includes(node.name);
        if (!inDefinition && node.name === 'path')
          for (const attribute of ['fill', 'stroke']) {
            const value = node.attributes.get(attribute);
            if (['white', '#fff', '#ffffff'].includes(value?.toLowerCase()))
              foregroundPaints.push({
                tag: node.name,
                d: node.attributes.get('d'),
                attribute,
                value,
              });
          }
        node.children.forEach((child) => visit(child, inDefinition));
      };
      visit(parseSvg(normalized));
      if (foregroundPaints.length) record.metadata.sourceForegroundPaints = foregroundPaints;
      else delete record.metadata.sourceForegroundPaints;
    }
    // Legacy Outline definitions used an underscore between the node ID parts.
    // Keep their existing paint exceptions attached when the import normalizes IDs.
    // Only move an existing exception to a definition that actually exists; this
    // does not authorize any new paint values or discard unmatched exceptions.
    if (family === 'outline') {
      const definitionIds = new Set(inspectFragmentGraph(normalized).owners.map(({ id }) => id));
      const legacyPrefix = `icon_${nodeId.replace(':', '_')}__`;
      const importedPrefix = `icon_${nodeId.replace(':', '')}__`;
      source.metadata.paintExceptions = (source.metadata.paintExceptions ?? []).map((exception) => {
        if (
          exception.path !== `outline/${record.file}` ||
          !exception.definitionId.startsWith(legacyPrefix)
        )
          return exception;
        const definitionId = exception.definitionId.replace(legacyPrefix, importedPrefix);
        return definitionIds.has(definitionId)
          ? {
              ...exception,
              definitionId,
              reason: exception.reason?.replaceAll(exception.definitionId, definitionId),
            }
          : exception;
      });
    }
    if (family === 'outline')
      generateIconStrokeContract(undefined, {
        fixedFill: sourceFixedFillDispositions([record]),
        sources: new Map([[record.file, normalized]]),
      });
    if (family === 'solid') {
      record.metadata.minimumDrawableCount = drawables(svg);
      record.metadata.paintRoles = [
        ...new Set(
          collectPaintSemantics(normalized, {
            normalizeFigmaPrimary: true,
            normalizeStrokeWidth: false,
          }).map((p) => p.role),
        ),
      ].sort();
    }
    if (existing) source.records[source.records.indexOf(existing)] = record;
    else source.records.push(record);
    report.push({ nodeId, exportName, status: existing ? 'updated' : 'added' });
  }
  validateSources(sources);
  const changes = new Map();
  for (const [family, source] of Object.entries(sources)) {
    const file = `config/icon-sources/${family}.json`;
    const after = jsonText(source);
    if (before.get(family) !== after)
      changes.set(file, { before: await readFile(path.join(root, file), 'utf8'), after });
  }
  return { changes, report };
}
export async function runSourceImport(args = process.argv.slice(2), root = packageRoot) {
  const values = args.filter((a) => a !== '--');
  required(
    values.length === 2 && values[0] === '--input',
    'Usage: pnpm icons:import --input /absolute/input.json',
  );
  const input = JSON.parse(await readFile(path.resolve(values[1]), 'utf8'));
  const { changes, report } = await planSourceImport(input, root);
  await applyChanges(root, changes);
  return { report, changedFiles: [...changes.keys()] };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await runSourceImport(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
