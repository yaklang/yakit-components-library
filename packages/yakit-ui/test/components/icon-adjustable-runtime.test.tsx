import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import {
  BugOutlined,
  ColorSwatchOutlined,
  HomeOutlined,
  Loading,
  RocketLaunchOffOutlined,
  StarOffOutlined,
} from '../../src/icons';
import { outlineIconRegistry } from '../../src/icons/registry';

const roots: Root[] = [];
const render = (node: React.ReactNode) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  flushSync(() => root.render(node));
  return { container, root };
};

const visibleStrokeElements = (container: Element) =>
  [...container.querySelectorAll<SVGElement>('[stroke]')].filter(
    (element) =>
      !element.closest('defs, mask, clipPath') && getComputedStyle(element).stroke !== 'none',
  );

const computedWidths = (container: Element) =>
  visibleStrokeElements(container).map((element) => getComputedStyle(element).strokeWidth);

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount());
  document.body.replaceChildren();
});

describe('adjustable icon runtime stroke contract', () => {
  it.each([0, 1, 1.5, 2, 3])(
    'applies svgProps.strokeWidth=%s to Bug, Home, and Loading visible strokes',
    (strokeWidth) => {
      const { container } = render(
        <>
          <BugOutlined data-icon-name="BugOutlined" svgProps={{ strokeWidth }} />
          <HomeOutlined data-icon-name="HomeOutlined" svgProps={{ strokeWidth }} />
          <Loading data-icon-name="Loading" svgProps={{ strokeWidth }} />
        </>,
      );

      for (const name of ['BugOutlined', 'HomeOutlined', 'Loading']) {
        const icon = container.querySelector(`[data-icon-name="${name}"]`)!;
        const widths = computedWidths(icon);
        expect(widths.length, name).toBeGreaterThan(0);
        expect(new Set(widths), name).toEqual(new Set([`${strokeWidth ?? 1}px`]));
      }
    },
  );

  it('uses svgProps.style.strokeWidth first and restores the source default after rerender', () => {
    const { container, root } = render(
      <HomeOutlined svgProps={{ strokeWidth: 1, style: { strokeWidth: 2 } }} />,
    );
    expect(new Set(computedWidths(container))).toEqual(new Set(['2px']));

    flushSync(() => root.render(<HomeOutlined svgProps={{ strokeWidth: 3 }} />));
    expect(new Set(computedWidths(container))).toEqual(new Set(['3px']));

    flushSync(() => root.render(<HomeOutlined />));
    expect(new Set(computedWidths(container))).toEqual(new Set(['1px']));
  });

  it('keeps two adjustable instances isolated', () => {
    const { container } = render(
      <>
        <HomeOutlined data-width="1" svgProps={{ strokeWidth: 1 }} />
        <HomeOutlined data-width="3" svgProps={{ strokeWidth: 3 }} />
      </>,
    );
    expect(new Set(computedWidths(container.querySelector('[data-width="1"]')!))).toEqual(
      new Set(['1px']),
    );
    expect(new Set(computedWidths(container.querySelector('[data-width="3"]')!))).toEqual(
      new Set(['3px']),
    );
  });

  it('preserves fixed fills when a mixed icon receives stroke width zero', () => {
    const { container } = render(<ColorSwatchOutlined svgProps={{ strokeWidth: 0 }} />);
    expect(new Set(computedWidths(container))).toEqual(new Set(['0px']));
    const filledCircle = container.querySelector<SVGCircleElement>('circle[fill="currentColor"]');
    expect(filledCircle).not.toBeNull();
    expect(getComputedStyle(filledCircle!).fill).not.toBe('none');
  });

  it.each([undefined, 0, 1, 1.5, 2, 3])(
    'couples both reviewed erase masks at width %s',
    (strokeWidth) => {
      for (const Icon of [StarOffOutlined, RocketLaunchOffOutlined]) {
        const { container } = render(<Icon svgProps={{ strokeWidth }} />);
        const visible = computedWidths(container);
        const definition = [...container.querySelectorAll<SVGElement>('mask [stroke]')].map(
          (element) => getComputedStyle(element).strokeWidth,
        );
        expect(definition.length).toBeGreaterThan(0);
        expect(new Set(visible)).toEqual(new Set([`${strokeWidth ?? 1}px`]));
        expect(new Set(definition)).toEqual(new Set([`${strokeWidth ?? 1}px`]));
      }
    },
  );

  it('allows author CSS on a shape to override its presentation width', () => {
    const { container } = render(
      <>
        <style>{'.stroke-css-proof path { stroke-width: 2.5px; }'}</style>
        <BugOutlined className="stroke-css-proof" svgProps={{ strokeWidth: 1 }} />
      </>,
    );
    expect(container.querySelector('path')?.getAttribute('stroke-width')).toBe('1');
    expect(new Set(computedWidths(container))).toEqual(new Set(['2.5px']));
  });

  it.each([undefined, 0, 1, 1.5, 2, 3])(
    'applies width %s to every adjustable Outline and Loading',
    (strokeWidth) => {
      const adjustable = outlineIconRegistry;
      expect(adjustable).toHaveLength(359);
      const { container } = render(
        <>
          {adjustable.map(({ Component, exportName }) => (
            <Component data-icon-name={exportName} key={exportName} svgProps={{ strokeWidth }} />
          ))}
          <Loading data-icon-name="Loading" svgProps={{ strokeWidth }} />
        </>,
      );
      for (const exportName of [...adjustable.map((icon) => icon.exportName), 'Loading']) {
        const icon = container.querySelector(`[data-icon-name="${exportName}"]`)!;
        const widths = computedWidths(icon);
        expect(widths.length, exportName).toBeGreaterThan(0);
        expect(new Set(widths), exportName).toEqual(new Set([`${strokeWidth ?? 1}px`]));
      }
    },
  );

  it.each(['1px', '5%'])('preserves browser-supported width units %s', (strokeWidth) => {
    const { container } = render(<BugOutlined svgProps={{ strokeWidth }} />);
    expect(new Set(computedWidths(container))).toEqual(new Set([strokeWidth]));
  });
});
