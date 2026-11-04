import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  checkIconStrokeWidths,
  runIconStrokeCheck,
  svgFiles,
} from '../../scripts/check-icon-stroke-width.mjs';
import { readIconInputSync } from '../../scripts/icon-source-documents.mjs';
import { normalizeSvgStrokeWidth, svgStrokeWidths } from '../../scripts/icon-stroke-width.mjs';
import avatarBadgeCorrections from '../fixtures/icons/reference/avatar-badge-weight.json';
import colorfulOutlineCorrections from '../fixtures/icons/reference/colorful-outline-weight.json';
import designUpdates from '../fixtures/icons/reference/outline-design-updates-sep17.json';
import visualWeightReviews from '../fixtures/icons/reference/visual-weight-v2/reviews.json';
import before from '../fixtures/icons/stroke-width-1/before.json';

import { iconSourceFiles, privateIconSourceFiles } from './icon-inventory';

const outlineManifest = JSON.parse(
  readIconInputSync(
    new URL('../../config/icon-sources/outline.json#manifest', import.meta.url),
    'utf8',
  ),
);
const solidManifest = JSON.parse(
  readIconInputSync(
    new URL('../../config/icon-sources/solid.json#manifest', import.meta.url),
    'utf8',
  ),
);
const solidRaw = JSON.parse(
  readIconInputSync(new URL('../../config/icon-sources/solid.json#raw', import.meta.url), 'utf8'),
);

const colorfulCorrections = [...colorfulOutlineCorrections, ...avatarBadgeCorrections];

const packageRoot = process.cwd();
const historicalWidth = (source: string) =>
  source.replaceAll('stroke-width="1.5"', 'stroke-width="1"');
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

const createCheckRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'icon-stroke-check-'));
  mkdirSync(resolve(root, 'src/icons/loading'), { recursive: true });
  mkdirSync(resolve(root, 'src/icons/outline'), { recursive: true });
  mkdirSync(resolve(root, 'test/fixtures/icons/stroke-width-1'), { recursive: true });
  writeFileSync(
    resolve(root, 'src/icons/outline/example.svg'),
    '<svg><path stroke="currentColor" stroke-width="1.5"/></svg>',
  );
  writeFileSync(
    resolve(root, 'src/icons/loading/index.tsx'),
    'export const Loading = () => <path d="M0 0" strokeWidth={1.5} />;\n',
  );
  writeFileSync(
    resolve(root, 'test/fixtures/icons/stroke-width-1/before.json'),
    JSON.stringify({ assets: [], sourceInventory: ['icons/outline/example.svg'] }),
  );
  mkdirSync(resolve(root, 'config/icon-sources'), { recursive: true });
  writeFileSync(
    resolve(root, 'config/icon-sources/private.json'),
    JSON.stringify({ schemaVersion: 1, files: [] }),
  );
  for (const family of ['outline', 'solid', 'colorful', 'oldicon', 'loading']) {
    writeFileSync(
      resolve(root, `config/icon-sources/${family}.json`),
      JSON.stringify({
        schemaVersion: 1,
        family,
        records: family === 'outline' ? [{ file: 'example.svg' }] : [],
      }),
    );
  }
  return root;
};

describe('source stroke-width policy', () => {
  it('sets positive literal attribute and inline style widths to 1.5 without changing artwork', () => {
    const source =
      '<svg viewBox="0 0 24 24"><g stroke="red" stroke-width="2"><path d="M1.5 2h3" style="stroke-width: 0.5;fill:none"/><defs><mask id="erase"><path stroke="black" stroke-width="4"/></mask></defs></g></svg>';
    const expected =
      '<svg viewBox="0 0 24 24"><g stroke="red" stroke-width="1.5"><path d="M1.5 2h3" style="stroke-width: 1.5;fill:none"/><defs><mask id="erase"><path stroke="black" stroke-width="1.5"/></mask></defs></g></svg>';
    expect(normalizeSvgStrokeWidth(source)).toBe(expected);
    expect(normalizeSvgStrokeWidth(expected)).toBe(expected);
    expect(svgStrokeWidths(expected).map(({ value }) => value)).toEqual(['1.5', '1.5', '1.5']);
  });

  it('keeps fill-only artwork, default widths, IDs and literal text intact', () => {
    const source =
      '<svg><!-- stroke-width="2" --><path d="M1.5 2h3" fill="red"/><path stroke="currentColor"/><text>stroke-width="2"</text></svg>';
    expect(normalizeSvgStrokeWidth(source)).toBe(source);
  });

  it('preserves quoting and supports quoted greater-than attributes', () => {
    expect(
      normalizeSvgStrokeWidth('<svg data-label="a > b"><path stroke-width=\'2\'/></svg>'),
    ).toBe('<svg data-label="a > b"><path stroke-width=\'1.5\'/></svg>');
  });

  it.each(['0', '-1', '1px', '20%', 'inherit', 'var(--width)', 'calc(1 + 1)', 'NaN'])(
    'rejects unsupported width %s with a diagnostic',
    (value) => {
      expect(() => normalizeSvgStrokeWidth(`<svg><path stroke-width="${value}"/></svg>`)).toThrow(
        'STROKE_WIDTH_UNSUPPORTED',
      );
    },
  );

  it('rejects embedded stylesheets rather than silently missing their stroke declarations', () => {
    expect(() =>
      normalizeSvgStrokeWidth('<svg><style>path { stroke-width: 2 }</style></svg>'),
    ).toThrow('STROKE_WIDTH_STYLESHEET_UNSUPPORTED');
  });
});

describe('current icon compatibility and historical evidence', () => {
  it('preserves all non-width bytes against independent frozen inputs', () => {
    expect(before.assets).toHaveLength(543);
    for (const record of before.assets) {
      expect(digest(record.beforeSvg), record.sourcePath).toBe(record.beforeSha256);
      // Independent oracle: this is intentionally not the production transformer.
      const expected = record.beforeSvg.replace(/stroke-width=(['"])[^'"]+\1/g, 'stroke-width="1"');
      const legacy = record.afterPath.startsWith('icons/oldicon/');
      const assetHash = digest(
        record.beforeSvg.replace(/stroke-width=(['"])[^'"]+\1/g, 'stroke-width="1.5"'),
      );
      const currentPath = legacy ? `icons/oldicon/assets/${assetHash}.svg` : record.afterPath;
      const actual = historicalWidth(
        readIconInputSync(resolve(packageRoot, 'src', currentPath), 'utf8'),
      );
      const review = visualWeightReviews.reviews.find(
        (item) => record.afterPath === `icons/outline/${item.file}`,
      );
      const colorfulCorrection = colorfulCorrections.find((item) => item.file === record.afterPath);
      const layoutUpdate = solidRaw.supplementalComponents.find(
        (item) =>
          ['4936:115787', '4936:115788', '4936:115789', '4936:115790'].includes(item.nodeId) &&
          record.afterPath === `icons/solid/${item.nodeId.replace(':', '-')}.svg`,
      );
      const designUpdate = designUpdates.updates.find(
        (item) => record.afterPath === `icons/outline/${item.file}`,
      );
      if (layoutUpdate) {
        expect(actual).toBe(layoutUpdate.svg.replaceAll('#353639', 'currentColor'));
      } else if (designUpdate) {
        expect(designUpdate.previousLocalSvg).toBe(expected);
        expect(actual).toBe(
          designUpdate.componentSvg
            .replaceAll('#353639', 'currentColor')
            .replaceAll('stroke-width="2"', 'stroke-width="1"'),
        );
      } else if (colorfulCorrection) {
        expect(colorfulCorrection.originalSha256).toBe(record.afterSha256);
        expect(colorfulCorrection.originalSvg).toBe(expected);
        expect(actual).toBe(colorfulCorrection.svg);
        expect(digest(actual)).toBe(colorfulCorrection.sha256);
      } else if (review) {
        expect(review.status).toBe('promoted');
        expect(review.reviewVerdict).toBe('pass');
        expect(review.oldSourceSha256).toBe(record.afterSha256);
        expect(
          readIconInputSync(
            resolve(
              packageRoot,
              'test/fixtures/icons/reference/visual-weight-v2',
              review.oldEvidence.path,
            ),
            'utf8',
          ),
        ).toBe(expected);
        expect(digest(actual), record.afterPath).toBe(review.candidateSourceSha256);
      } else {
        expect(actual, record.sourcePath).toBe(expected);
        expect(digest(actual), record.afterPath).toBe(record.afterSha256);
      }
    }
  });

  it('covers component-local SVGs as well as every public family and Loading', async () => {
    const expected = [...privateIconSourceFiles, ...iconSourceFiles].sort();
    expect(privateIconSourceFiles).toEqual(
      expect.arrayContaining(
        before.sourceInventory.filter((file) => file.startsWith('components/')),
      ),
    );
    expect(await svgFiles(resolve(packageRoot, 'src'))).toEqual(expected);
    expect(await checkIconStrokeWidths(packageRoot)).toEqual({
      svgFiles: expected.length,
      loading: 1,
      violations: 0,
    });
  });

  it('checks current source consistency separately from retained historical file hashes', () => {
    const updatedProvenance: Record<string, { input: string; hash: string }> = {
      'test/fixtures/icons/reference/figma-outline-raw-provenance-v1.json': {
        input: 'config/icon-sources/outline.json#raw',
        hash: outlineManifest.sourceEvidence.figmaRawProvenanceSha256,
      },
      'test/fixtures/icons/reference/figma-outline-placement-provenance-v1.json': {
        input: 'config/icon-sources/outline.json#placement',
        hash: outlineManifest.sourceEvidence.placementProvenanceSha256,
      },
      'test/fixtures/icons/reference/figma-solid-raw-provenance-v1.json': {
        input: 'config/icon-sources/solid.json#raw',
        hash: solidManifest.sourceEvidence.figmaRawProvenanceSha256,
      },
      'test/fixtures/icons/reference/figma-solid-placement-provenance-v1.json': {
        input: 'config/icon-sources/solid.json#placement',
        hash: solidManifest.sourceEvidence.placementProvenanceSha256,
      },
    };
    // These projections are current data, not byte-for-byte historical snapshots.
    // Historical retrieval by baselineCommit is documented in docs/icon-history/README.md.
    for (const [file, current] of Object.entries(updatedProvenance)) {
      expect(Object.keys(before.provenanceHashes)).toContain(file);
      expect(digest(readIconInputSync(resolve(packageRoot, current.input))), file).toBe(
        current.hash,
      );
    }
    // Only retained historical files are compared with the frozen hashes here.
    for (const [file, hash] of Object.entries(before.provenanceHashes)) {
      if (updatedProvenance[file]) continue;
      expect(digest(readIconInputSync(resolve(packageRoot, file))), file).toBe(hash);
    }
  });

  it('keeps every Oldicon public name and source identity', () => {
    expect(before.baselineCommit).toMatch(/^[a-f0-9]{40}$/);
    expect(before.baselineCommit).toBe('2ae1c3c9a41746ec57b820d226a7f91153d90a9d');
    const inventory = JSON.parse(
      readIconInputSync(resolve(packageRoot, 'config/icon-sources/oldicon.json#manifest'), 'utf8'),
    );
    expect(
      inventory.exports
        .filter(({ exportName }: { exportName: string }) =>
          before.oldiconExports.some((entry) => entry.exportName === exportName),
        )
        .map(({ exportName, sourceKeys }: { exportName: string; sourceKeys: string[] }) => ({
          exportName,
          sourceKeys,
        })),
    ).toEqual(before.oldiconExports);
    expect(
      inventory.entries
        .filter(({ sourceFile, sourceName }: Record<string, string>) =>
          before.oldiconSourceIdentity.some(
            (entry) => entry.sourceFile === sourceFile && entry.sourceName === sourceName,
          ),
        )
        .map(
          ({
            sourceFile,
            sourceName,
            exportName,
            canonicalArtworkSha256,
            sourceSvgSha256,
          }: Record<string, string>) => ({
            sourceFile,
            sourceName,
            exportName,
            canonicalArtworkSha256,
            sourceSvgSha256,
          }),
        ),
    ).toEqual(before.oldiconSourceIdentity);
  });
});

describe('read-only stroke-width check CLI', () => {
  it('keeps --check read-only, including source and inventory mtimes', async () => {
    const root = createCheckRoot();
    const paths = [
      'src/icons/outline/example.svg',
      'src/icons/loading/index.tsx',
      'test/fixtures/icons/stroke-width-1/before.json',
    ];
    try {
      const beforeState = paths.map((file) => ({
        contents: readIconInputSync(resolve(root, file), 'utf8'),
        mtimeNs: statSync(resolve(root, file), { bigint: true }).mtimeNs,
      }));
      await expect(runIconStrokeCheck(['--write'], root)).rejects.toThrow(/never writes files/);
      await expect(runIconStrokeCheck(['--capture'], root)).rejects.toThrow(/never writes files/);
      await expect(runIconStrokeCheck(['--check'], root)).resolves.toEqual({
        svgFiles: 1,
        loading: 1,
        violations: 0,
      });
      expect(
        paths.map((file) => ({
          contents: readIconInputSync(resolve(root, file), 'utf8'),
          mtimeNs: statSync(resolve(root, file), { bigint: true }).mtimeNs,
        })),
      ).toEqual(beforeState);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it.each([
    ['attribute', '<svg><path stroke-width="2"/></svg>', /stroke-width=2/],
    ['inline style', '<svg><path style="stroke-width: 2.5"/></svg>', /stroke-width=2\.5/],
  ])('locates an invalid %s declaration', async (_label, source, diagnostic) => {
    const root = createCheckRoot();
    try {
      writeFileSync(resolve(root, 'src/icons/outline/example.svg'), source);
      await expect(checkIconStrokeWidths(root)).rejects.toThrow(diagnostic);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it('rejects Loading drift and a newly added unregistered SVG', async () => {
    const root = createCheckRoot();
    try {
      writeFileSync(
        resolve(root, 'src/icons/loading/index.tsx'),
        'export const Loading = () => <path d="M0 0" strokeWidth={2} />;\n',
      );
      writeFileSync(
        resolve(root, 'src/icons/unregistered.svg'),
        '<svg><path stroke-width="1"/></svg>',
      );
      await expect(checkIconStrokeWidths(root)).rejects.toThrow(
        /unregistered\.svg: source is not registered[\s\S]*expected strokeWidth=\{1\.5\}/,
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
