import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import outlineManifest from '../../scripts/figma-outline-icons-inventory.json';
import metrics from '../fixtures/icons/reference/outline-controls-298.json';
import baseline from '../fixtures/icons/reference/outline-prechange-baseline-v1.json';
import rendererProvenance from '../fixtures/icons/reference/outline-renderer-provenance-v1.json';
import currentRenderContract from '../fixtures/icons/stroke-width-1/render-contract.json';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outlineRoot = resolve(packageRoot, 'src/icons/outline');
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const roundHalfUp6 = (value: number) => Math.floor(value * 1_000_000 + 0.5) / 1_000_000;
const type7Quantile = (values: number[], probability: number) => {
  const sorted = [...values].sort((left, right) => left - right);
  const h = (sorted.length - 1) * probability;
  const lower = Math.floor(h);
  const fraction = h - lower;
  return (
    sorted[lower] + (sorted[Math.min(lower + 1, sorted.length - 1)] - sorted[lower]) * fraction
  );
};
const semanticEraseMasks = new Map([
  ['14203-193724.svg', 'icon_14203_193724__mask_0'],
  ['38678-28634.svg', 'icon_38678_28634__mask_0'],
]);
const canonicalizeSemanticEraseMask = (source: string, file?: string) => {
  const maskId = file ? semanticEraseMasks.get(file) : undefined;
  if (!maskId) return source;
  const reference = `mask="url(#${maskId})"`;
  const localErasePath =
    '<path d="M3.6001 1.19995L22.2677 19.8676" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>';
  const baselineErasePath =
    '<path d="M3.6001 1.19995L22.2677 19.8676" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  const maskBlock = `<mask id="${maskId}" x="0" y="0" width="24" height="24" maskUnits="userSpaceOnUse" mask-type="luminance">\n<rect width="24" height="24" fill="white"/>\n${localErasePath}\n</mask>`;
  if (source.split(reference).length - 1 !== 1 || source.split(maskBlock).length - 1 !== 1) {
    throw new Error(`Invalid semantic erase-mask contract: ${file}`);
  }

  let canonical = source.replace(maskBlock, '');
  const slashStart =
    file === '14203-193724.svg'
      ? '<path d="M2.3999 2.40002L21.0675 21.0676"'
      : '<path d="M2.3999 2.3999L21.0675 21.0675"';
  if (file === '14203-193724.svg') {
    canonical = canonical.replace(`<g ${reference}>`, '<g>');
  } else {
    canonical = canonical.replace(`<g ${reference}>\n`, '');
    canonical = canonical.replace(`</g>\n${slashStart}`, slashStart);
  }
  canonical = canonical.replace(slashStart, `${baselineErasePath}\n${slashStart}`);
  canonical = canonical.replace(/<defs>\s*<\/defs>\s*/g, '');
  if (canonical.includes(reference) || canonical.includes(maskId)) {
    throw new Error(`Semantic erase-mask canonicalization incomplete: ${file}`);
  }
  return canonical;
};

const geometryProjection = (source: string, file?: string) => {
  source = canonicalizeSemanticEraseMask(source, file);
  const included = new Set([
    'viewBox',
    'd',
    'points',
    'x',
    'y',
    'x1',
    'y1',
    'x2',
    'y2',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'width',
    'height',
    'transform',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'fill-rule',
    'clip-rule',
    'opacity',
    'fill-opacity',
    'stroke-opacity',
    'pathLength',
    'preserveAspectRatio',
  ]);
  const tags: [string, [string, string][]][] = [];
  for (const match of source.matchAll(
    /<(svg|g|path|rect|circle|ellipse|line|polyline|polygon|defs|clipPath|mask|use)\b([^>]*)>/g,
  )) {
    const [, tag, rawAttributes] = match;
    const attributes: [string, string][] = [];
    for (const attribute of rawAttributes.matchAll(/([:\w-]+)=(['"])(.*?)\2/g)) {
      const [, name, , value] = attribute;
      if (included.has(name))
        attributes.push([
          name,
          name === 'stroke-width' && value === '1' ? '2' : value.trim().replace(/\s+/g, ' '),
        ]);
      if (
        (name === 'clip-path' || name === 'mask' || name === 'href' || name === 'xlink:href') &&
        value.includes('#')
      ) {
        attributes.push([name, '#fragment']);
      }
    }
    attributes.sort(([left], [right]) => left.localeCompare(right));
    tags.push([tag, attributes]);
  }
  return JSON.stringify(tags);
};

describe('Outline pre-change baseline', () => {
  it('freezes the intended export, defect, control, and legacy partitions', () => {
    expect(baseline.counts).toEqual({
      preexistingExports: 341,
      defects: 42,
      controls: 298,
      legacy: 1,
    });
    expect(new Set(baseline.defectFiles).size).toBe(42);
    expect(new Set(baseline.controls.map(({ file }) => file)).size).toBe(298);
    expect(baseline.legacyNotebook.file).toBe('45386-154724.svg');
    expect(baseline.legacyNotebook.exportName).toBe('NotebookOutlined');
  });

  it('keeps every control geometry equal to its pre-repair projection', () => {
    const changed = baseline.controls.filter(({ file, geometryProjectionSha256 }) => {
      const source = readFileSync(resolve(outlineRoot, file), 'utf8');
      return sha256(geometryProjection(source, file)) !== geometryProjectionSha256;
    });

    expect(changed.map(({ file }) => file)).toEqual([]);
  });

  it('replaces the legacy Notebook geometry with the current canonical Figma source', () => {
    const notebook = readFileSync(resolve(outlineRoot, baseline.legacyNotebook.file), 'utf8');
    expect(sha256(geometryProjection(notebook))).not.toBe(
      baseline.legacyNotebook.geometryProjectionSha256,
    );
    const currentNotebook = outlineManifest.symbols.find(
      ({ exportedSourceNodeId }) => exportedSourceNodeId === '45386:154724',
    );
    expect(currentNotebook).toMatchObject({
      exportName: 'NotebookOutlined',
      file: '45386-154724.svg',
      name: 'Outline/Notebook',
    });
    expect(currentNotebook?.localRawSvgSha256).toBe(sha256(notebook));
    expect(currentNotebook?.localGeometrySha256).toBe(currentNotebook?.figmaGeometrySha256);

    const landPlot = baseline.exports.find(({ file }) => file === '46174-9893.svg');
    expect(landPlot).toBeUndefined();
  });

  it('records raw and geometry hashes for all 341 pre-change sources', () => {
    expect(baseline.exports).toHaveLength(341);
    for (const row of baseline.exports) {
      expect(row.localRawSvgSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(row.geometryProjectionSha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});

describe('Outline pixel metrics v1 freeze', () => {
  it('keeps the canonical 298-control payload hash immutable', () => {
    const { canonicalPayloadSha256: expected, ...payload } = metrics;
    expect(metrics.controls).toHaveLength(298);
    expect(sha256(`${JSON.stringify(payload)}\n`)).toBe(expected);
  });

  it('binds the metrics to the independently captured Figma frame', () => {
    const reference = readFileSync(
      resolve(packageRoot, 'test/fixtures/icons/reference/outline-frame-46824-1930.png'),
    );
    expect(sha256(reference)).toBe(metrics.provenance.figmaReferenceSha256);
    expect(metrics.provenance.sourcePolicy).toContain('never candidate-derived');
  });

  it('uses the frozen global and per-control gates', () => {
    expect(metrics.globalGates).toEqual({
      maeMaximum: 20,
      iouMinimum: 0.618889,
      boundsDeltaMaximum: 2,
      centroidDeltaMaximum: 0.661033,
    });
    expect(metrics.perControlGates).toEqual({
      maeIncreaseMaximum: 0.25,
      iouDecreaseMaximum: 0.005,
      boundsDeltaIncreaseMaximum: 0,
      centroidDeltaIncreaseMaximum: 0.05,
    });
  });

  it('independently derives the frozen type-7 global thresholds from all 298 controls', () => {
    expect(metrics.controls).toHaveLength(298);
    const iouMinimum = Math.max(
      0,
      roundHalfUp6(
        type7Quantile(
          metrics.controls.map(({ iou }) => iou),
          0.01,
        ) - 0.02,
      ),
    );
    const boundsDeltaMaximum = Math.ceil(
      type7Quantile(
        metrics.controls.map(({ boundsDelta }) => boundsDelta),
        0.99,
      ) + 1,
    );
    const centroidDeltaMaximum = roundHalfUp6(
      type7Quantile(
        metrics.controls.map(({ centroidDelta }) => centroidDelta),
        0.99,
      ) + 0.25,
    );

    expect({ boundsDeltaMaximum, centroidDeltaMaximum, iouMinimum }).toEqual({
      boundsDeltaMaximum: metrics.globalGates.boundsDeltaMaximum,
      centroidDeltaMaximum: metrics.globalGates.centroidDeltaMaximum,
      iouMinimum: metrics.globalGates.iouMinimum,
    });
  });

  it('preserves the historical renderer evidence bound to the frozen metrics', () => {
    const { product, version } = rendererProvenance.browser;
    expect(rendererProvenance.metricsCanonicalPayloadSha256).toBe(metrics.canonicalPayloadSha256);
    expect(product).toBe(metrics.provenance.renderer.browser);
    expect(version).toBe('151.0.7922.174');
    expect(rendererProvenance.operatingSystem).toEqual({
      name: 'macOS',
      version: '15.7.7',
      build: '24G720',
    });
  });

  it('runs current visual checks only under the recorded stroke-width-1 renderer', () => {
    const { renderer } = currentRenderContract;
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
  });
});
