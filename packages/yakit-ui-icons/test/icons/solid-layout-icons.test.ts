import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import solidSource from '../../config/icon-sources/solid.json';
import { canonicalizeSvg } from '../../scripts/audit-icons.mjs';
import updates from '../fixtures/icons/reference/solid-layout-updates-sep30.json';

const solidRoot = resolve(import.meta.dirname, '../../src/solid');

describe('Figma layout icon correction', () => {
  it.each(updates.updates)('$exportName matches its current Figma source', ({ nodeId }) => {
    const svg = solidSource.records.find((record) => record.nodeId === nodeId)!.raw.svg;
    const source = readFileSync(resolve(solidRoot, `${nodeId.replace(':', '-')}.svg`), 'utf8');
    const normalization = { normalizeForegroundPaint: true, normalizeStrokeWidth: false };
    expect(canonicalizeSvg(source, normalization)).toBe(canonicalizeSvg(svg, normalization));
    expect(source).toContain('opacity="0.6"');
    expect(source).not.toMatch(/<mask\b|<clipPath\b/);
  });
});
