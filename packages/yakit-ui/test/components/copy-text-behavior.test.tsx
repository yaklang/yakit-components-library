import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfigProvider from '../../src/components/ConfigProvider';
import CopyText from '../../src/components/CopyText';
import type { CopyTextRef } from '../../src/components/CopyText';
import { cleanup, render } from '../helpers/render';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mockClipboard = (writeText: ReturnType<typeof vi.fn>) => {
  const previous = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return () => {
    if (previous) Object.defineProperty(navigator, 'clipboard', previous);
    else Reflect.deleteProperty(navigator, 'clipboard');
  };
};

describe('CopyText behavior', () => {
  it('exposes the public root class and forwards the root ref', () => {
    const ref = createRef<CopyTextRef>();
    const { container } = render(<CopyText ref={ref} showText="127.0.0.1" className="extra" />);
    const root = container.querySelector('.yakit-copy-text');
    expect(root).toBeTruthy();
    expect(root).toHaveClass('extra');
    expect(root?.querySelector('.yakit-copy-text-content')?.textContent).toBe('127.0.0.1');
    expect(root?.querySelector('.yakit-tag-copy')).toBeTruthy();
    expect(ref.current).toBe(root);
  });

  it('copies showText by default and reports success through onAfterCopy', async () => {
    const writeText = vi.fn(async () => undefined);
    const restore = mockClipboard(writeText);
    try {
      const onAfterCopy = vi.fn();
      const { container } = render(<CopyText showText="payload" onAfterCopy={onAfterCopy} />);
      const button = container.querySelector<HTMLButtonElement>('.yakit-tag-copy');
      expect(button?.getAttribute('aria-label')).toBe('复制');
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('payload');
        expect(onAfterCopy).toHaveBeenCalledWith(expect.anything(), { text: 'payload', ok: true });
      });
    } finally {
      restore();
    }
  });

  it('copies copyText when provided, including when showText differs', async () => {
    const writeText = vi.fn(async () => undefined);
    const restore = mockClipboard(writeText);
    try {
      const onAfterCopy = vi.fn();
      const { container } = render(
        <CopyText showText="visible" copyText="actual-command" onAfterCopy={onAfterCopy} />,
      );
      expect(container.querySelector('.yakit-copy-text-content')?.textContent).toBe('visible');
      container
        .querySelector('.yakit-tag-copy')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('actual-command');
        expect(onAfterCopy).toHaveBeenCalledWith(expect.anything(), {
          text: 'actual-command',
          ok: true,
        });
      });
    } finally {
      restore();
    }
  });

  it('falls back to showText when copyText is an empty string', async () => {
    const writeText = vi.fn(async () => undefined);
    const restore = mockClipboard(writeText);
    try {
      const onAfterCopy = vi.fn();
      const { container } = render(
        <CopyText showText="fallback" copyText="" onAfterCopy={onAfterCopy} />,
      );
      container
        .querySelector('.yakit-tag-copy')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('fallback');
        expect(onAfterCopy).toHaveBeenCalledWith(expect.anything(), { text: 'fallback', ok: true });
      });
    } finally {
      restore();
    }
  });

  it('reports a failed clipboard write through onAfterCopy', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('denied');
    });
    const restore = mockClipboard(writeText);
    const exec = vi.spyOn(document, 'execCommand').mockReturnValue(false);
    try {
      const onAfterCopy = vi.fn();
      const { container } = render(<CopyText showText="payload" onAfterCopy={onAfterCopy} />);
      container
        .querySelector('.yakit-tag-copy')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      await vi.waitFor(() => {
        expect(onAfterCopy).toHaveBeenCalledWith(expect.anything(), { text: 'payload', ok: false });
      });
    } finally {
      exec.mockRestore();
      restore();
    }
  });

  it('does not copy when disabled, and inherits ConfigProvider componentDisabled', async () => {
    const writeText = vi.fn(async () => undefined);
    const restore = mockClipboard(writeText);
    try {
      const onAfterCopy = vi.fn();
      const disabled = render(<CopyText showText="locked" disabled onAfterCopy={onAfterCopy} />);
      const disabledBtn = disabled.container.querySelector<HTMLButtonElement>('.yakit-tag-copy');
      expect(disabledBtn?.disabled).toBe(true);
      disabledBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      expect(writeText).not.toHaveBeenCalled();
      expect(onAfterCopy).not.toHaveBeenCalled();
      cleanup();

      const inherited = render(
        <ConfigProvider componentDisabled>
          <CopyText showText="locked-by-provider" onAfterCopy={onAfterCopy} />
        </ConfigProvider>,
      );
      const inheritedBtn = inherited.container.querySelector<HTMLButtonElement>('.yakit-tag-copy');
      expect(inheritedBtn?.disabled).toBe(true);
      inheritedBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      expect(writeText).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('disables the copy control when there is nothing to copy', () => {
    const { container } = render(<CopyText showText="" />);
    expect(container.querySelector<HTMLButtonElement>('.yakit-tag-copy')?.disabled).toBe(true);
  });

  it('uses a 16px copy icon by default to match yakit, and 14px when size is large', () => {
    const def = render(<CopyText showText="default-icon" />);
    const defaultSvg = def.container.querySelector('.yakit-tag-copy svg') as SVGElement;
    expect(defaultSvg).toBeTruthy();
    expect(getComputedStyle(defaultSvg).width).toBe('16px');
    expect(getComputedStyle(defaultSvg).height).toBe('16px');
    expect(def.container.querySelector('.yakit-copy-text')).toHaveClass('yakit-copy-text');
    const rootEl = def.container.querySelector('.yakit-copy-text') as HTMLElement;
    const contentRect = rootEl.querySelector('.yakit-copy-text-content')!.getBoundingClientRect();
    const buttonRect = rootEl.querySelector('.yakit-tag-copy')!.getBoundingClientRect();
    expect(buttonRect.left - contentRect.right).toBeCloseTo(0, 0);
    cleanup();

    const large = render(<CopyText showText="large-icon" size="large" />);
    const largeSvg = large.container.querySelector('.yakit-tag-copy svg') as SVGElement;
    expect(large.container.querySelector('.yakit-tag-copy')).toHaveClass('yakit-tag-copy-lg');
    expect(getComputedStyle(largeSvg).width).toBe('14px');
    expect(getComputedStyle(largeSvg).height).toBe('14px');
  });

  it('applies iconColor, size, wrapStyle and prefers style over wrapStyle', () => {
    const { container } = render(
      <CopyText
        showText="colored"
        iconColor="#d48806"
        size="large"
        wrapStyle={{ color: 'rgb(1, 2, 3)', marginRight: 8 }}
        style={{ color: 'rgb(4, 5, 6)' }}
        rootClassName="root-extra"
      />,
    );
    const root = container.querySelector<HTMLElement>('.yakit-copy-text');
    expect(root).toHaveClass('root-extra');
    expect(root?.style.color).toBe('rgb(4, 5, 6)');
    expect(root?.style.marginRight).toBe('8px');
    const button = container.querySelector<HTMLButtonElement>('.yakit-tag-copy');
    expect(button).toHaveClass('yakit-tag-copy-lg');
    expect(button?.style.color).toBe('rgb(212, 136, 6)');
  });

  it('uses ConfigProvider locale.Tag.copy as the copy control accessible name', () => {
    const { container } = render(
      <ConfigProvider locale={{ locale: 'en-US', Tag: { copy: 'Copy' } }}>
        <CopyText showText="host" />
      </ConfigProvider>,
    );
    expect(container.querySelector('.yakit-tag-copy')?.getAttribute('aria-label')).toBe('Copy');
  });
});
