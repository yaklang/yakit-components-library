import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { outlineStrokeContract } from '../../config/iconStrokeContract.generated';
import { BugOutlined, HomeOutlined, Loading } from '../../src';
import { outlineIconRegistry } from '../../src/registry';
import visualWeightReviews from '../fixtures/icons/reference/visual-weight-v2/reviews.json';

const widths = (markup: string) => {
  const shapesOnly = markup.replace(/^<span[^>]*><svg[^>]*>/, '');
  return [...shapesOnly.matchAll(/\bstroke-width="([^"]+)"/g)].map((match) => match[1]);
};

const render = (
  Component: ComponentType<{ svgProps?: Record<string, unknown> }>,
  svgProps?: Record<string, unknown>,
) => renderToStaticMarkup(createElement(Component, { svgProps }));

describe('adjustable icon CSS-free SSR contract', () => {
  it.each([
    ['BugOutlined', BugOutlined],
    ['HomeOutlined', HomeOutlined],
    ['Loading', Loading],
    ...outlineIconRegistry
      .filter(({ exportName }) =>
        visualWeightReviews.reviews.some(
          (review) =>
            review.exportName === exportName &&
            outlineStrokeContract[review.file as keyof typeof outlineStrokeContract]
              .classification === 'adjustable',
        ),
      )
      .map(({ exportName, Component }) => [exportName, Component] as const),
  ] as const)('renders %s overrides on actual stroke nodes', (name, Component) => {
    for (const strokeWidth of [undefined, null, 0, 1, 1.5, 2, 3]) {
      const markup = render(Component, { strokeWidth });
      expect(markup, name).toContain('<svg');
      expect(widths(markup).length, name).toBeGreaterThan(0);
      expect(new Set(widths(markup)), `${name}:${strokeWidth}`).toEqual(
        new Set([String(strokeWidth ?? 1.5)]),
      );
    }
  });

  it('uses style precedence and restores the selected default without CSS', () => {
    expect(
      new Set(widths(render(HomeOutlined, { strokeWidth: 1, style: { strokeWidth: 2 } }))),
    ).toEqual(new Set(['2']));
    expect(
      new Set(widths(render(HomeOutlined, { strokeWidth: 2, style: { strokeWidth: 0 } }))),
    ).toEqual(new Set(['0']));
    expect(new Set(widths(render(HomeOutlined)))).toEqual(new Set(['1.5']));
    expect(new Set(widths(render(Loading)))).toEqual(new Set(['1.5']));
  });

  it('keeps source-native filled contours fixed when strokeWidth is supplied', () => {
    const files = new Set<string>(
      Object.values(outlineStrokeContract)
        .filter((entry) => entry.classification === 'fixed-fill')
        .map((entry) => entry.file),
    );
    expect(files.size).toBe(10);
    for (const { Component, exportName, sourceNodeId } of outlineIconRegistry) {
      if (!files.has(`${sourceNodeId.replace(':', '-')}.svg`)) continue;
      for (const strokeWidth of [0, 1.5, 3]) {
        const markup = render(Component, { strokeWidth });
        expect(widths(markup), exportName).toEqual([]);
        expect(markup, exportName).toContain('fill="currentColor"');
        expect(markup, exportName).not.toMatch(/<path[^>]*\sstroke=/);
      }
    }
  });
});
