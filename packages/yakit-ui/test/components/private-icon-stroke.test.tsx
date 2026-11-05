import { describe, expect, it } from 'vitest';

import privateSource from '../../config/icon-sources/private.json';

const assets = import.meta.glob('../../src/components/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('UI private SVG assets', () => {
  it('covers registered private assets and preserves inherited stroke defaults', () => {
    expect(
      Object.keys(assets)
        .map((file) => file.replace('../../src/', ''))
        .sort(),
    ).toEqual([...privateSource.files].sort());
    const container = document.createElement('div');
    document.body.append(container);
    try {
      for (const [file, svg] of Object.entries(assets)) {
        container.innerHTML = svg;
        for (const drawable of container.querySelectorAll(
          'path,circle,ellipse,line,polyline,polygon,rect,use,text',
        )) {
          const style = getComputedStyle(drawable);
          if (style.stroke !== 'none') {
            const declared = drawable.closest('[stroke-width], [style*="stroke-width"]');
            expect(style.strokeWidth, file).toBe(declared ? '1.5px' : '1px');
          }
        }
      }
    } finally {
      container.remove();
    }
  });
});
