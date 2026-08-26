import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { QuestionMarkCircleOutlined } from '../../src/icons';
import {
  DeletedOutlineQuestionmarkcircleIcon,
  Naked020QuestionmarkcircleIcon,
} from '../fixtures/icons/ant48-compat/DeletedQuestionmarkcircle';

const renderThreeWay = () => ({
  historical: renderToStaticMarkup(
    React.createElement(DeletedOutlineQuestionmarkcircleIcon, {
      className: 'consumer',
      onClick: () => undefined,
      style: { marginLeft: 8 },
    }),
  ),
  naked020: renderToStaticMarkup(
    React.createElement(Naked020QuestionmarkcircleIcon, {
      className: 'consumer',
      onClick: () => undefined,
      size: 16,
      style: { marginLeft: 8 },
    }),
  ),
  p0: renderToStaticMarkup(
    React.createElement(QuestionMarkCircleOutlined, {
      className: 'consumer',
      onClick: () => undefined,
      size: 16,
      style: { marginLeft: 8 },
    }),
  ),
});

describe('historical / 0.2.0 / P0 prop ownership matrix', () => {
  it('restores class and style ownership from naked SVG to the span', () => {
    const matrix = renderThreeWay();

    expect(matrix.historical).toMatch(/^<span[^>]+class="anticon consumer"[^>]+style=/);
    expect(matrix.naked020).toMatch(/^<svg[^>]+class="consumer"[^>]+style=/);
    expect(matrix.p0).toMatch(/^<span[^>]+class="anticon yakit-icon consumer"[^>]+style=/);
  });

  it('restores Ant click tabIndex on the P0 span', () => {
    const matrix = renderThreeWay();

    expect(matrix.historical).toContain('tabindex="-1"');
    expect(matrix.naked020).not.toContain('tabindex=');
    expect(matrix.p0).toContain('tabindex="-1"');
  });

  it('keeps the census-proven size delta on the P0 inner SVG', () => {
    const matrix = renderThreeWay();
    const historicalSvg = matrix.historical.slice(matrix.historical.indexOf('<svg'));
    const p0Svg = matrix.p0.slice(matrix.p0.indexOf('<svg'));

    expect(historicalSvg).toContain('width="24" height="24"');
    expect(matrix.naked020).toContain('width="16" height="16"');
    expect(p0Svg).toContain('width="16" height="16"');
  });

  it('keeps fixed P0 inner accessibility as an explicit historical delta', () => {
    const matrix = renderThreeWay();
    const historicalSvg = matrix.historical.slice(matrix.historical.indexOf('<svg'));
    const p0Svg = matrix.p0.slice(matrix.p0.indexOf('<svg'));

    expect(historicalSvg).not.toContain('aria-hidden');
    expect(matrix.naked020).toContain('aria-hidden="true"');
    expect(p0Svg).toContain('aria-hidden="true"');
    expect(p0Svg).toContain('focusable="false"');
  });
});
