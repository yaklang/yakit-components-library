import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { generateColors } from '@yakit-libs/color';
import { isolateCatalogSvg } from '../../scripts/offline-catalog.mjs';
import { inspectFragmentGraph } from '../../scripts/colorful-fragments.mjs';
import { readIconSources, sourceExports } from '../../scripts/icon-source-data.mjs';

const pageUrl = new URL('../../catalog/index.html', import.meta.url);
const readData = (html) =>
  JSON.parse(
    html.match(/<script id="catalog-data" type="application\/json">([\s\S]*?)<\/script>/)[1],
  );
test('catalog contains exactly the public three-family exports and production artwork', async () => {
  const data = readData(await readFile(pageUrl, 'utf8'));
  const sources = readIconSources();
  assert.deepEqual(
    data.icons.map((icon) => icon.exportName).sort(),
    ['outline', 'solid', 'colorful'].flatMap((family) => sourceExports(sources[family])).sort(),
  );
  const allIds = new Set();
  for (const [index, icon] of data.icons.entries()) {
    const source = sources[icon.family];
    let record = source.records.find((row) => row.exportName === icon.exportName);
    assert.equal(icon.nodeId, record.componentNodeId ?? record.nodeId);
    if (record.publicExposure === 'semantic-alias')
      record = source.records.find((r) => r.nodeId === record.canonicalComponentNodeId);
    const file =
      icon.family === 'colorful'
        ? record.localFile.replace(/^src\//, '')
        : `${icon.family}/${record.file}`;
    const production = await readFile(new URL(`../../src/${file}`, import.meta.url), 'utf8');
    assert.equal(icon.svg, isolateCatalogSvg(production, `catalog-${icon.family}-${index}`));
    const graph = inspectFragmentGraph(icon.svg);
    const localIds = new Set(graph.owners.map(({ id }) => id));
    for (const id of localIds) {
      assert.ok(!allIds.has(id), id);
      allIds.add(id);
    }
    for (const { id } of graph.references) assert.ok(localIds.has(id), id);
  }
  for (const [brand, settings] of Object.entries(data.brands))
    for (const theme of ['light', 'dark'])
      assert.deepEqual(data.palettes[brand][theme], generateColors(theme, settings[theme]));
});

test('fragment isolation handles all local reference forms without changing artwork', () => {
  const svg =
    '<svg aria-labelledby="title"><title id="title">Title</title><defs><linearGradient id="a"><stop stop-color="#fff"/></linearGradient><path id="p" d="M1 2H3"/></defs><use href="#p" xlink:href="#p" style="fill:url(\'#a\')"/></svg>';
  const left = isolateCatalogSvg(svg, 'left');
  const right = isolateCatalogSvg(svg, 'right');
  assert.match(left, /aria-labelledby="left-0"/);
  assert.match(left, /href="#left-2"/);
  assert.match(left, /url\(#left-1\)/);
  assert.match(left, /d="M1 2H3"/);
  const leftIds = new Set(inspectFragmentGraph(left).owners.map(({ id }) => id));
  assert.ok(inspectFragmentGraph(right).owners.every(({ id }) => !leftIds.has(id)));
  assert.throws(() => isolateCatalogSvg('<svg><use href="#missing"/></svg>', 'test'), /ORPHAN/);
  assert.throws(() => isolateCatalogSvg('<svg onload="alert(1)"></svg>', 'test'), /EVENT/);
  assert.throws(
    () => isolateCatalogSvg('<svg><image href="https:\/\/example.org/a.png"/></svg>', 'test'),
    /EXTERNAL/,
  );
});
