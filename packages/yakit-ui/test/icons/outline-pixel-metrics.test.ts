import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import { beforeAll, describe, expect, it } from 'vitest';

import manifest from '../../scripts/figma-outline-icons-inventory.json';
import figmaProvenance from '../fixtures/icons/reference/figma-outline-raw-provenance-v1.json';
import metricsBaseline from '../fixtures/icons/reference/outline-controls-298.json';
import prechangeBaseline from '../fixtures/icons/reference/outline-prechange-baseline-v1.json';
import rendererProvenance from '../fixtures/icons/reference/outline-renderer-provenance-v1.json';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outlineRoot = resolve(packageRoot, 'src/icons/outline');
const reportPath = resolve(packageRoot, 'test-results/icons/outline-remediation-report.json');
const referencePath = resolve(
  packageRoot,
  'test/fixtures/icons/reference/outline-frame-46824-1930.png',
);
const frameOrigin = { x: 128, y: 524 };
const aiInstanceNodeId = '45098:8313';
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const wrapperOriginCorrections = new Map([
  ['1:2269', { x: -24, y: 0 }],
  ['1:2293', { x: -24, y: 0 }],
  ['1:2431', { x: 0, y: -24 }],
  ['1:2433', { x: 0, y: -24 }],
]);

interface PixelMetric {
  boundsDelta: number;
  centroidDelta: number;
  exportedSourceNodeId: string;
  iou: number;
  mae: number;
  nodeType: 'component' | 'instance' | 'symbol';
  placementNodeId: string;
}

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const sourceByNode = new Map(
  manifest.symbols.map(({ exportedSourceNodeId, file }) => [exportedSourceNodeId, file]),
);
const exportNameByNode = new Map(
  manifest.symbols.map(({ exportedSourceNodeId, exportName }) => [
    exportedSourceNodeId,
    exportName,
  ]),
);
const publicDefaultColor = (exportedSourceNodeId: string) =>
  ['EarOutlined', 'SunOutlined'].includes(exportNameByNode.get(exportedSourceNodeId) ?? '')
    ? '#0A0A0A'
    : '#353639';
interface GradientPaint {
  gradientStops: Array<{
    color: { a: number; b: number; g: number; r: number };
    position: number;
  }>;
  gradientTransform: number[][];
  type: 'GRADIENT_LINEAR';
}
const aiOverrideProvenance = figmaProvenance.instances.find(
  ({ placementNodeId }) => placementNodeId === aiInstanceNodeId,
);
const aiFillOverride = aiOverrideProvenance?.overrides.find(({ overriddenFields }) =>
  overriddenFields.includes('fills'),
) as { instanceValue?: { fills?: GradientPaint[] } } | undefined;
const aiGradientPaint = aiFillOverride?.instanceValue?.fills?.[0];
if (!aiGradientPaint || aiGradientPaint.type !== 'GRADIENT_LINEAR') {
  throw new Error('Figma AI fill override is missing its linear-gradient payload');
}
const colorHex = ({ b, g, r }: { b: number; g: number; r: number }) =>
  `#${[r, g, b]
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase();
const localPosition = (placement: { exportedSourceNodeId: string; x: number; y: number }) => {
  const correction = wrapperOriginCorrections.get(placement.exportedSourceNodeId) ?? { x: 0, y: 0 };
  return {
    x: placement.x - frameOrigin.x + correction.x,
    y: placement.y - frameOrigin.y + correction.y,
  };
};
const withAiInstanceOverride = (source: string) => {
  const stops = aiGradientPaint.gradientStops
    .map(
      ({ color, position }) =>
        `<stop offset="${position}" stop-color="${colorHex(color)}" stop-opacity="${color.a}"/>`,
    )
    .join('');
  const transform = escapeHtml(JSON.stringify(aiGradientPaint.gradientTransform));
  const gradient = `<defs><linearGradient id="outline-ai-instance-gradient" data-figma-gradient-transform="${transform}" gradientUnits="userSpaceOnUse" x1="4" y1="4" x2="19" y2="20">${stops}</linearGradient></defs>`;
  return source
    .replace(/(<svg\b[^>]*>)/, `$1${gradient}`)
    .replaceAll('"currentColor"', '"url(#outline-ai-instance-gradient)"');
};
const candidateHtml = `<!doctype html><html><head><style>
*{box-sizing:border-box}html,body{margin:0;width:456px;height:1731px;overflow:hidden;background:#f8f9fa}
.icon{position:absolute;display:block;color:#353639}.icon>svg{display:block;width:100%;height:100%}
</style></head><body>${manifest.placements
  .map((placement) => {
    const file = sourceByNode.get(placement.exportedSourceNodeId);
    if (!file) throw new Error(`Missing local source for ${placement.exportedSourceNodeId}`);
    const rawSource = readFileSync(resolve(outlineRoot, file), 'utf8').replace(
      /^<\?xml[^>]*>\s*/i,
      '',
    );
    const isAiOverride = placement.placementNodeId === aiInstanceNodeId;
    const source = isAiOverride ? withAiInstanceOverride(rawSource) : rawSource;
    const position = localPosition(placement);
    return `<div class="icon" data-placement-id="${escapeHtml(placement.placementNodeId)}" data-node-type="${placement.nodeType}" data-instance-override="${isAiOverride ? 'figma-linear-gradient' : 'none'}" style="left:${position.x}px;top:${position.y}px;width:24px;height:24px;color:${publicDefaultColor(placement.exportedSourceNodeId)}">${source}</div>`;
  })
  .join('')}</body></html>`;
const measurementRows = manifest.placements.map((placement) => {
  const position = localPosition(placement);
  return {
    exportedSourceNodeId: placement.exportedSourceNodeId,
    nodeType: placement.nodeType,
    placementNodeId: placement.placementNodeId,
    x: Math.round(position.x),
    y: Math.round(position.y),
  };
});

let aiOverrideEvidence = { candidateChromaticInk: 0, figmaChromaticInk: 0 };
let currentMetrics: PixelMetric[] = [];
let fullFrameMae = Number.POSITIVE_INFINITY;
const failsGlobalGate = ({ boundsDelta, centroidDelta, iou, mae }: PixelMetric) =>
  mae > metricsBaseline.globalGates.maeMaximum ||
  iou < metricsBaseline.globalGates.iouMinimum ||
  boundsDelta > metricsBaseline.globalGates.boundsDeltaMaximum ||
  centroidDelta > metricsBaseline.globalGates.centroidDeltaMaximum;

beforeAll(async () => {
  const { executablePath, version } = rendererProvenance.browser;
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH !== executablePath) {
    throw new Error(`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH must equal ${executablePath}`);
  }
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    if (browser.version() !== version) {
      throw new Error(`Chrome version ${browser.version()} does not match frozen ${version}`);
    }
    const page = await browser.newPage({
      deviceScaleFactor: rendererProvenance.deviceScaleFactor,
      viewport: { height: 1731, width: 456 },
    });
    await page.setContent(candidateHtml, { waitUntil: 'load' });
    const candidatePng = await page.screenshot({ omitBackground: false });
    const referencePng = readFileSync(referencePath);
    const result = await page.evaluate(
      async ({ aiPlacementNodeId, candidate, reference, rows }) => {
        const decode = async (base64: string) => {
          const image = new Image();
          image.src = `data:image/png;base64,${base64}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = 456;
          canvas.height = 1731;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Canvas 2D context unavailable');
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, 456, 1731).data;
        };
        const [local, figma] = await Promise.all([decode(candidate), decode(reference)]);
        const background = [248, 249, 250];
        const round6 = (value: number) => Math.floor(value * 1_000_000 + 0.5) / 1_000_000;
        let frameAbsoluteError = 0;
        for (let offset = 0; offset < local.length; offset += 4) {
          for (let channel = 0; channel < 3; channel += 1) {
            frameAbsoluteError += Math.abs(local[offset + channel] - figma[offset + channel]);
          }
        }
        const metrics = rows.map(
          ({ exportedSourceNodeId, nodeType, placementNodeId, x: x0, y: y0 }) => {
            let absoluteError = 0;
            let intersection = 0;
            let union = 0;
            const localMask: boolean[] = [];
            const figmaMask: boolean[] = [];
            const localWeight: number[] = [];
            const figmaWeight: number[] = [];
            for (let y = 0; y < 24; y += 1) {
              for (let x = 0; x < 24; x += 1) {
                const offset = ((y0 + y) * 456 + x0 + x) * 4;
                let localInkWeight = 0;
                let figmaInkWeight = 0;
                for (let channel = 0; channel < 3; channel += 1) {
                  absoluteError += Math.abs(local[offset + channel] - figma[offset + channel]);
                  localInkWeight = Math.max(
                    localInkWeight,
                    Math.abs(local[offset + channel] - background[channel]),
                  );
                  figmaInkWeight = Math.max(
                    figmaInkWeight,
                    Math.abs(figma[offset + channel] - background[channel]),
                  );
                }
                const localInk = localInkWeight > 8;
                const figmaInk = figmaInkWeight > 8;
                localMask.push(localInk);
                figmaMask.push(figmaInk);
                localWeight.push(localInkWeight);
                figmaWeight.push(figmaInkWeight);
                if (localInk && figmaInk) intersection += 1;
                if (localInk || figmaInk) union += 1;
              }
            }
            const inkGeometry = (mask: boolean[], weight: number[]) => {
              const indexes = mask.flatMap((ink, index) => (ink ? [index] : []));
              if (indexes.length === 0) throw new Error(`Empty ink: ${placementNodeId}`);
              const xs = indexes.map((index) => index % 24);
              const ys = indexes.map((index) => Math.floor(index / 24));
              const total = weight.reduce((sum, value) => sum + value, 0);
              let weightedX = 0;
              let weightedY = 0;
              weight.forEach((value, index) => {
                weightedX += ((index % 24) + 0.5) * value;
                weightedY += (Math.floor(index / 24) + 0.5) * value;
              });
              return {
                bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
                centroid: [weightedX / total, weightedY / total],
              };
            };
            if (union === 0 || !localMask.some(Boolean) || !figmaMask.some(Boolean)) {
              throw new Error(`Empty comparison: ${placementNodeId}`);
            }
            const localInk = inkGeometry(localMask, localWeight);
            const figmaInk = inkGeometry(figmaMask, figmaWeight);
            return {
              boundsDelta: Math.max(
                ...localInk.bounds.map((value, index) => Math.abs(value - figmaInk.bounds[index])),
              ),
              centroidDelta: round6(
                Math.hypot(
                  localInk.centroid[0] - figmaInk.centroid[0],
                  localInk.centroid[1] - figmaInk.centroid[1],
                ),
              ),
              exportedSourceNodeId,
              iou: round6(intersection / union),
              mae: round6(absoluteError / (24 * 24 * 3)),
              nodeType,
              placementNodeId,
            };
          },
        );
        const ai = rows.find(({ placementNodeId }) => placementNodeId === aiPlacementNodeId);
        if (!ai) throw new Error('AI instance placement missing');
        const chromaticInk = (pixels: Uint8ClampedArray) => {
          let count = 0;
          for (let y = 0; y < 24; y += 1) {
            for (let x = 0; x < 24; x += 1) {
              const offset = ((ai.y + y) * 456 + ai.x + x) * 4;
              const channels = [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
              if (Math.max(...channels) - Math.min(...channels) > 30) count += 1;
            }
          }
          return count;
        };
        return {
          aiOverrideEvidence: {
            candidateChromaticInk: chromaticInk(local),
            figmaChromaticInk: chromaticInk(figma),
          },
          fullFrameMae: round6(frameAbsoluteError / (456 * 1731 * 3)),
          metrics,
        };
      },
      {
        aiPlacementNodeId: aiInstanceNodeId,
        candidate: candidatePng.toString('base64'),
        reference: referencePng.toString('base64'),
        rows: measurementRows,
      },
    );
    currentMetrics = result.metrics as PixelMetric[];
    fullFrameMae = result.fullFrameMae;
    aiOverrideEvidence = result.aiOverrideEvidence;

    const currentSymbolBySource = new Map(
      currentMetrics
        .filter(({ nodeType }) => nodeType !== 'instance')
        .map((metric) => [metric.exportedSourceNodeId, metric]),
    );
    const manifestBySource = new Map(
      manifest.symbols.map((symbol) => [symbol.exportedSourceNodeId, symbol]),
    );
    const figmaComponentBySource = new Map(
      figmaProvenance.components.map((component) => [component.nodeId, component]),
    );
    const remediationRows = [
      ...prechangeBaseline.exports
        .filter(({ classification }) => classification === 'defect')
        .map(({ exportedSourceNodeId }) => exportedSourceNodeId),
      '46174:9893',
    ].map((exportedSourceNodeId, index) => {
      const symbol = manifestBySource.get(exportedSourceNodeId);
      const metric = currentSymbolBySource.get(exportedSourceNodeId);
      const figmaComponent = figmaComponentBySource.get(exportedSourceNodeId);
      if (!symbol || !metric || !figmaComponent) {
        throw new Error(`Missing remediation evidence: ${exportedSourceNodeId}`);
      }
      const figmaRawSvgSha256 = sha256(figmaComponent.svg);
      const localRawSvgSha256 = sha256(readFileSync(resolve(outlineRoot, symbol.file)));
      if (
        failsGlobalGate(metric) ||
        figmaRawSvgSha256 !== symbol.figmaRawSvgSha256 ||
        localRawSvgSha256 !== symbol.localRawSvgSha256
      ) {
        throw new Error(`Unresolved remediation evidence: ${exportedSourceNodeId}`);
      }
      return {
        anomalyFamily: index === 42 ? 'inventory-drift' : 'whole-node-fidelity',
        boundsDelta: metric.boundsDelta,
        centroidDelta: metric.centroidDelta,
        disposition: index === 42 ? 'added-canonical-source' : 'repaired-existing',
        exportName: symbol.exportName,
        exportedSourceNodeId,
        figmaRawSvgSha256,
        file: symbol.file,
        geometrySha256: symbol.geometrySha256,
        iou: metric.iou,
        localRawSvgSha256,
        mae: metric.mae,
        normalizedAstSha256: symbol.normalizedAstSha256,
        row: index + 1,
        status: index === 42 ? 'added-canonical-source' : 'passed',
      };
    });
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(
      reportPath,
      `${JSON.stringify(
        {
          legacyNotebook: {
            exportName: prechangeBaseline.legacyNotebook.exportName,
            file: prechangeBaseline.legacyNotebook.file,
            geometryProjectionSha256: prechangeBaseline.legacyNotebook.geometryProjectionSha256,
            status: 'unchanged-legacy-compatibility',
          },
          rows: remediationRows,
          schemaVersion: 'outline-remediation-report-v1',
          unresolved: [],
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await browser.close();
  }
}, 30_000);

describe('Outline pixel metrics v1', () => {
  it('renders the exact 344-placement frame including all three instances', () => {
    expect(currentMetrics).toHaveLength(344);
    expect(currentMetrics.filter(({ nodeType }) => nodeType === 'component')).toHaveLength(341);
    expect(currentMetrics.filter(({ nodeType }) => nodeType === 'instance')).toHaveLength(3);
    expect(fullFrameMae).toBeLessThanOrEqual(metricsBaseline.globalGates.maeMaximum);
    expect(currentMetrics.filter(failsGlobalGate)).toEqual([]);
  });

  it('verifies the AI placement against its real Figma override record and colored render', () => {
    const aiProvenance = figmaProvenance.instances.find(
      ({ placementNodeId }) => placementNodeId === aiInstanceNodeId,
    );
    const aiMetric = currentMetrics.find(
      ({ placementNodeId }) => placementNodeId === aiInstanceNodeId,
    );
    expect(aiProvenance).toMatchObject({
      mainComponentId: '45049:18098',
      overrides: expect.arrayContaining([
        expect.objectContaining({ overriddenFields: expect.arrayContaining(['fills']) }),
        expect.objectContaining({ overriddenFields: expect.arrayContaining(['strokes']) }),
      ]),
    });
    expect(
      aiGradientPaint.gradientStops.map(({ color, position }) => [position, colorHex(color)]),
    ).toEqual([
      [0, '#DC5CDF'],
      [0.6394230723381042, '#8862F8'],
      [1, '#4493FF'],
    ]);
    expect(aiGradientPaint.gradientTransform).toEqual([
      [0.7516543865203857, 0.24834559857845306, 4.912736883966318e-15],
      [-0.24834562838077545, 0.24834562838077545, 0.5],
    ]);
    expect(aiOverrideEvidence.candidateChromaticInk).toBeGreaterThan(0);
    expect(aiOverrideEvidence.figmaChromaticInk).toBeGreaterThan(0);
    expect(aiMetric && failsGlobalGate(aiMetric)).toBe(false);
  });

  it('keeps all 298 controls inside both global and frozen per-icon envelopes', () => {
    const currentById = new Map(
      currentMetrics
        .filter(({ nodeType }) => nodeType !== 'instance')
        .map((metric) => [metric.exportedSourceNodeId, metric]),
    );
    const failures = metricsBaseline.controls.flatMap((frozen) => {
      const current = currentById.get(frozen.exportedSourceNodeId);
      if (!current) return [`${frozen.exportedSourceNodeId}:missing`];
      const failed =
        failsGlobalGate(current) ||
        current.mae > frozen.mae + metricsBaseline.perControlGates.maeIncreaseMaximum ||
        current.iou < frozen.iou - metricsBaseline.perControlGates.iouDecreaseMaximum ||
        current.boundsDelta > frozen.boundsDelta ||
        current.centroidDelta >
          frozen.centroidDelta + metricsBaseline.perControlGates.centroidDeltaIncreaseMaximum;
      return failed
        ? [`${frozen.exportedSourceNodeId}:${JSON.stringify({ frozen, current })}`]
        : [];
    });

    expect(currentById.size).toBe(341);
    expect(metricsBaseline.controls).toHaveLength(298);
    expect(failures).toEqual([]);
  });

  it('passes the frozen joint pixel gates for 42 repairs and canonical LandPlot', () => {
    const remediationIds = new Set([
      ...prechangeBaseline.exports
        .filter(({ classification }) => classification === 'defect')
        .map(({ exportedSourceNodeId }) => exportedSourceNodeId),
      '46174:9893',
    ]);
    const failures = currentMetrics
      .filter(
        ({ exportedSourceNodeId, nodeType }) =>
          nodeType !== 'instance' && remediationIds.has(exportedSourceNodeId),
      )
      .filter(failsGlobalGate);

    expect(remediationIds.size).toBe(43);
    expect(failures).toEqual([]);
  });

  it('writes a deterministic resolved 43-row report with legacy Notebook kept separate', () => {
    const first = readFileSync(reportPath, 'utf8');
    const report = JSON.parse(first) as {
      legacyNotebook: { exportName: string; status: string };
      rows: Array<Record<string, unknown>>;
      unresolved: unknown[];
    };
    const requiredDigests = [
      'figmaRawSvgSha256',
      'localRawSvgSha256',
      'normalizedAstSha256',
      'geometrySha256',
    ];

    expect(report.rows).toHaveLength(43);
    expect(report.rows.slice(0, 42).every(({ status }) => status === 'passed')).toBe(true);
    expect(report.rows[42]).toMatchObject({
      exportedSourceNodeId: '46174:9893',
      row: 43,
      status: 'added-canonical-source',
    });
    expect(
      report.rows.every((row) =>
        requiredDigests.every((field) => /^[a-f0-9]{64}$/.test(String(row[field]))),
      ),
    ).toBe(true);
    expect(report.unresolved).toEqual([]);
    expect(report.legacyNotebook).toEqual(
      expect.objectContaining({
        exportName: 'NotebookOutlined',
        status: 'unchanged-legacy-compatibility',
      }),
    );
    expect(readFileSync(reportPath, 'utf8')).toBe(first);
  });
});
