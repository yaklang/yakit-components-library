import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import * as Icons from '../../src/icons';
import * as OldIcons from '../../src/icons/oldicon';

describe('unit-width server rendered icons without CSS', () => {
  it('preserves all exports and emits no legacy width declarations', () => {
    const icons = [...Object.entries(Icons), ...Object.entries(OldIcons)];
    expect(icons).toHaveLength(1293);
    for (const [name, Icon] of icons) {
      const markup = renderToStaticMarkup(createElement(Icon, { 'aria-label': name }));
      expect(markup, name).toContain('<svg');
      for (const match of markup.matchAll(/stroke-width="([^"]+)"/g))
        expect(match[1], name).toBe('1');
    }
  });
});
