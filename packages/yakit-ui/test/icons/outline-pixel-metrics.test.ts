import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import { beforeAll, describe, expect, it } from 'vitest';

import { readIconInputSync } from '../../scripts/icon-source-documents.mjs';
import metricsBaseline from '../fixtures/icons/reference/outline-controls-298.json';
import designUpdates from '../fixtures/icons/reference/outline-design-updates-sep17.json';
import prechangeBaseline from '../fixtures/icons/reference/outline-prechange-baseline-v1.json';
import rendererProvenance from '../fixtures/icons/reference/outline-renderer-provenance-v1.json';
import visualWeightReviews from '../fixtures/icons/reference/visual-weight-v2/reviews.json';
import strokeWidthFixture from '../fixtures/icons/stroke-width-1/before.json';
import currentRenderContract from '../fixtures/icons/stroke-width-1/render-contract.json';

const manifest = JSON.parse(
  readIconInputSync(
    new URL('../../config/icon-sources/outline.json#manifest', import.meta.url),
    'utf8',
  ),
);
const figmaProvenance = JSON.parse(
  readIconInputSync(new URL('../../config/icon-sources/outline.json#raw', import.meta.url), 'utf8'),
);

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outlineRoot = resolve(packageRoot, 'src/icons/outline');
const reportPath = resolve(packageRoot, 'test-results/icons/outline-remediation-report.json');
const referencePath = resolve(
  packageRoot,
  'test/fixtures/icons/reference/outline-frame-46824-1930.png',
);
const frameOrigin = { x: 128, y: 524 };
const frameSize = { height: 1779, width: 457 };
const aiInstanceNodeId = '45098:8313';
const landPlotNodeId = '46174:9893';
const notebookNodeId = '45386:154724';
const timerNodeId = '46879:8170';
const notebookGroupNodeIds = [
  notebookNodeId,
  '46707:8089',
  '46783:88121',
  '46705:8074',
  '46767:87743',
  '46767:87745',
  '46705:8072',
  '46707:8102',
  timerNodeId,
] as const;
const prechangeDefectNodeIds = prechangeBaseline.exports
  .filter(({ classification }) => classification === 'defect')
  .map(({ exportedSourceNodeId }) => exportedSourceNodeId);
const remediationNodeIds = [...prechangeDefectNodeIds, landPlotNodeId, ...notebookGroupNodeIds];
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const wrapperOriginCorrections = new Map([
  ['1:2269', { x: -24, y: 0 }],
  ['1:2293', { x: -24, y: 0 }],
  ['1:2431', { x: 0, y: -24 }],
  ['1:2433', { x: 0, y: -24 }],
]);
const historicalSourceByPath = new Map(
  strokeWidthFixture.assets.map(({ afterPath, beforeSvg }) => [afterPath, beforeSvg]),
);
const historicalOutlineSource = (file: string) => {
  const widthMigrationSource = historicalSourceByPath.get(`icons/outline/${file}`);
  if (widthMigrationSource) return widthMigrationSource;
  const review = visualWeightReviews.reviews.find((item) => item.file === file);
  if (review) {
    const original = readIconInputSync(
      resolve(
        packageRoot,
        'test/fixtures/icons/reference/visual-weight-v2',
        review.oldEvidence.path,
      ),
      'utf8',
    );
    expect(sha256(original)).toBe(review.oldSourceSha256);
    return original;
  }
  return file === '1-3136.svg'
    ? readIconInputSync(
        resolve(packageRoot, 'test/fixtures/icons/adjustable-stroke/bug-original-expanded.svg'),
        'utf8',
      )
    : readIconInputSync(resolve(outlineRoot, file), 'utf8');
};

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
const addedNodeIds = new Set(
  designUpdates.updates.filter(({ added }) => added).map(({ nodeId }) => nodeId),
);
const historicalPlacements = manifest.placements.filter(
  ({ exportedSourceNodeId }) => !addedNodeIds.has(exportedSourceNodeId),
);
const candidateHtml = `<!doctype html><html><head><style>
*{box-sizing:border-box}html,body{margin:0;width:${frameSize.width}px;height:${frameSize.height}px;overflow:hidden;background:#f8f9fa}
.icon{position:absolute;display:block;color:#353639}.icon>svg{display:block;width:100%;height:100%}
</style></head><body>${historicalPlacements
  .map((placement) => {
    const file = sourceByNode.get(placement.exportedSourceNodeId);
    if (!file) throw new Error(`Missing local source for ${placement.exportedSourceNodeId}`);
    const rawSource = historicalOutlineSource(file).replace(/^<\?xml[^>]*>\s*/i, '');
    const isAiOverride = placement.placementNodeId === aiInstanceNodeId;
    const source = isAiOverride ? withAiInstanceOverride(rawSource) : rawSource;
    const position = localPosition(placement);
    return `<div class="icon" data-placement-id="${escapeHtml(placement.placementNodeId)}" data-node-type="${placement.nodeType}" data-instance-override="${isAiOverride ? 'figma-linear-gradient' : 'none'}" style="left:${position.x}px;top:${position.y}px;width:24px;height:24px;color:${publicDefaultColor(placement.exportedSourceNodeId)}">${source}</div>`;
  })
  .join('')}</body></html>`;
const measurementRows = historicalPlacements.map((placement) => {
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
const strokeWidthPolicyGates = {
  boundsDeltaMaximum: 2,
  centroidDeltaMaximum: 0.75,
  iouMinimum: 0.618889,
  maeMaximum: 22,
} as const;
const failsGlobalGate = ({ boundsDelta, centroidDelta, iou, mae }: PixelMetric) =>
  mae > strokeWidthPolicyGates.maeMaximum ||
  iou < strokeWidthPolicyGates.iouMinimum ||
  boundsDelta > strokeWidthPolicyGates.boundsDeltaMaximum ||
  centroidDelta > strokeWidthPolicyGates.centroidDeltaMaximum;

beforeAll(async () => {
  const { browserExecutablePath, browserVersion } = currentRenderContract.renderer;
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH !== browserExecutablePath) {
    throw new Error(`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH must equal ${browserExecutablePath}`);
  }
  const browser = await chromium.launch({ executablePath: browserExecutablePath, headless: true });
  try {
    if (browser.version() !== browserVersion) {
      throw new Error(
        `Chrome version ${browser.version()} does not match current contract ${browserVersion}`,
      );
    }
    const page = await browser.newPage({
      deviceScaleFactor: currentRenderContract.raster.deviceScaleFactor,
      viewport: frameSize,
    });
    await page.setContent(candidateHtml, { waitUntil: 'load' });
    const candidatePng = await page.screenshot({ omitBackground: false });
    const referencePng = readIconInputSync(referencePath);
    const result = await page.evaluate(
      async ({ aiPlacementNodeId, candidate, frameHeight, frameWidth, reference, rows }) => {
        const decode = async (base64: string) => {
          const image = new Image();
          image.src = `data:image/png;base64,${base64}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = frameWidth;
          canvas.height = frameHeight;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Canvas 2D context unavailable');
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, frameWidth, frameHeight).data;
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
                const offset = ((y0 + y) * frameWidth + x0 + x) * 4;
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
              const offset = ((ai.y + y) * frameWidth + ai.x + x) * 4;
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
          fullFrameMae: round6(frameAbsoluteError / (frameWidth * frameHeight * 3)),
          metrics,
        };
      },
      {
        aiPlacementNodeId: aiInstanceNodeId,
        candidate: candidatePng.toString('base64'),
        frameHeight: frameSize.height,
        frameWidth: frameSize.width,
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
    const remediationRows = remediationNodeIds.map((exportedSourceNodeId, index) => {
      const symbol = manifestBySource.get(exportedSourceNodeId);
      const metric = currentSymbolBySource.get(exportedSourceNodeId);
      const figmaComponent = figmaComponentBySource.get(exportedSourceNodeId);
      if (!symbol || !metric || !figmaComponent) {
        throw new Error(`Missing remediation evidence: ${exportedSourceNodeId}`);
      }
      const figmaRawSvgSha256 = sha256(figmaComponent.svg);
      const currentLocalRawSvgSha256 = sha256(readIconInputSync(resolve(outlineRoot, symbol.file)));
      const historicalLocalRawSvgSha256 = sha256(historicalOutlineSource(symbol.file));
      if (
        figmaRawSvgSha256 !== symbol.figmaRawSvgSha256 ||
        currentLocalRawSvgSha256 !== symbol.localRawSvgSha256
      ) {
        throw new Error(`Unresolved remediation evidence: ${exportedSourceNodeId}`);
      }
      let anomalyFamily = 'missing-current-source';
      let disposition = 'added-current-source';
      let status = 'added-current-source';
      if (prechangeDefectNodeIds.includes(exportedSourceNodeId)) {
        anomalyFamily = 'whole-node-fidelity';
        disposition = 'repaired-existing';
        status = 'passed';
      } else if (exportedSourceNodeId === landPlotNodeId) {
        anomalyFamily = 'inventory-drift';
        disposition = 'added-canonical-source';
        status = 'added-canonical-source';
      } else if (exportedSourceNodeId === notebookNodeId) {
        anomalyFamily = 'stale-current-source';
        disposition = 'repaired-current-source';
        status = 'repaired-current-source';
      }
      return {
        anomalyFamily,
        boundsDelta: metric.boundsDelta,
        centroidDelta: metric.centroidDelta,
        disposition,
        exportName: symbol.exportName,
        exportedSourceNodeId,
        figmaRawSvgSha256,
        file: symbol.file,
        geometrySha256: symbol.geometrySha256,
        iou: metric.iou,
        currentLocalRawSvgSha256,
        historicalLocalRawSvgSha256,
        localRawSvgSha256: historicalLocalRawSvgSha256,
        mae: metric.mae,
        normalizedAstSha256: symbol.normalizedAstSha256,
        row: index + 1,
        status,
      };
    });
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(
      reportPath,
      `${JSON.stringify(
        {
          previousNotebookControl: {
            exportName: prechangeBaseline.legacyNotebook.exportName,
            file: prechangeBaseline.legacyNotebook.file,
            geometryProjectionSha256: prechangeBaseline.legacyNotebook.geometryProjectionSha256,
            sourceNodeId: notebookNodeId,
            status: 'replaced-by-current-figma-source',
          },
          rows: remediationRows,
          comparisonMode: 'historical-pre-stroke-width-1-source-vs-frozen-figma-frame',
          schemaVersion: 'outline-remediation-historical-report-v3',
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

describe('Historical Outline pixel diagnostics under the current renderer', () => {
  it('replays the exact pre-stroke-width-1 353-placement frame including all three instances', () => {
    expect(currentMetrics).toHaveLength(353);
    expect(currentMetrics.filter(({ nodeType }) => nodeType === 'component')).toHaveLength(350);
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

  it('keeps all 298 historical controls inside the reviewed 1.5px-vs-Figma envelope', () => {
    const currentById = new Map(
      currentMetrics
        .filter(({ nodeType }) => nodeType !== 'instance')
        .map((metric) => [metric.exportedSourceNodeId, metric]),
    );
    const failures = metricsBaseline.controls.flatMap(({ exportedSourceNodeId }) => {
      const current = currentById.get(exportedSourceNodeId);
      if (!current) return [`${exportedSourceNodeId}:missing`];
      return failsGlobalGate(current) ? [`${exportedSourceNodeId}:${JSON.stringify(current)}`] : [];
    });

    expect(currentById.size).toBe(350);
    expect(metricsBaseline.controls).toHaveLength(298);
    expect(manifest.strokeWidthPolicy).toEqual({
      strategy: 'local-uniform-stroke-v1',
      value: '1',
    });
    expect(rendererProvenance.browser.version).toBe('151.0.7922.174');
    expect(strokeWidthPolicyGates).toEqual({
      boundsDeltaMaximum: 2,
      centroidDeltaMaximum: 0.75,
      iouMinimum: 0.618889,
      maeMaximum: 22,
    });
    expect(failures).toEqual([]);
  });

  it('passes the frozen joint pixel gates for prior repairs, LandPlot, and the Notebook group', () => {
    const remediationIds = new Set(remediationNodeIds);
    const failures = currentMetrics
      .filter(
        ({ exportedSourceNodeId, nodeType }) =>
          nodeType !== 'instance' && remediationIds.has(exportedSourceNodeId),
      )
      .filter(failsGlobalGate);

    expect(remediationIds.size).toBe(52);
    expect(failures).toEqual([]);
  });

  it('writes a deterministic resolved 52-row report with the previous Notebook recorded', () => {
    const first = readIconInputSync(reportPath, 'utf8');
    const report = JSON.parse(first) as {
      previousNotebookControl: { exportName: string; sourceNodeId: string; status: string };
      rows: Array<Record<string, unknown>>;
      unresolved: unknown[];
    };
    const requiredDigests = [
      'figmaRawSvgSha256',
      'currentLocalRawSvgSha256',
      'historicalLocalRawSvgSha256',
      'localRawSvgSha256',
      'normalizedAstSha256',
      'geometrySha256',
    ];
    const landPlotIndex = prechangeDefectNodeIds.length;
    const notebookIndex = landPlotIndex + 1;
    const timerIndex = report.rows.length - 1;

    expect(report.rows).toHaveLength(52);
    expect(
      report.rows
        .slice(0, prechangeDefectNodeIds.length)
        .every(({ status }) => status === 'passed'),
    ).toBe(true);
    expect(report.rows[landPlotIndex]).toMatchObject({
      exportedSourceNodeId: landPlotNodeId,
      row: landPlotIndex + 1,
      status: 'added-canonical-source',
    });
    expect(report.rows[notebookIndex]).toMatchObject({
      exportedSourceNodeId: notebookNodeId,
      row: notebookIndex + 1,
      status: 'repaired-current-source',
    });
    expect(
      report.rows.slice(notebookIndex + 1).every(({ status }) => status === 'added-current-source'),
    ).toBe(true);
    expect(report.rows[timerIndex]).toMatchObject({
      exportedSourceNodeId: timerNodeId,
      row: timerIndex + 1,
      status: 'added-current-source',
    });
    expect(
      report.rows.every((row) =>
        requiredDigests.every((field) => /^[a-f0-9]{64}$/.test(String(row[field]))),
      ),
    ).toBe(true);
    expect(report.unresolved).toEqual([]);
    expect(report.previousNotebookControl).toEqual(
      expect.objectContaining({
        exportName: 'NotebookOutlined',
        sourceNodeId: notebookNodeId,
        status: 'replaced-by-current-figma-source',
      }),
    );
    expect(readIconInputSync(reportPath, 'utf8')).toBe(first);
  });
});
