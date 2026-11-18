import { readIconInput } from '../../scripts/icon-source-documents.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  applyChanges,
  packageRoot,
  planIconUpdate,
  runIconUpdate,
  renderImportedSvg,
  jsonText,
} from '../../scripts/update-icons.mjs';
import {
  planSourceImport,
  runSourceImport,
  parseFigmaUrl,
  suggestExportName,
} from '../../scripts/import-icon-sources.mjs';
import { readIconSources } from '../../scripts/icon-source-data.mjs';

async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'yakit-icons-'));
  try {
    for (const directory of ['config', 'src', 'test/fixtures/icons', 'scripts'])
      await cp(path.join(packageRoot, directory), path.join(root, directory), {
        recursive: true,
      });
    await cp(
      path.join(packageRoot, 'config/iconStrokeContract.generated.ts'),
      path.join(root, 'config/iconStrokeContract.generated.ts'),
    );
    await cp(path.join(packageRoot, '.prettierrc.json'), path.join(root, '.prettierrc.json')).catch(
      async () => {
        await writeFile(
          path.join(root, '.prettierrc.json'),
          jsonText({ singleQuote: true, printWidth: 100, trailingComma: 'all' }),
        );
      },
    );
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
async function snapshotConfig(root) {
  const directory = path.join(root, 'config');
  const files = (await readdir(directory, { recursive: true })).sort();
  const result = [];
  for (const file of files) {
    const absolute = path.join(directory, file);
    const info = await stat(absolute);
    if (info.isFile()) result.push([file, await readFile(absolute, 'utf8'), info.mtimeMs]);
  }
  return result;
}

const fileKey = 'QWct5XE0Bg0bNDQ93eYgEw';
const url = (id) => `https://www.figma.com/design/${fileKey}/Icons?node-id=${id.replace(':', '-')}`;
const outlineSvg =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L20 20" stroke="#353639" stroke-width="2"/></svg>\n';
const solidSvg =
  '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L20 20L2 20Z" fill="#353639"/></svg>\n';
const colorfulSvg = solidSvg.replace('#353639', '#F28C45');
async function input(root, family, nodeId = '999999:1') {
  const svgPath = path.join(root, `${family}.svg`);
  await writeFile(svgPath, { outline: outlineSvg, solid: solidSvg, colorful: colorfulSvg }[family]);
  return {
    schemaVersion: 1,
    icons: [
      {
        url: url(nodeId),
        family,
        name: `${family}/workflow-example`,
        nodeType: 'COMPONENT',
        dimensionsSource: 'svg-export',
        x: 100,
        y: 200,
        width: family === 'outline' ? 24 : 20,
        height: family === 'outline' ? 24 : 20,
        svgPath,
        ...(family === 'colorful'
          ? {
              groupNodeId: '37202:12895',
              paintReplacements: {
                '#F28C45': 'var(--Colors-Use-Neutral-Text-2-Primary, #F28C45)',
              },
            }
          : {}),
      },
    ],
  };
}

test('URL and export naming reject ambiguity instead of guessing', () => {
  assert.deepEqual(parseFigmaUrl(url('1:2')), { fileKey, nodeId: '1:2' });
  assert.equal(suggestExportName('Outline/arrow-up-from-dot', 'outline'), 'ArrowUpFromDotOutlined');
  assert.throws(() => parseFigmaUrl('https://example.org/design/a?node-id=1-2'), /URL_INVALID/);
  assert.throws(() => suggestExportName('箭头', 'outline'), /NAME_REQUIRED/);
  assert.ok(
    renderImportedSvg({ nodeId: '1:2', raw: { svg: solidSvg } }, 'outline').includes(
      'currentColor',
    ),
  );
});

for (const family of ['outline', 'solid', 'colorful'])
  test(`${family}: import, generate, update and idempotence without changing unrelated components`, () =>
    fixture(async (root) => {
      const originalLoading = await readIconInput(path.join(root, 'src/loading/index.tsx'), 'utf8');
      const request = await input(root, family);
      const imported = await planSourceImport(request, root);
      assert.equal(imported.report[0].status, 'added');
      assert.ok(imported.changes.has(`config/icon-sources/${family}.json`));
      assert.ok(imported.changes.has(`config/icon-project/${family}.json`));
      assert.ok(imported.changes.has(`config/icon-sources/svg/${fileKey}/999999-1.svg`));
      await applyChanges(root, imported.changes);
      await assert.rejects(
        runIconUpdate(['--check'], root),
        /ICON_GENERATED_DRIFT|ICON_SOURCE_MISSING/,
      );
      const changes = await planIconUpdate(root);
      assert.ok(changes.has(`src/${family}/999999-1.svg`));
      await applyChanges(root, changes);
      assert.equal((await planIconUpdate(root)).size, 0);
      const repeat = await planSourceImport(request, root);
      assert.equal(repeat.changes.size, 0);
      const source = await readIconInput(path.join(root, `src/${family}/999999-1.svg`), 'utf8');
      assert.ok(
        source.includes(
          family === 'colorful'
            ? 'var(--Colors-Use-Neutral-Text-2-Primary, #F28C45)'
            : 'currentColor',
        ),
      );
      request.icons[0].name = `${family}/renamed-in-figma`;
      await writeFile(
        request.icons[0].svgPath,
        (await readIconInput(request.icons[0].svgPath, 'utf8')).replace('M2 2', 'M3 3'),
      );
      const update = await planSourceImport(request, root);
      assert.equal(update.report[0].exportName, imported.report[0].exportName);
      await applyChanges(root, update.changes);
      await applyChanges(root, await planIconUpdate(root, { family }));
      assert.equal((await planIconUpdate(root)).size, 0);
      assert.equal(
        await readIconInput(path.join(root, 'src/loading/index.tsx'), 'utf8'),
        originalLoading,
      );
    }));

test('bad batch does not write good nodes, duplicate exports fail, missing records cannot remove public icons', () =>
  fixture(async (root) => {
    const request = await input(root, 'outline');
    request.icons.push({
      ...request.icons[0],
      url: url('999999:2'),
      svgPath: '/missing.svg',
    });
    const before = await readIconInput(path.join(root, 'config/icon-sources/outline.json'), 'utf8');
    await assert.rejects(planSourceImport(request, root), /ENOENT/);
    assert.equal(
      await readIconInput(path.join(root, 'config/icon-sources/outline.json'), 'utf8'),
      before,
    );
    request.icons.pop();
    request.icons[0].exportName = 'MailOutlined';
    await assert.rejects(planSourceImport(request, root), /EXPORT_DUPLICATE/);
    const sources = readIconSources(pathToFileURL(`${root}/config/icon-sources/`));
    sources.outline.records.shift();
    await assert.rejects(planIconUpdate(root, { sources }), /PUBLIC_REMOVAL/);
  }));

for (const kind of ['new', 'existing'])
  test(`Outline stroke preflight rejects an unsupported ${kind} source without writing the batch`, () =>
    fixture(async (root) => {
      const request = await input(root, 'outline');
      request.icons[0].evidence = { component: { nodeType: 'COMPONENT' } };
      const existing = readIconSources(pathToFileURL(`${root}/config/icon-sources/`)).outline
        .records[0];
      const invalidSvgPath = path.join(root, 'unsupported-stroke.svg');
      await writeFile(invalidSvgPath, outlineSvg.replace(' stroke-width="2"', ''));
      request.icons.push({
        ...request.icons[0],
        url: url(kind === 'existing' ? existing.nodeId : '999999:2'),
        name: kind === 'existing' ? existing.name : 'Outline/unsupported-stroke',
        svgPath: invalidSvgPath,
      });
      const inputPath = path.join(root, 'input.json');
      await writeFile(inputPath, jsonText(request));
      const before = await snapshotConfig(root);
      await assert.rejects(
        runSourceImport(['--input', inputPath], root),
        /ICON_STROKE_FILL_DISPOSITION_MISSING/,
      );
      // Includes source metadata, raw SVGs, project mappings and evidence for both nodes.
      assert.deepEqual(await snapshotConfig(root), before);
    }));

test('Oldicon assets are manually maintained and never regenerated', () =>
  fixture(async (root) => {
    const { readOldiconAssets } = await import('../../scripts/oldicon-assets.mjs');
    const inventory = readOldiconAssets(root);
    const file = path.join(root, 'src/oldicon', inventory.assets[0]);
    const changed = (await readFile(file, 'utf8')).replace('</svg>', '<!-- manual edit --></svg>');
    await writeFile(file, changed);
    await assert.rejects(runIconUpdate(['--family', 'oldicon'], root), /OLDICON_HANDWRITTEN/);
    const changes = await planIconUpdate(root);
    assert.ok(![...changes.keys()].some((f) => f.includes('oldicon')));
    await applyChanges(root, changes);
    assert.equal(await readFile(file, 'utf8'), changed);
    assert.deepEqual(readOldiconAssets(root), inventory);
  }));

test('transaction restores earlier writes and detects concurrent edits', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yakit-icon-transaction-'));
  try {
    await writeFile(path.join(root, 'a'), 'original');
    const changes = new Map([
      ['a', { before: 'original', after: 'updated' }],
      ['nested/b', { before: null, after: 'new' }],
    ]);
    let writes = 0;
    await assert.rejects(
      applyChanges(root, changes, {
        write: async (...args) => {
          if (++writes === 2) throw new Error('simulated disk failure');
          await writeFile(...args);
        },
      }),
      /simulated disk failure/,
    );
    assert.equal(await readIconInput(path.join(root, 'a'), 'utf8'), 'original');
    await assert.rejects(readIconInput(path.join(root, 'nested/b')), /ENOENT/);
    await writeFile(path.join(root, 'a'), 'someone else');
    await assert.rejects(applyChanges(root, changes), /CONCURRENT_EDIT/);
    assert.equal(await readIconInput(path.join(root, 'a'), 'utf8'), 'someone else');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('canonical sources preserve raw SVGs, node sizes and defaults without instance inventories', () =>
  fixture(async (root) => {
    const sources = readIconSources(pathToFileURL(`${root}/config/icon-sources/`));
    assert.equal(
      sources.outline.records.find((r) => r.exportName === 'SunOutlined').defaultColor,
      '#0A0A0A',
    );
    for (const family of ['outline', 'solid']) {
      const inventory = JSON.parse(
        await readIconInput(
          path.join(root, `config/icon-sources/${family}.json#placement`),
          'utf8',
        ),
      );
      const manifest = JSON.parse(
        await readIconInput(path.join(root, `config/icon-sources/${family}.json#manifest`), 'utf8'),
      );
      assert.equal(Object.hasOwn(inventory, 'placements'), false);
      assert.equal(Object.hasOwn(inventory.counts, 'instances'), false);
      assert.equal(Object.hasOwn(manifest, 'placements'), false);
      assert.equal(Object.hasOwn(manifest, 'instanceVerification'), false);
      assert.equal(Object.hasOwn(manifest.expectedCounts, 'instances'), false);
      const symbols = [...inventory.currentSymbols, ...(inventory.supplementalSources ?? [])];
      assert.equal(symbols.length, sources[family].records.length);
      for (const record of sources[family].records) {
        assert.equal(Object.hasOwn(record, 'placements'), false);
        const symbol = symbols.find((r) => (r.nodeId ?? r.exportedSourceNodeId) === record.nodeId);
        assert.equal(symbol.width, record.nodeSize?.width);
        assert.equal(symbol.height, record.nodeSize?.height);
        assert.equal(symbol.exportName, record.exportName);
      }
    }
    const raw = JSON.parse(
      await readIconInput(path.join(root, 'config/icon-sources/outline.json#raw'), 'utf8'),
    );
    for (const record of sources.outline.records)
      assert.equal(record.raw.svg, raw.components.find((r) => r.nodeId === record.nodeId).svg);
  }));

for (const family of ['outline', 'solid', 'colorful'])
  test(`${family} rejects instance placements without writing any batch files`, () =>
    fixture(async (root) => {
      const request = await input(root, family);
      request.icons[0].evidence = { extraction: { method: 'svg-export' } };
      const existing = readIconSources(pathToFileURL(`${root}/config/icon-sources/`))[family]
        .records[0];
      const before = await snapshotConfig(root);
      for (const nodeId of ['999999:2', existing.nodeId]) {
        for (const placements of [[], [{ placementNodeId: '999999:3', nodeType: 'instance' }]]) {
          const invalid = {
            ...request.icons[0],
            url: url(nodeId),
            name: nodeId === existing.nodeId ? existing.name : `${family}/unsupported-placement`,
            evidence: { placements },
          };
          const inputPath = path.join(root, 'input.json');
          await writeFile(inputPath, jsonText({ ...request, icons: [...request.icons, invalid] }));
          await assert.rejects(
            runSourceImport(['--input', inputPath], root),
            /ICON_INSTANCE_PLACEMENTS_UNSUPPORTED.*remove evidence.placements/,
          );
          assert.deepEqual(await snapshotConfig(root), before);
        }
      }
      // Necessary extraction evidence remains supported and idempotent.
      await applyChanges(root, (await planSourceImport(request, root)).changes);
      const record = readIconSources(pathToFileURL(`${root}/config/icon-sources/`))[
        family
      ].records.find((r) => r.nodeId === '999999:1');
      assert.deepEqual(record.evidence.captured, request.icons[0].evidence);
      assert.equal((await planSourceImport(request, root)).changes.size, 0);
    }));

test('partial generation stays within its family and rejects public removals', () =>
  fixture(async (root) => {
    const request = await input(root, 'outline');
    await applyChanges(root, (await planSourceImport(request, root)).changes);
    const changes = await planIconUpdate(root, { family: 'outline' });
    assert.ok(![...changes.keys()].some((f) => /(?:solid|colorful|oldicon)/.test(f)));
    await applyChanges(root, changes);
    const loading = readIconSources(pathToFileURL(`${root}/config/icon-sources/`));
    loading.loading.records = [];
    await assert.rejects(planIconUpdate(root, { sources: loading }), /PUBLIC_REMOVAL/);
  }));

test('source projections remain read-only and updates never recreate retired JSON files', () =>
  fixture(async (root) => {
    const retired = [
      ...['outline', 'solid', 'colorful'].map(
        (family) => `scripts/figma-${family}-icons-inventory.json`,
      ),
      ...['outline', 'solid'].flatMap((family) =>
        ['raw', 'placement'].map(
          (kind) => `test/fixtures/icons/reference/figma-${family}-${kind}-provenance-v1.json`,
        ),
      ),
      'src/oldicon/inventory.json',
    ];
    for (const file of retired) await assert.rejects(readFile(path.join(root, file)), /ENOENT/);
    const sourcePath = path.join(root, 'config/icon-sources/outline.json');
    const before = await readFile(sourcePath, 'utf8');
    const reference = path.join(root, 'config/icon-sources/outline.json#raw');
    const first = await readIconInput(reference, 'utf8');
    assert.equal(await readFile(sourcePath, 'utf8'), before);
    const source = JSON.parse(before);
    source.records[0].name = 'Outline/updated-evidence-name';
    await writeFile(sourcePath, jsonText(source));
    const second = JSON.parse(await readIconInput(reference, 'utf8'));
    assert.notEqual(JSON.stringify(second), JSON.stringify(JSON.parse(first)));
    assert.equal(second.components[0].name, 'Outline/updated-evidence-name');
    await writeFile(sourcePath, before);
    const fixturePath = path.join(root, 'review-fixture.json');
    await writeFile(fixturePath, first);
    assert.equal(await readIconInput(fixturePath, 'utf8'), first);
    const changes = await planIconUpdate(root);
    assert.ok(![...changes.keys()].some((file) => retired.includes(file) || file.includes('#')));
    await applyChanges(root, changes);
    assert.equal(await runIconUpdate(['--check'], root), 'ICONS_CHECK_OK 0 file(s)\n');
    for (const file of retired) await assert.rejects(readFile(path.join(root, file)), /ENOENT/);
  }));

test('unified update repairs the name catalog while check mode leaves it untouched', () =>
  fixture(async (root) => {
    const catalog = path.join(root, 'src/figmaNameCatalog.ts');
    const expected = await readFile(catalog, 'utf8');
    const corrupted = expected.replace('ArrowUpFromDotOutlined', 'WrongPublicName');
    assert.notEqual(corrupted, expected);
    await writeFile(catalog, corrupted);
    await assert.rejects(runIconUpdate(['--check'], root), /ICON_GENERATED_DRIFT/);
    assert.equal(await readFile(catalog, 'utf8'), corrupted);
    await runIconUpdate([], root);
    assert.equal(await readFile(catalog, 'utf8'), expected);
    assert.equal(await runIconUpdate([], root), 'ICONS_UPDATED 0 file(s)\n');
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
  const rawSvg =
    '<svg width="24" height="24"><path d="M1 1H20" stroke="#353639" stroke-width="3"/></svg>';
  for (const family of ['solid', 'colorful']) {
    assert.match(renderImportedSvg({ nodeId: '1:2', rawSvg }, family), /stroke-width="3"/);
  }
  assert.match(renderImportedSvg({ nodeId: '1:2', rawSvg }, 'outline'), /stroke-width="1.5"/);
});

test('all original SVGs rebuild missing products and repeated updates preserve mtimes', () =>
  fixture(async (root) => {
    await runIconUpdate([], root);
    const sources = readIconSources(pathToFileURL(`${root}/config/icon-sources/`));
    const files = [
      ...['outline', 'solid', 'colorful'].flatMap((f) =>
        sources[f].records.map((r) => `src/${r.localFile}`),
      ),
      'src/outline/index.tsx',
      'src/solid/index.tsx',
      'src/colorful/index.tsx',
      'src/colorful/catalog.ts',
      'src/figmaNameCatalog.ts',
      'config/iconStrokeContract.generated.ts',
      'catalog/index.html',
    ];
    const expected = new Map(
      await Promise.all(files.map(async (f) => [f, await readFile(path.join(root, f), 'utf8')])),
    );
    for (const file of files) await rm(path.join(root, file));
    await runIconUpdate([], root);
    for (const [file, content] of expected)
      assert.equal(await readFile(path.join(root, file), 'utf8'), content, file);
    const { stat } = await import('node:fs/promises');
    const times = await Promise.all(
      files.map((f) => stat(path.join(root, f)).then((s) => s.mtimeMs)),
    );
    assert.equal(await runIconUpdate([], root), 'ICONS_UPDATED 0 file(s)\n');
    assert.equal(await runIconUpdate(['--check'], root), 'ICONS_CHECK_OK 0 file(s)\n');
    assert.deepEqual(
      await Promise.all(files.map((f) => stat(path.join(root, f)).then((s) => s.mtimeMs))),
      times,
    );
  }));

test('raw changes with equal normalized output do not rewrite products; rule changes regenerate', () =>
  fixture(async (root) => {
    await runIconUpdate([], root);
    const sources = readIconSources(pathToFileURL(`${root}/config/icon-sources/`));
    const record = sources.outline.records.find((r) => r.raw.svg.includes('stroke-width="2"'));
    await writeFile(
      path.join(root, 'config/icon-sources', record.svgFile),
      record.raw.svg.replaceAll('stroke-width="2"', 'stroke-width="3"'),
    );
    assert.equal((await planIconUpdate(root)).size, 0);
    const file = path.join(root, 'config/icon-project/outline.json');
    const project = JSON.parse(await readFile(file, 'utf8'));
    project.records[record.nodeId].defaultColor = '#123456';
    await writeFile(file, jsonText(project));
    const changes = await planIconUpdate(root);
    assert.ok(changes.has('src/outline/index.tsx'));
    assert.ok(changes.has('catalog/index.html'));
  }));

test('registered default foreground colors remain overridable after import', () => {
  const output = renderImportedSvg(
    {
      nodeId: '1:2',
      defaultColor: '#0A0A0A',
      raw: { svg: outlineSvg.replace('#353639', '#0A0A0A') },
    },
    'outline',
  );
  assert.match(output, /stroke="currentColor"/);
  assert.doesNotMatch(output, /#0A0A0A/);
});

test('filled outlines are admitted by default and remain idempotent', () =>
  fixture(async (root) => {
    const request = await input(root, 'outline');
    const icon = request.icons[0];
    await writeFile(
      icon.svgPath,
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L20 20L2 20Z" fill="#353639"/></svg>\n',
    );
    const imported = await planSourceImport(request, root);
    const source = JSON.parse(imported.changes.get('config/icon-sources/outline.json').after);
    const record = source.records.find((r) => r.nodeId === '999999:1');
    assert.equal(record.production, undefined);
    assert.equal(record.metadata, undefined);
    await applyChanges(root, imported.changes);
    await runIconUpdate([], root);
    const svg = await readFile(path.join(root, 'src/outline/999999-1.svg'), 'utf8');
    assert.match(svg, /fill="currentColor"/);
    assert.doesNotMatch(svg, /\bstroke(?:-width)?=/);
    const contract = await readFile(
      path.join(root, 'config/iconStrokeContract.generated.ts'),
      'utf8',
    );
    assert.match(contract, /'999999-1.svg':\s*\{\s*classification: 'fixed-fill'/);
    assert.equal((await planSourceImport(request, root)).changes.size, 0);
    assert.equal(await runIconUpdate(['--check'], root), 'ICONS_CHECK_OK 0 file(s)\n');
  }));

test('source-native cutout authorization is restricted to the exported path and paint', () =>
  fixture(async (root) => {
    const request = await input(root, 'outline');
    request.icons[0].preserveSourceGeometry = true;
    await writeFile(
      request.icons[0].svgPath,
      outlineSvg.replace('</svg>', '<path d="M4 4L18 18" stroke="white" stroke-width="2"/></svg>'),
    );
    const imported = await planSourceImport(request, root);
    await applyChanges(root, imported.changes);
    const record = readIconSources(
      pathToFileURL(`${root}/config/icon-sources/`),
    ).outline.records.find((r) => r.nodeId === '999999:1');
    assert.deepEqual(record.metadata.sourceForegroundPaints, [
      { tag: 'path', d: 'M4 4L18 18', attribute: 'stroke', value: 'white' },
    ]);
    const { inspectSvg } = await import('../../scripts/audit-icons.mjs');
    const normalized = renderImportedSvg(record, 'outline');
    const manifest = { symbols: [{ file: record.file, ...record.metadata }] };
    const inspect = (svg) =>
      inspectSvg({
        manifest,
        source: svg,
        variant: 'outline',
        relativePath: `outline/${record.file}`,
      });
    assert.deepEqual(inspect(normalized), []);
    assert.ok(
      inspect(normalized.replace('M4 4L18 18', 'M4 4L19 19')).includes('FOREGROUND_LITERAL'),
    );
    assert.ok(
      inspect(normalized.replace('stroke="white"', 'stroke="red"')).includes('FOREGROUND_LITERAL'),
    );
    await runIconUpdate([], root);
  }));
