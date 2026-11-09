import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  DeletedOutlineQuestionmarkcircleIcon,
  DeletedQuestionmarkcircleSvg,
} from '../fixtures/icons/ant48-compat/DeletedQuestionmarkcircle';

const fixtureDirectory = resolve(process.cwd(), 'test/fixtures/icons/ant48-compat');

describe('Ant 4.8 deleted Yakit icon golden', () => {
  it('keeps the fixture self-contained and provenance-locked', () => {
    const provenance = JSON.parse(
      readFileSync(resolve(fixtureDirectory, 'provenance.json'), 'utf8'),
    ) as { antPackage: string; contract: Record<string, unknown> };

    expect(provenance).toMatchObject({
      antPackage: '@ant-design/icons@4.8.0',
      contract: {
        clickTabIndex: -1,
        consumerPropsOwner: 'span',
        publicWrapperForwardsRef: false,
        rawSvgAcceptsProps: false,
      },
    });
  });

  it('renders consumer class and click tabIndex on the historical span', () => {
    const markup = renderToStaticMarkup(
      React.createElement(DeletedOutlineQuestionmarkcircleIcon, {
        className: 'consumer-icon',
        onClick: () => undefined,
      }),
    );

    expect(markup).toMatch(/^<span role="img" class="anticon consumer-icon" tabindex="-1">/);
  });

  it('keeps historical consumer props off the zero-argument inner SVG', () => {
    const markup = renderToStaticMarkup(
      React.createElement(DeletedOutlineQuestionmarkcircleIcon, {
        className: 'consumer-icon',
        style: { color: '#123456' },
      }),
    );
    const svgMarkup = markup.slice(markup.indexOf('<svg'));

    expect(svgMarkup).not.toContain('consumer-icon');
    expect(svgMarkup).not.toContain('style=');
    expect(svgMarkup).not.toContain('aria-hidden');
    expect(svgMarkup).not.toContain('focusable');
  });

  it('keeps the deleted raw question icon geometry frozen', () => {
    const markup = renderToStaticMarkup(React.createElement(DeletedQuestionmarkcircleSvg));

    expect(markup).toContain('width="24" height="24" viewBox="0 0 24 24"');
    expect(markup).toContain('stroke="currentColor"');
    expect(markup).toContain('<circle cx="12" cy="17" r="1" fill="currentColor">');
  });

  it('freezes the Ant 4.8 selector surface needed by Yakit styles', () => {
    const css = readFileSync(resolve(fixtureDirectory, 'ant48.css'), 'utf8');

    expect(css).toContain('.anticon {');
    expect(css).toContain('color: inherit;');
    expect(css).toContain('.anticon svg {');
    expect(css).toContain('.anticon[tabindex] {');
  });
});
