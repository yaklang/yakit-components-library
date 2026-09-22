import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { auditIcons, canonicalizeSvg } from '../../scripts/audit-icons.mjs';
import { ICON_STROKE_WIDTH_POLICY } from '../../scripts/icon-audit-contracts.mjs';
import { reviewedOutlineGeometry } from '../../scripts/outline-geometry-overrides.mjs';
import { planIconStrokeManifests } from '../../scripts/update-icon-stroke-manifests.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const auditScript = resolve(packageRoot, 'scripts/audit-icons.mjs');
const updaterScript = resolve(packageRoot, 'scripts/update-outline-icon-baseline.mjs');
const manifest = resolve(packageRoot, 'scripts/figma-outline-icons-inventory.json');
const placementProvenance = resolve(
  packageRoot,
  'test/fixtures/icons/reference/figma-outline-placement-provenance-v1.json',
);
const rawProvenance = resolve(
  packageRoot,
  'test/fixtures/icons/reference/figma-outline-raw-provenance-v1.json',
);
const prechangeBaseline = resolve(
  packageRoot,
  'test/fixtures/icons/reference/outline-prechange-baseline-v1.json',
);
const networkGuard = resolve(packageRoot, 'test/icons/helpers/deny-network.cjs');
const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const validOutline =
  '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M1 1h2" stroke="currentColor"/></svg>';
const dataCompareFormula = 'rgb(from currentColor calc(r + 139) calc(g + 144) calc(b + 152))';

const completeManifest = (source = validOutline) => {
  const normalizedAstSha256 = sha256(
    canonicalizeSvg(source, {
      normalizeForegroundPaint: true,
      normalizeSemanticErase: true,
      normalizeStrokeWidth: true,
    }),
  );
  const geometrySha256 = sha256(
    canonicalizeSvg(source, {
      geometryOnly: true,
      normalizeSemanticErase: true,
      normalizeStrokeWidth: true,
    }),
  );
  const symbol = (index: number) => ({
    exportedSourceNodeId: `${index + 1}:1`,
    exportName: `Example${index}Outlined`,
    figmaGeometrySha256: geometrySha256,
    figmaNormalizedAstSha256: normalizedAstSha256,
    figmaRawSvgSha256: sha256(source),
    file: 'example.svg',
    geometrySha256,
    localGeometrySha256: geometrySha256,
    localNormalizedAstSha256: normalizedAstSha256,
    localRawSvgSha256: sha256(source),
    normalizedAstSha256,
  });
  const placements = Array.from({ length: 362 }, (_, index) => {
    const instance = index >= 359;
    const exportedSourceNodeId = `${(index % 359) + 1}:1`;
    return {
      exportedSourceNodeId,
      mainComponentId: exportedSourceNodeId,
      mainComponentIdStatus: instance ? 'resolved' : 'self_symbol',
      nodeType: instance ? 'instance' : 'component',
      overrideHash: sha256(`override-${index}`),
      overrideHashStatus: 'captured',
      placementNodeId: `placement:${index}`,
    };
  });
  return {
    complete: true,
    expectedCounts: { currentSymbols: 359, instances: 3, placements: 362, publicExports: 359 },
    fileKey: 'QWct5XE0Bg0bNDQ93eYgEw',
    frameNodeId: '46824:1930',
    instanceVerification: placements.slice(-3),
    legacySources: [] as Array<Record<string, string | null>>,
    placements,
    paintExceptions: [] as Array<Record<string, string>>,
    provenanceComplete: true,
    sourceEvidence: {} as Record<string, string>,
    strokeWidthPolicy: { ...ICON_STROKE_WIDTH_POLICY },
    symbols: Array.from({ length: 359 }, (_, index) => symbol(index)),
    variant: 'outline',
  };
};
type ManifestFixture = ReturnType<typeof completeManifest>;

const withFixture = async (files: Record<string, string>, run: (root: string) => Promise<void>) => {
  const root = mkdtempSync(resolve(tmpdir(), 'yakit-icon-audit-'));
  try {
    for (const [name, source] of Object.entries(files)) {
      const file = resolve(root, name);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, source);
    }
    await run(root);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
};

const snapshot = (roots: string[]) => {
  const result: Record<string, string> = {};
  const visit = (path: string) => {
    if (!statSync(path).isDirectory()) {
      result[relative(packageRoot, path)] = sha256(readFileSync(path));
      return;
    }
    for (const entry of readdirSync(path).sort()) visit(resolve(path, entry));
  };
  roots.forEach(visit);
  return result;
};

const runAudit = () => {
  const result = spawnSync(process.execPath, [auditScript, '--check', '--manifest', manifest], {
    cwd: packageRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require=${networkGuard}`.trim(),
    },
  });
  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
};

describe('Outline icon audit check mode', () => {
  let before: Record<string, string>;
  let after: Record<string, string>;
  let first: ReturnType<typeof runAudit>;
  let second: ReturnType<typeof runAudit>;

  beforeAll(() => {
    const roots = [resolve(packageRoot, 'scripts'), resolve(packageRoot, 'src/icons')];
    before = snapshot(roots);
    first = runAudit();
    second = runAudit();
    after = snapshot(roots);
  });

  it('passes without network access', () => {
    expect(first).toMatchObject({ status: 0, stderr: '' });
    expect(first.stdout).toContain('AUDIT_OK');
  });

  it('produces byte-identical output on consecutive runs', () => {
    expect(second).toEqual(first);
  });

  it('does not mutate icon or manifest inputs in check mode', () => {
    expect(after).toEqual(before);
  });

  it('does not emit a generated timestamp', () => {
    expect(`${first.stdout}\n${first.stderr}`).not.toMatch(/\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });
});

describe('Outline icon audit structural failures', () => {
  it.each([
    ['XML_INVALID', '<svg>'],
    [
      'VIEWPORT_OUTLINE_INVALID',
      '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M0 0h1" stroke="currentColor"/></svg>',
    ],
    [
      'VIEWPORT_SOLID_INVALID',
      '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h1"/></svg>',
      'solid',
    ],
    [
      'PARTIAL_EXPORT',
      '<svg width="24" height="24" viewBox="0 0 24 24" preserveAspectRatio="none"><path d="M0 0h1" stroke="currentColor"/></svg>',
    ],
    ['DRAWABLE_EMPTY', '<svg width="24" height="24" viewBox="0 0 24 24"><g/></svg>'],
    [
      'PLACEHOLDER_RECT',
      '<svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="currentColor"/></svg>',
    ],
    [
      'FOREGROUND_LITERAL',
      '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h1" stroke="#353639"/></svg>',
    ],
    [
      'STROKE_WIDTH_INVALID',
      '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h1" stroke="currentColor" stroke-width="2"/></svg>',
    ],
    [
      'FRAGMENT_BASE_INVALID',
      '<svg width="24" height="24" viewBox="0 0 24 24"><defs><clipPath id="clip0"><path d="M0 0h1"/></clipPath></defs><path clip-path="url(#clip0)" d="M0 0h1" stroke="currentColor"/></svg>',
    ],
    [
      'DEFINITION_EMPTY',
      '<svg width="24" height="24" viewBox="0 0 24 24"><defs><clipPath id="icon_1_1__clip_0"><g/></clipPath></defs><path clip-path="url(#icon_1_1__clip_0)" d="M0 0h1" stroke="currentColor"/></svg>',
    ],
  ])('reports %s', async (token, source, variant = 'outline') => {
    await withFixture({ [`${variant}/example.svg`]: source }, async (root) => {
      const result = await auditIcons({ root });
      expect(result.failures.map((failure) => failure.token)).toContain(token);
    });
  });

  it('rejects invalid semantic paint evidence and accepts exact referenced mask evidence', async () => {
    const source =
      '<svg width="24" height="24" viewBox="0 0 24 24"><path mask="url(#icon_1_1__mask_0)" d="M1 1h2" fill="currentColor"/><defs><mask id="icon_1_1__mask_0"><rect width="24" height="24" fill="white"/></mask></defs></svg>';
    await withFixture({ 'outline/example.svg': source }, async (root) => {
      const invalidPath = resolve(root, 'invalid.json');
      writeFileSync(invalidPath, JSON.stringify(completeManifest(source)));
      const invalid = await auditIcons({ manifestPath: invalidPath, root });
      expect(invalid.failures.map(({ token }) => token)).toContain('MASK_EXCEPTION_INVALID');

      const validManifest = completeManifest(source);
      validManifest.paintExceptions = [
        {
          attribute: 'fill',
          definitionId: 'icon_1_1__mask_0',
          path: 'outline/example.svg',
          reason: 'white establishes luminance mask visibility',
          value: 'white',
        },
      ];
      const validPath = resolve(root, 'valid.json');
      writeFileSync(validPath, JSON.stringify(validManifest));
      const valid = await auditIcons({ manifestPath: validPath, root });
      expect(valid.failures.map(({ token }) => token)).not.toContain('MASK_EXCEPTION_INVALID');
    });
  });

  it.each([
    ['color', '<path d="M1 1h2" stroke="currentColor" color="white"/>'],
    ['style', '<path d="M1 1h2" style="stroke:#fff"/>'],
  ])('audits literal paint in the %s surface', async (_surface, drawable) => {
    await withFixture(
      {
        'outline/example.svg': `<svg width="24" height="24" viewBox="0 0 24 24">${drawable}</svg>`,
      },
      async (root) => {
        const result = await auditIcons({ root });
        expect(result.failures.map(({ token }) => token)).toContain('FOREGROUND_LITERAL');
      },
    );
  });

  const relativeColorManifest = (file = '45035-1908.svg') => ({
    relativeCurrentColorExceptions: [
      {
        attribute: 'color',
        exportedSourceNodeId: '45035:1908',
        path: 'outline/45035-1908.svg',
        reason: 'preserves the canonical secondary role',
        strategy: 'relative-currentColor-secondary-role-v1',
        value: dataCompareFormula,
      },
    ],
    symbols: [{ exportedSourceNodeId: '45035:1908', file }],
  });

  it('allows the exact relative-currentColor formula only for the recorded DataCompare source', async () => {
    const source = `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M1 1h2" stroke="currentColor" color="${dataCompareFormula}"/></svg>`;
    await withFixture({ 'outline/45035-1908.svg': source }, async (root) => {
      const manifestPath = resolve(root, 'manifest.json');
      writeFileSync(manifestPath, JSON.stringify(relativeColorManifest()));
      const result = await auditIcons({ manifestPath, root });
      expect(result.failures.map(({ token }) => token)).not.toContain('FOREGROUND_LITERAL');
    });
  });

  it('rejects the same relative-currentColor syntax on another icon', async () => {
    const source = `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M1 1h2" stroke="currentColor" color="${dataCompareFormula}"/></svg>`;
    await withFixture({ 'outline/example.svg': source }, async (root) => {
      const manifestPath = resolve(root, 'manifest.json');
      writeFileSync(manifestPath, JSON.stringify(relativeColorManifest('example.svg')));
      const result = await auditIcons({ manifestPath, root });
      expect(result.failures.map(({ token }) => token)).toContain('FOREGROUND_LITERAL');
    });
  });

  it('rejects altered relative-currentColor offsets and fails AST provenance', async () => {
    const alteredFormula = dataCompareFormula.replace('+ 152', '+ 151');
    const source = `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M1 1h2" stroke="currentColor" color="${alteredFormula}"/></svg>`;
    const expectedSource = `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M1 1h2" stroke="currentColor" color="${dataCompareFormula}"/></svg>`;
    await withFixture({ 'outline/45035-1908.svg': source }, async (root) => {
      const value = relativeColorManifest();
      Object.assign(value.symbols[0], {
        localNormalizedAstSha256: sha256(
          canonicalizeSvg(expectedSource, {
            normalizeForegroundPaint: true,
            relativeCurrentColorValue: dataCompareFormula,
          }),
        ),
      });
      const manifestPath = resolve(root, 'manifest.json');
      writeFileSync(manifestPath, JSON.stringify(value));
      const result = await auditIcons({ manifestPath, root });
      const tokens = result.failures.map(({ token }) => token);
      expect(tokens).toContain('FOREGROUND_LITERAL');
      expect(tokens).toContain('AST_DIGEST_MISMATCH');
    });
  });

  it('detects duplicate fragment ownership across sources', async () => {
    const source =
      '<svg width="24" height="24" viewBox="0 0 24 24"><path mask="url(#icon_1_1__mask_0)" d="M1 1h2"/><defs><mask id="icon_1_1__mask_0"><path d="M1 1h2"/></mask></defs></svg>';
    await withFixture({ 'outline/a.svg': source, 'outline/b.svg': source }, async (root) => {
      const result = await auditIcons({ root });
      expect(result.failures.map(({ token }) => token)).toContain('FRAGMENT_BASE_COLLISION');
    });
  });

  it.each([
    [
      'FRAGMENT_ORPHAN',
      '<svg width="24" height="24" viewBox="0 0 24 24"><path mask="url(#icon_1_1__mask_0)" d="M1 1h2"/></svg>',
    ],
    [
      'FRAGMENT_UNUSED_ID',
      '<svg width="24" height="24" viewBox="0 0 24 24"><path id="icon_1_1__path_0" d="M1 1h2" stroke="currentColor"/></svg>',
    ],
  ])('reports %s fragment reachability', async (token, source) => {
    await withFixture({ 'outline/example.svg': source }, async (root) => {
      const result = await auditIcons({ root });
      expect(result.failures.map(({ token: actual }) => actual)).toContain(token);
    });
  });
});

describe('Outline index and manifest failures', () => {
  it.each([
    ['IMPORT_MISSING', "export const ExampleOutlined = createIcon(MissingSvg, 'ExampleOutlined');"],
    [
      'EXPORT_DUPLICATE',
      "import ExampleSvg from './example.svg?react';\nexport const ExampleOutlined = createIcon(ExampleSvg, 'ExampleOutlined');\nexport const ExampleOutlined = createIcon(ExampleSvg, 'Again');",
    ],
  ])('reports %s from the public index', async (token, indexSource) => {
    await withFixture(
      { 'outline/example.svg': validOutline, 'outline/index.tsx': indexSource },
      async (root) => {
        const result = await auditIcons({ indexPath: resolve(root, 'outline/index.tsx'), root });
        expect(result.failures.map(({ token: actual }) => actual)).toContain(token);
      },
    );
  });

  it('rejects an SVG directory file that is not imported by the public index', async () => {
    const indexSource =
      "import ExampleSvg from './example.svg?react';\nexport const ExampleOutlined = createIcon(ExampleSvg, 'ExampleOutlined');";
    await withFixture(
      {
        'outline/example.svg': validOutline,
        'outline/extra.svg': validOutline,
        'outline/index.tsx': indexSource,
      },
      async (root) => {
        const result = await auditIcons({ indexPath: resolve(root, 'outline/index.tsx'), root });
        expect(result.failures.map(({ token }) => token)).toContain('INVENTORY_CURRENT_MISSING');
      },
    );
  });

  it.each([
    [
      'MANIFEST_INCOMPLETE',
      (value: ManifestFixture) => {
        value.complete = false;
      },
    ],
    [
      'FIGMA_RAW_HASH_MISMATCH',
      (value: ManifestFixture) => {
        value.symbols[0].figmaRawSvgSha256 = null;
      },
    ],
    [
      'LOCAL_RAW_HASH_MISMATCH',
      (value: ManifestFixture) => {
        value.symbols[0].localRawSvgSha256 = '0'.repeat(64);
      },
    ],
    [
      'AST_DIGEST_MISMATCH',
      (value: ManifestFixture) => {
        value.symbols[0].normalizedAstSha256 = '0'.repeat(64);
      },
    ],
    [
      'GEOMETRY_DIGEST_MISMATCH',
      (value: ManifestFixture) => {
        value.symbols[0].geometrySha256 = '0'.repeat(64);
      },
    ],
    [
      'INVENTORY_CURRENT_MISSING',
      (value: ManifestFixture) => {
        value.symbols[0].file = 'missing.svg';
      },
    ],
    [
      'LEGACY_STATUS_INVALID',
      (value: ManifestFixture) => {
        value.legacySources.push({
          exportName: 'LegacyOutlined',
          figmaRawSvgSha256: null,
          provenanceStatus: 'current',
        });
      },
    ],
  ])('reports %s for fail-closed manifest evidence', async (token, mutate) => {
    await withFixture({ 'outline/example.svg': validOutline }, async (root) => {
      const value = completeManifest();
      mutate(value);
      const manifestPath = resolve(root, 'manifest.json');
      writeFileSync(manifestPath, JSON.stringify(value));
      const result = await auditIcons({ manifestPath, root });
      expect(result.failures.map(({ token: actual }) => actual)).toContain(token);
    });
  });

  it('recomputes an embedded Figma raw hash when fixture evidence is available', async () => {
    await withFixture({ 'outline/example.svg': validOutline }, async (root) => {
      const value = completeManifest();
      Object.assign(value.symbols[0], { figmaRawSvg: validOutline });
      value.symbols[0].figmaRawSvgSha256 = '0'.repeat(64);
      const manifestPath = resolve(root, 'manifest.json');
      writeFileSync(manifestPath, JSON.stringify(value));
      const result = await auditIcons({ manifestPath, root });
      expect(result.failures.map(({ token }) => token)).toContain('FIGMA_RAW_HASH_MISMATCH');
    });
  });

  it('protects the unrelated Basic manifest by a frozen digest', async () => {
    await withFixture(
      { 'basic.json': '{"changed":true}', 'outline/example.svg': validOutline },
      async (root) => {
        const value = completeManifest();
        value.sourceEvidence = { basicManifestSha256: sha256('{"original":true}') };
        const manifestPath = resolve(root, 'manifest.json');
        writeFileSync(manifestPath, JSON.stringify(value));
        const result = await auditIcons({
          basicManifestPath: resolve(root, 'basic.json'),
          manifestPath,
          root,
        });
        expect(result.failures.map(({ token }) => token)).toContain('BASIC_MANIFEST_CHANGED');
      },
    );
  });
});

describe('Outline manifest updater provenance gate', () => {
  const runUpdater = (
    output: string,
    figmaRawProvenance = rawProvenance,
    reviewId = 'audit-test',
    reviewedBy = 'vitest',
  ) =>
    spawnSync(
      process.execPath,
      [
        updaterScript,
        '--source-inventory',
        placementProvenance,
        '--prechange-baseline',
        prechangeBaseline,
        '--figma-raw-provenance',
        figmaRawProvenance,
        '--review-id',
        reviewId,
        '--reviewed-by',
        reviewedBy,
        '--output',
        output,
      ],
      { cwd: packageRoot, encoding: 'utf8' },
    );

  it('writes only a complete 359/359/362/3 independently matched manifest', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'yakit-icon-updater-'));
    try {
      const output = resolve(root, 'manifest.json');
      const result = runUpdater(output);
      expect(result).toMatchObject({ status: 0, stderr: '' });
      const value = JSON.parse(readFileSync(output, 'utf8'));
      expect(value).toMatchObject({ complete: true, provenanceComplete: true });
      expect(value.strokeWidthPolicy).toEqual(ICON_STROKE_WIDTH_POLICY);
      expect(value.symbols).toHaveLength(359);
      expect(value.placements).toHaveLength(362);
      expect(value.instanceVerification).toHaveLength(3);
      expect(
        new Set(value.symbols.map((symbol: Record<string, string>) => symbol.exportName)).size,
      ).toBe(359);
      expect(value.legacySources).toEqual([]);
      expect(
        value.placements.every(
          (placement: Record<string, string>) =>
            placement.mainComponentId && placement.overrideHash,
        ),
      ).toBe(true);
      expect(
        value.symbols.every((record: Record<string, string>) => {
          const reviewed = reviewedOutlineGeometry(record);
          return (
            (Boolean(reviewed) || record.figmaNormalizedAstSha256 === record.normalizedAstSha256) &&
            record.localNormalizedAstSha256 === record.normalizedAstSha256 &&
            (Boolean(reviewed) || record.figmaGeometrySha256 === record.geometrySha256) &&
            record.localGeometrySha256 === record.geometrySha256 &&
            record.geometryReviewId === reviewed
          );
        }),
      ).toBe(true);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it('fails before writing when independent Figma/local geometry differs', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'yakit-icon-updater-'));
    try {
      const altered = JSON.parse(readFileSync(rawProvenance, 'utf8'));
      altered.components[0].svg = altered.components[0].svg.replace('M3 8', 'M4 8');
      const alteredPath = resolve(root, 'altered.json');
      const output = resolve(root, 'manifest.json');
      writeFileSync(alteredPath, JSON.stringify(altered));
      const result = runUpdater(output, alteredPath);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('normalized AST mismatch');
      expect(existsSync(output)).toBe(false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it('reproduces the committed derived manifest data from committed provenance', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'yakit-icon-updater-'));
    try {
      const output = resolve(root, 'manifest.json');
      const committed = JSON.parse(readFileSync(manifest, 'utf8'));
      const { reviewId, reviewedBy } = committed.updateProvenance;
      const result = runUpdater(output, rawProvenance, reviewId, reviewedBy);
      expect(result).toMatchObject({ status: 0, stderr: '' });
      const generated = JSON.parse(readFileSync(output, 'utf8'));
      expect({ ...generated, updateProvenance: committed.updateProvenance }).toEqual(committed);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

describe('Versioned semantic erase normalization', () => {
  const figma =
    '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M1 1h2" stroke="currentColor"/><path d="M3 1L22 20" stroke="white" stroke-width="2"/><path d="M2 2L21 21" stroke="currentColor" stroke-width="2"/></svg>';
  const local = (maskBody: string, reference = ' mask="url(#icon_14203_193724__mask_0)"') =>
    `<svg width="24" height="24" viewBox="0 0 24 24"><g${reference}><path d="M1 1h2" stroke="currentColor"/></g><path d="M2 2L21 21" stroke="currentColor" stroke-width="2"/><defs>${maskBody}</defs></svg>`;
  const options = {
    normalizeForegroundPaint: true,
    normalizeSemanticErase: true,
    semanticEraseSourceId: '14203:193724',
  };
  const validMask =
    '<mask id="icon_14203_193724__mask_0" mask-type="luminance"><rect width="24" height="24" fill="white"/><path d="M3 1L22 20" stroke="black" stroke-width="2"/></mask>';

  it('matches only the validated referenced 24x24 luminance erase topology', () => {
    expect(canonicalizeSvg(local(validMask), options)).toBe(canonicalizeSvg(figma, options));
    expect(
      canonicalizeSvg(local(validMask), {
        ...options,
        geometryOnly: true,
      }),
    ).toBe(canonicalizeSvg(figma, { ...options, geometryOnly: true }));
  });

  it.each([
    [
      'malformed full-frame rect',
      validMask.replace('width="24"', 'width="23"'),
      ' mask="url(#icon_14203_193724__mask_0)"',
    ],
    ['unreferenced mask', validMask, ''],
  ])('rejects %s instead of hiding topology differences', (_label, mask, reference) => {
    expect(canonicalizeSvg(local(mask, reference), options)).not.toBe(
      canonicalizeSvg(figma, options),
    );
  });
});

describe('Versioned local stroke-width normalization', () => {
  it('compares immutable Figma widths against the local 1 policy only when requested', () => {
    const figma =
      '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M1 1h2" stroke="black" stroke-width="2"/></svg>';
    const local = figma.replace('stroke-width="2"', 'stroke-width="1"');

    expect(canonicalizeSvg(local)).not.toBe(canonicalizeSvg(figma));
    expect(canonicalizeSvg(local, { normalizeStrokeWidth: true })).toBe(
      canonicalizeSvg(figma, { normalizeStrokeWidth: true }),
    );
  });
});

describe('Stroke-width manifest planner', () => {
  it('reproduces all committed derived manifests from committed provenance and local sources', async () => {
    const outputs = await planIconStrokeManifests(packageRoot, new Map());

    expect([...outputs.keys()]).toEqual([
      'scripts/figma-outline-icons-inventory.json',
      'scripts/figma-solid-icons-inventory.json',
      'scripts/figma-colorful-icons-inventory.json',
    ]);
    for (const [relativePath, source] of outputs)
      expect(source, relativePath).toBe(readFileSync(resolve(packageRoot, relativePath), 'utf8'));
  });
});
