import { type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { readOldiconAssets } from '../../../yakit-ui-icons/scripts/oldicon-assets.mjs';
import { iconCounts } from '../../../yakit-ui-icons/test/icons/icon-inventory';
import iconMeta from '../../.storybook/stories/Icon.stories';
import oldIconMeta, * as oldIconStories from '../../.storybook/stories/OldIcon.stories';

const oldIconInventory = readOldiconAssets();

const expectedExports = oldIconInventory.exports.map(({ exportName }) => exportName);
const oldIconImportPath = '@yakit-libs/yakit-ui-icons/oldicon';

const renderStory = (story: unknown) => {
  const render = (story as { render?: () => ReactElement }).render;
  expect(render).toBeTypeOf('function');
  return renderToStaticMarkup(render!());
};

const attributeValues = (markup: string, attribute: string) =>
  [...markup.matchAll(new RegExp(`${attribute}="([^"]+)"`, 'g'))].map((match) => match[1]);

describe('oldIcon Storybook contract', () => {
  it('exposes only Overview and All Icons under the existing Icon group', () => {
    expect(oldIconMeta.title).toBe('YakitUi/通用/Icon/oldIcon');
    expect(iconMeta.title).toBe('YakitUi/通用/Icon');
    expect(oldIconMeta.title).not.toContain('Icon 迁移审查');
    expect(
      Object.keys(oldIconStories)
        .filter((name) => name !== 'default')
        .sort(),
    ).toEqual(['AllIcons', 'Overview']);
  });

  it('renders all 380 canonical oldicon exports exactly once without family metadata', () => {
    expect(expectedExports).toHaveLength(iconCounts.oldicon);
    expect(new Set(expectedExports).size).toBe(iconCounts.oldicon);

    const markup = renderStory(oldIconStories.AllIcons);
    const renderedExports = attributeValues(markup, 'data-oldicon-export');

    expect(renderedExports).toEqual(expectedExports);
    expect(new Set(renderedExports).size).toBe(iconCounts.oldicon);
    expect(markup).toContain(`data-oldicon-total="${iconCounts.oldicon}"`);
    expect(markup).not.toContain('data-oldicon-family');
    expect(markup).not.toContain('data-canary-');
  });

  it('uses the canonical oldicon import path for every gallery card', () => {
    const markup = renderStory(oldIconStories.AllIcons);
    const importPaths = attributeValues(markup, 'data-oldicon-import');

    expect(importPaths).toHaveLength(iconCounts.oldicon);
    expect(new Set(importPaths)).toEqual(new Set([oldIconImportPath]));
    expect(
      [...markup.matchAll(/import \{ ([A-Za-z0-9]+) \} from &#x27;[^&]+&#x27;;/g)].map(
        (match) => match[1],
      ),
    ).toEqual(expectedExports);
  });

  it('keeps Overview lightweight and documents the compatibility boundary', () => {
    const markup = renderStory(oldIconStories.Overview);

    expect(attributeValues(markup, 'data-oldicon-export')).toHaveLength(0);
    expect(markup).toContain('data-oldicon-summary="true"');
    expect(markup).toContain(String(iconCounts.oldicon));
    expect(markup).not.toContain('source paths');
    expect(markup).toContain(oldIconImportPath);
    expect(markup).toContain('没有可靠的 Outline、Solid 或 Colorful family 元数据');
  });
});
