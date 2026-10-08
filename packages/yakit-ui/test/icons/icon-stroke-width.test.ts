import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import outlineManifest from '../../scripts/figma-outline-icons-inventory.json';
import solidManifest from '../../scripts/figma-solid-icons-inventory.json';
import { normalizeSvgStrokeWidth, svgStrokeWidths } from '../../scripts/icon-stroke-width.mjs';
import {
  applyStrokeWidthMigrationPlan,
  captureStrokeWidthInputs,
  checkIconStrokeWidths,
  planStrokeWidthMigration,
  runStrokeWidthMigration,
  svgFiles,
  validateFrozenMigrationInputs,
} from '../../scripts/normalize-icon-stroke-width.mjs';
import avatarBadgeCorrections from '../fixtures/icons/reference/avatar-badge-weight.json';
import colorfulOutlineCorrections from '../fixtures/icons/reference/colorful-outline-weight.json';
import solidRaw from '../fixtures/icons/reference/figma-solid-raw-provenance-v1.json';
import additions from '../fixtures/icons/reference/outline-additions-sep22.json';
import additionsSep30 from '../fixtures/icons/reference/outline-additions-sep30.json';
import designUpdates from '../fixtures/icons/reference/outline-design-updates-sep17.json';
import visualWeightReviews from '../fixtures/icons/reference/visual-weight-v2/reviews.json';
import before from '../fixtures/icons/stroke-width-1/before.json';

const colorfulCorrections = [...colorfulOutlineCorrections, ...avatarBadgeCorrections];

const packageRoot = process.cwd();
const oldInventory = JSON.parse(
  readFileSync(resolve(packageRoot, 'src/icons/oldicon/inventory.json'), 'utf8'),
);
const historicalWidth = (source: string) =>
  source.replaceAll('stroke-width="1.5"', 'stroke-width="1"');
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

const createCheckRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'icon-stroke-check-'));
  mkdirSync(resolve(root, 'src/icons/loading'), { recursive: true });
  mkdirSync(resolve(root, 'test/fixtures/icons/stroke-width-1'), { recursive: true });
  writeFileSync(
    resolve(root, 'src/icons/example.svg'),
    '<svg><path stroke="currentColor" stroke-width="1.5"/></svg>',
  );
  writeFileSync(
    resolve(root, 'src/icons/loading/index.tsx'),
    'export const Loading = () => <path d="M0 0" strokeWidth={1.5} />;\n',
  );
  writeFileSync(
    resolve(root, 'test/fixtures/icons/stroke-width-1/before.json'),
    JSON.stringify({ assets: [], sourceInventory: ['icons/example.svg'] }),
  );
  return root;
};

describe('source stroke-width policy', () => {
  it('sets positive literal attribute and inline style widths to one without changing artwork', () => {
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

describe('all production icon migration contracts', () => {
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
        readFileSync(resolve(packageRoot, 'src', currentPath), 'utf8'),
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
          readFileSync(
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
    const migrated = new Map(
      before.assets.map(({ sourcePath, afterPath }) => [sourcePath, afterPath]),
    );
    const expected = [
      ...before.sourceInventory
        .map((file) => migrated.get(file) ?? file)
        .filter((file) => !file.startsWith('icons/oldicon/assets/')),
      ...new Set<string>(
        oldInventory.exports.map(
          (entry: { assetFile: string }) => `icons/oldicon/${entry.assetFile}`,
        ),
      ),
      ...[...designUpdates.updates, ...additions.updates, ...additionsSep30.updates]
        .filter(({ added }) => added)
        .map(({ file }) => `icons/outline/${file}`),
      'icons/solid/46709-8109.svg',
    ].sort();
    expect(expected).toHaveLength(1313);
    expect(expected.filter((file) => file.startsWith('components/'))).toHaveLength(24);
    expect(await svgFiles(resolve(packageRoot, 'src'))).toEqual(expected);
    expect(await checkIconStrokeWidths(packageRoot)).toEqual({
      svgFiles: 1313,
      loading: 1,
      violations: 0,
    });
  });

  it('binds updated Figma provenance to the current manifest and preserves historical evidence', () => {
    const updatedProvenance: Record<string, string> = {
      'test/fixtures/icons/reference/figma-outline-raw-provenance-v1.json':
        outlineManifest.sourceEvidence.figmaRawProvenanceSha256,
      'test/fixtures/icons/reference/figma-outline-placement-provenance-v1.json':
        outlineManifest.sourceEvidence.placementProvenanceSha256,
      'test/fixtures/icons/reference/figma-solid-raw-provenance-v1.json':
        solidManifest.sourceEvidence.figmaRawProvenanceSha256,
      'test/fixtures/icons/reference/figma-solid-placement-provenance-v1.json':
        solidManifest.sourceEvidence.placementProvenanceSha256,
    };
    for (const [file, hash] of Object.entries(before.provenanceHashes))
      expect(digest(readFileSync(resolve(packageRoot, file))), file).toBe(
        updatedProvenance[file] ?? hash,
      );
  });

  it('keeps every Oldicon public name and source identity', () => {
    expect(before.baselineCommit).toMatch(/^[a-f0-9]{40}$/);
    expect(before.baselineCommit).toBe('2ae1c3c9a41746ec57b820d226a7f91153d90a9d');
    const inventory = JSON.parse(
      readFileSync(resolve(packageRoot, 'src/icons/oldicon/inventory.json'), 'utf8'),
    );
    expect(
      inventory.exports.map(
        ({ exportName, sourceKeys }: { exportName: string; sourceKeys: string[] }) => ({
          exportName,
          sourceKeys,
        }),
      ),
    ).toEqual(before.oldiconExports);
    expect(
      inventory.entries.map(
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

  it('plans no additional writes or removals on a migrated checkout', async () => {
    const result = await planStrokeWidthMigration(packageRoot);
    expect([...result.changes.keys()]).toEqual([]);
    expect(result.removed).toEqual([]);
  });
});

describe('stroke-width migration CLI safety', () => {
  it('keeps --check read-only, including source and inventory mtimes', async () => {
    const root = createCheckRoot();
    const paths = [
      'src/icons/example.svg',
      'src/icons/loading/index.tsx',
      'test/fixtures/icons/stroke-width-1/before.json',
    ];
    try {
      const beforeState = paths.map((file) => ({
        contents: readFileSync(resolve(root, file), 'utf8'),
        mtimeNs: statSync(resolve(root, file), { bigint: true }).mtimeNs,
      }));
      await expect(runStrokeWidthMigration(['--check'], root)).resolves.toEqual({
        svgFiles: 1,
        loading: 1,
        violations: 0,
      });
      expect(
        paths.map((file) => ({
          contents: readFileSync(resolve(root, file), 'utf8'),
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
      writeFileSync(resolve(root, 'src/icons/example.svg'), source);
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

  it.each([
    'icons/outline/14203-193724.svg',
    'icons/outline/1-2359.svg',
    'icons/outline/1-2375.svg',
    'icons/colorful/DataComparisonOutlineColorful.svg',
    'icons/colorful/LuaAvatarColorful.svg',
    'icons/solid/4936-115787.svg',
    'icons/solid/4936-115788.svg',
    'icons/solid/4936-115789.svg',
    'icons/solid/4936-115790.svg',
  ])(
    'accepts only the exact later-reviewed geometry pair and rejects subsequent drift: %s',
    async (sourcePath) => {
      const root = mkdtempSync(join(tmpdir(), 'icon-stroke-reviewed-'));
      const record = before.assets.find((item) => item.sourcePath === sourcePath)!;
      const current = historicalWidth(
        readFileSync(resolve(packageRoot, 'src', sourcePath), 'utf8'),
      );
      try {
        mkdirSync(dirname(resolve(root, 'src', sourcePath)), { recursive: true });
        writeFileSync(resolve(root, 'src', sourcePath), current);
        await expect(
          validateFrozenMigrationInputs(root, { assets: [record] }, [sourcePath]),
        ).resolves.toBeUndefined();
        await expect(
          validateFrozenMigrationInputs(
            root,
            { assets: [{ ...record, afterSha256: '0'.repeat(64) }] },
            [sourcePath],
          ),
        ).rejects.toThrow('MIGRATION_INPUT_DRIFT');
        writeFileSync(
          resolve(root, 'src', sourcePath),
          sourcePath.startsWith('icons/solid/')
            ? current.replace('opacity="0.6"', 'opacity="0.7"')
            : current.replace('stroke-width="1"', 'stroke-width="2"'),
        );
        await expect(
          validateFrozenMigrationInputs(root, { assets: [record] }, [sourcePath]),
        ).rejects.toThrow('MIGRATION_INPUT_DRIFT');
      } finally {
        rmSync(root, { force: true, recursive: true });
      }
    },
  );

  it('fails before planning when a frozen migration input hash drifts', async () => {
    const root = mkdtempSync(join(tmpdir(), 'icon-stroke-input-'));
    const source = '<svg><path stroke-width="2"/></svg>';
    try {
      mkdirSync(resolve(root, 'src/icons'), { recursive: true });
      writeFileSync(resolve(root, 'src/icons/example.svg'), source);
      const frozen = {
        assets: [
          {
            sourcePath: 'icons/example.svg',
            afterPath: 'icons/example.svg',
            beforeSha256: digest(source),
            afterSha256: digest('<svg><path stroke-width="1"/></svg>'),
          },
        ],
      };
      await expect(
        validateFrozenMigrationInputs(root, frozen, ['icons/example.svg']),
      ).resolves.toBeUndefined();
      writeFileSync(resolve(root, 'src/icons/example.svg'), '<svg><path stroke-width="3"/></svg>');
      await expect(
        validateFrozenMigrationInputs(root, frozen, ['icons/example.svg']),
      ).rejects.toThrow(/MIGRATION_INPUT_DRIFT: icons\/example\.svg/);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it('captures an explicit truthful commit once and never overwrites the oracle', async () => {
    const root = mkdtempSync(join(tmpdir(), 'icon-stroke-capture-'));
    const baselineCommit = 'a'.repeat(40);
    try {
      mkdirSync(resolve(root, 'src/icons/oldicon'), { recursive: true });
      mkdirSync(resolve(root, 'src/icons/loading'), { recursive: true });
      mkdirSync(resolve(root, 'test/fixtures/icons/reference'), { recursive: true });
      writeFileSync(resolve(root, 'src/icons/example.svg'), '<svg><path stroke-width="2"/></svg>');
      writeFileSync(
        resolve(root, 'src/icons/oldicon/inventory.json'),
        JSON.stringify({ entries: [], exports: [] }),
      );
      writeFileSync(
        resolve(root, 'src/icons/loading/index.tsx'),
        'export const Loading = () => <path d="M0 0" strokeWidth={2} />;\n',
      );

      await expect(captureStrokeWidthInputs(root, { baselineCommit })).resolves.toMatchObject({
        captured: 1,
        scanned: 1,
      });
      const captured = JSON.parse(
        readFileSync(resolve(root, 'test/fixtures/icons/stroke-width-1/before.json'), 'utf8'),
      );
      expect(captured.baselineCommit).toBe(baselineCommit);
      await expect(captureStrokeWidthInputs(root, { baselineCommit })).rejects.toMatchObject({
        code: 'EEXIST',
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it('stages bounded writes, removes only obsolete Oldicon assets, and cleans staging', async () => {
    const root = mkdtempSync(join(tmpdir(), 'icon-stroke-apply-'));
    const stagingParent = mkdtempSync(join(tmpdir(), 'icon-stroke-staging-parent-'));
    const obsoleteAsset = `src/icons/oldicon/assets/${'a'.repeat(64)}.svg`;
    try {
      mkdirSync(resolve(root, 'src/icons/oldicon/assets'), { recursive: true });
      writeFileSync(resolve(root, 'src/icons/example.svg'), 'before');
      writeFileSync(resolve(root, obsoleteAsset), 'obsolete');
      await applyStrokeWidthMigrationPlan(
        root,
        {
          changes: new Map([['src/icons/example.svg', 'after']]),
          removed: [obsoleteAsset],
        },
        { stagingParent },
      );
      expect(readFileSync(resolve(root, 'src/icons/example.svg'), 'utf8')).toBe('after');
      await expect(
        applyStrokeWidthMigrationPlan(root, {
          changes: new Map([['src/icons/example.svg', 'must-not-apply']]),
          removed: ['src/icons/oldicon/assets/obsolete.svg'],
        }),
      ).rejects.toThrow(/MIGRATION_PATH_OUT_OF_SCOPE/);
      expect(readFileSync(resolve(root, 'src/icons/example.svg'), 'utf8')).toBe('after');
      expect(readdirSync(resolve(root, 'src/icons/oldicon/assets'))).toEqual([]);
      expect(readdirSync(stagingParent)).toEqual([]);
      await applyStrokeWidthMigrationPlan(
        root,
        { changes: new Map(), removed: [] },
        { stagingParent },
      );
      expect(readdirSync(stagingParent)).toEqual([]);
      await expect(
        applyStrokeWidthMigrationPlan(
          root,
          { changes: new Map([['../escape.svg', 'unsafe']]), removed: [] },
          { stagingParent },
        ),
      ).rejects.toThrow(/MIGRATION_PATH_OUT_OF_SCOPE/);
      expect(readdirSync(stagingParent)).toEqual([]);
      await expect(
        applyStrokeWidthMigrationPlan(
          root,
          {
            changes: new Map([['src/icons/example.svg', 'must-not-apply']]),
            removed: ['src/icons/example.svg'],
          },
          { stagingParent },
        ),
      ).rejects.toThrow(/MIGRATION_PATH_OUT_OF_SCOPE/);
      expect(readFileSync(resolve(root, 'src/icons/example.svg'), 'utf8')).toBe('after');
    } finally {
      rmSync(root, { force: true, recursive: true });
      rmSync(stagingParent, { force: true, recursive: true });
    }
  });

  it('keeps dry-run output informative without applying its planned writes', async () => {
    const root = mkdtempSync(join(tmpdir(), 'icon-stroke-dry-run-'));
    try {
      mkdirSync(resolve(root, 'src/icons'), { recursive: true });
      writeFileSync(resolve(root, 'src/icons/example.svg'), 'before');
      const planMigration = async () => ({
        changes: new Map([['src/icons/example.svg', 'after']]),
        removed: [],
      });
      await expect(runStrokeWidthMigration([], root, { planMigration })).resolves.toEqual({
        mode: 'dry-run',
        changedFiles: 1,
        removedFiles: 0,
        paths: ['src/icons/example.svg'],
        removed: [],
      });
      expect(readFileSync(resolve(root, 'src/icons/example.svg'), 'utf8')).toBe('before');
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
