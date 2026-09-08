import type { Meta, StoryObj } from '@storybook/react';

import '../../../yakit-ui-icons/icon.css';

import * as OldIcons from '../../src/icons/oldicon';
import type { IconComponent } from '../../src/icons/oldicon';
import oldIconInventory from '../../src/icons/oldicon/inventory.json';

const oldIconModule = OldIcons as Record<string, IconComponent>;
const oldIconEntries = oldIconInventory.exports.map((entry) => {
  const Component = oldIconModule[entry.exportName];
  if (!Component) {
    throw new Error(
      `oldIcon inventory export is missing from the runtime module: ${entry.exportName}`,
    );
  }
  return { ...entry, Component };
});

type OldIconEntry = (typeof oldIconEntries)[number];

const oldIconImportPath = '@yakit-libs/yakit-ui-icons/oldicon';

const OldIconCard = ({ entry }: { entry: OldIconEntry }) => {
  const { Component, exportName, sourceKeys } = entry;
  const importSnippet = `import { ${exportName} } from '${oldIconImportPath}';`;

  return (
    <article
      data-oldicon-export={exportName}
      data-oldicon-import={oldIconImportPath}
      style={{
        border: '1px solid #e7e8eb',
        borderRadius: 6,
        containIntrinsicSize: '156px',
        contentVisibility: 'auto',
        display: 'grid',
        gap: 12,
        gridTemplateColumns: '56px minmax(0, 1fr)',
        padding: 14,
      }}
    >
      <div
        style={{
          alignItems: 'center',
          background: '#f7f8fa',
          borderRadius: 4,
          display: 'flex',
          height: 48,
          justifyContent: 'center',
          overflow: 'hidden',
          width: 56,
        }}
      >
        <Component
          aria-label={exportName}
          svgProps={{ height: 36, preserveAspectRatio: 'xMidYMid meet', width: 48 }}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <strong style={{ color: '#353639', display: 'block', fontSize: 13 }}>{exportName}</strong>
        <code
          style={{ color: '#686c73', display: 'block', fontSize: 11, overflowWrap: 'anywhere' }}
        >
          {importSnippet}
        </code>
        <code style={{ color: '#686c73', display: 'block', fontSize: 11 }}>
          {`<${exportName} />`}
        </code>
        <small
          title={sourceKeys.join('\n')}
          style={{ color: '#8c8f95', display: 'block', marginTop: 8, overflowWrap: 'anywhere' }}
        >
          {sourceKeys.length} source {sourceKeys.length === 1 ? 'mapping' : 'mappings'} ·{' '}
          {sourceKeys[0]}
          {sourceKeys.length > 1 ? ` · +${sourceKeys.length - 1}` : ''}
        </small>
      </div>
    </article>
  );
};

const OldIconOverview = () => (
  <div style={{ display: 'grid', gap: 24, maxWidth: 900 }}>
    <header>
      <h1 style={{ color: '#353639', marginBottom: 8 }}>oldIcon 兼容图标</h1>
      <p style={{ color: '#686c73', lineHeight: 1.6, margin: 0 }}>
        这里收录 Yakit 迁移期间仍需保留的旧 SVG。它们通过 <code>{oldIconImportPath}</code>{' '}
        独立导入，不进入正式图标 registry。内置描边已统一为 1 SVG
        用户单位，原有图形、颜色和导出名称保留。
      </p>
    </header>
    <div
      data-oldicon-summary
      style={{
        background: '#f7f8fa',
        border: '1px solid #e7e8eb',
        borderRadius: 6,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        padding: 18,
      }}
    >
      <span>
        <strong>{oldIconInventory.totals.exports}</strong> public exports
      </span>
      <span>
        <strong>{oldIconInventory.totals.artworks}</strong> unique artworks
      </span>
      <span>
        <strong>{oldIconInventory.totals.sourcePaths}</strong> source paths
      </span>
    </div>
    <p style={{ color: '#686c73', lineHeight: 1.6, margin: 0 }}>
      该兼容集合没有可靠的 Outline、Solid 或 Colorful family 元数据，因此不会按正式 family
      分类。请在 <strong>All Icons</strong>{' '}
      页面查看全部导出；列表按导出名排序，可使用浏览器页面查找快速定位。
    </p>
    <pre
      style={{
        background: '#1f2328',
        borderRadius: 6,
        color: '#f0f3f6',
        margin: 0,
        overflowX: 'auto',
        padding: 16,
      }}
    >
      <code>{`import { PopoverArrowIcon } from '${oldIconImportPath}';`}</code>
    </pre>
  </div>
);

const OldIconGallery = () => (
  <div style={{ display: 'grid', gap: 24 }}>
    <header>
      <h1 style={{ color: '#353639', marginBottom: 8 }}>oldIcon 全部导出</h1>
      <p data-oldicon-total={oldIconEntries.length} style={{ color: '#686c73', margin: 0 }}>
        {oldIconEntries.length} public exports · {oldIconInventory.totals.artworks} unique artworks
        · {oldIconInventory.totals.sourcePaths} source paths
      </p>
    </header>
    <section
      aria-label="All oldIcon exports"
      style={{
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      }}
    >
      {oldIconEntries.map((entry) => (
        <OldIconCard entry={entry} key={entry.exportName} />
      ))}
    </section>
  </div>
);

const meta = {
  title: 'YakitUi/通用/Icon/oldIcon',
  component: OldIconOverview,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof OldIconOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Overview',
  render: () => <OldIconOverview />,
};

export const AllIcons: Story = {
  name: 'All Icons',
  render: () => <OldIconGallery />,
};
