import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readIconSources, sourceExports, FIGMA_FAMILIES } from './icon-source-data.mjs';
import { joinIconSource, sourceSvgPath } from './icon-source-model.mjs';
import {
  applyChanges,
  jsonText,
  packageRoot,
  renderImportedSvg,
  validateSources,
} from './update-icons.mjs';
import { parseSvg } from './audit-icons.mjs';
import { filledPaths, readGeometryNode, restoreOutlineStrokes } from './figma-outline-stroke.mjs';
import { loadPinnedTokenCatalog } from './colorful-color-resolver.mjs';
import { inspectFragmentGraph } from './colorful-fragments.mjs';
import {
  generateIconStrokeContract,
  sourceFixedFillDispositions,
} from '../config/generateIconStrokeContract.mjs';

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

export async function planSourceImport(input, root = packageRoot) {
  required(
    input?.schemaVersion === 1 && Array.isArray(input.icons) && input.icons.length,
    'ICON_IMPORT_SCHEMA_INVALID',
  );
  const sources = readIconSources(pathToFileURL(`${root}/config/icon-sources/`));
  const files = new Map();
  const rawFiles = {};
  const evidenceFiles = {};
  for (const family of FIGMA_FAMILIES)
    for (const r of sources[family].records) {
      rawFiles[r.svgFile] = r.raw.svg;
      if (r.evidenceFile) evidenceFiles[r.evidenceFile] = r.evidence;
    }
  const knownTokens = new Set((await loadPinnedTokenCatalog()).map((t) => t.name));
  const seen = new Set();
  const report = [];
  let geometrySnapshot;
  for (const icon of input.icons) {
    const { fileKey, nodeId } = parseFigmaUrl(icon.url);
    required(
      !Object.hasOwn(icon.evidence ?? {}, 'placements'),
      `ICON_INSTANCE_PLACEMENTS_UNSUPPORTED: ${nodeId}: remove evidence.placements; only canonical icon sources are maintained`,
    );
    required(!seen.has(`${fileKey}/${nodeId}`), `ICON_IMPORT_NODE_DUPLICATE: ${nodeId}`);
    seen.add(`${fileKey}/${nodeId}`);
    const owner = FIGMA_FAMILIES.find(
      (f) => sources[f].fileKey === fileKey && sources[f].records.some((r) => r.nodeId === nodeId),
    );
    const family = icon.family ?? owner;
    required(FIGMA_FAMILIES.includes(family), `ICON_IMPORT_FAMILY_REQUIRED: ${nodeId}`);
    required(!owner || owner === family, `ICON_FAMILY_CHANGE_REQUIRES_MIGRATION: ${nodeId}`);
    const source = sources[family];
    required(source.fileKey === fileKey, `ICON_FILE_KEY_MISMATCH: ${nodeId}`);
    required(
      typeof icon.name === 'string' && icon.name.trim() && typeof icon.nodeType === 'string',
      `ICON_NODE_METADATA_MISSING: ${nodeId}`,
    );
    required(
      icon.nodeType.toUpperCase() !== 'INSTANCE',
      `ICON_INSTANCE_CANONICAL_SOURCE_REQUIRED: ${nodeId}`,
    );
    if (family !== 'colorful')
      required(
        icon.nodeType.toUpperCase() === 'COMPONENT',
        `ICON_COMPONENT_SOURCE_REQUIRED: ${nodeId}`,
      );
    required(
      icon.dimensionsSource === undefined || ['node', 'svg-export'].includes(icon.dimensionsSource),
      `ICON_DIMENSIONS_SOURCE_INVALID: ${nodeId}`,
    );
    required(
      typeof icon.svgPath === 'string' && path.isAbsolute(icon.svgPath),
      `ICON_SVG_PATH_REQUIRED: ${nodeId}`,
    );
    let svg = await readFile(icon.svgPath, 'utf8');
    const parsed = parseSvg(svg);
    required(
      Number.isFinite(icon.width) &&
        icon.width > 0 &&
        Number.isFinite(icon.height) &&
        icon.height > 0,
      `ICON_DIMENSIONS_MISSING: ${nodeId}`,
    );
    required(
      Number(parsed.attributes.get('width')) === icon.width &&
        Number(parsed.attributes.get('height')) === icon.height,
      `ICON_SVG_DIMENSIONS_MISMATCH: ${nodeId}`,
    );
    if (family !== 'colorful') {
      const size = family === 'outline' ? 24 : 20;
      required(
        icon.width === size &&
          icon.height === size &&
          parsed.attributes.get('viewBox') === `0 0 ${size} ${size}`,
        `ICON_${family.toUpperCase()}_VIEWPORT_INVALID: ${nodeId}`,
      );
    }
    const existing = source.document.records.find((r) => r.nodeId === nodeId);
    const priorMapping = source.project.records[nodeId];
    const exportName =
      priorMapping?.exportName ?? icon.exportName ?? suggestExportName(icon.name, family);
    required(
      !priorMapping || !icon.exportName || icon.exportName === priorMapping.exportName,
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
    const groupNodeId = icon.groupNodeId ?? existing?.groupNodeId ?? null;
    const group = source.groups.find((g) => g.nodeId === groupNodeId);
    required(
      (group || (family !== 'colorful' && groupNodeId === null)) &&
        (!icon.category || group?.category === icon.category),
      `ICON_${family.toUpperCase()}_GROUP_REQUIRED: ${nodeId}`,
    );
    const record = {
      ...existing,
      nodeId,
      name: icon.name,
      groupNodeId,
      svgFile: sourceSvgPath(fileKey, nodeId),
    };
    record.nodeType = icon.nodeType;
    if (icon.dimensionsSource !== 'svg-export')
      record.nodeSize = { width: icon.width, height: icon.height };
    else delete record.nodeSize;
    const oldSvg = existing ? rawFiles[existing.svgFile] : undefined;
    const filled = family === 'outline' ? filledPaths(parsed) : [];
    let strokeLocators = [];
    if (filled.length) {
      if (input.figmaNodesPath && !geometrySnapshot)
        geometrySnapshot = JSON.parse(await readFile(input.figmaNodesPath, 'utf8'));
      const component = await readGeometryNode(fileKey, nodeId, geometrySnapshot);
      const restored = await restoreOutlineStrokes(svg, filled, component, fileKey);
      svg = restored.svg;
      strokeLocators = restored.locators.map((path) => path.join('.'));
    }
    const importedBindings =
      icon.colorBindings ??
      (icon.evidence?.themePaintBindings
        ? { status: 'captured', bindings: icon.evidence.themePaintBindings }
        : undefined);
    record.colorBindings = importedBindings
      ? {
          ...importedBindings,
          bindings: importedBindings.bindings.map(({ token: _token, ...b }) => b),
        }
      : ((oldSvg === svg ? existing?.colorBindings : undefined) ?? {
          status: 'unknown',
          bindings: [],
        });
    if (importedBindings && strokeLocators.length) {
      for (const binding of record.colorBindings.bindings)
        if (binding.targets)
          binding.targets = binding.targets.map((target) =>
            target.attribute === 'fill' && strokeLocators.includes(target.locator.join('.'))
              ? { ...target, attribute: 'stroke' }
              : target,
          );
    }
    const mapping = {
      ...priorMapping,
      exportName,
      file: priorMapping?.file ?? `${family}/${nodeId.replace(':', '-')}.svg`,
    };
    if (icon.paintReplacements !== undefined)
      mapping.transform = { ...mapping.transform, paintReplacements: icon.paintReplacements };
    const tokens = { ...mapping.variableTokens, ...icon.variableTokens };
    for (const b of importedBindings?.bindings ?? [])
      if (b.token) tokens[b.figmaVariableId] = b.token;
    if (Object.keys(tokens).length) mapping.variableTokens = tokens;
    if (!existing || oldSvg !== svg) {
      if (icon.retrievedAt) record.retrievedAt = icon.retrievedAt;
      else delete record.retrievedAt;
    }
    const oldEvidence = existing?.evidenceFile
      ? jsonText(evidenceFiles[existing.evidenceFile])
      : undefined;
    if (icon.evidence) {
      const { themePaintBindings: _bindings, ...captured } = icon.evidence;
      if (Object.keys(captured).length) {
        record.evidenceFile ??= `evidence/${fileKey}/${nodeId.replace(':', '-')}.json`;
        evidenceFiles[record.evidenceFile] = {
          ...(existing?.evidenceFile ? evidenceFiles[existing.evidenceFile] : {}),
          captured,
        };
      }
    }
    rawFiles[record.svgFile] = svg;
    if (existing) source.document.records[source.document.records.indexOf(existing)] = record;
    else source.document.records.push(record);
    source.project.records[nodeId] = mapping;
    const joined = joinIconSource(
      source.document,
      source.project,
      rawFiles,
      evidenceFiles,
      source.display,
    );
    const working = joined.records.find((r) => r.nodeId === nodeId);
    const normalized = renderImportedSvg(working, family);
    inspectFragmentGraph(normalized);
    for (const [, token] of normalized.matchAll(/var\(\s*(--[\w-]+)\s*,/g))
      required(knownTokens.has(token), `COLOR_TOKEN_UNKNOWN: ${nodeId}: ${token}`);
    if (family === 'outline') {
      // Use the same capability rules as generation before committing any source files.
      generateIconStrokeContract(undefined, {
        fixedFill: sourceFixedFillDispositions([working]),
        sources: new Map([[working.file, normalized]]),
      });
      const foreground = [];
      const walk = (node, inDefinition = false) => {
        const inside =
          inDefinition ||
          ['defs', 'mask', 'clipPath', 'pattern', 'marker', 'symbol'].includes(node.name);
        if (!inside && node.name === 'path')
          for (const attribute of ['fill', 'stroke']) {
            const value = node.attributes.get(attribute);
            if (['white', '#fff', '#ffffff'].includes(value?.toLowerCase()))
              foreground.push({ tag: node.name, d: node.attributes.get('d'), attribute, value });
          }
        node.children.forEach((n) => walk(n, inside));
      };
      walk(parseSvg(normalized));
      if (foreground.length) mapping.sourceForegroundPaints = foreground;
      else delete mapping.sourceForegroundPaints;
    }
    sources[family] = joinIconSource(
      source.document,
      source.project,
      rawFiles,
      evidenceFiles,
      source.display,
    );
    const unchanged =
      existing &&
      oldSvg === svg &&
      jsonText(existing) === jsonText(record) &&
      jsonText(priorMapping) === jsonText(mapping) &&
      oldEvidence ===
        (record.evidenceFile ? jsonText(evidenceFiles[record.evidenceFile]) : undefined);
    report.push({
      nodeId,
      exportName,
      status: unchanged ? 'unchanged' : existing ? 'updated' : 'added',
    });
  }
  validateSources(sources);
  for (const family of FIGMA_FAMILIES) {
    files.set(`config/icon-sources/${family}.json`, jsonText(sources[family].document));
    files.set(`config/icon-project/${family}.json`, jsonText(sources[family].project));
  }
  for (const [file, svg] of Object.entries(rawFiles)) files.set(`config/icon-sources/${file}`, svg);
  for (const [file, evidence] of Object.entries(evidenceFiles))
    files.set(`config/icon-sources/${file}`, jsonText(evidence));
  const changes = new Map();
  for (const [file, after] of files) {
    const before = await readFile(path.join(root, file), 'utf8').catch((e) => {
      if (e.code === 'ENOENT') return null;
      throw e;
    });
    if (before !== after) changes.set(file, { before, after });
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
