import { Loading, LoadingOutlined } from '@yakit-libs/yakit-ui-icons';
import React, { createRef, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfigProvider from '../../src/components/ConfigProvider';
import Spin from '../../src/components/Spin';
import type { SpinRef } from '../../src/components/Spin';
import { cleanup, render } from '../helpers/render';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const themeColorOf = (container: HTMLElement) => {
  const probe = document.createElement('div');
  probe.style.color = 'var(--Colors-Use-Main-Primary)';
  container.append(probe);
  return getComputedStyle(probe).color;
};

const expectStandalone = (container: HTMLElement) => {
  const root = container.querySelector('.yakit-spin') as HTMLElement;
  expect(root.classList.contains('yakit-spin-nested')).toBe(false);
  expect(container.querySelector('.yakit-spin-container')).toBeNull();
  expect(container.querySelector('.yakit-spin-nest')).toBeNull();
  expect(getComputedStyle(root).display).toBe('inline-flex');
};

describe('Spin behavior', () => {
  it('spins by default and exposes the public root class', () => {
    const { container } = render(<Spin />);
    const root = container.querySelector('.yakit-spin');
    expect(root).toBeTruthy();
    expect(root?.classList.contains('yakit-spin-spinning')).toBe(true);
    expect(root?.classList.contains('yakit-spin-medium')).toBe(true);
    expect(root?.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('.yakit-spin-dot')).toBeTruthy();
    expect(container.querySelector('.ant-spin')).toBeNull();
  });

  it('exposes the root DOM through ref', () => {
    const ref = createRef<SpinRef>();
    const { container } = render(<Spin ref={ref} />);
    const root = container.querySelector('.yakit-spin');
    expect(ref.current).toBe(root);
    expect(ref.current?.tagName).toBe('DIV');
  });

  it('stops spinning when spinning is false', () => {
    const { container } = render(
      <Spin spinning={false}>
        <p>ready</p>
      </Spin>,
    );
    const root = container.querySelector('.yakit-spin');
    expect(root?.classList.contains('yakit-spin-spinning')).toBe(false);
    expect(root?.getAttribute('aria-busy')).toBe('false');
    expect(container.textContent).toContain('ready');
    expect(container.querySelector('.yakit-spin-dot')).toBeNull();
  });

  it('overlays children when spinning', () => {
    const { container } = render(
      <Spin spinning>
        <p>panel</p>
      </Spin>,
    );
    const root = container.querySelector('.yakit-spin');
    expect(root?.classList.contains('yakit-spin-nested')).toBe(true);
    expect(container.querySelector('.yakit-spin-container')?.textContent).toContain('panel');
    expect(container.querySelector('.yakit-spin-section')).toBeTruthy();
    expect(container.querySelector('.yakit-spin-dot')).toBeTruthy();
  });

  it('still shows tip when there are no children and reserves a nest', () => {
    const { container } = render(<Spin tip="加载中..." />);
    expect(container.querySelector('.yakit-spin-tip')?.textContent).toBe('加载中...');
    expect(container.querySelector('.yakit-spin-nest')).toBeTruthy();
    expect(container.querySelector('.yakit-spin')?.classList.contains('yakit-spin-nested')).toBe(
      true,
    );
  });

  it.each([null, false, ''] as const)('does not nest when children is %j', (children) => {
    const { container } = render(<Spin>{children}</Spin>);
    expectStandalone(container);
  });

  it('does not nest when children are only empty values', () => {
    const emptyArray = render(<Spin>{[]}</Spin>);
    expectStandalone(emptyArray.container);
    cleanup();

    const emptySiblings = render(
      <Spin>
        {null}
        {false}
      </Spin>,
    );
    expectStandalone(emptySiblings.container);
    cleanup();

    const emptyFragment = render(
      <Spin>
        <></>
      </Spin>,
    );
    expectStandalone(emptyFragment.container);
  });

  it('still nests a tip placeholder when children is null', () => {
    const { container } = render(<Spin tip="加载中...">{null}</Spin>);
    expect(container.querySelector('.yakit-spin-tip')?.textContent).toBe('加载中...');
    expect(container.querySelector('.yakit-spin-nest')).toBeTruthy();
    expect(container.querySelector('.yakit-spin')?.classList.contains('yakit-spin-nested')).toBe(
      true,
    );
  });

  it('still nests a tip placeholder when children are only empty values', () => {
    const emptyArray = render(<Spin tip="加载中...">{[]}</Spin>);
    expect(emptyArray.container.querySelector('.yakit-spin-tip')?.textContent).toBe('加载中...');
    expect(emptyArray.container.querySelector('.yakit-spin-nest')).toBeTruthy();
    expect(
      emptyArray.container.querySelector('.yakit-spin')?.classList.contains('yakit-spin-nested'),
    ).toBe(true);
    cleanup();

    const emptySiblings = render(
      <Spin tip="加载中...">
        {null}
        {false}
      </Spin>,
    );
    expect(emptySiblings.container.querySelector('.yakit-spin-nest')).toBeTruthy();
    cleanup();

    const emptyFragment = render(
      <Spin tip="加载中...">
        <></>
      </Spin>,
    );
    expect(emptyFragment.container.querySelector('.yakit-spin-nest')).toBeTruthy();
  });

  it('applies only small, medium and large size classes, defaulting to medium', () => {
    const small = render(<Spin size="small" />);
    expect(small.container.querySelector('.yakit-spin-small')).toBeTruthy();
    expect(small.container.querySelector('.yakit-spin-medium')).toBeNull();
    expect(small.container.querySelector('.yakit-spin-large')).toBeNull();
    cleanup();

    const large = render(<Spin size="large" />);
    expect(large.container.querySelector('.yakit-spin-large')).toBeTruthy();
    expect(large.container.querySelector('.yakit-spin-small')).toBeNull();
    expect(large.container.querySelector('.yakit-spin-medium')).toBeNull();
    cleanup();

    const medium = render(<Spin size="medium" />);
    expect(medium.container.querySelector('.yakit-spin-medium')).toBeTruthy();
    expect(medium.container.querySelector('.yakit-spin-small')).toBeNull();
    expect(medium.container.querySelector('.yakit-spin-large')).toBeNull();
    cleanup();

    const omitted = render(<Spin />);
    expect(omitted.container.querySelector('.yakit-spin-medium')).toBeTruthy();
    expect(omitted.container.querySelector('.yakit-spin-small')).toBeNull();
    expect(omitted.container.querySelector('.yakit-spin-large')).toBeNull();
  });

  it('keeps a standalone small spinner inline and does not stretch to fill the parent', () => {
    const { container } = render(
      <div style={{ width: 240, height: 120 }}>
        <Spin size="small" />
      </div>,
    );
    const root = container.querySelector('.yakit-spin') as HTMLElement;
    expect(root.classList.contains('yakit-spin-nested')).toBe(false);
    expect(container.querySelector('.yakit-spin-nest')).toBeNull();
    expect(container.querySelector('.yakit-spin-container')).toBeNull();
    expect(getComputedStyle(root).display).toBe('inline-flex');
    const rootRect = root.getBoundingClientRect();
    expect(rootRect.width).toBeLessThan(240);
    expect(rootRect.height).toBeLessThan(120);
  });

  it('passes a custom indicator without the default dot size class', () => {
    const { container } = render(
      <Spin
        indicator={
          <span
            className="custom-indicator"
            style={{ display: 'inline-block', width: 16, height: 16 }}
          />
        }
      />,
    );
    const node = container.querySelector('.custom-indicator') as HTMLElement;
    expect(node).toBeTruthy();
    expect(node.classList.contains('yakit-spin-custom')).toBe(true);
    expect(node.classList.contains('yakit-spin-dot')).toBe(false);
    expect(container.querySelector('.yakit-spin-dot-item')).toBeNull();
    expect(node.parentElement?.classList.contains('yakit-spin-custom-spin')).toBe(false);
    expect(node.hasAttribute('color')).toBe(false);
    expect(node.hasAttribute('size')).toBe(false);
    expect(getComputedStyle(node).width).toBe('16px');
    expect(getComputedStyle(node).height).toBe('16px');
  });

  it('renders a fragment indicator that contains a real node', () => {
    const { container } = render(
      <Spin
        indicator={
          <>
            <span
              className="custom-indicator"
              style={{ display: 'inline-block', width: 16, height: 16 }}
            />
          </>
        }
      >
        <p>body</p>
      </Spin>,
    );
    const node = container.querySelector('.custom-indicator') as HTMLElement;
    expect(node).toBeTruthy();
    expect(node.classList.contains('yakit-spin-custom')).toBe(true);
    expect(container.querySelector('.yakit-spin-dot')).toBeNull();
    expect(container.querySelector('.yakit-spin-spinning')).toBeTruthy();
    expect(container.querySelector('.yakit-spin-container')?.textContent).toContain('body');
    expect(node.parentElement?.classList.contains('yakit-spin-custom-spin')).toBe(false);
    expect(getComputedStyle(node).width).toBe('16px');
    expect(getComputedStyle(node).height).toBe('16px');
  });

  it('lets LoadingOutlined inherit the spin color and follow the Spin size', () => {
    const { container } = render(<Spin indicator={<LoadingOutlined spin />} size="small" />);
    const root = container.querySelector('.yakit-spin') as HTMLElement;
    const icon = container.querySelector('.anticon.yakit-icon') as HTMLElement;
    const svg = icon.querySelector('svg') as SVGSVGElement;
    expect(container.querySelector('.yakit-spin-dot')).toBeNull();
    expect(icon.classList.contains('yakit-spin-custom')).toBe(true);
    expect(icon.style.animation).toBe('');
    expect(svg.classList.contains('yakit-icon-spinning')).toBe(true);
    expect(getComputedStyle(svg).animationName).toBe('yakitIconLoadingSpin_b1a35c158267');
    expect(getComputedStyle(icon).color).toBe(getComputedStyle(root).color);
    expect(svg.getAttribute('width')).toBe('14');
    expect(svg.getAttribute('height')).toBe('14');
    cleanup();

    const large = render(<Spin indicator={<LoadingOutlined spin />} size="large" />);
    expect(large.container.querySelector('svg')?.getAttribute('width')).toBe('32');
    cleanup();

    const customSize = render(<Spin indicator={<LoadingOutlined spin size={48} />} size="small" />);
    expect(customSize.container.querySelector('svg')?.getAttribute('width')).toBe('48');
  });

  it('does not inject color or size into a custom component indicator', () => {
    const SpreadingIndicator = (
      props: React.HTMLAttributes<HTMLSpanElement> & { color?: string; size?: number },
    ) => <span data-testid="spreading-indicator" {...props} />;
    const SizedIndicator = ({ size = 48 }: { size?: number; color?: string }) => (
      <span data-testid="sized-indicator" data-size={size} />
    );
    const ForwardingIndicator = ({
      className,
      size = 48,
    }: {
      className?: string;
      size?: number;
      color?: string;
    }) => <span data-testid="forwarding-indicator" className={className} data-size={size} />;

    const spreading = render(<Spin indicator={<SpreadingIndicator />} />);
    const spreadingNode = spreading.container.querySelector(
      '[data-testid="spreading-indicator"]',
    ) as HTMLElement;
    expect(spreadingNode.classList.contains('yakit-spin-custom')).toBe(true);
    expect(spreadingNode.hasAttribute('color')).toBe(false);
    expect(spreadingNode.hasAttribute('size')).toBe(false);
    cleanup();

    const sized = render(<Spin indicator={<SizedIndicator />} size="small" />);
    const sizedNode = sized.container.querySelector(
      '[data-testid="sized-indicator"]',
    ) as HTMLElement;
    expect(sizedNode.classList.contains('yakit-spin-custom')).toBe(false);
    expect(sizedNode.getAttribute('data-size')).toBe('48');
    cleanup();

    const forwarding = render(<Spin indicator={<ForwardingIndicator />} size="small" />);
    const forwardingNode = forwarding.container.querySelector(
      '[data-testid="forwarding-indicator"]',
    ) as HTMLElement;
    expect(forwardingNode.classList.contains('yakit-spin-custom')).toBe(true);
    expect(forwardingNode.getAttribute('data-size')).toBe('48');
    expect(forwardingNode.hasAttribute('color')).toBe(false);
    expect(forwardingNode.hasAttribute('size')).toBe(false);
  });

  it('injects color and size into the hand-marked Loading icon', () => {
    const { container } = render(<Spin indicator={<Loading />} size="small" />);
    const root = container.querySelector('.yakit-spin') as HTMLElement;
    const icon = container.querySelector('.anticon.yakit-icon') as HTMLElement;
    const svg = icon.querySelector('svg') as SVGSVGElement;
    expect(container.querySelector('.yakit-spin-dot')).toBeNull();
    expect(icon.classList.contains('yakit-spin-custom')).toBe(true);
    expect(getComputedStyle(icon).color).toBe(getComputedStyle(root).color);
    expect(svg.getAttribute('width')).toBe('14');
    expect(svg.getAttribute('height')).toBe('14');
  });

  it('can hide the default dots with an empty fragment or null indicator', () => {
    const hidden = render(<Spin indicator={<></>} tip="处理中..." />);
    expect(hidden.container.querySelector('.yakit-spin-dot-item')).toBeNull();
    expect(hidden.container.querySelector('.yakit-spin-tip')?.textContent).toBe('处理中...');
    cleanup();

    const hiddenByWhitespace = render(
      <Spin indicator={<> </>} tip="处理中...">
        <p>body</p>
      </Spin>,
    );
    expect(hiddenByWhitespace.container.querySelector('.yakit-spin-dot')).toBeNull();
    expect(hiddenByWhitespace.container.querySelector('.yakit-spin-dot-item')).toBeNull();
    expect(hiddenByWhitespace.container.querySelector('.yakit-spin-custom')).toBeNull();
    expect(hiddenByWhitespace.container.querySelector('.yakit-spin-tip')?.textContent).toBe(
      '处理中...',
    );
    expect(
      hiddenByWhitespace.container.querySelector('.yakit-spin-container')?.textContent,
    ).toContain('body');
    cleanup();

    const hiddenWithChildren = render(
      <Spin indicator={<></>} tip="处理中...">
        <p>body</p>
      </Spin>,
    );
    expect(hiddenWithChildren.container.querySelector('.yakit-spin-dot')).toBeNull();
    expect(hiddenWithChildren.container.querySelector('.yakit-spin-dot-item')).toBeNull();
    expect(hiddenWithChildren.container.querySelector('.yakit-spin-custom')).toBeNull();
    expect(hiddenWithChildren.container.querySelector('.yakit-spin-tip')?.textContent).toBe(
      '处理中...',
    );
    expect(
      hiddenWithChildren.container.querySelector('.yakit-spin-container')?.textContent,
    ).toContain('body');
    expect(hiddenWithChildren.container.querySelector('.yakit-spin-nested')).toBeTruthy();
    cleanup();

    const hiddenByNull = render(
      <Spin indicator={null} tip="处理中...">
        <p>body</p>
      </Spin>,
    );
    expect(hiddenByNull.container.querySelector('.yakit-spin-dot')).toBeNull();
    expect(hiddenByNull.container.querySelector('.yakit-spin-dot-item')).toBeNull();
    expect(hiddenByNull.container.querySelector('.yakit-spin-custom')).toBeNull();
    expect(hiddenByNull.container.querySelector('.yakit-spin-tip')?.textContent).toBe('处理中...');
    expect(hiddenByNull.container.querySelector('.yakit-spin-container')?.textContent).toContain(
      'body',
    );
  });

  it('keeps className and rootClassName on the root', () => {
    const { container } = render(
      <Spin className="extra" rootClassName="root">
        <p>body</p>
      </Spin>,
    );
    const root = container.querySelector('.yakit-spin');
    expect(root?.classList.contains('extra')).toBe(true);
    expect(root?.classList.contains('root')).toBe(true);
  });

  it('puts the provider theme and direction on the root', () => {
    const { container } = render(
      <ConfigProvider direction="rtl" theme={{ mode: 'dark' }}>
        <Spin />
      </ConfigProvider>,
    );
    const root = container.querySelector('.yakit-spin');
    expect(root?.getAttribute('data-theme')).toBe('dark');
    expect(root?.getAttribute('dir')).toBe('rtl');
  });

  it('uses the theme primary token for the spinner and tip color', () => {
    const { container } = render(<Spin tip="加载中..." />);
    const root = container.querySelector('.yakit-spin');
    const tip = container.querySelector('.yakit-spin-tip');
    if (!root || !tip) throw new Error('expected spin root and tip');
    const themeColor = themeColorOf(container);
    expect(getComputedStyle(root).color).toBe(themeColor);
    expect(getComputedStyle(tip).color).toBe(themeColor);
  });

  it('follows ConfigProvider token overrides for spinner, tip, and mask colors', () => {
    const { container } = render(
      <ConfigProvider
        theme={{ token: { colorPrimary: '#123456', colorBasicBackground: '#abcdef' } }}
      >
        <Spin tip="加载中...">
          <p>body</p>
        </Spin>
      </ConfigProvider>,
    );
    const root = container.querySelector('.yakit-spin');
    const tip = container.querySelector('.yakit-spin-tip');
    const mask = container.querySelector('.yakit-spin-container');
    if (!root || !tip || !mask) throw new Error('expected spin root, tip, and mask');
    expect(root.style.getPropertyValue('--yakit-color-primary')).toBe('#123456');
    expect(root.style.getPropertyValue('--yakit-color-basic-background')).toBe('#abcdef');
    expect(getComputedStyle(root).color).toBe('rgb(18, 52, 86)');
    expect(getComputedStyle(tip).color).toBe('rgb(18, 52, 86)');
    expect(getComputedStyle(mask, '::after').backgroundColor).toBe('rgb(171, 205, 239)');
  });

  it('waits for delay before spinning', () => {
    vi.useFakeTimers();
    const { container } = render(<Spin delay={80} />);
    expect(container.querySelector('.yakit-spin-spinning')).toBeNull();
    expect(container.querySelector('.yakit-spin-dot')).toBeNull();
    flushSync(() => {
      vi.advanceTimersByTime(79);
    });
    expect(container.querySelector('.yakit-spin-spinning')).toBeNull();
    flushSync(() => {
      vi.advanceTimersByTime(1);
    });
    expect(container.querySelector('.yakit-spin-spinning')).toBeTruthy();
    expect(container.querySelector('.yakit-spin-dot')).toBeTruthy();
  });

  it('cancels a pending delay when spinning turns off before the timer fires', () => {
    vi.useFakeTimers();
    const { container, root } = render(<Spin delay={80} />);
    flushSync(() => {
      vi.advanceTimersByTime(40);
    });
    expect(container.querySelector('.yakit-spin-spinning')).toBeNull();
    flushSync(() => {
      root.render(<Spin delay={80} spinning={false} />);
    });
    flushSync(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.querySelector('.yakit-spin-spinning')).toBeNull();
    expect(container.querySelector('.yakit-spin-dot')).toBeNull();
  });

  it('shows the spinner immediately when spinning turns on with no delay', async () => {
    const { container, root } = render(<Spin spinning={false} />);
    flushSync(() => {
      root.render(<Spin spinning delay={0} />);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector('.yakit-spin-spinning')).toBeTruthy();
    expect(container.querySelector('.yakit-spin-dot')).toBeTruthy();
  });

  it('hides immediately after a delayed spinner has become visible', async () => {
    vi.useFakeTimers();
    const { container, root } = render(<Spin delay={80} />);
    flushSync(() => {
      vi.advanceTimersByTime(80);
    });
    expect(container.querySelector('.yakit-spin-spinning')).toBeTruthy();
    vi.useRealTimers();
    flushSync(() => {
      root.render(<Spin delay={80} spinning={false} />);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector('.yakit-spin-spinning')).toBeNull();
    expect(container.querySelector('.yakit-spin-dot')).toBeNull();
  });
});
describe('Spin getContainer', () => {
  const createHost = (id?: string) => {
    const host = document.createElement('div');
    if (id) {
      host.id = id;
    }
    host.style.width = '240px';
    host.style.height = '120px';
    document.body.append(host);
    return host;
  };

  it('portals the mask into a given element and keeps children in place', () => {
    const host = createHost();
    const { container } = render(
      <Spin getContainer={host} tip="加载中...">
        <p>outside</p>
      </Spin>,
    );

    expect(container.querySelector('.yakit-spin')).toBeNull();
    expect(container.querySelector('.yakit-spin-container')).toBeNull();
    expect(container.textContent).toContain('outside');
    expect(container.querySelector('.yakit-spin-dot')).toBeNull();

    const root = host.querySelector('.yakit-spin') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.classList.contains('yakit-spin-portal')).toBe(true);
    expect(root.classList.contains('yakit-spin-nested')).toBe(false);
    expect(root.classList.contains('yakit-spin-spinning')).toBe(true);
    expect(host.querySelectorAll('.yakit-spin-dot')).toHaveLength(1);
    expect(host.querySelector('.yakit-spin-tip')?.textContent).toBe('加载中...');
    expect(getComputedStyle(root).position).toBe('absolute');
    expect(getComputedStyle(root).top).toBe('0px');
    expect(getComputedStyle(root).right).toBe('0px');
    expect(getComputedStyle(root).bottom).toBe('0px');
    expect(getComputedStyle(root).left).toBe('0px');
    expect(getComputedStyle(root, '::before').opacity).toBe('0.4');
  });

  it('accepts a function or a selector to resolve the container', () => {
    const host = createHost('spin-host');
    const { root, container } = render(<Spin getContainer={() => host} />);
    expect(host.querySelector('.yakit-spin')).toBeTruthy();
    expect(container.querySelector('.yakit-spin')).toBeNull();

    flushSync(() => root.render(<Spin getContainer="#spin-host" tip="选择器" />));
    expect(host.querySelector('.yakit-spin')).toBeTruthy();
    expect(host.querySelector('.yakit-spin-tip')?.textContent).toBe('选择器');
    expect(document.querySelectorAll('.yakit-spin')).toHaveLength(1);
  });

  it('does not render an in-place spinner while the container is missing', () => {
    const { container } = render(<Spin getContainer={() => null} />);
    expect(container.querySelector('.yakit-spin')).toBeNull();
    expect(document.querySelector('.yakit-spin')).toBeNull();
  });

  it('covers the viewport with fixed positioning when the container is body', () => {
    const previousPosition = document.body.style.position;
    document.body.style.position = '';
    render(<Spin getContainer={document.body} />);

    const root = document.body.querySelector(':scope > .yakit-spin') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.classList.contains('yakit-spin-viewport')).toBe(true);
    expect(getComputedStyle(root).position).toBe('fixed');
    expect(document.body.style.position).toBe('');

    cleanup();
    document.body.style.position = previousPosition;
  });

  it('makes a static container relative and restores it on unmount', () => {
    const host = createHost();
    expect(getComputedStyle(host).position).toBe('static');

    const { root } = render(<Spin getContainer={host} />);
    expect(host.style.position).toBe('relative');

    flushSync(() => root.unmount());
    expect(host.style.position).toBe('');
    host.remove();
  });

  it('does not change a container that is already positioned', () => {
    const host = createHost();
    host.style.position = 'absolute';
    render(<Spin getContainer={host} />);
    expect(host.style.position).toBe('absolute');
  });

  it('exposes the portaled mask through ref', () => {
    const host = createHost();
    const ref = createRef<SpinRef>();
    render(<Spin ref={ref} getContainer={host} />);
    expect(ref.current).toBe(host.querySelector('.yakit-spin'));
    expect(ref.current?.tagName).toBe('DIV');
  });

  it('exposes the portaled ref before the parent layout effect when the container is already known', () => {
    const host = createHost();
    const seen: Array<HTMLElement | null> = [];

    const Probe = () => {
      const ref = useRef<SpinRef>(null);
      useLayoutEffect(() => {
        seen.push(ref.current);
      }, []);
      return <Spin ref={ref} getContainer={host} />;
    };

    render(<Probe />);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(host.querySelector('.yakit-spin'));
    expect(seen[0]).not.toBeNull();
  });

  it('hides the portaled indicator when spinning is false and keeps the mask off', () => {
    const host = createHost();
    render(
      <Spin spinning={false} getContainer={host} tip="加载中...">
        <p>outside</p>
      </Spin>,
    );
    const root = host.querySelector('.yakit-spin') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.classList.contains('yakit-spin-spinning')).toBe(false);
    expect(root.getAttribute('aria-busy')).toBe('false');
    expect(host.querySelector('.yakit-spin-dot')).toBeNull();
    expect(host.querySelector('.yakit-spin-tip')).toBeNull();
    const veil = getComputedStyle(root, '::before');
    expect(veil.content === 'none' || veil.content === '' || veil.opacity === '0').toBe(true);
  });

  it('keeps a hidden indicator in a portaled mask', () => {
    const host = createHost();
    render(<Spin getContainer={host} indicator={null} tip="处理中..." />);
    const root = host.querySelector('.yakit-spin') as HTMLElement;
    expect(host.querySelector('.yakit-spin-dot')).toBeNull();
    expect(host.querySelector('.yakit-spin-tip')?.textContent).toBe('处理中...');
    expect(getComputedStyle(root, '::before').opacity).toBe('0.4');
  });

  it('keeps a custom host indicator size inside the portaled mask', () => {
    const host = createHost();
    render(
      <Spin
        getContainer={host}
        indicator={<span className="custom-ring" style={{ width: 16, height: 16 }} />}
      />,
    );
    expect(host.querySelector('.yakit-spin-dot')).toBeNull();
    const custom = host.querySelector('.custom-ring') as HTMLElement;
    expect(custom.classList.contains('yakit-spin-custom')).toBe(true);
    expect(custom.hasAttribute('color')).toBe(false);
    expect(custom.parentElement?.classList.contains('yakit-spin-custom-spin')).toBe(false);
    expect(getComputedStyle(custom).width).toBe('16px');
    expect(getComputedStyle(custom).height).toBe('16px');
  });

  it('does not rewrite position when getContainer is an unstable callback', () => {
    const host = createHost();
    const { root } = render(<Spin getContainer={() => host} />);
    expect(host.style.position).toBe('relative');

    for (let index = 0; index < 5; index += 1) {
      flushSync(() => root.render(<Spin getContainer={() => host} />));
    }

    expect(host.style.position).toBe('relative');
    flushSync(() => root.unmount());
    expect(host.style.position).toBe('');
    host.remove();
  });

  it('keeps a shared container positioned until the last Spin unmounts', () => {
    const host = createHost();
    const first = render(<Spin getContainer={host} />);
    const second = render(<Spin getContainer={host} />);
    expect(host.style.position).toBe('relative');
    expect(host.querySelectorAll('.yakit-spin')).toHaveLength(2);

    flushSync(() => first.root.unmount());
    expect(host.style.position).toBe('relative');
    expect(host.querySelectorAll('.yakit-spin')).toHaveLength(1);

    flushSync(() => second.root.unmount());
    expect(host.style.position).toBe('');
    host.remove();
  });

  it('moves the mask and restores position when getContainer changes', () => {
    const first = createHost();
    const second = createHost();
    const { root } = render(<Spin getContainer={first} />);
    expect(first.style.position).toBe('relative');
    expect(first.querySelector('.yakit-spin')).toBeTruthy();

    flushSync(() => root.render(<Spin getContainer={second} />));
    expect(first.style.position).toBe('');
    expect(first.querySelector('.yakit-spin')).toBeNull();
    expect(second.style.position).toBe('relative');
    expect(second.querySelector('.yakit-spin')).toBeTruthy();

    flushSync(() => root.unmount());
    expect(second.style.position).toBe('');
    first.remove();
    second.remove();
  });

  it('releases the container and renders in place when getContainer is removed', () => {
    const host = createHost();
    const { root, container } = render(<Spin getContainer={host} />);
    expect(host.style.position).toBe('relative');
    expect(host.querySelector('.yakit-spin')).toBeTruthy();

    flushSync(() => root.render(<Spin />));
    expect(host.style.position).toBe('');
    expect(host.querySelector('.yakit-spin')).toBeNull();
    expect(container.querySelector('.yakit-spin')).toBeTruthy();
    host.remove();
  });

  it('follows ConfigProvider token overrides on the portaled mask', () => {
    const host = createHost();
    render(
      <ConfigProvider
        theme={{ token: { colorPrimary: '#123456', colorBasicBackground: '#abcdef' } }}
      >
        <Spin getContainer={host} tip="加载中..." />
      </ConfigProvider>,
    );
    const root = host.querySelector('.yakit-spin') as HTMLElement;
    expect(root.style.getPropertyValue('--yakit-color-primary')).toBe('#123456');
    expect(root.style.getPropertyValue('--yakit-color-basic-background')).toBe('#abcdef');
    expect(getComputedStyle(root).color).toBe('rgb(18, 52, 86)');
    expect(getComputedStyle(root, '::before').backgroundColor).toBe('rgb(171, 205, 239)');
  });

  it('does not portal during renderToString even when the document can resolve the selector', () => {
    const panel = document.createElement('div');
    panel.id = 'spin-ssr-panel';
    document.body.append(panel);

    let markup = '';
    expect(() => {
      markup = renderToString(
        <Spin getContainer="#spin-ssr-panel">
          <p className="spin-ssr-body">content</p>
        </Spin>,
      );
    }).not.toThrow();

    expect(markup).toContain('spin-ssr-body');
    expect(markup).toContain('content');
    expect(markup).not.toContain('yakit-spin');
    expect(panel.querySelector('.yakit-spin')).toBeNull();
  });

  it('hydrates getContainer without a mismatch and then portals the mask', async () => {
    const isHydrationMismatch = (value: unknown) => {
      const text = value instanceof Error ? `${value.name}: ${value.message}` : String(value);
      return /hydrat|did not match|did not expect|Text content does not match/i.test(text);
    };

    const waitFor = async (assert: () => void, timeout = 2000) => {
      const startedAt = Date.now();
      let lastError: unknown;
      while (Date.now() - startedAt < timeout) {
        try {
          assert();
          return;
        } catch (error) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 16));
        }
      }
      throw lastError;
    };

    const hydrateTree = async (
      tree: React.ReactElement,
      mountNode: HTMLElement,
      waitForMask: () => void,
    ) => {
      const markup = renderToString(tree);
      mountNode.innerHTML = markup;
      const recoverable: unknown[] = [];
      const consoleErrors: string[] = [];
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        const text = args.map(String).join(' ');
        if (isHydrationMismatch(text)) {
          consoleErrors.push(text);
        }
        originalError.apply(console, args);
      };

      let root: Root;
      try {
        root = hydrateRoot(mountNode, tree, {
          onRecoverableError(error) {
            recoverable.push(error);
          },
        });
        // hydrateRoot 是并发的；还要等 hydration 之后 useSyncExternalStore 的快照更新把遮罩提交上去。
        await waitFor(waitForMask);
      } finally {
        console.error = originalError;
      }

      return { markup, root, recoverable, consoleErrors };
    };

    const expectHydrationClean = (result: {
      markup: string;
      recoverable: unknown[];
      consoleErrors: string[];
    }) => {
      expect(result.markup).toContain('spin-ssr-body');
      expect(result.markup).not.toContain('yakit-spin');
      expect(result.recoverable.filter(isHydrationMismatch)).toEqual([]);
      expect(result.consoleErrors).toEqual([]);
    };

    const host = document.createElement('div');
    document.body.append(host);

    const insideTree = (
      <div>
        <div id="spin-hydrate-inside" />
        <Spin getContainer="#spin-hydrate-inside">
          <span className="spin-ssr-body">content</span>
        </Spin>
      </div>
    );
    const inside = await hydrateTree(insideTree, host, () => {
      expect(host.querySelector('#spin-hydrate-inside .yakit-spin')).toBeTruthy();
    });
    expectHydrationClean(inside);
    inside.root.unmount();
    host.replaceChildren();

    const outsidePanel = document.createElement('div');
    outsidePanel.id = 'spin-hydrate-outside';
    document.body.append(outsidePanel);
    const outsideTree = (
      <Spin getContainer="#spin-hydrate-outside">
        <span className="spin-ssr-body">content</span>
      </Spin>
    );
    const outside = await hydrateTree(outsideTree, host, () => {
      expect(outsidePanel.querySelector('.yakit-spin')).toBeTruthy();
    });
    expectHydrationClean(outside);
    expect(host.querySelector('.yakit-spin')).toBeNull();
    outside.root.unmount();
    outsidePanel.remove();
    host.replaceChildren();

    const functionPanel = document.createElement('div');
    functionPanel.id = 'spin-hydrate-function';
    document.body.append(functionPanel);
    const functionTree = (
      <Spin getContainer={() => functionPanel}>
        <span className="spin-ssr-body">content</span>
      </Spin>
    );
    const functionResult = await hydrateTree(functionTree, host, () => {
      expect(functionPanel.querySelector('.yakit-spin')).toBeTruthy();
    });
    expectHydrationClean(functionResult);
    functionResult.root.unmount();
    functionPanel.remove();
    host.replaceChildren();

    const staticPanel = document.createElement('div');
    staticPanel.id = 'spin-hydrate-static';
    document.body.append(staticPanel);
    const staticTree = (
      <Spin getContainer={staticPanel}>
        <span className="spin-ssr-body">content</span>
      </Spin>
    );
    const staticResult = await hydrateTree(staticTree, host, () => {
      expect(staticPanel.querySelector('.yakit-spin')).toBeTruthy();
    });
    expectHydrationClean(staticResult);
    expect(staticPanel.querySelector('.yakit-spin')).toBeTruthy();
    staticResult.root.unmount();
    staticPanel.remove();
    host.remove();
  });
});
