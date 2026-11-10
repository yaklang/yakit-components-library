import { buildIconDocuments } from "../../scripts/icon-source-documents.mjs";
import { readIconInput } from "../../scripts/icon-source-documents.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  applyChanges,
  packageRoot,
  planIconUpdate,
  runIconUpdate,
  renderImportedSvg,
  jsonText,
} from "../../scripts/update-icons.mjs";
import {
  planSourceImport,
  parseFigmaUrl,
  suggestExportName,
} from "../../scripts/import-icon-sources.mjs";
import { readIconSources } from "../../scripts/icon-source-data.mjs";

async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), "yakit-icons-"));
  try {
    for (const directory of [
      "config/icon-sources",
      "src",
      "test/fixtures/icons",
      "scripts",
    ])
      await cp(path.join(packageRoot, directory), path.join(root, directory), {
        recursive: true,
      });
    await cp(
      path.join(packageRoot, "config/iconStrokeContract.generated.ts"),
      path.join(root, "config/iconStrokeContract.generated.ts"),
    );
    await cp(
      path.join(packageRoot, ".prettierrc.json"),
      path.join(root, ".prettierrc.json"),
    ).catch(async () => {
      await writeFile(
        path.join(root, ".prettierrc.json"),
        jsonText({ singleQuote: true, printWidth: 100, trailingComma: "all" }),
      );
    });
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const fileKey = "QWct5XE0Bg0bNDQ93eYgEw";
const url = (id) =>
  `https://www.figma.com/design/${fileKey}/Icons?node-id=${id.replace(":", "-")}`;
const outlineSvg =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L20 20" stroke="#353639" stroke-width="2"/></svg>\n';
const solidSvg =
  '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L20 20L2 20Z" fill="#353639"/></svg>\n';
const colorfulSvg = solidSvg.replace("#353639", "#F28C45");
async function input(root, family, nodeId = "999999:1") {
  const svgPath = path.join(root, `${family}.svg`);
  await writeFile(
    svgPath,
    { outline: outlineSvg, solid: solidSvg, colorful: colorfulSvg }[family],
  );
  return {
    schemaVersion: 1,
    icons: [
      {
        url: url(nodeId),
        family,
        name: `${family}/workflow-example`,
        nodeType: "COMPONENT",
        dimensionsSource: "svg-export",
        x: 100,
        y: 200,
        width: family === "outline" ? 24 : 20,
        height: family === "outline" ? 24 : 20,
        svgPath,
        ...(family === "colorful"
          ? {
              groupNodeId: "37202:12895",
              paintReplacements: {
                "#F28C45": "var(--Colors-Use-Neutral-Text-2-Primary, #F28C45)",
              },
            }
          : {}),
      },
    ],
  };
}

test("URL and export naming reject ambiguity instead of guessing", () => {
  assert.deepEqual(parseFigmaUrl(url("1:2")), { fileKey, nodeId: "1:2" });
  assert.equal(
    suggestExportName("Outline/arrow-up-from-dot", "outline"),
    "ArrowUpFromDotOutlined",
  );
  assert.throws(
    () => parseFigmaUrl("https://example.org/design/a?node-id=1-2"),
    /URL_INVALID/,
  );
  assert.throws(() => suggestExportName("箭头", "outline"), /NAME_REQUIRED/);
  assert.throws(
    () =>
      renderImportedSvg({ nodeId: "1:2", raw: { svg: solidSvg } }, "outline"),
    /STROKE_MISSING/,
  );
});

for (const family of ["outline", "solid", "colorful"])
  test(`${family}: import, generate, update and idempotence without rewriting historical controls`, () =>
    fixture(async (root) => {
      const originalLoading = await readIconInput(
        path.join(root, "src/loading/index.tsx"),
        "utf8",
      );
      const baseline = await readIconInput(
        path.join(
          root,
          "test/fixtures/icons/reference/outline-prechange-baseline-v1.json",
        ),
        "utf8",
      );
      const request = await input(root, family);
      const imported = await planSourceImport(request, root);
      assert.equal(imported.report[0].status, "added");
      assert.deepEqual(
        [...imported.changes.keys()],
        [`config/icon-sources/${family}.json`],
      );
      await applyChanges(root, imported.changes);
      await assert.rejects(
        runIconUpdate(["--check"], root),
        /ICON_GENERATED_DRIFT|ICON_SOURCE_MISSING/,
      );
      const changes = await planIconUpdate(root);
      assert.ok(changes.has(`src/${family}/999999-1.svg`));
      await applyChanges(root, changes);
      assert.equal((await planIconUpdate(root)).size, 0);
      const repeat = await planSourceImport(request, root);
      assert.equal(repeat.changes.size, 0);
      const source = await readIconInput(
        path.join(root, `src/${family}/999999-1.svg`),
        "utf8",
      );
      assert.ok(
        source.includes(
          family === "colorful"
            ? "var(--Colors-Use-Neutral-Text-2-Primary, #F28C45)"
            : "currentColor",
        ),
      );
      request.icons[0].name = `${family}/renamed-in-figma`;
      await writeFile(
        request.icons[0].svgPath,
        (await readIconInput(request.icons[0].svgPath, "utf8")).replace(
          "M2 2",
          "M3 3",
        ),
      );
      const update = await planSourceImport(request, root);
      assert.equal(update.report[0].exportName, imported.report[0].exportName);
      await applyChanges(root, update.changes);
      await applyChanges(root, await planIconUpdate(root, { family }));
      assert.equal((await planIconUpdate(root)).size, 0);
      assert.equal(
        await readIconInput(
          path.join(root, "src/loading/index.tsx"),
          "utf8",
        ),
        originalLoading,
      );
      assert.equal(
        await readIconInput(
          path.join(
            root,
            "test/fixtures/icons/reference/outline-prechange-baseline-v1.json",
          ),
          "utf8",
        ),
        baseline,
      );
    }));

test("bad batch does not write good nodes, duplicate exports fail, missing records cannot remove public icons", () =>
  fixture(async (root) => {
    const request = await input(root, "outline");
    request.icons.push({
      ...request.icons[0],
      url: url("999999:2"),
      svgPath: "/missing.svg",
    });
    const before = await readIconInput(
      path.join(root, "config/icon-sources/outline.json"),
      "utf8",
    );
    await assert.rejects(planSourceImport(request, root), /ENOENT/);
    assert.equal(
      await readIconInput(
        path.join(root, "config/icon-sources/outline.json"),
        "utf8",
      ),
      before,
    );
    request.icons.pop();
    request.icons[0].exportName = "MailOutlined";
    await assert.rejects(planSourceImport(request, root), /EXPORT_DUPLICATE/);
    const sources = readIconSources(
      pathToFileURL(`${root}/config/icon-sources/`),
    );
    sources.outline.records.shift();
    await assert.rejects(planIconUpdate(root, { sources }), /PUBLIC_REMOVAL/);
  }));

test("Oldicon aliases share assets and retain all deep imports", () =>
  fixture(async (root) => {
    const sources = readIconSources(
      pathToFileURL(`${root}/config/icon-sources/`),
    );
    const record = sources.oldicon.records[0];
    record.sources.push({
      ...record.sources[0],
      exportName: "WorkflowLegacyAliasIcon",
      sourceName: "WorkflowLegacyAliasIcon",
    });
    const changes = await planIconUpdate(root, { sources, family: "oldicon" });
    assert.ok(
      changes.has("src/oldicon/icons/WorkflowLegacyAliasIcon.tsx"),
    );
    assert.ok(![...changes.keys()].some((f) => f.includes("/assets/")));
    const inventory = buildIconDocuments(root, { sources }).get(
      "config/icon-sources/oldicon.json#manifest",
    );
    assert.equal(
      inventory.exports.find((r) => r.exportName === "WorkflowLegacyAliasIcon")
        .assetFile,
      record.assetFile,
    );
  }));

test("transaction restores earlier writes and detects concurrent edits", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "yakit-icon-transaction-"));
  try {
    await writeFile(path.join(root, "a"), "original");
    const changes = new Map([
      ["a", { before: "original", after: "updated" }],
      ["nested/b", { before: null, after: "new" }],
    ]);
    let writes = 0;
    await assert.rejects(
      applyChanges(root, changes, {
        write: async (...args) => {
          if (++writes === 2) throw new Error("simulated disk failure");
          await writeFile(...args);
        },
      }),
      /simulated disk failure/,
    );
    assert.equal(await readIconInput(path.join(root, "a"), "utf8"), "original");
    await assert.rejects(readIconInput(path.join(root, "nested/b")), /ENOENT/);
    await writeFile(path.join(root, "a"), "someone else");
    await assert.rejects(applyChanges(root, changes), /CONCURRENT_EDIT/);
    assert.equal(
      await readIconInput(path.join(root, "a"), "utf8"),
      "someone else",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("canonical sources preserve raw SVGs, placements and existing default colors", () =>
  fixture(async (root) => {
    const original = JSON.parse(
      await readIconInput(
        path.join(root, "config/icon-sources/solid.json#placement"),
        "utf8",
      ),
    );
    const migrated = readIconSources(
      pathToFileURL(`${root}/config/icon-sources/`),
    );
    assert.equal(
      migrated.outline.records.find((r) => r.exportName === "SunOutlined")
        .defaultColor,
      "#0A0A0A",
    );
    assert.equal(
      migrated.solid.records.flatMap((r) => r.placements).length,
      original.placements.length,
    );
    for (const placement of original.placements) {
      const record = migrated.solid.records.find(
        (r) => r.nodeId === placement.exportedSourceNodeId,
      );
      const preserved = record.placements.find(
        (p) => p.placementNodeId === placement.placementNodeId,
      );
      assert.equal(preserved.width, placement.width);
      assert.equal(preserved.height, placement.height);
    }
    const raw = JSON.parse(
      await readIconInput(
        path.join(root, "config/icon-sources/outline.json#raw"),
        "utf8",
      ),
    );
    for (const record of migrated.outline.records)
      assert.equal(
        record.raw.svg,
        raw.components.find((r) => r.nodeId === record.nodeId).svg,
      );
  }));

test("partial generation stays within its family and rejects public removals", () =>
  fixture(async (root) => {
    const request = await input(root, "outline");
    await applyChanges(root, (await planSourceImport(request, root)).changes);
    const changes = await planIconUpdate(root, { family: "outline" });
    assert.ok(
      ![...changes.keys()].some((f) => /(?:solid|colorful|oldicon)/.test(f)),
    );
    await applyChanges(root, changes);
    const loading = readIconSources(
      pathToFileURL(`${root}/config/icon-sources/`),
    );
    loading.loading.records = [];
    await assert.rejects(
      planIconUpdate(root, { sources: loading }),
      /PUBLIC_REMOVAL/,
    );
  }));

test("source projections remain read-only and updates never recreate retired JSON files", () =>
  fixture(async (root) => {
    const retired = [
      ...["outline", "solid", "colorful"].map(
        (family) => `scripts/figma-${family}-icons-inventory.json`,
      ),
      ...["outline", "solid"].flatMap((family) =>
        ["raw", "placement"].map(
          (kind) =>
            `test/fixtures/icons/reference/figma-${family}-${kind}-provenance-v1.json`,
        ),
      ),
      "src/oldicon/inventory.json",
    ];
    for (const file of retired)
      await assert.rejects(readFile(path.join(root, file)), /ENOENT/);
    const sourcePath = path.join(root, "config/icon-sources/outline.json");
    const before = await readFile(sourcePath, "utf8");
    const reference = path.join(root, "config/icon-sources/outline.json#raw");
    const first = await readIconInput(reference, "utf8");
    assert.equal(await readFile(sourcePath, "utf8"), before);
    const source = JSON.parse(before);
    source.records[0].name = "Outline/updated-evidence-name";
    await writeFile(sourcePath, jsonText(source));
    const second = JSON.parse(await readIconInput(reference, "utf8"));
    assert.notEqual(JSON.stringify(second), JSON.stringify(JSON.parse(first)));
    assert.equal(second.components[0].name, "Outline/updated-evidence-name");
    await writeFile(sourcePath, before);
    const fixturePath = path.join(root, "review-fixture.json");
    await writeFile(fixturePath, first);
    assert.equal(await readIconInput(fixturePath, "utf8"), first);
    const changes = await planIconUpdate(root);
    assert.ok(
      ![...changes.keys()].some(
        (file) => retired.includes(file) || file.includes("#"),
      ),
    );
    await applyChanges(root, changes);
    assert.equal(
      await runIconUpdate(["--check"], root),
      "ICONS_CHECK_OK 0 file(s)\n",
    );
    for (const file of retired)
      await assert.rejects(readFile(path.join(root, file)), /ENOENT/);
  }));

test("unified update repairs the name catalog while check mode leaves it untouched", () =>
  fixture(async (root) => {
    const catalog = path.join(root, "src/figmaNameCatalog.ts");
    const expected = await readFile(catalog, "utf8");
    const corrupted = expected.replace(
      "ArrowUpFromDotOutlined",
      "WrongPublicName",
    );
    assert.notEqual(corrupted, expected);
    await writeFile(catalog, corrupted);
    await assert.rejects(
      runIconUpdate(["--check"], root),
      /ICON_GENERATED_DRIFT/,
    );
    assert.equal(await readFile(catalog, "utf8"), corrupted);
    await runIconUpdate([], root);
    assert.equal(await readFile(catalog, "utf8"), expected);
    assert.equal(await runIconUpdate([], root), "ICONS_UPDATED 0 file(s)\n");
  }));

test('Colorful exports normalize named white without changing source gradients', () => {
  const rawSvg =
    '<svg width="24" height="24" viewBox="0 0 24 24"><defs><linearGradient id="paint"><stop stop-color="#1B8E9D"/><stop offset="1" stop-color="#FFCE1E"/></linearGradient><clipPath id="clip"><rect width="24" height="24" fill="white"/></clipPath></defs><path d="M2 2H20" stroke="url(#paint)" stroke-width="2" clip-path="url(#clip)"/></svg>';
  const record = { nodeId: '47752:13925', rawSvg };
  const output = renderImportedSvg(record, 'colorful');
  assert.match(output, /fill="#FFFFFF"/);
  assert.match(output, /stop-color="#1B8E9D"/);
  assert.match(output, /stop-color="#FFCE1E"/);
  assert.match(output, /stroke-width="2"/);
  assert.match(output, /stroke="url\(#/);
  assert.equal(record.rawSvg, rawSvg);
});


test('uniform stroke generation applies only to Outline', () => {
  const rawSvg = '<svg width="24" height="24"><path d="M1 1H20" stroke="#353639" stroke-width="3"/></svg>';
  for (const family of ['solid', 'colorful', 'oldicon']) {
    assert.match(renderImportedSvg({nodeId:'1:2',rawSvg}, family), /stroke-width="3"/);
  }
  assert.match(renderImportedSvg({nodeId:'1:2',rawSvg}, 'outline'), /stroke-width="1.5"/);
});

test('explicit synchronization repairs stale legacy groups even when raw SVG is unchanged', () =>
  fixture(async (root) => {
    const sourcePath = path.join(root, 'config/icon-sources/outline.json');
    const source = JSON.parse(await readFile(sourcePath, 'utf8'));
    const record = source.records.find((r) => r.exportName === 'BookOpenTextOutlined');
    delete record.production;
    await writeFile(sourcePath, jsonText(source));
    const svgPath = path.join(root, 'book-remote.svg');
    await writeFile(svgPath, record.raw.svg);
    const file = path.join(root, 'src/outline', record.file);
    const expected = await readFile(file, 'utf8');
    const stale = expected.replace('<path', '<g><g><path').replace('</svg>', '</g></g></svg>');
    await writeFile(file, stale);
    const icon = { url: url(record.nodeId), name: record.name, family: 'outline', nodeType: 'COMPONENT', width: 24, height: 24, svgPath };
    assert.equal((await planSourceImport({schemaVersion: 1, icons: [icon]}, root)).report[0].status, 'unchanged');
    const request = {schemaVersion: 1, icons: [{...icon, syncProduction: true}]};
    const imported = await planSourceImport(request, root);
    assert.equal(imported.report[0].status, 'updated');
    await applyChanges(root, imported.changes);
    await assert.rejects(runIconUpdate(['--check'], root), /ICON_GENERATED_DRIFT/);
    assert.equal(await readFile(file, 'utf8'), stale);
    await runIconUpdate([], root);
    assert.equal(await readFile(file, 'utf8'), expected);
    assert.equal((await planSourceImport(request, root)).changes.size, 0);
    await writeFile(file, expected.replace(/<path\b[^>]*\/>/, ''));
    await assert.rejects(runIconUpdate(['--check'], root), /ICON_GENERATED_DRIFT/);
    await runIconUpdate([], root);
    assert.equal(await readFile(file, 'utf8'), expected);
  }));

test('registered default foreground colors remain overridable after import', () => {
  const output = renderImportedSvg({nodeId: '1:2', defaultColor: '#0A0A0A', raw: {svg: outlineSvg.replace('#353639', '#0A0A0A')}}, 'outline');
  assert.match(output, /stroke="currentColor"/);
  assert.doesNotMatch(output, /#0A0A0A/);
});

test('import keeps legacy mask paint exceptions attached to the normalized definition', () =>
  fixture(async (root) => {
    const sourcePath = path.join(root, 'config/icon-sources/outline.json');
    const source = JSON.parse(await readFile(sourcePath, 'utf8'));
    const record = source.records.find((r) => r.nodeId === '1:3058');
    delete record.production;
    for (const exception of source.metadata.paintExceptions)
      if (exception.path === 'outline/1-3058.svg')
        exception.definitionId = exception.definitionId.replace('icon_13058__', 'icon_1_3058__');
    await writeFile(sourcePath, jsonText(source));
    const svgPath = path.join(root, 'mask-remote.svg');
    await writeFile(svgPath, record.raw.svg);
    const imported = await planSourceImport({schemaVersion: 1, icons: [{url: url(record.nodeId), name: record.name, family: 'outline', nodeType: 'COMPONENT', width: 24, height: 24, svgPath, syncProduction: true}]}, root);
    const next = JSON.parse(imported.changes.get('config/icon-sources/outline.json').after);
    const exception = next.metadata.paintExceptions.find((e) => e.path === 'outline/1-3058.svg');
    assert.equal(exception.definitionId, 'icon_13058__mask_0');
    assert.equal(exception.value, '#D9D9D9');
    await applyChanges(root, imported.changes);
    await runIconUpdate([], root);
    assert.equal(await runIconUpdate(['--check'], root), 'ICONS_CHECK_OK 0 file(s)\n');
  }));

test('source-native geometry is explicit, supports fixed fills, and remains idempotent', () =>
  fixture(async (root) => {
    const request = await input(root, 'outline');
    const icon = request.icons[0];
    await writeFile(icon.svgPath, '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L20 20L2 20Z" fill="#353639"/></svg>\n');
    await assert.rejects(planSourceImport(request, root), /ICON_OUTLINE_STROKE_MISSING/);
    icon.preserveSourceGeometry = true;
    const imported = await planSourceImport(request, root);
    const source = JSON.parse(imported.changes.get('config/icon-sources/outline.json').after);
    const record = source.records.find((r) => r.nodeId === '999999:1');
    assert.equal(record.production.strokeMode, 'fixed-fill');
    assert.equal(record.metadata.geometryReviewId, undefined);
    await applyChanges(root, imported.changes);
    await runIconUpdate([], root);
    const svg = await readFile(path.join(root, 'src/outline/999999-1.svg'), 'utf8');
    assert.match(svg, /fill="currentColor"/);
    assert.doesNotMatch(svg, /\bstroke(?:-width)?=/);
    const contract = await readFile(path.join(root, 'config/iconStrokeContract.generated.ts'), 'utf8');
    assert.match(contract, /'999999-1.svg':\s*\{\s*classification: 'fixed-fill'/);
    assert.equal((await planSourceImport(request, root)).changes.size, 0);
    assert.equal(await runIconUpdate(['--check'], root), 'ICONS_CHECK_OK 0 file(s)\n');
  }));

test('source-native cutout authorization is restricted to the exported path and paint', () =>
  fixture(async (root) => {
    const request = await input(root, 'outline');
    request.icons[0].preserveSourceGeometry = true;
    await writeFile(request.icons[0].svgPath, outlineSvg.replace('</svg>', '<path d="M4 4L18 18" stroke="white" stroke-width="2"/></svg>'));
    const imported = await planSourceImport(request, root);
    const source = JSON.parse(imported.changes.get('config/icon-sources/outline.json').after);
    const record = source.records.find((r) => r.nodeId === '999999:1');
    assert.deepEqual(record.metadata.sourceForegroundPaints, [{tag: 'path', d: 'M4 4L18 18', attribute: 'stroke', value: 'white'}]);
    const {inspectSvg} = await import('../../scripts/audit-icons.mjs');
    const normalized = renderImportedSvg(record, 'outline');
    const manifest = {symbols: [{file: record.file, ...record.metadata}]};
    const inspect = (svg) => inspectSvg({manifest, source: svg, variant: 'outline', relativePath: `outline/${record.file}`});
    assert.deepEqual(inspect(normalized), []);
    assert.ok(inspect(normalized.replace('M4 4L18 18', 'M4 4L19 19')).includes('FOREGROUND_LITERAL'));
    assert.ok(inspect(normalized.replace('stroke="white"', 'stroke="red"')).includes('FOREGROUND_LITERAL'));
    await applyChanges(root, imported.changes);
    await runIconUpdate([], root);
  }));
