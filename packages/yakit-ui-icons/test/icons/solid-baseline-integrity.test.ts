import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { auditIcons, canonicalizeSvg, parseIconIndex } from '../../scripts/audit-icons.mjs';
import {
  canonicalJson,
  getIconAuditPolicy,
  policyDigest,
  sortedPublicMapping,
} from '../../scripts/icon-audit-contracts.mjs';
import { readIconInputSync } from '../../scripts/icon-source-documents.mjs';
import nameMigration from '../fixtures/icons/english-name-migration.json';
import prechange from '../fixtures/icons/reference/solid-local-prechange-controls-v1.json';
import renderContract from '../fixtures/icons/reference/solid-render-contract-v1.json';
import currentRenderContract from '../fixtures/icons/stroke-width-1/render-contract.json';

const manifest = JSON.parse(
  readIconInputSync(
    new URL('../../config/icon-sources/solid.json#manifest', import.meta.url),
    'utf8',
  ),
);
const placement = JSON.parse(
  readIconInputSync(
    new URL('../../config/icon-sources/solid.json#placement', import.meta.url),
    'utf8',
  ),
);
const raw = JSON.parse(
  readIconInputSync(new URL('../../config/icon-sources/solid.json#raw', import.meta.url), 'utf8'),
);

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const solidRoot = resolve(packageRoot, 'src/solid');
const policy = getIconAuditPolicy('solid-v1');
const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const geometrySha256 = (source: string) =>
  sha256(canonicalizeSvg(source, { geometryOnly: true, ignoreUnreferencedIds: true }));
const files = readdirSync(solidRoot)
  .filter((file) => file.endsWith('.svg'))
  .sort();
const currentSource = (file: string) => readIconInputSync(resolve(solidRoot, file), 'utf8');
const currentGeometry = (file: string) => geometrySha256(currentSource(file));
const targetIds = placement.targetSymbols.map(({ nodeId }) => nodeId);
const supplementIds = placement.supplementalSources.map(({ nodeId }) => nodeId);
const rawByNodeId = new Map(
  [...raw.components, ...raw.supplementalComponents].map((record) => [record.nodeId, record]),
);

type SolidManifest = typeof manifest;
const auditMutation = async (mutate: (value: SolidManifest) => void) => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'yakit-solid-policy-'));
  try {
    const value = structuredClone(manifest);
    mutate(value);
    const manifestPath = resolve(temporaryRoot, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(value));
    const result = await auditIcons({
      figmaRawProvenancePath: resolve(packageRoot, 'config/icon-sources/solid.json#raw'),
      indexPath: resolve(packageRoot, 'src/solid/index.tsx'),
      manifestPath,
      placementProvenancePath: resolve(packageRoot, 'config/icon-sources/solid.json#placement'),
      policyId: 'solid-v1',
      root: resolve(packageRoot, 'src'),
    });
    return result.failures.map(({ token }) => token);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

describe('Solid icon baseline integrity', () => {
  it('matches the updater-immutable target membership, order, and supplement contract', () => {
    expect(targetIds).toHaveLength(policy.expectedCounts.targetSymbols);
    expect(new Set(targetIds).size).toBe(policy.expectedCounts.targetSymbols);
    expect(policyDigest(targetIds)).toBe(policy.targetOrderSha256);
    expect(policyDigest([...targetIds].sort())).toBe(policy.targetMembershipSha256);
    expect(raw.components.map(({ nodeId }) => nodeId)).toEqual(targetIds);
    expect(targetIds.some((nodeId) => supplementIds.includes(nodeId))).toBe(false);
    expect(
      canonicalJson(
        placement.supplementalSources.map(({ nodeId, localFile, exportName, scopeRole }) => ({
          nodeId,
          localFile: `solid/${localFile}`,
          exportName,
          scopeRole: scopeRole === 'supplemental' ? 'supplement' : scopeRole,
        })),
      ),
    ).toBe(canonicalJson(policy.supplementalSources));
  });

  it('contains exactly the 256 classified numeric sources and none of the stale orphans', () => {
    expect(files).toHaveLength(policy.expectedCounts.publicExports);
    expect(files.every((file) => /^\d+(?:-\d+)+\.svg$/.test(file))).toBe(true);
    expect(prechange.staleOrphanFiles).toHaveLength(20);
    for (const orphan of prechange.staleOrphanFiles) expect(files).not.toContain(orphan);
  });

  it('preserves all 255 source mappings through the Solid suffix and English name migrations', () => {
    const parsed = parseIconIndex(
      readIconInputSync(resolve(packageRoot, 'src/solid/index.tsx'), 'utf8'),
    );
    const actual = [...parsed.exports].map(([exportName, localFile]) => ({
      nodeId: localFile?.replace(/\.svg$/, '').replace('-', ':'),
      localFile: `solid/${localFile}`,
      exportName,
      scopeRole: supplementIds.includes(localFile!.replace(/\.svg$/, '').replace('-', ':'))
        ? 'supplement'
        : 'target',
    }));
    const frozen = prechange.records.map(({ nodeId, localFile, exportName, scopeRole }) => ({
      nodeId,
      localFile: `solid/${localFile}`,
      exportName:
        nameMigration.rows.find((row) => row.family === 'solid' && row.sourceNodeId === nodeId)
          ?.exportName ?? exportName.replace(/Filled$/, 'Solid'),
      scopeRole,
    }));

    expect(parsed.duplicateExports.size).toBe(0);
    expect(parsed.duplicateImports.size).toBe(0);
    expect(parsed.missingImportTargets.size).toBe(0);
    expect(actual).toHaveLength(policy.expectedCounts.publicExports);
    expect(prechange.records.every(({ exportName }) => exportName.endsWith('Filled'))).toBe(true);
    expect(actual.every(({ exportName }) => exportName.endsWith('Solid'))).toBe(true);
    expect(sortedPublicMapping(actual)).toEqual(
      sortedPublicMapping([
        ...frozen,
        {
          nodeId: '46709:8109',
          localFile: 'solid/46709-8109.svg',
          exportName: 'ParkAboveSolid',
          scopeRole: 'supplement',
        },
      ]),
    );
    expect(policyDigest(sortedPublicMapping(actual))).toBe(policy.publicMappingSha256);
  });

  it('preserves historical evidence and limits changes to the known design updates', () => {
    const refreshedIds = ['16035:380989'];
    const layoutIds = ['4936:115787', '4936:115788', '4936:115789', '4936:115790'];
    const changed = prechange.records
      .filter(({ geometrySha256: frozen, localFile }) => currentGeometry(localFile) !== frozen)
      .map(({ nodeId }) => nodeId)
      .sort();
    expect(changed).toEqual(['2281:144183', ...layoutIds, ...refreshedIds].sort());

    for (const row of prechange.records.filter(({ nodeId }) => nodeId !== '2281:144183')) {
      const figma = rawByNodeId.get(row.nodeId);
      expect(figma, row.nodeId).toBeDefined();
      expect(currentGeometry(row.localFile), row.localFile).toBe(geometrySha256(figma!.svg));
    }

    const drag = currentSource('2281-144183.svg');
    const figmaDrag = rawByNodeId.get('2281:144183')!;
    expect(currentGeometry('2281-144183.svg')).toBe(geometrySha256(figmaDrag.svg));
    expect(drag).toMatch(/^<svg width="20" height="20" viewBox="0 0 20 20"/);
    expect(drag).not.toMatch(/preserveAspectRatio="none"|overflow="visible"/);
    expect([...drag.matchAll(/<path\b/g)]).toHaveLength(6);
    expect(drag).toContain('M7 6');
    expect(drag).toContain('M13 6');
  });

  it.each([
    [
      'truncated target inventory',
      (value: SolidManifest) => {
        value.symbols.pop();
      },
      'POLICY_CONTRACT_MISMATCH',
    ],
    [
      'same-count target substitution',
      (value: SolidManifest) => {
        value.symbols[0].nodeId = '999:999';
      },
      'POLICY_CONTRACT_MISMATCH',
    ],
    [
      'target order drift',
      (value: SolidManifest) => {
        [value.symbols[0], value.symbols[1]] = [value.symbols[1], value.symbols[0]];
      },
      'POLICY_CONTRACT_MISMATCH',
    ],
    [
      'public mapping scope drift',
      (value: SolidManifest) => {
        value.publicExports[0].scopeRole = 'supplement';
      },
      'POLICY_CONTRACT_MISMATCH',
    ],
    [
      'public mapping local-file remap',
      (value: SolidManifest) => {
        value.publicExports[0].localFile = value.publicExports[1].localFile;
      },
      'POLICY_CONTRACT_MISMATCH',
    ],
    [
      'public mapping export-name remap',
      (value: SolidManifest) => {
        value.publicExports[0].exportName = value.publicExports[1].exportName;
      },
      'POLICY_CONTRACT_MISMATCH',
    ],
    [
      'prechange evidence hash drift',
      (value: SolidManifest) => {
        value.sourceEvidence.prechangeBaselineSha256 = '0'.repeat(64);
      },
      'PRECHANGE_BASELINE_MISMATCH',
    ],
    [
      'Figma paint digest drift',
      (value: SolidManifest) => {
        value.symbols[0].figmaPaintSemanticsSha256 = '0'.repeat(64);
      },
      'PAINT_SEMANTICS_MISMATCH',
    ],
    [
      'local paint digest drift',
      (value: SolidManifest) => {
        value.symbols[0].localPaintSemanticsSha256 = '0'.repeat(64);
      },
      'PAINT_SEMANTICS_MISMATCH',
    ],
    [
      'unknown algorithm version',
      (value: SolidManifest) => {
        value.idHygieneAlgorithmVersion = 'unknown-id-hygiene';
      },
      'ALGORITHM_VERSION_UNSUPPORTED',
    ],
    [
      'unknown paint comparison normalization version',
      (value: SolidManifest) => {
        value.paintComparisonNormalizationVersion = 'unknown-paint-comparison';
      },
      'ALGORITHM_VERSION_UNSUPPORTED',
    ],
  ])('fails closed on %s', async (_label, mutate, token) => {
    expect(await auditMutation(mutate)).toContain(token);
  });

  it('keeps the historical 4px-vs-1.5px browser and metric evidence immutable', () => {
    const { renderer } = renderContract;
    expect(renderer.browserVersion).toBe('151.0.7922.174');
    expect(renderer.operatingSystem).toEqual({
      name: 'macOS',
      version: '15.7.7',
      build: '24G720',
      architecture: 'arm64',
    });
    expect(renderContract.raster).toEqual({
      background: '#F8F9FA',
      cropHeight: 20,
      cropWidth: 20,
      defaultColor: '#353639',
      deviceScaleFactor: 1,
      inkMaskThreshold: 8,
    });
    expect(renderContract.metrics).toEqual({
      bounds: 'inclusive',
      boundsEdgeDeltaMaximum: 0,
      centroid: 'intensity-weighted-euclidean',
      centroidDeltaMaximum: 0.05,
      iouMinimum: 0.995,
      maeMaximum: 0.5,
      rounding: 'half-up-six-decimals',
    });
    expect(renderContract.localStrokeWidthPolicy).toEqual({
      strategy: 'local-uniform-stroke-v1',
      figmaStrokeWidth: 4,
      localStrokeWidth: 1.5,
      nodeIds: ['4936:115787', '4936:115788', '4936:115789', '4936:115790'],
      metrics: {
        maeMaximum: 20.25,
        iouMinimum: 0.8,
        boundsEdgeDeltaMaximum: 0,
        centroidDeltaMaximum: 1.75,
      },
    });
  });

  it('binds current stroke-width-1 visual checks to the installed renderer', () => {
    const { renderer } = currentRenderContract;
    expect(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH).toBe(renderer.browserExecutablePath);
    expect(sha256(readIconInputSync(renderer.browserExecutablePath))).toBe(
      renderer.browserExecutableSha256,
    );
    expect(
      execFileSync(renderer.browserExecutablePath, ['--version'], { encoding: 'utf8' }).trim(),
    ).toBe(`${renderer.browserProduct} ${renderer.browserVersion}`);
    expect(execFileSync('/usr/bin/sw_vers', ['-productName'], { encoding: 'utf8' }).trim()).toBe(
      renderer.operatingSystem.name,
    );
    expect(execFileSync('/usr/bin/sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim()).toBe(
      renderer.operatingSystem.version,
    );
    expect(execFileSync('/usr/bin/sw_vers', ['-buildVersion'], { encoding: 'utf8' }).trim()).toBe(
      renderer.operatingSystem.build,
    );
    expect(process.arch).toBe(renderer.operatingSystem.architecture);
    expect(
      JSON.parse(
        readIconInputSync(resolve(packageRoot, 'node_modules/playwright/package.json'), 'utf8'),
      ).version,
    ).toBe(renderer.playwrightVersion);
    expect(currentRenderContract.strokeWidthPolicy).toEqual({
      strategy: 'local-uniform-stroke-v1',
      normalizedFigmaWidth: 1,
      localWidth: 1,
      nodeIds: ['16035:380989'],
      figmaFourPixelNodeIds: [],
    });
  });
});
