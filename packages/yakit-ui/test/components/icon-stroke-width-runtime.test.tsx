import React, { createRef } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import * as Icons from '../../src/icons';
import * as OldIcons from '../../src/icons/oldicon';

const internalAssets = import.meta.glob('../../src/components/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
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
  for (const drawable of element.querySelectorAll(
    'path,circle,ellipse,line,polyline,polygon,rect,use,text',
  )) {
    const style = getComputedStyle(drawable);
    if (style.stroke !== 'none')
      expect(style.strokeWidth, `${name}: ${drawable.outerHTML}`).toBe('1px');
  }
};
afterEach(() => {
  root?.unmount();
  root = undefined;
  container?.remove();
});

describe('default width across every rendered icon', () => {
  it('renders all 910 family icons, 380 Oldicons and Loading with unit-width strokes', () => {
    const icons = [...Object.entries(Icons), ...Object.entries(OldIcons)];
    expect(icons).toHaveLength(1292);
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

  it('includes all 24 internal component SVGs with their inherited defaults', () => {
    expect(Object.keys(internalAssets)).toHaveLength(24);
    const mounted = render(<div />).firstElementChild!;
    for (const [name, svg] of Object.entries(internalAssets)) {
      mounted.innerHTML = svg;
      assertWidths(mounted, name);
    }
  });

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
