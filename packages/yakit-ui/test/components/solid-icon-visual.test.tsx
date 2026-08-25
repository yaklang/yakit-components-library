import { cdp } from '@vitest/browser/context';
import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { solidIconRegistry } from '../../src/icons/registry';
import raw from '../fixtures/icons/reference/figma-solid-raw-provenance-v1.json';
import prechange from '../fixtures/icons/reference/solid-local-prechange-controls-v1.json';
import contract from '../fixtures/icons/reference/solid-render-contract-v1.json';

const roots: Root[] = [];
const background = [248, 249, 250] as const;
const focusNodeIds = [
  '2281:144183',
  '1:2967',
  '16035:380989',
  '22425:254718',
  '37831:7379',
  '4936:115787',
  '4936:115790',
  '4936:115789',
  '4936:115788',
] as const;
const strokePolicyNodeIds = new Set(contract.localStrokeWidthPolicy.nodeIds);
const colors = [contract.raster.defaultColor, '#123456'] as const;
const rawByNodeId = new Map(
  [...raw.components, ...raw.supplementalComponents].map((record) => [record.nodeId, record.svg]),
);
const definitionByExportName = new Map(
  solidIconRegistry.map((definition) => [definition.exportName, definition]),
);
const exportByNodeId = new Map(
  prechange.records.map((record) => [record.nodeId, record.exportName.replace(/Filled$/, 'Solid')]),
);

interface Bounds {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface InkMetric {
  bounds: Bounds;
  centroid: [number, number];
  mask: boolean[];
}

interface PixelMetric {
  boundsEdgeDelta: number;
  centroidDelta: number;
  iou: number;
  mae: number;
}

const roundHalfUp6 = (value: number) => Math.round((value + Number.EPSILON) * 1e6) / 1e6;

const render = (node: React.ReactNode) => {
  const container = document.createElement('div');
  container.style.background = contract.raster.background;
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  flushSync(() => root.render(node));
  return container;
};

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Unable to rasterize SVG fixture'));
    };
    image.src = blobUrl;
  });

const rasterize = async (source: string) => {
  const { cropHeight: height, cropWidth: width } = contract.raster;
  const canvas = document.createElement('canvas');
  canvas.height = height;
  canvas.width = width;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D context unavailable');
  context.fillStyle = contract.raster.background;
  context.fillRect(0, 0, width, height);
  context.drawImage(await loadImage(source), 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
};

const figmaSourceForColor = (source: string, color: string) =>
  source.replace(/(fill|stroke)="#353639"/gi, `$1="${color}"`);

const localSourceForColor = (nodeId: string, color: string) => {
  const exportName = exportByNodeId.get(nodeId);
  const definition = exportName ? definitionByExportName.get(exportName) : undefined;
  if (!definition) throw new Error(`Missing Solid component for ${nodeId}`);
  const container = render(<definition.Component color={color} size={20} />);
  const svg = container.querySelector('svg');
  if (!svg) throw new Error(`Missing rendered SVG for ${nodeId}`);
  return new XMLSerializer().serializeToString(svg);
};

const inkMetric = (pixels: Uint8ClampedArray): InkMetric => {
  const mask: boolean[] = [];
  const bounds: Bounds = { bottom: -1, left: 20, right: -1, top: 20 };
  let total = 0;
  let weightedX = 0;
  let weightedY = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const pixelIndex = index / 4;
    const x = pixelIndex % contract.raster.cropWidth;
    const y = Math.floor(pixelIndex / contract.raster.cropWidth);
    const intensity = Math.max(
      Math.abs(pixels[index] - background[0]),
      Math.abs(pixels[index + 1] - background[1]),
      Math.abs(pixels[index + 2] - background[2]),
    );
    const ink = intensity > contract.raster.inkMaskThreshold;
    mask.push(ink);
    if (!ink) continue;
    bounds.left = Math.min(bounds.left, x);
    bounds.right = Math.max(bounds.right, x);
    bounds.top = Math.min(bounds.top, y);
    bounds.bottom = Math.max(bounds.bottom, y);
    total += intensity;
    weightedX += (x + 0.5) * intensity;
    weightedY += (y + 0.5) * intensity;
  }
  if (total === 0) throw new Error('Rasterized icon contains no ink');
  return { bounds, centroid: [weightedX / total, weightedY / total], mask };
};

const compare = (figma: Uint8ClampedArray, local: Uint8ClampedArray): PixelMetric => {
  let absoluteError = 0;
  for (let index = 0; index < figma.length; index += 4) {
    absoluteError += Math.abs(figma[index] - local[index]);
    absoluteError += Math.abs(figma[index + 1] - local[index + 1]);
    absoluteError += Math.abs(figma[index + 2] - local[index + 2]);
  }
  const figmaInk = inkMetric(figma);
  const localInk = inkMetric(local);
  let intersection = 0;
  let union = 0;
  for (let index = 0; index < figmaInk.mask.length; index += 1) {
    if (figmaInk.mask[index] && localInk.mask[index]) intersection += 1;
    if (figmaInk.mask[index] || localInk.mask[index]) union += 1;
  }
  const boundsEdgeDelta = Math.max(
    ...(['bottom', 'left', 'right', 'top'] as const).map((edge) =>
      Math.abs(figmaInk.bounds[edge] - localInk.bounds[edge]),
    ),
  );
  return {
    boundsEdgeDelta,
    centroidDelta: roundHalfUp6(
      Math.hypot(
        figmaInk.centroid[0] - localInk.centroid[0],
        figmaInk.centroid[1] - localInk.centroid[1],
      ),
    ),
    iou: roundHalfUp6(intersection / union),
    mae: roundHalfUp6(absoluteError / (contract.raster.cropWidth * contract.raster.cropHeight * 3)),
  };
};

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount());
  document.body.replaceChildren();
});

describe('Solid Figma pixel parity', () => {
  it('runs under the frozen Chromium and raster contract', async () => {
    const browserVersion = await (await cdp()).send('Browser.getVersion');
    expect(browserVersion.product).toBe(`Chrome/${contract.renderer.browserVersion}`);
    expect(navigator.userAgent).toMatch(/(?:Headless)?Chrome\/151\./);
    expect(devicePixelRatio).toBe(contract.raster.deviceScaleFactor);
    expect(contract.metrics).toEqual({
      rounding: 'half-up-six-decimals',
      bounds: 'inclusive',
      centroid: 'intensity-weighted-euclidean',
      maeMaximum: 0.5,
      iouMinimum: 0.995,
      boundsEdgeDeltaMaximum: 0,
      centroidDeltaMaximum: 0.05,
    });
    expect(contract.localStrokeWidthPolicy).toEqual({
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

  it.each(focusNodeIds.flatMap((nodeId) => colors.map((color) => [nodeId, color] as const)))(
    'rasterizes Figma and local %s at %s within the frozen metric gates',
    async (nodeId, color) => {
      const figmaSource = rawByNodeId.get(nodeId);
      expect(figmaSource, nodeId).toBeDefined();
      const metric = compare(
        await rasterize(figmaSourceForColor(figmaSource!, color)),
        await rasterize(localSourceForColor(nodeId, color)),
      );
      const gates = strokePolicyNodeIds.has(nodeId)
        ? contract.localStrokeWidthPolicy.metrics
        : contract.metrics;

      expect(metric.mae, `${nodeId}:${color}:MAE`).toBeLessThanOrEqual(gates.maeMaximum);
      expect(metric.iou, `${nodeId}:${color}:IoU`).toBeGreaterThanOrEqual(gates.iouMinimum);
      expect(metric.boundsEdgeDelta, `${nodeId}:${color}:bounds`).toBeLessThanOrEqual(
        gates.boundsEdgeDeltaMaximum,
      );
      expect(metric.centroidDelta, `${nodeId}:${color}:centroid`).toBeLessThanOrEqual(
        gates.centroidDeltaMaximum,
      );
    },
  );
});
