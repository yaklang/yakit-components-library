import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { createElement, Fragment, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import * as OldIcons from '../../src/icons/oldicon';
import inventory from '../../src/icons/oldicon/inventory.json';

const packageRoot = resolve(import.meta.dirname, '../..');
const oldiconRoot = resolve(packageRoot, 'src/icons/oldicon');
const packageManifest = JSON.parse(
  readFileSync(resolve(packageRoot, '../yakit-ui-icons/package.json'), 'utf8'),
);
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

type InventoryEntry = (typeof inventory.entries)[number];
type IconComponent = ComponentType<Record<string, unknown>>;

const sourceKey = ({ sourceFile, sourceName }: InventoryEntry) => `${sourceFile}::${sourceName}`;
const assetSource = (assetFile: string) => readFileSync(resolve(oldiconRoot, assetFile), 'utf8');
const svgAttributes = (source: string) => {
  const attributes = source.match(/<svg\b([^>]*)>/)?.[1] ?? '';
  const value = (name: string) =>
    attributes.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1] ?? null;
  return { height: value('height'), viewBox: value('viewBox'), width: value('width') };
};
const svgPaintValues = (source: string) =>
  [...source.matchAll(/\b(?:color|fill|stop-color|stroke)=["'](?!none(?:["']))([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((value) => !/^url\(/i.test(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();
const fragmentIds = (source: string) =>
  [...source.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
const fragmentReferences = (source: string) =>
  [...source.matchAll(/url\(\s*#([^)\s]+)\s*\)|(?:href|xlink:href)=["']#([^"']+)["']/g)]
    .map((match) => match[1] ?? match[2])
    .filter(Boolean);
const exportedIcon = (exportName: string) =>
  (OldIcons as Record<string, unknown>)[exportName] as IconComponent | undefined;
const groupBy = <T>(values: T[], key: (value: T) => string) => {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const groupKey = key(value);
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), value]);
  }
  return groups;
};

describe('oldicon migration inventory', () => {
  it('covers exactly 408 unique Yakit source paths', () => {
    expect(inventory.schemaVersion).toBe(1);
    expect(inventory.totals.sourcePaths).toBe(408);
    expect(inventory.entries).toHaveLength(408);
    expect(new Set(inventory.entries.map(sourceKey)).size).toBe(408);
    expect(inventory.totals.sourceNames).toBe(
      new Set(inventory.entries.map(({ sourceName }) => sourceName)).size,
    );
  });

  it('binds every source mapping and public export to one real SVG asset', () => {
    const exportByName = new Map(inventory.exports.map((entry) => [entry.exportName, entry]));

    expect(new Set(inventory.exports.map(({ exportName }) => exportName)).size).toBe(
      inventory.exports.length,
    );
    expect(inventory.totals.exports).toBe(inventory.exports.length);
    for (const entry of inventory.entries) {
      const exported = exportByName.get(entry.exportName);
      expect(exported, sourceKey(entry)).toBeDefined();
      expect(exported).toMatchObject({
        artworkSha256: entry.artworkSha256,
        assetFile: entry.assetFile,
      });
      expect(exported!.sourceKeys).toContain(sourceKey(entry));
      expect(exportedIcon(entry.exportName), entry.exportName).toBeTypeOf('object');
    }
  });

  it('deduplicates exact artwork without merging different artwork that shares a legacy name', () => {
    const byArtwork = groupBy(inventory.entries, ({ artworkSha256 }) => artworkSha256);
    const duplicateArtwork = [...byArtwork.values()].filter((entries) => entries.length > 1);
    expect(duplicateArtwork.length).toBeGreaterThan(0);
    for (const entries of duplicateArtwork) {
      expect(new Set(entries.map(({ assetFile }) => assetFile)).size).toBe(1);
    }
    expect(new Set(inventory.exports.map(({ assetFile }) => assetFile)).size).toBe(
      inventory.totals.artworks,
    );

    const byLegacyName = groupBy(inventory.entries, ({ sourceName }) => sourceName);
    for (const entries of byLegacyName.values()) {
      const bySameArtwork = groupBy(entries, ({ artworkSha256 }) => artworkSha256);
      for (const exactDuplicates of bySameArtwork.values()) {
        expect(new Set(exactDuplicates.map(({ exportName }) => exportName)).size).toBe(1);
      }
    }
    const artworkCollisions = [...byLegacyName.values()].filter(
      (entries) => new Set(entries.map(({ artworkSha256 }) => artworkSha256)).size > 1,
    );
    expect(artworkCollisions.map(([entry]) => entry.sourceName).sort()).toEqual([
      'RocketIcon',
      'YakitLogoSvgIcon',
    ]);
    for (const entries of artworkCollisions) {
      expect(new Set(entries.map(({ exportName }) => exportName)).size).toBe(
        new Set(entries.map(({ artworkSha256 }) => artworkSha256)).size,
      );
    }
  });

  it('preserves the recorded SVG bytes, dimensions, and paint contract', () => {
    expect(inventory.sources.map(({ name }) => name).sort()).toEqual([
      'aiTree',
      'classification',
      'linkAudit',
      'mainAudit',
      'pluginLog',
    ]);
    expect(inventory.sources.every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256))).toBe(true);
    const repairedEntries = inventory.entries.filter(({ repairs }) => repairs.length > 0);
    expect(inventory.totals.repairedSourcePaths).toBe(12);
    expect(repairedEntries).toHaveLength(12);
    expect(
      repairedEntries
        .flatMap(({ repairs }) => repairs)
        .every(({ kind }) =>
          ['orphan-reference-removed', 'unreferenced-presentation-id-removed'].includes(kind),
        ),
    ).toBe(true);
    expect(
      repairedEntries.filter(({ repairs }) =>
        repairs.some(({ kind }) => kind === 'orphan-reference-removed'),
      ),
    ).toHaveLength(3);
    for (const exported of inventory.exports) {
      const source = assetSource(exported.assetFile);
      expect(exported.assetFile).toBe(`assets/${exported.artworkSha256}.svg`);
      expect(sha256(source), exported.assetFile).toBe(exported.artworkSha256);
    }
    for (const entry of inventory.entries) {
      const source = assetSource(entry.assetFile);
      expect(entry.sourceSvgSha256, sourceKey(entry)).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.canonicalArtworkSha256, sourceKey(entry)).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.assetSha256, sourceKey(entry)).toBe(entry.artworkSha256);
      expect(svgAttributes(source), sourceKey(entry)).toEqual(entry.dimensions);
      expect(svgPaintValues(source), sourceKey(entry)).toEqual([...entry.paintValues].sort());
    }
  });
});

describe('oldicon package entry and server rendering', () => {
  it('publishes matching runtime, browser, and declaration entry points', () => {
    expect(packageManifest.exports['./oldicon']).toEqual({
      browser: './dist/browser/oldicon/index.js',
      import: './dist/oldicon/index.js',
      types: './dist/oldicon/index.d.ts',
    });
    expect(Object.keys(OldIcons).sort()).toEqual(
      inventory.exports.map(({ exportName }) => exportName).sort(),
    );
  });

  it('generates one public source module per oldicon export', () => {
    const iconFiles = readdirSync(resolve(oldiconRoot, 'icons')).sort();
    const exportNames = inventory.exports.map(({ exportName }) => exportName).sort();

    expect(iconFiles).toEqual(exportNames.map((exportName) => `${exportName}.tsx`));
    expect(exportNames).not.toContain('TaskWaitIcon');
    const barrel = readFileSync(resolve(oldiconRoot, 'index.tsx'), 'utf8');
    expect(barrel).not.toContain('?react');
    expect(barrel).not.toContain('createIcon(');
    for (const { assetFile, exportName } of inventory.exports) {
      expect(barrel).toContain(`export { ${exportName} } from './icons/${exportName}.js';`);
      const source = readFileSync(resolve(oldiconRoot, 'icons', `${exportName}.tsx`), 'utf8');
      expect(source).toContain(`from '../${assetFile}?react';`);
      expect(source).toContain(`export const ${exportName} = createIcon(`);
      expect(source.match(/\.svg\?react/g)).toHaveLength(1);
    }
  });

  it('SSR renders every oldicon export as an accessible icon wrapper', () => {
    for (const { exportName } of inventory.exports) {
      const Component = exportedIcon(exportName)!;
      const markup = renderToStaticMarkup(createElement(Component));
      expect(markup, exportName).toMatch(
        /^<span role="img" class="anticon yakit-icon"[^>]*><svg\b/,
      );
      expect(markup, exportName).toContain('aria-hidden="true"');
      expect(markup, exportName).toContain('focusable="false"');
    }
  });

  it('SSR renders representative themeable, colorful, large, and special-size icons', () => {
    const themeable = inventory.entries.find(({ paintValues }) =>
      paintValues.includes('currentColor'),
    );
    const colorful = inventory.entries.find(
      ({ paintValues }) =>
        new Set(paintValues.filter((paint) => paint !== 'currentColor')).size >= 2,
    );
    const large = inventory.entries.find(({ dimensions }) => {
      const values = dimensions.viewBox.split(/\s+/).map(Number);
      return values.length === 4 && Math.max(values[2], values[3]) >= 100;
    });
    const special = inventory.entries.find(({ sourceName }) => sourceName === 'PopoverArrowIcon');
    const representatives = [themeable, colorful, large, special];

    expect(representatives.every(Boolean)).toBe(true);
    for (const entry of representatives as InventoryEntry[]) {
      const Component = exportedIcon(entry.exportName)!;
      const markup = renderToStaticMarkup(createElement(Component));
      expect(markup, entry.exportName).toContain('<span');
      expect(markup, entry.exportName).toContain('<svg');
      expect(markup, entry.exportName).toContain(`viewBox="${entry.dimensions.viewBox}"`);
    }
    expect(special?.dimensions).toMatchObject({ height: '36', width: '9' });
  });
});

describe('oldicon fragment safety', () => {
  it('keeps every raw fragment owner unique, normalized, referenced, and local', () => {
    const assets = [...new Set(inventory.exports.map(({ assetFile }) => assetFile))];
    const owners = new Map<string, string>();
    let fragmentAssetCount = 0;

    for (const assetFile of assets) {
      const source = assetSource(assetFile);
      const ids = fragmentIds(source);
      const references = fragmentReferences(source);
      if (ids.length > 0) fragmentAssetCount += 1;
      expect(new Set(ids).size, assetFile).toBe(ids.length);
      expect(new Set(references), assetFile).toEqual(new Set(ids));
      for (const id of ids) {
        expect(id, `${assetFile}:${id}`).toMatch(/^icon_[0-9_]+__[A-Za-z][A-Za-z0-9_]*_\d+$/);
        expect(owners.has(id), `${assetFile}:${id}`).toBe(false);
        owners.set(id, assetFile);
      }
    }
    expect(fragmentAssetCount).toBeGreaterThan(0);
  });

  it('SSR gives repeated fragment-bearing icons unique owner-local IDs', () => {
    const fragmentExports = inventory.exports.filter(
      ({ assetFile }) => fragmentIds(assetSource(assetFile)).length > 0,
    );
    expect(fragmentExports.length).toBeGreaterThan(0);
    const markup = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        ...fragmentExports.flatMap(({ exportName }, index) => {
          const Component = exportedIcon(exportName)!;
          return [
            createElement(Component, { key: `${index}-first` }),
            createElement(Component, { key: `${index}-second` }),
          ];
        }),
      ),
    );
    const ids = fragmentIds(markup);
    const references = fragmentReferences(markup);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(references.every((reference) => ids.includes(reference))).toBe(true);
    expect(markup).not.toMatch(/id="icon_[^"]+__(?:clip|mask|gradient)_\d+"/);
  });
});
