import React, { createRef } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Loading, LogoOutlined, QuestionMarkCircleOutlined } from '../../src/icons';
import { iconRegistry } from '../../src/icons/registry';

const roots: Root[] = [];
const render = (node: React.ReactNode) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  flushSync(() => root.render(node));
  return container;
};

const getIconParts = (container: HTMLElement) => {
  const span = container.querySelector<HTMLSpanElement>('span.anticon.yakit-icon');
  const svg = span?.querySelector<SVGSVGElement>(':scope > svg');
  expect(span).not.toBeNull();
  expect(svg).not.toBeNull();
  return { span: span!, svg: svg! };
};

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount());
  document.head.querySelectorAll('[data-ant-compat-test]').forEach((node) => node.remove());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('Ant-compatible icon root', () => {
  it('renders one compatibility span with one direct SVG child', () => {
    const { span, svg } = getIconParts(render(<QuestionMarkCircleOutlined />));

    expect(span.getAttribute('role')).toBe('img');
    expect(span.children).toHaveLength(1);
    expect(span.firstElementChild).toBe(svg);
  });

  it('routes consumer class and style only to the span', () => {
    const { span, svg } = getIconParts(
      render(
        <QuestionMarkCircleOutlined
          className="http-history-search-question-icon"
          style={{ marginLeft: 8 }}
        />,
      ),
    );

    expect(span.classList).toContain('http-history-search-question-icon');
    expect(span.style.marginLeft).toBe('8px');
    expect(svg.classList).not.toContain('http-history-search-question-icon');
    expect(svg.style.marginLeft).toBe('');
  });

  it('restores existing Yakit descendant SVG selectors without call-site changes', () => {
    const style = document.createElement('style');
    style.dataset.antCompatTest = '';
    style.textContent =
      '.http-history-search-question-icon svg { width: 16px; height: 16px; color: rgb(36, 104, 172); }';
    document.head.append(style);
    const { span, svg } = getIconParts(
      render(
        <QuestionMarkCircleOutlined
          className="http-history-search-question-icon"
          color="currentColor"
        />,
      ),
    );

    expect(span.matches('.http-history-search-question-icon')).toBe(true);
    expect(getComputedStyle(svg).width).toBe('16px');
    expect(getComputedStyle(svg).height).toBe('16px');
    expect(getComputedStyle(svg).color).toBe('rgb(36, 104, 172)');
  });

  it('delivers click events from the span and supplies Ant click tabIndex', () => {
    const onClick = vi.fn(
      (event: React.MouseEvent<HTMLSpanElement>) => event.currentTarget.tagName,
    );
    const { span } = getIconParts(render(<QuestionMarkCircleOutlined onClick={onClick} />));

    span.click();

    expect(onClick).toHaveBeenCalledOnce();
    expect(onClick.mock.results[0]?.value).toBe('SPAN');
    expect(span.tabIndex).toBe(-1);
  });

  it('preserves an explicit root tabIndex when clickable', () => {
    const { span } = getIconParts(
      render(<QuestionMarkCircleOutlined onClick={() => undefined} tabIndex={3} />),
    );

    expect(span.tabIndex).toBe(3);
  });

  it('forwards refs to the compatibility span', () => {
    const ref = createRef<HTMLSpanElement>();
    const { span } = getIconParts(render(<QuestionMarkCircleOutlined ref={ref} />));

    expect(ref.current).toBe(span);
    expect(ref.current?.tagName).toBe('SPAN');
  });

  it('routes size to the inner SVG', () => {
    const { span, svg } = getIconParts(render(<QuestionMarkCircleOutlined size={16} />));

    expect(span.hasAttribute('width')).toBe(false);
    expect(span.hasAttribute('height')).toBe(false);
    expect(svg.getAttribute('width')).toBe('16');
    expect(svg.getAttribute('height')).toBe('16');
  });

  it('lets presentation-only svgProps override size on the inner SVG', () => {
    const { svg } = getIconParts(
      render(
        <QuestionMarkCircleOutlined
          size={16}
          svgProps={{ className: 'inner', height: 19, preserveAspectRatio: 'xMidYMid', width: 18 }}
        />,
      ),
    );

    expect(svg.classList).toContain('inner');
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('height')).toBe('19');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid');
  });

  it('sanitizes forbidden untyped svgProps and keeps fixed inner accessibility', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const forbiddenSvgProps = {
      'aria-label': 'duplicate accessible node',
      children: <title>replacement</title>,
      dangerouslySetInnerHTML: { __html: '<script>bad()</script>' },
      focusable: 'true',
      onClick: () => undefined,
      role: 'button',
      tabIndex: 0,
    };
    const { svg } = getIconParts(
      render(
        <>
          <QuestionMarkCircleOutlined svgProps={forbiddenSvgProps as never} />
          <QuestionMarkCircleOutlined svgProps={forbiddenSvgProps as never} />
        </>,
      ),
    );

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.hasAttribute('aria-label')).toBe(false);
    expect(svg.hasAttribute('role')).toBe(false);
    expect(svg.hasAttribute('tabindex')).toBe(false);
    expect(svg.querySelector('title')).toBeNull();
    expect(svg.querySelector('script')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(Object.keys(forbiddenSvgProps).length);
  });

  it('keeps root ARIA and data attributes off the inner SVG', () => {
    const { span, svg } = getIconParts(
      render(
        <QuestionMarkCircleOutlined
          aria-label="question"
          data-icon-purpose="help"
          id="question-icon"
        />,
      ),
    );

    expect(span.getAttribute('aria-label')).toBe('question');
    expect(span.getAttribute('data-icon-purpose')).toBe('help');
    expect(span.id).toBe('question-icon');
    expect(svg.hasAttribute('aria-label')).toBe(false);
    expect(svg.hasAttribute('data-icon-purpose')).toBe(false);
    expect(svg.hasAttribute('id')).toBe(false);
  });
});

describe('Ant-compatible icon color', () => {
  const antCss = '.anticon { color: inherit; } .anticon svg { display: inline-block; }';
  const addStyle = (css: string) => {
    const style = document.createElement('style');
    style.dataset.antCompatTest = '';
    style.textContent = css;
    document.head.append(style);
  };

  it('uses the standalone neutral fallback without competing color rules', () => {
    const { span, svg } = getIconParts(render(<QuestionMarkCircleOutlined />));

    expect(getComputedStyle(span).color).toBe('rgb(53, 54, 57)');
    expect(getComputedStyle(svg).color).toBe('rgb(53, 54, 57)');
  });

  it('keeps currentColor inheritable without Ant CSS', () => {
    const container = render(
      <div style={{ color: 'rgb(36, 104, 172)' }}>
        <QuestionMarkCircleOutlined color="currentColor" />
      </div>,
    );
    const { span, svg } = getIconParts(container);

    expect(span.style.color).toBe('');
    expect(svg.style.color).toBe('');
    expect(getComputedStyle(svg).color).toBe('rgb(36, 104, 172)');
  });

  it.each(['before', 'after'] as const)(
    'keeps currentColor inheritable when Ant CSS loads %s package rendering',
    (order) => {
      if (order === 'before') addStyle(antCss);
      const container = render(
        <div style={{ color: 'rgb(36, 104, 172)' }}>
          <QuestionMarkCircleOutlined color="currentColor" />
        </div>,
      );
      if (order === 'after') addStyle(antCss);
      const { span, svg } = getIconParts(container);

      expect(span.style.color).toBe('');
      expect(svg.style.color).toBe('');
      expect(getComputedStyle(svg).color).toBe('rgb(36, 104, 172)');
    },
  );

  it('applies explicit color on the span', () => {
    const { span, svg } = getIconParts(render(<QuestionMarkCircleOutlined color="#123456" />));

    expect(span.style.color).toBe('rgb(18, 52, 86)');
    expect(svg.style.color).toBe('');
    expect(getComputedStyle(svg).color).toBe('rgb(18, 52, 86)');
  });

  it('lets root style color override the explicit color prop', () => {
    const { span } = getIconParts(
      render(<QuestionMarkCircleOutlined color="#123456" style={{ color: '#654321' }} />),
    );

    expect(span.style.color).toBe('rgb(101, 67, 33)');
  });
});

describe('Ant-compatible registry and Loading contracts', () => {
  it('wraps all 911 generated registry icons', () => {
    const container = render(
      <>
        {iconRegistry.map(({ Component, exportName }) => (
          <Component key={exportName} />
        ))}
      </>,
    );

    expect(iconRegistry).toHaveLength(911);
    expect(container.querySelectorAll(':scope > span.anticon.yakit-icon')).toHaveLength(911);
    expect(container.querySelectorAll(':scope > svg')).toHaveLength(0);
  });

  it('keeps Loading animation on the inner SVG with the frozen hashed keyframe', () => {
    const { span, svg } = getIconParts(render(<Loading spin spinSpeed={2} />));

    expect(span.style.animation).toBe('');
    expect(svg.style.animation).toContain('yakitIconLoadingSpin_b1a35c158267');
    expect(svg.style.animation).toContain('2s');
    expect(svg.querySelector('style')).toBeNull();
  });

  it('lets Loading svgProps animation override its computed spin animation', () => {
    const { svg } = getIconParts(
      render(<Loading spin spinSpeed={2} svgProps={{ style: { animation: 'none' } }} />),
    );

    expect(svg.style.animationName).toBe('none');
    expect(svg.style.animation).not.toContain('yakitIconLoadingSpin_b1a35c158267');
  });

  it('uses currentColor for the Loading path', () => {
    const { span, svg } = getIconParts(render(<Loading color="#123456" />));

    expect(span.style.color).toBe('rgb(18, 52, 86)');
    expect(svg.querySelector('path')?.getAttribute('stroke')).toBe('currentColor');
  });
});

describe('Ant-compatible SSR and hydration', () => {
  it('hydrates repeated fragment icons without warnings or identifier drift', async () => {
    const tree = (
      <>
        <LogoOutlined />
        <LogoOutlined />
      </>
    );
    const markup = renderToString(tree, { identifierPrefix: 'ant-compat-' });
    const serverIds = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const container = document.createElement('div');
    container.innerHTML = markup;
    document.body.append(container);
    const errors: unknown[][] = [];
    const root = hydrateRoot(container, tree, {
      identifierPrefix: 'ant-compat-',
      onRecoverableError: (...args) => errors.push(args),
    });
    roots.push(root);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));

    expect(errors).toEqual([]);
    expect([...container.querySelectorAll('span.anticon.yakit-icon')]).toHaveLength(2);
    expect([...container.querySelectorAll('[id]')].map((node) => node.id)).toEqual(serverIds);
  });
});
