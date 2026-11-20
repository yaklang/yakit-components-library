import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Card, { YakitCard } from '../../src/components/Card';
import { cleanup, render } from '../helpers/render';

afterEach(() => {
  cleanup();
});

describe('Card behavior', () => {
  it('renders header when title is provided', () => {
    const { container } = render(<Card title="Title">Body</Card>);
    expect(container.querySelector('.yakit-card-header')).not.toBeNull();
    const title = container.querySelector<HTMLElement>('.yakit-card-header-title');
    expect(title?.textContent).toBe('Title');
    expect(getComputedStyle(title!).fontWeight).toBe('500');
    expect(container.querySelector('.yakit-card-body')?.textContent).toBe('Body');
  });

  it('hides header when title and extra are absent', () => {
    const { container } = render(<Card>Only body</Card>);
    expect(container.querySelector('.yakit-card-header')).toBeNull();
    expect(container.querySelector('.yakit-card-body')?.textContent).toBe('Only body');
  });

  it('hides header when title and extra are false', () => {
    const { container } = render(
      <Card title={false} extra={false}>
        Body
      </Card>,
    );
    expect(container.querySelector('.yakit-card-header')).toBeNull();
  });

  it('renders zero as a valid title', () => {
    const { container } = render(<Card title={0}>Body</Card>);
    expect(container.querySelector('.yakit-card-header-title')?.textContent).toBe('0');
  });

  it('applies bordered-hidden when bordered is false', () => {
    const { container } = render(
      <Card title="T" bordered={false}>
        B
      </Card>,
    );
    expect(container.querySelector('.yakit-card-bordered-hidden')).not.toBeNull();
  });

  it('maps variant=borderless to bordered-hidden', () => {
    const { container } = render(
      <Card title="T" variant="borderless">
        B
      </Card>,
    );
    expect(container.querySelector('.yakit-card-bordered-hidden')).not.toBeNull();
  });

  it('applies size=small class', () => {
    const { container } = render(
      <Card title="T" size="small">
        B
      </Card>,
    );
    expect(container.querySelector('.yakit-card-size-small')).not.toBeNull();
  });

  it('applies hoverable class', () => {
    const { container } = render(
      <Card hoverable title="T">
        B
      </Card>,
    );
    expect(container.querySelector('.yakit-card-hoverable')).not.toBeNull();
  });

  it('shows loading mask when loading', () => {
    const { container } = render(
      <Card loading title="T">
        B
      </Card>,
    );
    expect(container.querySelector('.yakit-card-loading')).not.toBeNull();
    expect(container.querySelector('.yakit-card-loading-mask')).not.toBeNull();
    const body = container.querySelector('.yakit-card-body') as HTMLElement;
    expect(body.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('.yakit-card-loading-mask')?.getAttribute('role')).toBe(
      'status',
    );
    expect(container.querySelector('.yakit-card-spin')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.yakit-card-sr-only')?.textContent).toBe('加载中');
    expect(body.textContent).toContain('B');
  });

  it('keeps children when loading', () => {
    const { container } = render(
      <Card loading>
        <button type="button">Action</button>
      </Card>,
    );
    expect(container.querySelector('button')?.textContent).toBe('Action');
  });

  it('renders header when only extra is provided', () => {
    const { container } = render(<Card extra={<span>More</span>}>Body</Card>);
    expect(container.querySelector('.yakit-card-header')).not.toBeNull();
    expect(container.querySelector('.yakit-card-header-title')).toBeNull();
    expect(container.querySelector('.yakit-card-header-extra')?.textContent).toBe('More');
  });

  it('lets variant override bordered', () => {
    const { container } = render(
      <Card title="T" bordered={false} variant="outlined">
        B
      </Card>,
    );
    expect(container.querySelector('.yakit-card-bordered-hidden')).toBeNull();
  });

  it('merges styles.header over headStyle', () => {
    const { container } = render(
      <Card title="T" headStyle={{ padding: 1 }} styles={{ header: { padding: 8 } }}>
        B
      </Card>,
    );
    const head = container.querySelector('.yakit-card-header') as HTMLElement;
    expect(head.style.padding).toBe('8px');
  });

  it('merges styles.body over bodyStyle', () => {
    const { container } = render(
      <Card bodyStyle={{ padding: 1 }} styles={{ body: { padding: 8 } }}>
        B
      </Card>,
    );
    const body = container.querySelector('.yakit-card-body') as HTMLElement;
    expect(body.style.padding).toBe('8px');
  });

  it('forwards onClick to root', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Card onClick={onClick} title="T">
        B
      </Card>,
    );
    (container.querySelector('.yakit-card') as HTMLElement).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('exports YakitCard as Card alias', () => {
    expect(YakitCard).toBe(Card);
  });
});
