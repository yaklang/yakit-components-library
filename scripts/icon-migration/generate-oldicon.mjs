#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { format, resolveConfig } from "prettier";

import {
  inspectFragmentGraph,
  normalizeColorfulFragments,
} from "../../packages/yakit-ui/scripts/colorful-fragments.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const yakitRoot = resolve(
  process.env.YAKIT_REPOSITORY ?? join(repositoryRoot, "..", "yakit"),
);
const outputDirectory = join(
  repositoryRoot,
  "packages/yakit-ui/src/icons/oldicon",
);
const assetDirectory = join(outputDirectory, "assets");

const inputFiles = Object.freeze({
  classification: join(
    yakitRoot,
    ".omx/specs/current-static-svg-icon-classification.json",
  ),
  mainAudit: join(
    yakitRoot,
    ".omx/specs/current-static-svg-icon-audit-data.json",
  ),
  linkAudit: join(
    yakitRoot,
    ".omx/specs/current-static-svg-link-icon-audit-data.json",
  ),
  aiTree: join(
    yakitRoot,
    "app/renderer/src/main/src/pages/ai-agent/aiTree/icon.tsx",
  ),
  pluginLog: join(
    yakitRoot,
    "app/renderer/src/main/src/pages/pluginHub/pluginLog/PluginLogOpt.tsx",
  ),
});

const directSources = Object.freeze([
  {
    componentName: "TaskSuccess",
    exportName: "TaskSuccessIcon",
    input: "aiTree",
    sourceFile: "app/renderer/src/main/src/pages/ai-agent/aiTree/icon.tsx",
  },
  {
    componentName: "TaskError",
    exportName: "TaskErrorIcon",
    input: "aiTree",
    sourceFile: "app/renderer/src/main/src/pages/ai-agent/aiTree/icon.tsx",
  },
  {
    componentName: "TaskSkipped",
    exportName: "TaskSkippedIcon",
    input: "aiTree",
    sourceFile: "app/renderer/src/main/src/pages/ai-agent/aiTree/icon.tsx",
  },
  {
    componentName: "PopoverArrow",
    exportName: "PopoverArrowIcon",
    input: "pluginLog",
    sourceFile:
      "app/renderer/src/main/src/pages/pluginHub/pluginLog/PluginLogOpt.tsx",
  },
]);

const expected = Object.freeze({
  exports: 380,
  sourceNames: 378,
  sourcePaths: 408,
});
const targetClassifications = new Set(["package-absent", "review-required"]);
const ownerTag = /<([A-Za-z][\w:.-]*)(\s[^<>]*?)?>/g;
const attribute = /([:\w.-]+)\s*=\s*(["'])(.*?)\2/g;
const localUrl = /url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g;

function fail(code, message) {
  throw new Error(`${code}: ${message}`);
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceKey = (file, name) => `${file}\0${name}`;
const toPosix = (value) => value.split(sep).join("/");

async function readText(path) {
  if (!existsSync(path)) fail("INPUT_MISSING", path);
  return readFile(path, "utf8");
}

async function readJson(path) {
  const source = await readText(path);
  try {
    return { source, value: JSON.parse(source) };
  } catch (error) {
    fail("INPUT_JSON_INVALID", `${path}: ${error.message}`);
  }
}

function uniqueMap(rows, label) {
  const result = new Map();
  for (const row of rows) {
    const key = sourceKey(row.file, row.name);
    if (result.has(key))
      fail("AUDIT_KEY_DUPLICATE", `${label}: ${row.file}::${row.name}`);
    result.set(key, row);
  }
  return result;
}

function jsxSvg(source, componentName) {
  const declaration = new RegExp(
    `\\bconst\\s+${componentName}\\s*=\\s*\\(\\)\\s*=>\\s*\\(`,
  );
  const declarationMatch = declaration.exec(source);
  if (!declarationMatch) fail("DIRECT_COMPONENT_MISSING", componentName);
  const start = source.indexOf("<svg", declarationMatch.index);
  const end = source.indexOf("</svg>", start);
  if (start < 0 || end < 0) fail("DIRECT_SVG_MISSING", componentName);
  const raw = source.slice(start, end + "</svg>".length);
  if (/[{}]/.test(raw.replace(/d="[^"]*"/g, "")))
    fail("DIRECT_SVG_EXPRESSION_UNSUPPORTED", componentName);
  return raw
    .replace(/\bfillRule=/g, "fill-rule=")
    .replace(/\bclipRule=/g, "clip-rule=")
    .replace(/\bstrokeWidth=/g, "stroke-width=")
    .replace(/\bstrokeLinecap=/g, "stroke-linecap=")
    .replace(/\bstrokeLinejoin=/g, "stroke-linejoin=")
    .replace(/\bclassName=/g, "class=");
}

function localReferences(name, value) {
  const references = [];
  for (const match of value.matchAll(localUrl)) references.push(match[1]);
  if (["href", "xlink:href"].includes(name) && value.startsWith("#"))
    references.push(value.slice(1));
  if (["aria-labelledby", "aria-describedby"].includes(name))
    references.push(...value.trim().split(/\s+/));
  return references.filter(Boolean);
}

function removeOrphanReferences(svg) {
  const graph = inspectFragmentGraph(svg);
  const owners = new Set(graph.owners.map(({ id }) => id));
  const orphanIds = new Set(
    graph.references.map(({ id }) => id).filter((id) => !owners.has(id)),
  );
  if (orphanIds.size === 0) return { repairs: [], svg };

  const repairs = [];
  const repaired = svg.replace(ownerTag, (tagSource) =>
    tagSource.replace(attribute, (attributeSource, name, quote, value) => {
      const orphans = localReferences(name, value).filter((id) =>
        orphanIds.has(id),
      );
      if (orphans.length === 0) return attributeSource;
      if (localReferences(name, value).some((id) => !orphanIds.has(id)))
        fail("FRAGMENT_REFERENCE_MIXED", `${name}=${value}`);
      repairs.push({
        attribute: name,
        orphanIds: [...new Set(orphans)].sort(),
      });
      return "";
    }),
  );
  return { repairs, svg: repaired };
}

function fragmentSeed(svg) {
  return BigInt(`0x${sha256(svg).slice(0, 15)}`).toString(10);
}

function prepareSvg(rawSvg) {
  if (typeof rawSvg !== "string" || !rawSvg.includes("<svg"))
    fail("SVG_INVALID", "missing SVG root");
  if (/<style\b/i.test(rawSvg))
    fail("SVG_STYLE_UNSUPPORTED", "style elements are unsupported");
  const allUrls = [...rawSvg.matchAll(/url\(\s*[^)]+\s*\)/g)].map(
    ([value]) => value,
  );
  const localUrls = [...rawSvg.matchAll(localUrl)].map(([value]) => value);
  if (allUrls.length !== localUrls.length)
    fail(
      "SVG_EXTERNAL_REFERENCE_UNSUPPORTED",
      allUrls.find((value) => !localUrls.includes(value)),
    );
  const repaired = removeOrphanReferences(rawSvg);
  const canonical = normalizeColorfulFragments(repaired.svg, "1");
  const canonicalArtworkSha256 = sha256(canonical.svg);
  const normalized = normalizeColorfulFragments(
    canonical.svg,
    fragmentSeed(canonical.svg),
  );
  const graph = inspectFragmentGraph(normalized.svg);
  const ownerIds = new Set(graph.owners.map(({ id }) => id));
  for (const { id } of graph.references)
    if (!ownerIds.has(id)) fail("FRAGMENT_ORPHAN_AFTER_NORMALIZE", id);
  return {
    repairs: [
      ...repaired.repairs.map((repair) => ({
        kind: "orphan-reference-removed",
        ...repair,
      })),
      ...canonical.removedPresentationIds.map((id) => ({
        id,
        kind: "unreferenced-presentation-id-removed",
      })),
    ],
    canonicalArtworkSha256,
    svg: normalized.svg,
  };
}

function sourceQualifier(file) {
  const marker = file.includes("/src/main/src/") ? "/src/main/src/" : "/src/";
  const tail = file.includes(marker) ? file.split(marker).at(-1) : file;
  return tail
    .replace(/\.[^.]+$/, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function assignExportNames(entries) {
  const byName = groupBy(entries, ({ sourceName }) => sourceName);
  const used = new Map();
  for (const [name, rows] of [...byName].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const byArtwork = groupBy(
      rows,
      ({ canonicalArtworkSha256 }) => canonicalArtworkSha256,
    );
    const artworkGroups = [...byArtwork.values()].sort((left, right) =>
      left[0].sourceFile.localeCompare(right[0].sourceFile),
    );
    for (const [index, artworkRows] of artworkGroups.entries()) {
      const exportName =
        index === 0
          ? name
          : `${name}From${sourceQualifier(artworkRows[0].sourceFile)}`;
      const previous = used.get(exportName);
      if (previous && previous !== artworkRows[0].canonicalArtworkSha256)
        fail(
          "EXPORT_NAME_COLLISION",
          `${exportName}: ${previous} / ${artworkRows[0].canonicalArtworkSha256}`,
        );
      used.set(exportName, artworkRows[0].canonicalArtworkSha256);
      for (const row of artworkRows) row.exportName = exportName;
    }
  }
}

function groupBy(values, keyOf) {
  const groups = new Map();
  for (const value of values) {
    const key = keyOf(value);
    const group = groups.get(key);
    if (group) group.push(value);
    else groups.set(key, [value]);
  }
  return groups;
}

function dimensionsFromSvg(svg) {
  const root = svg.match(/<svg\b([^>]*)>/)?.[1];
  if (!root) fail("SVG_ROOT_INVALID", "root attributes missing");
  const values = {};
  for (const match of root.matchAll(attribute)) values[match[1]] = match[3];
  return {
    height: values.height ?? null,
    viewBox: values.viewBox ?? null,
    width: values.width ?? null,
  };
}

function generatedIndex(exports) {
  const assets = [...new Set(exports.map(({ assetFile }) => assetFile))].sort();
  const assetIndexes = new Map(
    assets.map((assetFile, index) => [assetFile, index]),
  );
  const imports = assets
    .map(
      (assetFile, index) =>
        `import OldIconAsset${index}Svg from './${assetFile.replace(/\\/g, "/")}?react';`,
    )
    .join("\n");
  const declarations = exports
    .map(
      ({ assetFile, exportName }) =>
        `export const ${exportName} = createIcon(OldIconAsset${assetIndexes.get(assetFile)}Svg, '${exportName}');`,
    )
    .join("\n");
  return `// Generated by scripts/icon-migration/generate-oldicon.mjs. Do not edit manually.\n\nimport { createIcon } from '../createIcon.js';\n\nexport type { IconComponent, IconProps, IconRef, IconSvgProps } from '../types.js';\n\n${imports}\n\n${declarations}\n`;
}

async function collect() {
  const classificationInput = await readJson(inputFiles.classification);
  const mainAuditInput = await readJson(inputFiles.mainAudit);
  const linkAuditInput = await readJson(inputFiles.linkAudit);
  const aiTreeSource = await readText(inputFiles.aiTree);
  const pluginLogSource = await readText(inputFiles.pluginLog);
  const directSourceText = { aiTree: aiTreeSource, pluginLog: pluginLogSource };

  const targets = classificationInput.value.rows.filter(
    (row) =>
      targetClassifications.has(row.classification) &&
      row.consumerOccurrences > 0,
  );
  if (targets.length !== 407)
    fail(
      "CLASSIFICATION_TARGET_COUNT",
      `expected 407, received ${targets.length}`,
    );
  if (
    new Set(targets.map(({ file, name }) => sourceKey(file, name))).size !==
    targets.length
  )
    fail("CLASSIFICATION_KEY_DUPLICATE", "target rows are not unique");

  const mainAudit = uniqueMap(mainAuditInput.value.localIcons, "main audit");
  const linkAudit = uniqueMap(linkAuditInput.value.localIcons, "Link audit");
  const directByKey = new Map(
    directSources.map((source) => [
      sourceKey(source.sourceFile, source.exportName),
      {
        ...source,
        rawSvg: jsxSvg(directSourceText[source.input], source.componentName),
      },
    ]),
  );

  const entries = targets.map((row) => {
    const key = sourceKey(row.file, row.name);
    const direct = directByKey.get(key);
    const isLink = row.file.startsWith("app/renderer/engine-link-startup/");
    const audit = (isLink ? linkAudit : mainAudit).get(key);
    if (!direct && !audit?.rawSvg)
      fail("AUDIT_ROW_MISSING", `${row.file}::${row.name}`);
    const rawSvg = direct?.rawSvg ?? audit.rawSvg;
    let sourceKind = "main-audit";
    if (direct) sourceKind = "direct-source";
    else if (isLink) sourceKind = "link-audit";
    return {
      classification: row.classification,
      dimensions: dimensionsFromSvg(rawSvg),
      paintValues: row.paintValues,
      sourceSvgSha256: sha256(rawSvg),
      rawSvg,
      sourceFile: row.file,
      sourceKind,
      sourceName: row.name,
    };
  });

  const popoverFile = toPosix(relative(yakitRoot, inputFiles.pluginLog));
  const popover = directByKey.get(sourceKey(popoverFile, "PopoverArrowIcon"));
  if (!popover)
    fail("DIRECT_COMPONENT_MISSING", `${popoverFile}::PopoverArrowIcon`);
  if (
    entries.some(
      ({ sourceFile, sourceName }) =>
        sourceKey(sourceFile, sourceName) ===
        sourceKey(popoverFile, popover.exportName),
    )
  )
    fail("DIRECT_SOURCE_DUPLICATE", `${popoverFile}::${popover.exportName}`);
  entries.push({
    classification: "package-absent",
    dimensions: dimensionsFromSvg(popover.rawSvg),
    paintValues: ["currentColor"],
    sourceSvgSha256: sha256(popover.rawSvg),
    rawSvg: popover.rawSvg,
    sourceFile: popoverFile,
    sourceKind: "direct-source",
    sourceName: popover.exportName,
  });
  entries.sort((left, right) =>
    `${left.sourceFile}\0${left.sourceName}`.localeCompare(
      `${right.sourceFile}\0${right.sourceName}`,
    ),
  );

  const preparedByRaw = new Map();
  for (const entry of entries) {
    if (!preparedByRaw.has(entry.sourceSvgSha256))
      preparedByRaw.set(entry.sourceSvgSha256, prepareSvg(entry.rawSvg));
    const prepared = preparedByRaw.get(entry.sourceSvgSha256);
    prepared.assetSource = `${prepared.svg.trim()}\n`;
    entry.canonicalArtworkSha256 = prepared.canonicalArtworkSha256;
    entry.artworkSha256 = sha256(prepared.assetSource);
    entry.assetSha256 = entry.artworkSha256;
    entry.assetFile = `assets/${entry.artworkSha256}.svg`;
    entry.repairs = prepared.repairs;
  }
  assignExportNames(entries);

  const assets = new Map();
  const fragmentOwners = new Map();
  for (const entry of entries) {
    const assetSource = preparedByRaw.get(entry.sourceSvgSha256).assetSource;
    const existingAsset = assets.get(entry.assetFile);
    if (existingAsset && existingAsset !== assetSource)
      fail("ASSET_HASH_COLLISION", entry.assetFile);
    assets.set(entry.assetFile, assetSource);
  }
  for (const [assetFile, assetSource] of assets) {
    for (const { id } of inspectFragmentGraph(assetSource).owners) {
      const previousAsset = fragmentOwners.get(id);
      if (previousAsset && previousAsset !== assetFile)
        fail(
          "FRAGMENT_BASE_COLLISION",
          `${id}: ${previousAsset} / ${assetFile}`,
        );
      fragmentOwners.set(id, assetFile);
    }
  }

  const exportGroups = groupBy(entries, ({ exportName }) => exportName);
  const exports = [...exportGroups.entries()]
    .map(([exportName, rows]) => {
      const artworkHashes = new Set(
        rows.map(({ artworkSha256 }) => artworkSha256),
      );
      if (artworkHashes.size !== 1) fail("EXPORT_ARTWORK_CONFLICT", exportName);
      return {
        assetFile: rows[0].assetFile,
        artworkSha256: rows[0].artworkSha256,
        exportName,
        sourceKeys: rows
          .map(({ sourceFile, sourceName }) => `${sourceFile}::${sourceName}`)
          .sort(),
      };
    })
    .sort((left, right) => left.exportName.localeCompare(right.exportName));

  const totals = {
    artworks: new Set(entries.map(({ artworkSha256 }) => artworkSha256)).size,
    exports: exports.length,
    repairedSourcePaths: entries.filter(({ repairs }) => repairs.length > 0)
      .length,
    sourceNames: new Set(entries.map(({ sourceName }) => sourceName)).size,
    sourcePaths: entries.length,
  };
  for (const [key, value] of Object.entries(expected))
    if (totals[key] !== value)
      fail(
        "GENERATED_COUNT_MISMATCH",
        `${key}: ${totals[key]} !== ${value}; qualified=${exports
          .filter(({ exportName }) => exportName.includes("From"))
          .map(({ exportName }) => exportName)
          .join(",")}`,
      );

  const sources = await Promise.all(
    Object.entries(inputFiles).map(async ([name, path]) => ({
      name,
      path: toPosix(relative(yakitRoot, path)),
      sha256: sha256(await readText(path)),
    })),
  );
  const inventoryEntries = entries.map(
    ({ rawSvg: _rawSvg, ...entry }) => entry,
  );
  const inventory = {
    schemaVersion: 1,
    generationPolicy: {
      deduplicationKey: "canonicalArtworkSha256",
      fragmentIds: "stable-content-qualified",
      nameCollision: "lexicographic-primary-with-source-qualified-secondary",
      orphanReferences: "remove-without-guess-pairing",
    },
    hashSemantics: {
      artworkSha256: "alias of assetSha256",
      assetSha256: "SHA-256 of exact emitted SVG file bytes",
      canonicalArtworkSha256:
        "SHA-256 after orphan cleanup and canonical fragment normalization",
      sourceSvgSha256: "SHA-256 of exact audit or direct-source SVG evidence",
    },
    sources,
    totals,
    entries: inventoryEntries,
    exports,
  };
  const indexPath = join(outputDirectory, "index.tsx");
  const inventoryPath = join(outputDirectory, "inventory.json");
  const indexPrettierConfig = (await resolveConfig(indexPath)) ?? {};
  const inventoryPrettierConfig = (await resolveConfig(inventoryPath)) ?? {};
  const index = await format(generatedIndex(exports), {
    ...indexPrettierConfig,
    filepath: indexPath,
  });
  const inventorySource = await format(JSON.stringify(inventory), {
    ...inventoryPrettierConfig,
    filepath: inventoryPath,
  });
  return {
    assets,
    exports,
    index,
    inventory,
    inventorySource,
  };
}

async function generate(result) {
  await rm(outputDirectory, { force: true, recursive: true });
  await mkdir(assetDirectory, { recursive: true });
  for (const [assetFile, svg] of result.assets)
    await writeFile(join(outputDirectory, assetFile), svg);
  await writeFile(join(outputDirectory, "index.tsx"), result.index);
  await writeFile(
    join(outputDirectory, "inventory.json"),
    result.inventorySource,
  );
}

async function check(result) {
  const expectedFiles = new Map([
    ["index.tsx", result.index],
    ["inventory.json", result.inventorySource],
    ...result.assets,
  ]);
  const actualAssets = existsSync(assetDirectory)
    ? await readdir(assetDirectory)
    : [];
  const expectedAssets = [...result.assets.keys()]
    .map((path) => path.replace("assets/", ""))
    .sort();
  if (JSON.stringify(actualAssets.sort()) !== JSON.stringify(expectedAssets))
    fail(
      "GENERATED_ASSET_SET_DRIFT",
      `${actualAssets.length} !== ${expectedAssets.length}`,
    );
  for (const [path, expectedSource] of expectedFiles) {
    const absolutePath = join(outputDirectory, path);
    const actualSource = await readText(absolutePath);
    if (actualSource !== expectedSource) fail("GENERATED_FILE_DRIFT", path);
  }
}

const result = await collect();
if (process.argv.includes("--check")) await check(result);
else await generate(result);
console.log(JSON.stringify(result.inventory.totals));
