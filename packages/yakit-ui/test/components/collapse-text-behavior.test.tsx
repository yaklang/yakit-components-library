import { createRef, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it } from 'vitest';

import CollapseText from '../../src/components/CollapseText';
import type { CollapseTextRef } from '../../src/components/CollapseText';
import ConfigProvider from '../../src/components/ConfigProvider';
import { cleanup, render } from '../helpers/render';

afterEach(() => {
  cleanup();
});

const LONG_TEXT =
  '这段说明足够长，在默认三行限制下需要折叠。展开后仍然能看到完整内容，再点一次即可收起。'.repeat(
    6,
  );

const renderNarrow = (node: ReactNode, width = 240) => {
  const { container, root } = render(<div style={{ width }}>{node}</div>);
  return {
    container,
    root,
    host: container.firstElementChild as HTMLElement,
  };
};

const getAction = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('.yakit-collapse-text-action');

const getContent = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.yakit-collapse-text-content');

describe('CollapseText behavior', () => {
  it('exposes the public root class and forwards the root ref', () => {
    const ref = createRef<CollapseTextRef>();
    const { container } = render(
      <CollapseText ref={ref} content="短文本" className="extra" wrapperClassName="wrap-extra" />,
    );
    const root = container.querySelector('.yakit-collapse-text');
    expect(root).toBeTruthy();
    expect(root).toHaveClass('extra', 'wrap-extra');
    expect(getContent(container)?.textContent).toBe('短文本');
    expect(ref.current).toBe(root);
  });

  it('hides the expand control when the text fits in the collapsed height', () => {
    const { container } = renderNarrow(<CollapseText content="端口开放，服务类型为 nginx。" />);
    expect(getAction(container)).toBeNull();
    expect(getContent(container)?.style.maxHeight).toBe('48px');
  });

  it('shows an expand control when the text overflows, then toggles expand and collapse', () => {
    const { container } = renderNarrow(<CollapseText content={LONG_TEXT} />);
    const content = getContent(container);
    const action = getAction(container);
    expect(action).toBeTruthy();
    expect(action?.textContent).toBe('展开');
    expect(action?.getAttribute('aria-expanded')).toBe('false');
    expect(action?.getAttribute('title')).toBe(LONG_TEXT);
    expect(action?.getAttribute('aria-controls')).toBe(content?.id);
    expect(content?.style.maxHeight).toBe('48px');
    expect(content && content.scrollHeight).toBeGreaterThan(48);

    flushSync(() => {
      getAction(container)?.click();
    });
    const expandedAction = getAction(container);
    expect(expandedAction?.textContent).toBe('收起');
    expect(expandedAction?.getAttribute('aria-expanded')).toBe('true');
    expect(getContent(container)?.style.maxHeight).toBe('');

    flushSync(() => {
      getAction(container)?.click();
    });
    expect(getAction(container)?.textContent).toBe('展开');
    expect(getAction(container)?.getAttribute('aria-expanded')).toBe('false');
    expect(getContent(container)?.style.maxHeight).toBe('48px');
  });

  it('keeps the toggle visible after expanding, because overflow is measured against the collapsed height', () => {
    const { container } = renderNarrow(<CollapseText content={LONG_TEXT} />);
    flushSync(() => {
      getAction(container)?.click();
    });
    expect(getAction(container)?.textContent).toBe('收起');
    expect(getAction(container)).not.toBeNull();
  });

  it('uses a custom row threshold when measuring overflow', () => {
    const oneLine = renderNarrow(<CollapseText content={LONG_TEXT} rows={1} />);
    expect(getAction(oneLine.container)).toBeTruthy();
    expect(getContent(oneLine.container)?.style.maxHeight).toBe('16px');
    cleanup();

    const manyLines = renderNarrow(<CollapseText content="只有一行。" rows={8} />);
    expect(getAction(manyLines.container)).toBeNull();
    expect(getContent(manyLines.container)?.style.maxHeight).toBe('128px');
  });

  it('applies fontSize and lineHeight to the content and the collapsed max height', () => {
    const { container } = renderNarrow(
      <CollapseText content={LONG_TEXT} rows={2} fontSize={14} lineHeight={22} />,
    );
    const content = getContent(container);
    expect(content?.style.fontSize).toBe('14px');
    expect(content?.style.lineHeight).toBe('22px');
    expect(content?.style.maxHeight).toBe('44px');
    expect(getAction(container)).toBeTruthy();
  });

  it('preserves newline characters in the content', () => {
    const content = '第一行\n第二行\n第三行\n第四行';
    const { container } = renderNarrow(<CollapseText content={content} rows={2} />);
    expect(getContent(container)?.textContent).toBe(content);
    expect(getComputedStyle(getContent(container)!).whiteSpace).toBe('pre-wrap');
    expect(getAction(container)).toBeTruthy();
  });

  it('hides the control and collapses when the content shrinks enough to fit', () => {
    const { container, root, host } = renderNarrow(<CollapseText content={LONG_TEXT} />);
    expect(getAction(container)).toBeTruthy();

    flushSync(() => {
      root.render(
        <div style={{ width: 240 }}>
          <CollapseText content="已经很短了。" />
        </div>,
      );
    });
    expect(host.querySelector('.yakit-collapse-text-action')).toBeNull();
    expect(host.querySelector<HTMLElement>('.yakit-collapse-text-content')?.style.maxHeight).toBe(
      '48px',
    );
  });

  it('uses ConfigProvider locale.CollapseText for the toggle labels', () => {
    const { container } = renderNarrow(
      <ConfigProvider
        locale={{ locale: 'en-US', CollapseText: { expand: 'Expand', collapse: 'Collapse' } }}
      >
        <CollapseText content={LONG_TEXT} />
      </ConfigProvider>,
    );
    const action = getAction(container);
    expect(action?.textContent).toBe('Expand');
    flushSync(() => {
      getAction(container)?.click();
    });
    expect(getAction(container)?.textContent).toBe('Collapse');
  });

  it('falls back to default rows when rows is not a positive number', () => {
    const { container } = renderNarrow(<CollapseText content={LONG_TEXT} rows={0} />);
    expect(getContent(container)?.style.maxHeight).toBe('48px');
    expect(getAction(container)).toBeTruthy();
  });
});
