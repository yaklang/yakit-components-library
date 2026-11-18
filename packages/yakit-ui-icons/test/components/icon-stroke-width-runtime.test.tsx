import React, { createRef } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import * as Icons from '../../src';
import * as OldIcons from '../../src/oldicon';
import { solid as solidSource } from '../helpers/sources';
import { iconCounts, iconExports } from '../icons/icon-inventory';

let root: Root | undefined;
let container: HTMLDivElement;
const render = (node: React.ReactNode) => {
  root?.unmount();
  container?.remove();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  flushSync(() => root!.render(node));
  return container;
};
const assertWidths = (element: Element, name: string) => {
  const selector = 'path,circle,ellipse,line,polyline,polygon,rect,use,text';
  const solid = solidSource.records.find((record) => record.exportName === name);
  const raw = solid
    ? new DOMParser().parseFromString(solid.raw.svg, 'image/svg+xml').querySelectorAll(selector)
    : undefined;
  for (const [index, drawable] of [...element.querySelectorAll(selector)].entries()) {
    const style = getComputedStyle(drawable);
    if (style.stroke !== 'none') {
      // SVGs without a width declaration retain the browser's inherited default.
      const declaredWidth = drawable.closest('[stroke-width], [style*="stroke-width"]');
      const sourceOwner = raw?.[index]?.closest('[stroke-width], [style*="stroke-width"]');
      const sourceWidth =
        (sourceOwner as SVGElement | undefined)?.style?.strokeWidth ||
        sourceOwner?.getAttribute('stroke-width') ||
        '1';
      const declared =
        (declaredWidth as SVGElement | null)?.style?.strokeWidth ||
        declaredWidth?.getAttribute('stroke-width') ||
        '1';
      const expectedWidth = solid
        ? `${sourceWidth}px`
        : iconExports.outline.includes(name)
          ? declaredWidth
            ? '1.5px'
            : '1px'
          : `${Number.parseFloat(declared)}px`;
      expect(style.strokeWidth, `${name}: ${drawable.outerHTML}`).toBe(expectedWidth);
    }
  }
};
afterEach(() => {
  root?.unmount();
  root = undefined;
  container?.remove();
});

describe('default width across every rendered icon', () => {
  it('renders every icon with its family stroke-width policy', () => {
    const icons = [...Object.entries(Icons), ...Object.entries(OldIcons)];
    expect(icons).toHaveLength(iconCounts.all);
    expect(icons.map(([name]) => name).sort()).toEqual([...iconExports.all].sort());
    for (let index = 0; index < icons.length; index += 24) {
      const batch = icons.slice(index, index + 24);
      const mounted = render(
        <>
          {batch.map(([name, Icon]) => (
            <Icon key={name} data-icon-name={name} />
          ))}
        </>,
      );
      for (const [name] of batch) {
        const icon = mounted.querySelector(`[data-icon-name="${name}"]`)!;
        expect(icon.querySelector('svg'), name).not.toBeNull();
        assertWidths(icon, name);
      }
    }
  }, 30000);

  it('preserves size, color, aria, ref and caller-owned SVG presentation overrides', () => {
    const ref = createRef<HTMLSpanElement>();
    const mounted = render(
      <Icons.Loading
        ref={ref}
        aria-label="Loading"
        size={32}
        color="#123456"
        svgProps={{ strokeWidth: 3, style: { opacity: 0.5 } }}
      />,
    );
    const svg = mounted.querySelector('svg')!;
    expect(ref.current).toBe(mounted.firstElementChild);
    expect(ref.current?.getAttribute('aria-label')).toBe('Loading');
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('stroke-width')).toBe('3');
    expect(getComputedStyle(svg).opacity).toBe('0.5');
    // Loading binds the presentation override to its actual stroke.
    expect(getComputedStyle(svg.querySelector('path')!).strokeWidth).toBe('3px');
    expect(getComputedStyle(svg.querySelector('path')!).stroke).toBe('rgb(18, 52, 86)');
  });
});
