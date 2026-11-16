import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Button from '../../src/components/Button';
import ConfigProvider from '../../src/components/ConfigProvider';

describe('Button markup', () => {
  it('renders design sizes, native type, and provider disabled state', () => {
    const markup = renderToString(
      <ConfigProvider componentDisabled componentSize="large">
        <Button>提交</Button>
        <Button htmlType="submit" size="small">
          保存
        </Button>
      </ConfigProvider>,
    );

    expect(markup).toContain('yakit-btn-large');
    expect(markup).toContain('yakit-btn-small');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('type="submit"');
  });

  it('renders links, groups, loading, and icon position without nested buttons', () => {
    const markup = renderToString(
      <>
        <Button href="/docs" target="_blank">
          文档
        </Button>
        <Button disabled href="/hidden">
          隐藏
        </Button>
        <Button icon={<span data-icon="plus" />} iconPosition="end" loading>
          加载
        </Button>
        <Button.Group shape="round" size="huge">
          <Button>日</Button>
          <Button type="primary">周</Button>
        </Button.Group>
      </>,
    );

    expect(markup).toContain('href="/docs"');
    expect(markup).toContain('target="_blank"');
    expect(markup).not.toContain('href="/hidden"');
    expect(markup).toContain('aria-disabled="true"');
    // 与 antd 一致：Button 不设置 aria-busy
    expect(markup).not.toContain('aria-busy');
    expect(markup).toContain('yakit-btn-icon-end');
    const loadingButton = markup.slice(markup.indexOf('yakit-btn-icon-end'));
    expect(loadingButton.indexOf('>加载<')).toBeLessThan(
      loadingButton.indexOf('class="yakit-btn-icon"'),
    );
    expect(markup).toContain('yakit-btn-group-round');
    expect(markup).toContain('yakit-btn-group-huge');
    expect(markup).not.toContain('yakit-btn-selected');
    expect(markup).not.toContain('aria-pressed');
    expect(markup).not.toContain('<button type="button"><span><button');
  });

  it('matches YakitButton colors, size, state, and radius', () => {
    const markup = renderToString(
      <>
        <Button colors="success" danger isHover isActive radius size="huge" type="text">
          停止
        </Button>
        <Button colors="infoBlue" radius={12}>
          信息
        </Button>
        <Button danger>危险</Button>
      </>,
    );
    const primaryWithDanger = renderToString(
      <Button colors="primary" danger>
        主色
      </Button>,
    );

    expect(markup).toContain('yakit-btn-color-success');
    expect(markup).toContain('yakit-btn-text');
    expect(markup).toContain('yakit-btn-huge');
    expect(markup).toContain('yakit-btn-hover');
    expect(markup).toContain('yakit-btn-active');
    expect(markup).toContain('--yakit-btn-border-radius:8px');
    expect(markup).toContain('yakit-btn-color-infoBlue');
    expect(markup).toContain('--yakit-btn-border-radius:12px');
    expect(markup).toContain('yakit-btn-color-danger');
    expect(markup.indexOf('yakit-btn-color-success')).toBeLessThan(
      markup.indexOf('yakit-btn-color-danger'),
    );
    expect(primaryWithDanger).not.toContain('yakit-btn-color-danger');
  });
});
