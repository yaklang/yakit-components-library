import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { canonicalizeSvg } from '../../scripts/audit-icons.mjs';
import updates from '../fixtures/icons/reference/solid-layout-updates-sep30.json';

const solidRoot = resolve(import.meta.dirname, '../../src/solid');

describe('Figma layout icon correction', () => {
  it.each(updates.updates)(
    '$exportName matches the September 30 Figma export',
    ({ nodeId, svg }) => {
      const source = readFileSync(resolve(solidRoot, `${nodeId.replace(':', '-')}.svg`), 'utf8');
      const normalization = { normalizeForegroundPaint: true, normalizeStrokeWidth: true };
      expect(canonicalizeSvg(source, normalization)).toBe(canonicalizeSvg(svg, normalization));
      expect(source).toContain('opacity="0.6"');
      expect(source).not.toMatch(/<mask\b|<clipPath\b/);
    },
  );
});
