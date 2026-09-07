import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfigProvider from '../../src/components/ConfigProvider';
import Tag from '../../src/components/Tag';
import type { TagProps } from '../../src/components/Tag/Tag';
import { cleanup, render } from '../helpers/render';

const colors: NonNullable<TagProps['color']>[] = [
  'default',
  'primary',
  'success',
  'warning',
  'error',
  'purple',
  'magenta',
  'blue',
  'lake-blue',
  'cyan',
  'orange',
  'neutral',
  'yellow',
];

afterEach(() => {
  cleanup();
});

describe('Tag', () => {
  it('renders a plain span with its default visual classes', () => {
    const { container } = render(<Tag>Stable</Tag>);
    const tag = container.querySelector('span');

    expect(tag?.tagName).toBe('SPAN');
    expect(tag).toHaveClass('yakit-tag', 'yakit-tag-middle', 'yakit-tag-default');
    expect(tag).not.toHaveClass('yakit-tag-bordered');
    expect(tag).not.toHaveAttribute('role');
    expect(tag).not.toHaveAttribute('tabindex');
    expect(tag).toHaveTextContent('Stable');
  });

  it.each(['small', 'middle', 'large'] as const)('applies the %s size class', (size) => {
    const { container } = render(<Tag size={size}>{size}</Tag>);

    expect(container.querySelector('.yakit-tag')).toHaveClass(`yakit-tag-${size}`);
  });

  it.each(colors)('applies the %s color class', (color) => {
    const { container } = render(<Tag color={color}>{color}</Tag>);

    expect(container.querySelector('.yakit-tag')).toHaveClass(`yakit-tag-${color}`);
  });

  it('characterizes the current inverted bordered class behavior', () => {
    const { container } = render(
      <>
        <Tag bordered>Bordered prop true</Tag>
        <Tag bordered={false}>Bordered prop false</Tag>
      </>,
    );
    const [bordered, borderless] = [...container.querySelectorAll('.yakit-tag')];

    expect(bordered).not.toHaveClass('yakit-tag-bordered');
    expect(borderless).toHaveClass('yakit-tag-bordered');
  });

  it('merges classes and lets consumer style override provider token variables', () => {
    const { container } = render(
      <ConfigProvider
        direction="rtl"
        theme={{
          components: {
            YakitTag: { borderRadiusMD: '7px', paddingMD: '12px' },
          },
          mode: 'dark',
          token: { colorPrimary: '#123456' },
        }}
      >
        <Tag
          className="consumer-class"
          rootClassName="consumer-root"
          style={{ '--yakit-tag-padding-md': '20px' } as React.CSSProperties}
        >
          Themed
        </Tag>
      </ConfigProvider>,
    );
    const tag = container.querySelector<HTMLElement>('.yakit-tag');

    expect(tag).toHaveClass('consumer-class', 'consumer-root');
    expect(tag).toHaveAttribute('dir', 'rtl');
    expect(tag).toHaveAttribute('data-theme', 'dark');
    expect(tag?.style.getPropertyValue('--yakit-color-primary')).toBe('#123456');
    expect(tag?.style.getPropertyValue('--yakit-tag-border-radius-md')).toBe('7px');
    expect(tag?.style.getPropertyValue('--yakit-tag-padding-md')).toBe('20px');
  });

  it('temporarily characterizes icon, closeIcon and onClose as known gaps', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Tag
        closeIcon={<button type="button">Close</button>}
        icon={<span data-testid="leading-icon" />}
        onClose={onClose}
      >
        Stable
      </Tag>,
    );
    const tag = container.querySelector<HTMLElement>('.yakit-tag');

    tag?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(tag).toHaveTextContent('Stable');
    expect(tag?.querySelector('[data-testid="leading-icon"]')).toBeNull();
    expect(tag?.querySelector('button')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
