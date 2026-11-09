import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';

import reviews from '../../scripts/outline-geometry-overrides.json';
import * as Icons from '../../src/outline';

const names = [
  'SwitchCameraOutlined',
  'CircleArrowUpOutlined',
  'HistoryOutlined',
  'AtOutlined',
  'HandDepositOutlined',
  'TimerOffOutlined',
] as const;
it.each(names)('%s renders with configurable color and stroke width', (name) => {
  const markup = renderToStaticMarkup(
    createElement(Icons[name], { color: '#123456', svgProps: { strokeWidth: 2.5 } }),
  );
  expect(markup).toContain('<svg');
  expect(markup).toContain('#123456');
  expect(markup).toContain('stroke-width="2.5"');
});

it('changes only the four secondary paint attributes on the reviewed DataComparison geometry', () => {
  const source = readFileSync(new URL('../../src/outline/45035-1908.svg', import.meta.url), 'utf8');
  expect(source.match(/opacity="0.5"/g)).toHaveLength(4);
  expect(source).not.toContain('rgb(from');
  const restored = source.replaceAll(
    'opacity="0.5"',
    'color="rgb(from currentColor calc(r + 139) calc(g + 144) calc(b + 152))"',
  );
  const previous = reviews.reviews.find((r) => r.file === '45035-1908.svg')!;
  expect(createHash('sha256').update(restored).digest('hex')).toBe(previous.localRawSvgSha256);
  const markup = renderToStaticMarkup(
    createElement(Icons.DataComparisonOutlined, {
      color: '#123456',
      svgProps: { strokeWidth: 2.5 },
    }),
  );
  expect(markup.match(/opacity="0.5"/g)).toHaveLength(4);
  expect(markup).toContain('stroke-width="2.5"');
});
