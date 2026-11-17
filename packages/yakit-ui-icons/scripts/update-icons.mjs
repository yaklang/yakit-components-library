import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile, rename, unlink, lstat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { ICON_FAMILIES, readIconSources, sourceExports, sourceFiles } from './icon-source-data.mjs';
import { renderOfflineCatalog } from './offline-catalog.mjs';
import { colorfulComponentNodeId } from './colorful-icon-contracts.mjs';

import { inspectSvg, parseSvg } from './audit-icons.mjs';
import { normalizeSvgStrokeWidth } from './icon-stroke-width.mjs';
import { normalizeColorfulFragments } from './colorful-fragments.mjs';
import { buildIconDocuments, manifestPath, evidencePath } from './icon-source-documents.mjs';
import {
  buildIconNameCatalog,
  renderIconNameCatalog,
  parseIconIndexMapping,
} from './icon-name-catalog-core.mjs';
import {
  publicRows,
  renderColorfulBarrel,
  renderColorfulCatalog,
} from './colorful-entry-generator.mjs';

import { auditColorfulInputs } from './colorful-audit.mjs';
import { loadPinnedTokenCatalog } from './colorful-color-resolver.mjs';
import {
  generateIconStrokeContract,
  sourceFixedFillDispositions,
  serializeIconStrokeContract,
} from '../config/generateIconStrokeContract.mjs';

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const fail = (message) => {
  throw new Error(message);
};
const ts = (text) => JSON.stringify(text);
export function safeRelative(file) {
  if (
    typeof file !== 'string' ||
    !file ||
    path.isAbsolute(file) ||
    file.includes('\\') ||
    file.split('/').some((part) => !part || part === '..' || part === '.')
  )
    fail(`ICON_PATH_INVALID: ${file}`);
  return file;
}
async function read(root, file) {
  return readFile(path.join(root, safeRelative(file)), 'utf8');
}
async function optionalRead(root, file) {
  try {
    return await read(root, file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
async function filesAt(root, directory) {
  const result = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) fail(`ICON_SYMLINK_UNSUPPORTED: ${file}`);
    if (entry.isDirectory()) result.push(...(await filesAt(root, file)));
    else result.push(file);
  }
  return result;
}
export function validateSources(sources) {
  const publicNames = new Set();
  const identities = new Set();
  for (const family of ICON_FAMILIES) {
    const source = sources[family];
    if (
      source?.schemaVersion !== (family === 'loading' ? 1 : 2) ||
      source.family !== family ||
      !Array.isArray(source.records)
    )
      fail(`ICON_SOURCE_SCHEMA_INVALID: ${family}`);
    for (const name of sourceExports(source)) {
      if (!/^[A-Za-z_$][\w$]*$/.test(name ?? '') || publicNames.has(name))
        fail(`ICON_EXPORT_DUPLICATE_OR_INVALID: ${name}`);
      publicNames.add(name);
    }
    const files = sourceFiles(source);
    for (const file of files) {
      safeRelative(file);
      if (!file.startsWith(`${family}/`)) fail(`ICON_FAMILY_PATH_MISMATCH: ${file}`);
    }
    if (new Set(files).size !== files.length) fail(`ICON_SOURCE_FILE_DUPLICATE: ${family}`);
    if (['outline', 'solid', 'colorful'].includes(family))
      for (const record of source.records) {
        const identity = `${source.fileKey}:${record.nodeId}`;
        if (
          !/^[A-Za-z0-9]+$/.test(source.fileKey ?? '') ||
          !/^\d+:\d+$/.test(record.nodeId ?? '') ||
          identities.has(identity)
        )
          fail(`ICON_NODE_DUPLICATE_OR_INVALID: ${identity}`);
        identities.add(identity);
        if (family !== 'colorful' && record.file !== `${record.nodeId.replace(':', '-')}.svg`)
          fail(`ICON_NODE_FILENAME_MISMATCH: ${identity}`);
        if (family !== 'colorful') {
          if (!record.raw?.svg || typeof record.name !== 'string')
            fail(`ICON_EVIDENCE_MISSING: ${identity}`);
          parseSvg(record.raw.svg);
        }
      }
  }
}

// Every Figma icon is derived from its original SVG and explicit project rules.
export function applyPaintBindings(svg, record) {
  const root = parseSvg(svg);
  const edits = new Map();
  const occupied = new Set();
  for (const binding of record.themePaintBindings ?? []) {
    const token = record.variableTokens?.[binding.figmaVariableId] ?? binding.token;
    if (!token) continue;
    if (!/^--[\w-]+$/.test(token) || !/^#[a-fA-F0-9]{6}$/.test(binding.fallbackHex))
      fail(`ICON_BINDING_VALUE_INVALID: ${record.nodeId}`);
    if (!binding.targets?.length) {
      if (!Object.keys(record.transform?.paintReplacements ?? {}).length)
        fail(`ICON_BINDING_TARGET_REQUIRED: ${record.nodeId}`);
      continue;
    }
    for (const target of binding.targets) {
      if (
        typeof target.expectedValue !== 'string' ||
        !Array.isArray(target.locator) ||
        !target.locator.every((i) => Number.isInteger(i) && i >= 0) ||
        !['fill', 'stroke', 'stop-color'].includes(target.attribute)
      )
        fail(`ICON_BINDING_TARGET_INVALID: ${record.nodeId}`);
      let node = root;
      for (const index of target.locator) node = node?.children[index];
      const key = `${target.locator.join('.')}/${target.attribute}`;
      if (
        !node ||
        occupied.has(key) ||
        node.attributes.get(target.attribute) !== target.expectedValue
      )
        fail(`ICON_BINDING_TARGET_AMBIGUOUS: ${record.nodeId}/${key}`);
      occupied.add(key);
      const tag = edits.get(node.sourceStart)?.text ?? svg.slice(node.sourceStart, node.sourceEnd);
      const pattern = new RegExp(`(\\s${target.attribute}\\s*=\\s*)["'][^"']*["']`);
      edits.set(node.sourceStart, {
        end: node.sourceEnd,
        text: tag.replace(pattern, `$1"var(${token}, ${binding.fallbackHex})"`),
      });
    }
  }
  for (const [start, edit] of [...edits].sort(([a], [b]) => b - a))
    svg = svg.slice(0, start) + edit.text + svg.slice(edit.end);
  return svg;
}

export function renderImportedSvg(record, family) {
  const raw = record.raw?.svg ?? record.rawSvg;
  if (!raw) fail(`ICON_RAW_SVG_MISSING: ${record.nodeId}`);
  const parsed = parseSvg(raw);
  if (/<(?:script|foreignObject)\b|\bon\w+\s*=/i.test(raw))
    fail(`ICON_EXTERNAL_CONTENT_UNSUPPORTED: ${record.nodeId}`);
  const checkReferences = (node) => {
    for (const name of ['href', 'xlink:href']) {
      const value = node.attributes.get(name);
      if (value === undefined || value.startsWith('#')) continue;
      const embeddedRaster =
        family === 'colorful' &&
        node.name === 'image' &&
        /^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
      if (!embeddedRaster) fail(`ICON_EXTERNAL_CONTENT_UNSUPPORTED: ${record.nodeId}`);
    }
    node.children.forEach(checkReferences);
  };
  checkReferences(parsed);
  let svg = applyPaintBindings(raw, record);
  if (family !== 'colorful')
    svg = svg.replace(/(\b(?:fill|stroke)=)["']#353639["']/gi, '$1"currentColor"');
  // A registered default color is supplied by createIcon; the SVG must still
  // inherit color overrides (for example Ear's #0A0A0A foreground).
  if (family !== 'colorful' && /^#[a-fA-F0-9]{6}$/.test(record.defaultColor ?? ''))
    svg = svg.replace(
      new RegExp(`(\\b(?:fill|stroke)=)["']${record.defaultColor}["']`, 'gi'),
      '$1"currentColor"',
    );
  // Normalize named paints without changing their value, including mask auxiliaries.
  // Explicit bindings can then also cover Figma's named white exports.
  if (family === 'colorful')
    svg = svg.replace(
      /(\b(?:fill|stroke|stop-color)=)["'](white|black)["']/gi,
      (_, attribute, color) =>
        `${attribute}"${color.toLowerCase() === 'white' ? '#FFFFFF' : '#000000'}"`,
    );
  for (const [from, to] of Object.entries(record.transform?.paintReplacements ?? {})) {
    if (!/^#[a-fA-F0-9]{6}$/.test(from) || !/^var\(--[\w-]+,\s*#[a-fA-F0-9]{6}\)$/.test(to))
      fail(`ICON_PAINT_MAPPING_INVALID: ${record.nodeId}`);
    svg = svg.replace(
      new RegExp(`(\\b(?:fill|stroke|stop-color)=)["']${from}["']`, 'gi'),
      `$1"${to}"`,
    );
  }
  if (family === 'colorful') {
    svg = svg.replace(
      /<svg\b([^>]*)>/,
      (tag, attributes) =>
        `<svg${attributes.replace(/\s+preserveAspectRatio=["'][^"']*["']/g, '')} preserveAspectRatio="xMidYMid meet">`,
    );
  }
  if (family === 'outline') svg = normalizeSvgStrokeWidth(svg);
  return normalizeColorfulFragments(svg, record.nodeId).svg;
}

function renderBarrel(source) {
  return (
    [
      '// Generated by scripts/update-icons.mjs. Do not edit manually.',
      "import { createIcon } from '../createIcon.js';",
      "export type { IconComponent, IconProps, IconRef, IconSvgProps } from '../types.js';",
      ...source.records.map((r) => `import ${r.exportName}Svg from ${ts(`./${r.file}?react`)};`),
      ...source.records.map(
        (r) =>
          `export const ${r.exportName} = createIcon(${r.exportName}Svg, ${ts(r.exportName)}${r.defaultColor ? `, ${ts(r.defaultColor)}` : ''});`,
      ),
    ].join('\n') + '\n'
  );
}

export async function planIconUpdate(
  root = packageRoot,
  { family, sources = readIconSources(pathToFileURL(`${root}/config/icon-sources/`)) } = {},
) {
  if (family === 'oldicon') fail('OLDICON_HANDWRITTEN: edit assets and component modules directly');
  if (family && !ICON_FAMILIES.includes(family)) fail(`ICON_FAMILY_INVALID: ${family}`);
  validateSources(sources);
  const selected = family ? [family] : ICON_FAMILIES;
  const output = new Map();
  const assets = new Map();
  for (const kind of ICON_FAMILIES) {
    const source = sources[kind];
    for (const file of sourceFiles(source)) {
      let svg = null;
      const record = source.records.find(
        (r) => `${kind}/${r.file}` === file || r.localFile === file,
      );
      if (kind !== 'loading') svg = renderImportedSvg(record, kind);
      else svg = await optionalRead(root, `src/${file}`);
      if (svg === null) fail(`ICON_SOURCE_MISSING: ${file}`);
      if (file.endsWith('.svg')) {
        parseSvg(svg);
        if (kind === 'outline' && normalizeSvgStrokeWidth(svg) !== svg)
          fail(`ICON_STROKE_WIDTH_STALE: ${file}`);
        assets.set(file, svg);
        if (selected.includes(kind)) output.set(`src/${file}`, svg);
      }
    }
    // No implicit removal or rename: all currently public names must still be present.
    const existing = await optionalRead(root, `src/${kind}/index.tsx`);
    const names =
      kind === 'loading'
        ? [...(await read(root, 'src/index.tsx')).matchAll(/export \{ (\w+) \}/g)].map((m) => m[1])
        : [...parseIconIndexMapping(existing ?? '').keys()];
    for (const name of names)
      if (!sourceExports(source).includes(name))
        fail(`ICON_PUBLIC_REMOVAL_REQUIRES_EXPLICIT_MIGRATION: ${kind}/${name}`);
    const expected = new Set(sourceFiles(source).map((f) => `src/${f}`));
    for (const file of await filesAt(root, `src/${kind}`))
      if (file.endsWith('.svg') && !expected.has(file)) fail(`ICON_UNREGISTERED_SVG: ${file}`);
  }
  const documents = buildIconDocuments(root, { sources, assets });
  const colorful = documents.get(manifestPath('colorful'));
  auditColorfulInputs(
    {
      inventory: colorful,
      sources: [...assets]
        .filter(([file]) => file.startsWith('colorful/'))
        .map(([file, svg]) => ({ path: file, svg })),
    },
    {
      expectedGroupCount: colorful.groups.length,
      expectedRowCount: colorful.rows.length,
      requireFrozenClassification: true,
      requireProvenance: true,
      tokenCatalog: await loadPinnedTokenCatalog(),
    },
  );
  for (const kind of ['outline', 'solid']) {
    const manifest = documents.get(manifestPath(kind));
    const owners = new Map();
    for (const [file, svg] of assets)
      if (file.startsWith(`${kind}/`)) {
        const errors = inspectSvg({ manifest, relativePath: file, source: svg, variant: kind });
        if (errors.length) fail(`ICON_SVG_CONTRACT_INVALID: ${file}: ${errors.join(', ')}`);
        const walk = (node) => {
          const id = node.attributes.get('id');
          if (id && owners.has(id))
            fail(`ICON_FRAGMENT_COLLISION: ${file} and ${owners.get(id)}: ${id}`);
          if (id) owners.set(id, file);
          node.children.forEach(walk);
        };
        walk(parseSvg(svg));
      }
  }
  for (const kind of ['outline', 'solid'])
    if (selected.includes(kind)) output.set(`src/${kind}/index.tsx`, renderBarrel(sources[kind]));
  if (selected.includes('colorful')) {
    output.set('src/colorful/index.tsx', renderColorfulBarrel(colorful));
    output.set('src/colorful/catalog.ts', renderColorfulCatalog(colorful));
  }
  const monochromeCatalog = buildIconNameCatalog({
    outlineIndexSource: renderBarrel(sources.outline),
    outlineManifest: documents.get(manifestPath('outline')),
    outlineRawProvenance: documents.get(evidencePath('outline', 'raw')),
    outlinePlacementProvenance: documents.get(evidencePath('outline', 'placement')),
    solidIndexSource: renderBarrel(sources.solid),
    solidManifest: documents.get(manifestPath('solid')),
    solidRawProvenance: documents.get(evidencePath('solid', 'raw')),
    solidPlacementProvenance: documents.get(evidencePath('solid', 'placement')),
  });
  if (selected.some((f) => ['outline', 'solid'].includes(f)))
    output.set('src/figmaNameCatalog.ts', renderIconNameCatalog(monochromeCatalog));
  if (selected.some((f) => ['outline', 'solid', 'colorful'].includes(f))) {
    const entries = [
      ...monochromeCatalog.map((entry) => {
        const record = sources[entry.family].records.find((r) => r.exportName === entry.exportName);
        return {
          ...entry,
          file: `${entry.family}/${record.file}`,
          defaultColor: record.defaultColor,
        };
      }),
      ...publicRows(colorful).map((row) => ({
        family: 'colorful',
        figmaName: row.figmaName ?? null,
        exportName: row.exportName,
        sourceNodeId: colorfulComponentNodeId(row),
        file: row.canonicalLocalFile.replace(/^src\//, ''),
      })),
    ];
    output.set(
      'catalog/index.html',
      await renderOfflineCatalog({
        entries,
        assets,
        brands: JSON.parse(await read(root, 'config/brand-themes.json')),
      }),
    );
  }
  if (selected.includes('outline'))
    output.set(
      'config/iconStrokeContract.generated.ts',
      await serializeIconStrokeContract(
        generateIconStrokeContract(undefined, {
          fixedFill: sourceFixedFillDispositions(sources.outline.records),
          sources: new Map(
            [...assets]
              .filter(([f]) => f.startsWith('outline/'))
              .map(([f, s]) => [path.basename(f), s]),
          ),
        }),
      ),
    );
  // Loading implementations stay handwritten; only the public entry is generated.
  if (selected.includes('loading'))
    output.set(
      'src/index.tsx',
      sources.loading.records
        .map(
          (r) =>
            `import ${r.exportName} from './${r.file.replace(/\.tsx$/, '.js')}';\nexport { ${r.exportName} };\nexport type { ${r.typeExports.join(', ')} } from './${r.file.replace(/\.tsx$/, '.js')}';`,
        )
        .join('\n') +
        "\nexport * from './colorful/index.js';\nexport * from './outline/index.js';\nexport * from './solid/index.js';\nexport type { IconComponent, IconProps, IconRef, IconSvgProps } from './types.js';\n",
    );
  const prettier = (await resolveConfig(path.join(root, 'src/index.tsx'))) ?? {};
  for (const [file, content] of output)
    if (/\.tsx?$/.test(file))
      output.set(
        file,
        await format(file.endsWith('.json') ? JSON.stringify(JSON.parse(content)) : content, {
          ...prettier,
          filepath: file,
        }),
      );
  const changes = new Map();
  for (const [file, content] of output) {
    const before = await optionalRead(root, file);
    if (before !== content) changes.set(file, { before, after: content });
  }
  return changes;
}

// Verify output snapshots before writing. A failed write restores only this transaction's files.
export async function applyChanges(root, changes, { write = writeFile } = {}) {
  for (const [file, { before }] of changes) {
    safeRelative(file);
    let parent = path.dirname(path.join(root, file));
    while (parent.startsWith(`${root}${path.sep}`)) {
      const stat = await lstat(parent).catch((error) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      if (stat?.isSymbolicLink()) fail(`ICON_SYMLINK_UNSUPPORTED: ${file}`);
      parent = path.dirname(parent);
    }
    const stat = await lstat(path.join(root, file)).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (stat?.isSymbolicLink()) fail(`ICON_SYMLINK_UNSUPPORTED: ${file}`);
    if ((await optionalRead(root, file)) !== before) fail(`ICON_CONCURRENT_EDIT: ${file}`);
  }
  const written = [];
  try {
    for (const [file, { after }] of changes) {
      const target = path.join(root, file);
      await mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.icons-${process.pid}.tmp`;
      try {
        await write(temporary, after, { flag: 'wx' });
        await rename(temporary, target);
        written.push(file);
      } finally {
        await unlink(temporary).catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        });
      }
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const file of written.reverse()) {
      const { before, after } = changes.get(file);
      try {
        if ((await optionalRead(root, file)) !== after)
          fail(`Concurrent edit prevents rollback: ${file}`);
        if (before === null) await unlink(path.join(root, file));
        else await writeFile(path.join(root, file), before);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError.message);
      }
    }
    if (rollbackErrors.length)
      throw new AggregateError(
        [error],
        `${error.message}; rollback incomplete: ${rollbackErrors.join('; ')}`,
      );
    throw error;
  }
}
export function parseIconUpdateArgs(args) {
  let family;
  let check = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') check = true;
    else if (args[i] === '--family' && args[i + 1]) family = args[++i];
    else if (args[i] !== '--') fail(`Unknown icon argument: ${args[i]}`);
  }
  return { family, check };
}

export async function runIconUpdate(args = process.argv.slice(2), root = packageRoot) {
  const { family, check } = parseIconUpdateArgs(args);
  const changes = await planIconUpdate(root, { family });
  if (check && changes.size)
    fail(
      `ICON_GENERATED_DRIFT\n${[...changes.keys()].join('\n')}\nRun pnpm icons:update${family ? ` --family ${family}` : ''}`,
    );
  if (!check) await applyChanges(root, changes);
  return `ICONS_${check ? 'CHECK_OK' : 'UPDATED'} ${changes.size} file(s)${changes.size ? `\n${[...changes.keys()].join('\n')}` : ''}\n`;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(await runIconUpdate());
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
