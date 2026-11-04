import React from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Modal from '../../src/components/Modal';
import { cleanup, render } from '../helpers/render';

afterEach(cleanup);

const dialog = () => document.querySelector<HTMLElement>('.yakit-modal');

const footerButton = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('.yakit-modal-footer button')].find(
    (button) => button.textContent === label,
  );

describe('Modal dialog', () => {
  it('stays closed until open is set', () => {
    render(
      <Modal subTitle="这里是辅助性内容" title="Title">
        内容
      </Modal>,
    );

    expect(dialog()).toBeNull();
  });

  it('renders the style 01 header, body and default actions', () => {
    render(
      <Modal open subTitle="这里是辅助性内容" title="Title">
        内容区域
      </Modal>,
    );

    expect(dialog()?.classList.contains('yakit-modal-basic')).toBe(true);
    expect(dialog()?.classList.contains('yakit-modal-small')).toBe(true);
    expect(document.querySelector('.yakit-modal-title')?.textContent).toBe('Title');
    expect(document.querySelector('.yakit-modal-subtitle')?.textContent).toBe('这里是辅助性内容');
    expect(document.querySelector('.yakit-modal-body')?.textContent).toBe('内容区域');
    expect(document.querySelector('.yakit-modal-status')).toBeNull();
    expect(document.querySelector('.yakit-modal-footer')?.textContent).toContain('取消');
    expect(document.querySelector('.yakit-modal-footer')?.textContent).toContain('确定');
    expect(dialog()?.getAttribute('role')).toBe('dialog');
    expect(dialog()?.getAttribute('aria-modal')).toBe('true');
  });

  it('uses medium spacing and keeps a controlled dialog open', () => {
    const onCancel = vi.fn();
    render(
      <Modal
        footerExtra={<span>Switch button</span>}
        onCancel={onCancel}
        open
        size="medium"
        statusBar={
          <>
            当前系统代理状态：<strong>已启用</strong>
          </>
        }
        title="Title"
        variant="banner"
      >
        内容
      </Modal>,
    );

    expect(dialog()?.classList.contains('yakit-modal-medium')).toBe(true);
    expect(dialog()?.classList.contains('yakit-modal-banner')).toBe(true);
    expect(document.querySelector('.yakit-modal-status')?.textContent).toContain('已启用');
    expect(document.querySelector('.yakit-modal-footer-extra')?.textContent).toBe('Switch button');

    document.querySelector<HTMLButtonElement>('.yakit-modal-close')?.click();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(dialog()).not.toBeNull();
  });

  it('closes an uncontrolled dialog from cancel, mask and escape', () => {
    const onCancel = vi.fn();
    const first = render(
      <Modal defaultOpen onCancel={onCancel} title="Title">
        内容
      </Modal>,
    );

    flushSync(() => footerButton('取消')?.click());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();
    first.root.unmount();

    const second = render(
      <Modal defaultOpen title="再次打开">
        内容
      </Modal>,
    );
    flushSync(() => {
      document
        .querySelector('.yakit-modal-wrap')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(dialog()).toBeNull();
    second.root.unmount();

    render(
      <Modal defaultOpen title="键盘">
        内容
      </Modal>,
    );
    flushSync(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    });
    expect(dialog()).toBeNull();
  });

  it('ignores the mask and escape when those dismiss paths are disabled', () => {
    const onCancel = vi.fn();
    render(
      <Modal keyboard={false} maskClosable={false} onCancel={onCancel} open title="Title">
        内容
      </Modal>,
    );

    document
      .querySelector('.yakit-modal-wrap')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));

    expect(onCancel).not.toHaveBeenCalled();
    expect(dialog()).not.toBeNull();
  });

  it('confirms, hides the footer, and renders inline without a mask', () => {
    const onOk = vi.fn();
    const confirmed = render(
      <Modal defaultOpen okText="Yes" onOk={onOk} title="Title">
        内容
      </Modal>,
    );

    flushSync(() => footerButton('Yes')?.click());
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();
    confirmed.root.unmount();

    const hidden = render(
      <Modal footer={null} open title="没有底部">
        内容
      </Modal>,
    );
    expect(document.querySelector('.yakit-modal-footer')).toBeNull();
    hidden.root.unmount();

    const inline = render(
      <Modal getContainer={false} open title="就地渲染">
        内容
      </Modal>,
    );
    expect(inline.container.querySelector('.yakit-modal-title')?.textContent).toBe('就地渲染');
    expect(document.querySelector('.yakit-modal-mask')).toBeNull();
  });

  it('locks body scroll and keeps focus inside the dialog', () => {
    const previous = document.body.style.overflow;
    render(<button type="button">外面</button>);
    const outside = document.querySelector('button');
    outside?.focus();
    const { root } = render(
      <Modal open title="焦点">
        内容
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(dialog());

    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.yakit-modal button')];
    const last = buttons[buttons.length - 1];
    last?.focus();
    dialog()?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
    expect(document.activeElement).toBe(buttons[0]);

    root.unmount();
    expect(document.body.style.overflow).toBe(previous);
    expect(document.activeElement).toBe(outside);
  });
});

describe('Modal alert', () => {
  it('renders a status icon, help action and custom actions', () => {
    const onHelp = vi.fn();
    render(
      <Modal
        cancelText="Cancel"
        layout="alert"
        okText="Done"
        onHelp={onHelp}
        open
        status="success"
        title="Some task has completed!"
      >
        Some contents...
      </Modal>,
    );

    expect(dialog()?.classList.contains('yakit-modal-alert')).toBe(true);
    expect(dialog()?.classList.contains('yakit-modal-success')).toBe(true);
    expect(document.querySelector('.yakit-modal-icon')).not.toBeNull();
    expect(document.querySelector('.yakit-modal-close')).toBeNull();
    expect(document.querySelector('.yakit-modal-body')?.textContent).toBe('Some contents...');
    expect(document.querySelector('.yakit-modal-footer')?.textContent).toContain('Cancel');
    expect(document.querySelector('.yakit-modal-footer')?.textContent).toContain('Done');

    document.querySelector<HTMLButtonElement>('.yakit-modal-help')?.click();
    expect(onHelp).toHaveBeenCalledTimes(1);
  });

  it('can hide the confirm button and replace the footer', () => {
    render(
      <Modal
        footer={<button type="button">一键安装</button>}
        layout="alert"
        open
        showOk={false}
        title="未安装引擎"
      >
        说明
      </Modal>,
    );

    expect(document.querySelector('.yakit-modal-footer')?.textContent).toBe('一键安装');
    expect(document.querySelector('.yakit-modal-footer')?.textContent).not.toContain('确定');
  });
});
