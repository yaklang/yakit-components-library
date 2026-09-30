import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { auditIcons } from '../../scripts/audit-icons.mjs';
import {
  buildIconNameCatalog,
  renderIconNameCatalog,
} from '../../scripts/icon-name-catalog-core.mjs';
import { figmaIconNameCatalog } from '../../src/icons/figmaNameCatalog';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const paths = {
  catalog: resolve(packageRoot, 'src/icons/figmaNameCatalog.ts'),
  icons: resolve(packageRoot, 'src/icons'),
  outlineIndex: resolve(packageRoot, 'src/icons/outline/index.tsx'),
  outlineManifest: resolve(packageRoot, 'scripts/figma-outline-icons-inventory.json'),
  outlinePlacement: resolve(
    packageRoot,
    'test/fixtures/icons/reference/figma-outline-placement-provenance-v1.json',
  ),
  outlineRaw: resolve(
    packageRoot,
    'test/fixtures/icons/reference/figma-outline-raw-provenance-v1.json',
  ),
  solidIndex: resolve(packageRoot, 'src/icons/solid/index.tsx'),
  solidManifest: resolve(packageRoot, 'scripts/figma-solid-icons-inventory.json'),
  solidPlacement: resolve(
    packageRoot,
    'test/fixtures/icons/reference/figma-solid-placement-provenance-v1.json',
  ),
  solidRaw: resolve(
    packageRoot,
    'test/fixtures/icons/reference/figma-solid-raw-provenance-v1.json',
  ),
  updater: resolve(packageRoot, 'scripts/update-icon-name-catalog.mjs'),
};
const notebookGroupMappings = [
  { exportName: 'NotebookOutlined', figmaName: 'Outline/Notebook', sourceStatus: 'current' },
  {
    exportName: 'Notebook2Outlined',
    figmaName: 'Outline/Notebook 2',
    sourceStatus: 'current',
  },
  {
    exportName: 'RotateCcwOutlined',
    figmaName: 'Outline/RotateCcw',
    sourceStatus: 'current',
  },
  { exportName: 'FeatherOutlined', figmaName: 'Outline/Feather', sourceStatus: 'current' },
  {
    exportName: 'HardDriveDownloadOutlined',
    figmaName: 'Outline/HardDriveDownload',
    sourceStatus: 'current',
  },
  {
    exportName: 'RotateCcwSquareOutlined',
    figmaName: 'Outline/RotateCcwSquare',
    sourceStatus: 'current',
  },
  {
    exportName: 'BookMarkedOutlined',
    figmaName: 'Outline/BookMarked',
    sourceStatus: 'current',
  },
  {
    exportName: 'BookMarked2Outlined',
    figmaName: 'Outline/BookMarked 2',
    sourceStatus: 'current',
  },
  { exportName: 'TimerOutlined', figmaName: 'Outline/Timer', sourceStatus: 'current' },
] as const;
const notebookGroupExportNames = new Set<string>(
  notebookGroupMappings.map(({ exportName }) => exportName),
);

const loadInputs = () => ({
  outlineIndexSource: readFileSync(paths.outlineIndex, 'utf8'),
  outlineManifest: JSON.parse(readFileSync(paths.outlineManifest, 'utf8')),
  outlinePlacementProvenance: JSON.parse(readFileSync(paths.outlinePlacement, 'utf8')),
  outlineRawProvenance: JSON.parse(readFileSync(paths.outlineRaw, 'utf8')),
  solidIndexSource: readFileSync(paths.solidIndex, 'utf8'),
  solidManifest: JSON.parse(readFileSync(paths.solidManifest, 'utf8')),
  solidPlacementProvenance: JSON.parse(readFileSync(paths.solidPlacement, 'utf8')),
  solidRawProvenance: JSON.parse(readFileSync(paths.solidRaw, 'utf8')),
});

const runNameAudit = (overrides: Record<string, string> = {}) =>
  auditIcons({
    iconNameCatalogPath: paths.catalog,
    indexPath: paths.outlineIndex,
    manifestPath: paths.outlineManifest,
    outlineNameIndexPath: paths.outlineIndex,
    outlineNameManifestPath: paths.outlineManifest,
    outlineNamePlacementProvenancePath: paths.outlinePlacement,
    outlineNameRawProvenancePath: paths.outlineRaw,
    policyId: 'outline-v1',
    root: paths.icons,
    solidNameIndexPath: paths.solidIndex,
    solidNameManifestPath: paths.solidManifest,
    solidNamePlacementProvenancePath: paths.solidPlacement,
    solidNameRawProvenancePath: paths.solidRaw,
    ...overrides,
  });

describe('Figma icon name catalog', () => {
  it('preserves all 615 public export mappings in manifest source order', () => {
    const expected = buildIconNameCatalog(loadInputs());
    expect(figmaIconNameCatalog).toEqual(expected);
    expect(figmaIconNameCatalog).toHaveLength(615);
    expect(figmaIconNameCatalog.filter(({ family }) => family === 'outline')).toHaveLength(359);
    expect(figmaIconNameCatalog.filter(({ family }) => family === 'solid')).toHaveLength(256);
    expect(new Set(figmaIconNameCatalog.map(({ exportName }) => exportName))).toHaveLength(615);
  });

  it('keeps authoritative full Figma names byte-for-byte except outer whitespace', () => {
    expect(
      figmaIconNameCatalog.find(({ exportName }) => exportName === 'SpeechToText2Outlined'),
    ).toMatchObject({ figmaName: 'Outline/Speech-to-text2', sourceStatus: 'current' });
    expect(
      figmaIconNameCatalog.find(({ exportName }) => exportName === 'CommandOutlined'),
    ).toMatchObject({ figmaName: null, sourceStatus: 'unnamed-in-figma' });
    expect(
      figmaIconNameCatalog.find(({ exportName }) => exportName === 'NotebookOutlined'),
    ).toMatchObject({ figmaName: 'Outline/Notebook', sourceStatus: 'current' });
    expect(
      figmaIconNameCatalog
        .filter(({ exportName }) => notebookGroupExportNames.has(exportName))
        .map(({ exportName, figmaName, sourceStatus }) => ({
          exportName,
          figmaName,
          sourceStatus,
        })),
    ).toEqual(notebookGroupMappings);
    expect(
      figmaIconNameCatalog.find(({ exportName }) => exportName === 'FloatingSolid'),
    ).toMatchObject({ figmaName: 'Solid/Floating', sourceStatus: 'supplement' });
    const names = figmaIconNameCatalog.flatMap(({ figmaName }) =>
      figmaName === null ? [] : [figmaName],
    );
    expect(names).toHaveLength(614);
    expect(new Set(names)).toHaveLength(613);
  });

  it.each([
    ['missing', (inputs: ReturnType<typeof loadInputs>) => inputs.outlineManifest.symbols.pop()],
    [
      'unknown',
      (inputs: ReturnType<typeof loadInputs>) => {
        inputs.solidManifest.symbols[0].exportName = 'UnknownSolid';
      },
    ],
    [
      'duplicate',
      (inputs: ReturnType<typeof loadInputs>) => {
        inputs.solidManifest.symbols[1].name = inputs.solidManifest.symbols[0].name;
      },
    ],
  ])('fails closed for a %s mapping mutation', (_label, mutate) => {
    const inputs = loadInputs();
    mutate(inputs);
    expect(() => buildIconNameCatalog(inputs)).toThrow(/FIGMA_NAME_/);
  });

  it('rejects coordinated manifest/catalog name forgery against frozen provenance', async () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'yakit-icon-name-forgery-'));
    try {
      const inputs = loadInputs();
      const originalName = inputs.outlineManifest.symbols[0].name;
      inputs.outlineManifest.symbols[0].name = 'Outline/Forged-mail';
      const forgedManifest = resolve(temporaryRoot, 'outline.json');
      const forgedCatalog = resolve(temporaryRoot, 'figmaNameCatalog.ts');
      writeFileSync(forgedManifest, JSON.stringify(inputs.outlineManifest));
      writeFileSync(
        forgedCatalog,
        readFileSync(paths.catalog, 'utf8').replace(originalName.trim(), 'Outline/Forged-mail'),
      );
      const result = await runNameAudit({
        iconNameCatalogPath: forgedCatalog,
        outlineNameManifestPath: forgedManifest,
      });
      expect(result.failures.map(({ token }) => token)).toContain('FIGMA_NAME_PROVENANCE_MISMATCH');
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });

  it('rejects coordinated Outline manifest/catalog reorder against placement order', async () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'yakit-icon-name-order-'));
    try {
      const manifest = loadInputs().outlineManifest;
      [manifest.symbols[0], manifest.symbols[1]] = [manifest.symbols[1], manifest.symbols[0]];
      const reorderedManifest = resolve(temporaryRoot, 'outline.json');
      writeFileSync(reorderedManifest, JSON.stringify(manifest));
      const result = await runNameAudit({ outlineNameManifestPath: reorderedManifest });
      expect(result.failures.map(({ token }) => token)).toContain('FIGMA_NAME_ORDER_MISMATCH');
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });

  it.each([
    [
      'raw/placement name disagreement',
      (inputs: ReturnType<typeof loadInputs>) => {
        inputs.outlineRawProvenance.components[0].name = 'Outline/Forged';
      },
    ],
    [
      'missing raw node',
      (inputs: ReturnType<typeof loadInputs>) => inputs.solidRawProvenance.components.pop(),
    ],
    [
      'extra raw node',
      (inputs: ReturnType<typeof loadInputs>) =>
        inputs.solidRawProvenance.components.push({
          name: 'Solid/Extra',
          nodeId: 'extra:1',
          nodeType: 'COMPONENT',
          svg: '<svg/>',
        }),
    ],
  ])('fails closed for %s in frozen provenance', (_label, mutate) => {
    const inputs = loadInputs();
    mutate(inputs);
    expect(() => buildIconNameCatalog(inputs)).toThrow(/FIGMA_NAME_PROVENANCE_MISMATCH/);
  });

  it('detects a byte-level catalog mutation through the normal audit', async () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'yakit-icon-names-'));
    try {
      const mutatedCatalog = resolve(temporaryRoot, 'figmaNameCatalog.ts');
      writeFileSync(mutatedCatalog, `${readFileSync(paths.catalog, 'utf8')}\n`);
      const result = await runNameAudit({ iconNameCatalogPath: mutatedCatalog });
      expect(result.failures.map(({ token }) => token)).toContain('FIGMA_NAME_CATALOG_CHANGED');
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });
});

describe('Figma icon name catalog updater', () => {
  it('is non-overwriting by default and replays byte-identically when explicitly replaced', () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'yakit-icon-name-update-'));
    const output = resolve(temporaryRoot, 'figmaNameCatalog.ts');
    const run = (...extra: string[]) =>
      spawnSync(process.execPath, [paths.updater, '--output', output, ...extra], {
        cwd: packageRoot,
        encoding: 'utf8',
      });
    try {
      expect(run().status).toBe(0);
      expect(readFileSync(output, 'utf8')).toBe(
        renderIconNameCatalog(buildIconNameCatalog(loadInputs())),
      );
      expect(run()).toMatchObject({ status: 2 });
      expect(run('--replace-existing').status).toBe(0);
      expect(readFileSync(output, 'utf8')).toBe(readFileSync(paths.catalog, 'utf8'));
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });
});
