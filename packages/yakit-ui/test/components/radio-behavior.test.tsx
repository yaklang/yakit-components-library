import React from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfigProvider from '../../src/components/ConfigProvider';
import Radio from '../../src/components/Radio';
import { cleanup, render } from '../helpers/render';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Radio behavior', () => {
  it('detects Radio.Button children nested in a Fragment', () => {
    const { container } = render(
      <Radio.Group buttonStyle="solid">
        <>
          <Radio.Button value="one">One</Radio.Button>
        </>
      </Radio.Group>,
    );

    expect(container.querySelector('.yakit-radio-group-button-solid')).not.toBeNull();
    expect(container.querySelector('.ant-radio-group-solid')).not.toBeNull();
  });

  it('reports an undefined value when a standalone Radio has no value', () => {
    const onChange = vi.fn();
    const { container } = render(<Radio onChange={onChange} />);
    const input = container.querySelector('input');

    if (!input) throw new Error('expected a radio input');
    flushSync(() => input.click());

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0].target.value).toBeUndefined();
  });

  it('uses distinct React keys for numeric and string option values', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<Radio.Group options={[1, '1']} />);

    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    expect(consoleError.mock.calls.some(([message]) => String(message).includes('same key'))).toBe(
      false,
    );
  });

  it('uses consistent horizontal button padding at every size', () => {
    const sizes = ['small', 'middle', 'large', 'maxLarge'] as const;
    const { container } = render(
      <>
        {sizes.map((size) => (
          <Radio.Group
            key={size}
            optionType="button"
            size={size}
            options={[{ label: size, value: size }]}
          />
        ))}
      </>,
    );

    const buttons = container.querySelectorAll('.yakit-radio-group-button-item');
    expect(buttons).toHaveLength(sizes.length);
    buttons.forEach((button) => {
      expect(getComputedStyle(button).paddingInline).toBe('14px');
    });
  });

  it('keeps the selected solid color when the button receives focus', () => {
    const { container } = render(
      <Radio.Group buttonStyle="solid" value="one">
        <Radio.Button value="one">One</Radio.Button>
      </Radio.Group>,
    );
    const button = container.querySelector('.yakit-radio-group-button-item-checked');
    const input = button?.querySelector('input');

    if (!button || !input) throw new Error('expected a selected radio button');
    const background = getComputedStyle(button).getPropertyValue('background');

    input.focus();

    expect(getComputedStyle(button).getPropertyValue('background')).toBe(background);
  });

  it('stacks vertical button groups without horizontal overlap and preserves end radii', () => {
    const { container } = render(
      <Radio.Group optionType="button" vertical>
        <Radio.Button value="one">One</Radio.Button>
        <Radio.Button value="two">Two</Radio.Button>
      </Radio.Group>,
    );
    const group = container.querySelector<HTMLElement>('.yakit-radio-group');
    const buttons = container.querySelectorAll<HTMLElement>('.yakit-radio-group-button-item');

    if (!group || buttons.length !== 2) throw new Error('expected two buttons in a group');

    expect(getComputedStyle(group).flexDirection).toBe('column');
    expect(getComputedStyle(buttons[0]!).marginBlockStart).toBe('0px');
    expect(getComputedStyle(buttons[1]!).marginBlockStart).toBe('-1px');
    expect(getComputedStyle(buttons[1]!).marginInlineStart).toBe('0px');
    expect(getComputedStyle(buttons[0]!).borderStartStartRadius).toBe('4px');
    expect(getComputedStyle(buttons[1]!).borderEndEndRadius).toBe('4px');
  });

  it('scopes Ant Design compatibility styles and uses logical separator positioning in RTL', () => {
    const { container } = render(
      <>
        <ConfigProvider direction="rtl">
          <Radio.Group optionType="button">
            <Radio.Button value="one">One</Radio.Button>
            <Radio.Button value="two">Two</Radio.Button>
          </Radio.Group>
        </ConfigProvider>
        <div className="ant-radio-group ant-radio-group-block">
          <label className="ant-radio-button-wrapper">Unrelated Ant Design radio</label>
        </div>
      </>,
    );
    const group = container.querySelector<HTMLElement>('.yakit-radio-group');
    const separatorOwner = container.querySelector<HTMLElement>(
      '.yakit-radio-group-button-item:not(:first-child)',
    );
    const unrelatedGroup = container.querySelector<HTMLElement>(
      ':scope > .ant-radio-group-block:not(.yakit-radio-group)',
    );

    if (!group || !separatorOwner || !unrelatedGroup) {
      throw new Error('expected both Yakit and unrelated Ant Design radio groups');
    }

    expect(group.dir).toBe('rtl');
    expect(getComputedStyle(separatorOwner, '::before').insetInlineStart).toBe('-1px');
    expect(getComputedStyle(unrelatedGroup).display).toBe('block');
    expect(getComputedStyle(unrelatedGroup.firstElementChild!).position).toBe('static');
  });
});

/** antd 5 在主项目 hashed:false 下会命中的关键规则（用于验证库内 reset 层） */
const ANTD5_RADIO_CSS = `
.ant-radio-group { display: inline-block; font-size: 0; }
.ant-radio-wrapper { display: inline-flex; align-items: baseline; margin-inline-end: 8px; }
.ant-radio-wrapper::after { display: inline-block; width: 0; overflow: hidden; content: "\\a0"; }
span.ant-radio + * { padding-inline-start: 8px; padding-inline-end: 8px; }
.ant-radio-inner::after { position: absolute; top: 50%; left: 50%; width: 16px; height: 16px; margin-top: -8px; margin-left: -8px; background: #f28c45; border-radius: 16px; content: ""; }
.ant-radio-wrapper .ant-radio-checked .ant-radio-inner::after { transform: scale(0.5); opacity: 1; }
.ant-radio-button-wrapper:not(:last-child) { margin-inline-end: -1px; }
.ant-radio-button-wrapper:first-child { border-inline-start: 1px solid #d9d9d9; border-start-start-radius: 4px; border-end-start-radius: 4px; }
.ant-radio-button-wrapper:last-child { border-start-end-radius: 4px; border-end-end-radius: 4px; }
.ant-radio-button-wrapper:first-child:last-child { border-radius: 4px; }
`;

const withAntd5RadioCss = (run: () => void) => {
  const style = document.createElement('style');
  style.textContent = ANTD5_RADIO_CSS;
  // antd cssinjs 以 prependQueue 插入，排在页面自有样式之前
  document.head.insertBefore(style, document.head.firstChild);
  try {
    run();
  } finally {
    style.remove();
  }
};

describe('Radio antd compatibility', () => {
  it('detects Radio.Button children wrapped in layout elements', () => {
    const { container } = render(
      <Radio.Group buttonStyle="solid" value="one">
        <div>
          <Radio.Button value="one">One</Radio.Button>
          <Radio.Button value="two">Two</Radio.Button>
        </div>
      </Radio.Group>,
    );
    const group = container.querySelector('.yakit-radio-group');

    expect(group).toHaveClass('yakit-radio-group-button');
    expect(group).toHaveClass('ant-radio-group-solid');
    expect(container.querySelector('.yakit-radio-group-button-item-checked')).not.toBeNull();
  });

  it('keeps circular geometry stable when antd 5 global radio CSS is present', () => {
    const { container } = render(
      <Radio.Group defaultValue="a">
        <Radio value="a">Alpha</Radio>
        <Radio value="b">Beta</Radio>
      </Radio.Group>,
    );
    const radio = container.querySelector<HTMLElement>('.yakit-radio');
    const content = container.querySelector<HTMLElement>('.yakit-radio-content');
    const inner = container.querySelector<HTMLElement>('.yakit-radio-checked .yakit-radio-inner');

    if (!radio || !content || !inner) throw new Error('expected a circular radio');

    const widthBefore = radio.getBoundingClientRect().width;
    withAntd5RadioCss(() => {
      void radio.offsetWidth;
      expect(radio.getBoundingClientRect().width).toBeCloseTo(widthBefore, 2);
      expect(getComputedStyle(content).paddingInlineStart).toBe('0px');
      expect(getComputedStyle(radio, '::after').content).toBe('none');
      expect(getComputedStyle(inner, '::after').marginTop).toBe('0px');
      expect(getComputedStyle(inner, '::after').marginLeft).toBe('0px');
    });
  });

  it('keeps button margins and first/last radii under antd 5 CSS', () => {
    const { container } = render(
      <Radio.Group optionType="button" value="a">
        <Radio.Button value="a">A</Radio.Button>
        <Radio.Button value="b">B</Radio.Button>
      </Radio.Group>,
    );
    const buttons = container.querySelectorAll<HTMLElement>('.yakit-radio-group-button-item');

    if (buttons.length !== 2) throw new Error('expected two button radios');

    withAntd5RadioCss(() => {
      expect(getComputedStyle(buttons[0]!).marginInlineEnd).toBe('0px');
      expect(getComputedStyle(buttons[0]!).borderStartStartRadius).toBe('4px');
      expect(getComputedStyle(buttons[1]!).borderEndEndRadius).toBe('4px');
    });
  });

  it('stretches circular radios when the group is block', () => {
    const { container } = render(
      <Radio.Group block>
        <Radio value="a">A</Radio>
      </Radio.Group>,
    );
    const radio = container.querySelector<HTMLElement>('.yakit-radio');

    expect(radio).toHaveClass('ant-radio-wrapper-block');
    expect(getComputedStyle(radio!).flexGrow).toBe('1');
  });

  it('links label and description to the radio input', () => {
    const { container } = render(<Radio description="Help text">Label text</Radio>);
    const input = container.querySelector('input');
    const label = container.querySelector('.yakit-radio-label');
    const description = container.querySelector('.yakit-radio-description');

    expect(input?.getAttribute('aria-labelledby')).toBe(label?.id);
    expect(input?.getAttribute('aria-describedby')).toBe(description?.id);
  });
});

describe('Radio group behavior', () => {
  it('switches uncontrolled selection and reports the new value once', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Radio.Group defaultValue="a" onChange={onChange} name="probe">
        <Radio value="a">A</Radio>
        <Radio value="b">B</Radio>
      </Radio.Group>,
    );
    const labels = container.querySelectorAll<HTMLElement>('.yakit-radio');
    const inputs = container.querySelectorAll<HTMLInputElement>('input');

    labels[1]!.click();

    expect(inputs[0]!.checked).toBe(false);
    expect(inputs[1]!.checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0].target.value).toBe('b');
  });

  it('blocks selection when the group is disabled', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Radio.Group disabled onChange={onChange}>
        <Radio value="a">A</Radio>
        <Radio value="b">B</Radio>
      </Radio.Group>,
    );

    container.querySelector<HTMLElement>('.yakit-radio')!.click();

    expect(container.querySelectorAll('input:checked')).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the controlled value when the parent ignores the change', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Radio.Group value="a" onChange={onChange}>
        <Radio value="a">A</Radio>
        <Radio value="b">B</Radio>
      </Radio.Group>,
    );
    const labels = container.querySelectorAll<HTMLElement>('.yakit-radio');
    const inputs = container.querySelectorAll<HTMLInputElement>('input');

    labels[1]!.click();

    expect(inputs[0]!.checked).toBe(true);
    expect(inputs[1]!.checked).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0].target.value).toBe('b');
  });
});
