import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { auditIcons, canonicalizeSvg, parseIconIndex } from '../../scripts/audit-icons.mjs';
import manifest from '../../scripts/figma-solid-icons-inventory.json';
import {
  canonicalJson,
  getIconAuditPolicy,
  policyDigest,
  sortedPublicMapping,
} from '../../scripts/icon-audit-contracts.mjs';
import placement from '../fixtures/icons/reference/figma-solid-placement-provenance-v1.json';
import raw from '../fixtures/icons/reference/figma-solid-raw-provenance-v1.json';
import prechange from '../fixtures/icons/reference/solid-local-prechange-controls-v1.json';
import renderContract from '../fixtures/icons/reference/solid-render-contract-v1.json';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const solidRoot = resolve(packageRoot, 'src/icons/solid');
const policy = getIconAuditPolicy('solid-v1');
const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const geometrySha256 = (source: string) => sha256(canonicalizeSvg(source, { geometryOnly: true }));
const files = readdirSync(solidRoot)
  .filter((file) => file.endsWith('.svg'))
  .sort();
const currentSource = (file: string) => readFileSync(resolve(solidRoot, file), 'utf8');
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
      figmaRawProvenancePath: resolve(
        packageRoot,
        'test/fixtures/icons/reference/figma-solid-raw-provenance-v1.json',
      ),
      indexPath: resolve(packageRoot, 'src/icons/solid/index.tsx'),
      manifestPath,
      placementProvenancePath: resolve(
        packageRoot,
        'test/fixtures/icons/reference/figma-solid-placement-provenance-v1.json',
      ),
      policyId: 'solid-v1',
      root: resolve(packageRoot, 'src/icons'),
    });
    return result.failures.map(({ token }) => token);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

describe('Solid icon baseline integrity', () => {
  it('matches the updater-immutable target membership, order, and supplement contract', () => {
    expect(targetIds).toHaveLength(251);
    expect(new Set(targetIds).size).toBe(251);
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

  it('contains exactly the 255 classified numeric sources and none of the stale orphans', () => {
    expect(files).toHaveLength(255);
    expect(files.every((file) => /^\d+(?:-\d+)+\.svg$/.test(file))).toBe(true);
    expect(prechange.staleOrphanFiles).toHaveLength(20);
    for (const orphan of prechange.staleOrphanFiles) expect(files).not.toContain(orphan);
  });

  it('preserves all 255 public export mappings byte-for-byte', () => {
    const parsed = parseIconIndex(
      readFileSync(resolve(packageRoot, 'src/icons/solid/index.tsx'), 'utf8'),
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
      exportName,
      scopeRole,
    }));

    expect(parsed.duplicateExports.size).toBe(0);
    expect(parsed.duplicateImports.size).toBe(0);
    expect(parsed.missingImportTargets.size).toBe(0);
    expect(actual).toHaveLength(255);
    expect(sortedPublicMapping(actual)).toEqual(sortedPublicMapping(frozen));
    expect(policyDigest(sortedPublicMapping(actual))).toBe(policy.publicMappingSha256);
  });

  it('allows exactly one geometry change and binds it to the six-dot Figma component', () => {
    const changed = prechange.records
      .filter(({ geometrySha256: frozen, localFile }) => currentGeometry(localFile) !== frozen)
      .map(({ nodeId }) => nodeId);
    expect(changed).toEqual(['2281:144183']);

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

  it('freezes the browser, operating system, raster math, and thresholds', () => {
    const { renderer } = renderContract;
    expect(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH).toBe(renderer.browserExecutablePath);
    expect(sha256(readFileSync(renderer.browserExecutablePath))).toBe(
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
      JSON.parse(readFileSync(resolve(packageRoot, 'node_modules/playwright/package.json'), 'utf8'))
        .version,
    ).toBe(renderer.playwrightVersion);
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
  });
});
