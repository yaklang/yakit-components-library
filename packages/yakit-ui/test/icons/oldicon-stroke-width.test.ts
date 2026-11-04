import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readIconInputSync } from '../../scripts/icon-source-documents.mjs';
import { planOldiconStrokeWidth } from '../../scripts/oldicon-stroke-width.mjs';

import { iconCounts } from './icon-inventory';
import { oldiconSourceCounts } from './icon-inventory';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const assetFile = (source: string) => `assets/${sha256(source)}.svg`;

const fixtureInventory = (leftSource: string, rightSource: string) => {
  const leftAsset = assetFile(leftSource);
  const rightAsset = assetFile(rightSource);
  return {
    schemaVersion: 1,
    generationPolicy: {
      deduplicationKey: 'canonicalArtworkSha256',
      fragmentIds: 'stable-content-qualified',
    },
    hashSemantics: {
      artworkSha256: 'alias of assetSha256',
      assetSha256: 'SHA-256 of exact emitted SVG file bytes',
      canonicalArtworkSha256: 'source identity',
      sourceSvgSha256: 'source evidence',
    },
    sources: [{ name: 'fixture', path: 'fixture.tsx', sha256: 'source-sha' }],
    totals: { artworks: 2, exports: 2, repairedSourcePaths: 1, sourceNames: 2, sourcePaths: 2 },
    entries: [
      {
        assetFile: leftAsset,
        artworkSha256: sha256(leftSource),
        assetSha256: sha256(leftSource),
        canonicalArtworkSha256: 'canonical-left',
        exportName: 'LeftIcon',
        repairs: [{ kind: 'orphan-reference-removed' }],
        sourceFile: 'left.tsx',
        sourceName: 'LeftIcon',
        sourceSvgSha256: 'source-left',
      },
      {
        assetFile: rightAsset,
        artworkSha256: sha256(rightSource),
        assetSha256: sha256(rightSource),
        canonicalArtworkSha256: 'canonical-right',
        exportName: 'RightIcon',
        repairs: [],
        sourceFile: 'right.tsx',
        sourceName: 'RightIcon',
        sourceSvgSha256: 'source-right',
      },
    ],
    exports: [
      {
        assetFile: leftAsset,
        artworkSha256: sha256(leftSource),
        exportName: 'LeftIcon',
        sourceKeys: ['left.tsx::LeftIcon'],
      },
      {
        assetFile: rightAsset,
        artworkSha256: sha256(rightSource),
        exportName: 'RightIcon',
        sourceKeys: ['right.tsx::RightIcon'],
      },
    ],
  };
};

describe('Oldicon stroke-width migration plan', () => {
  it('allows normalized asset sharing without changing source or export identity', () => {
    const leftSource = '<svg><path stroke="currentColor" stroke-width="1.5" d="M0 0h1"/></svg>\n';
    const rightSource = '<svg><path stroke="currentColor" stroke-width="2" d="M0 0h1"/></svg>\n';
    const inventory = fixtureInventory(leftSource, rightSource);
    const original = JSON.parse(JSON.stringify(inventory));
    const result = planOldiconStrokeWidth(
      inventory,
      new Map([
        [assetFile(leftSource), leftSource],
        [assetFile(rightSource), rightSource],
      ]),
    );

    expect(inventory).toEqual(original);
    expect(result.assets.size).toBe(1);
    expect(new Set(result.replacements.values()).size).toBe(1);
    expect(result.inventory.entries.map(({ exportName }) => exportName)).toEqual([
      'LeftIcon',
      'RightIcon',
    ]);
    expect(result.inventory.exports.map(({ sourceKeys }) => sourceKeys)).toEqual([
      ['left.tsx::LeftIcon'],
      ['right.tsx::RightIcon'],
    ]);
    expect(
      result.inventory.entries.map(({ canonicalArtworkSha256, sourceSvgSha256 }) => ({
        canonicalArtworkSha256,
        sourceSvgSha256,
      })),
    ).toEqual([
      { canonicalArtworkSha256: 'canonical-left', sourceSvgSha256: 'source-left' },
      { canonicalArtworkSha256: 'canonical-right', sourceSvgSha256: 'source-right' },
    ]);
    expect(result.inventory.sources).toEqual(original.sources);
    expect(result.inventory.totals).toMatchObject({
      artworks: 1,
      exports: 2,
      repairedSourcePaths: 1,
    });
    expect(result.inventory.generationPolicy.strokeWidth).toEqual({
      strategy: 'local-uniform-stroke-v1',
      value: '1.5',
    });
    for (const [newAssetFile, source] of result.assets) {
      expect(newAssetFile).toBe(assetFile(source));
      expect(source).toContain('stroke-width="1.5"');
    }
  });

  it('is idempotent and rejects stale content-addressed input', () => {
    const source = '<svg stroke="currentColor" stroke-width="1.5"><path d="M0 0h1"/></svg>\n';
    const inventory = fixtureInventory(source, source);
    inventory.entries[1].assetFile = inventory.entries[0].assetFile;
    inventory.entries[1].artworkSha256 = inventory.entries[0].artworkSha256;
    inventory.entries[1].assetSha256 = inventory.entries[0].assetSha256;
    inventory.exports[1].assetFile = inventory.exports[0].assetFile;
    inventory.exports[1].artworkSha256 = inventory.exports[0].artworkSha256;
    const first = planOldiconStrokeWidth(inventory, new Map([[assetFile(source), source]]));
    const second = planOldiconStrokeWidth(first.inventory, first.assets);

    expect(second.inventory).toEqual(first.inventory);
    expect(second.assets).toEqual(first.assets);
    expect(() =>
      planOldiconStrokeWidth(inventory, new Map([[`assets/${'0'.repeat(64)}.svg`, source]])),
    ).toThrow(/OLDICON_ASSET_HASH_MISMATCH/);
  });

  it('plans the committed inventory offline while preserving all public mappings', () => {
    const packageRoot = resolve(import.meta.dirname, '../..');
    const oldiconRoot = resolve(packageRoot, 'src/icons/oldicon');
    const inventory = JSON.parse(
      readIconInputSync(resolve(packageRoot, 'config/icon-sources/oldicon.json#manifest'), 'utf8'),
    );
    const assets = new Map<string, string>();
    for (const { assetFile: path } of inventory.exports) {
      if (!assets.has(path)) assets.set(path, readFileSync(resolve(oldiconRoot, path), 'utf8'));
    }
    const beforeMapping = inventory.entries.map(
      ({ exportName, sourceFile, sourceName }: Record<string, string>) =>
        `${sourceFile}::${sourceName}=>${exportName}`,
    );
    const beforeSources = JSON.parse(JSON.stringify(inventory.sources));
    const beforeCanonical = inventory.entries.map(
      ({ canonicalArtworkSha256 }: Record<string, string>) => canonicalArtworkSha256,
    );
    const beforeRepairs = inventory.entries.map(({ repairs }: { repairs: unknown[] }) =>
      JSON.parse(JSON.stringify(repairs)),
    );
    const result = planOldiconStrokeWidth(inventory, assets);

    expect(result.inventory.entries).toHaveLength(oldiconSourceCounts.entries);
    expect(result.inventory.exports).toHaveLength(iconCounts.oldicon);
    expect(
      result.inventory.entries.map(
        ({ exportName, sourceFile, sourceName }: Record<string, string>) =>
          `${sourceFile}::${sourceName}=>${exportName}`,
      ),
    ).toEqual(beforeMapping);
    expect(result.inventory.sources).toEqual(beforeSources);
    expect(
      result.inventory.entries.map(
        ({ canonicalArtworkSha256 }: Record<string, string>) => canonicalArtworkSha256,
      ),
    ).toEqual(beforeCanonical);
    expect(result.inventory.entries.map(({ repairs }: { repairs: unknown[] }) => repairs)).toEqual(
      beforeRepairs,
    );
    expect(result.inventory.totals.repairedSourcePaths).toBe(oldiconSourceCounts.repaired);
  });
});
