import type { Meta, StoryObj } from '@storybook/react';
import '@yakit-libs/yakit-ui-icons/icon.css';
import * as OldIcons from '@yakit-libs/yakit-ui-icons/oldicon';
import type { IconComponent } from '@yakit-libs/yakit-ui-icons/oldicon';

const oldIconModule = OldIcons as Record<string, IconComponent>;
const oldIconEntries = Object.keys(oldIconModule)
  .sort((a, b) => a.localeCompare(b))
  .map((exportName) => ({ exportName, Component: oldIconModule[exportName] }));

type OldIconEntry = (typeof oldIconEntries)[number];

const oldIconImportPath = '@yakit-libs/yakit-ui-icons/oldicon';

const OldIconCard = ({ entry }: { entry: OldIconEntry }) => {
  const { Component, exportName } = entry;
  const importSnippet = `import { ${exportName} } from '${oldIconImportPath}';`;

  return (
    <article
      data-oldicon-export={exportName}
      data-oldicon-import={oldIconImportPath}
      style={{
        border: '1px solid var(--Colors-Use-Neutral-Border)',
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
          background: 'var(--Colors-Use-Neutral-Bg)',
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
        <strong
          style={{
            color: 'var(--Colors-Use-Neutral-Text-1-Title)',
            display: 'block',
            fontSize: 13,
          }}
        >
          {exportName}
        </strong>
        <code
          style={{
            color: 'var(--Colors-Use-Neutral-Text-2-Primary)',
            display: 'block',
            fontSize: 11,
            overflowWrap: 'anywhere',
          }}
        >
          {importSnippet}
        </code>
        <code
          style={{
            color: 'var(--Colors-Use-Neutral-Text-2-Primary)',
            display: 'block',
            fontSize: 11,
          }}
        >
          {`<${exportName} />`}
        </code>
      </div>
    </article>
  );
};

const OldIconOverview = () => (
  <div style={{ display: 'grid', gap: 24, maxWidth: 900 }}>
    <header>
      <h1 style={{ color: 'var(--Colors-Use-Neutral-Text-1-Title)', marginBottom: 8 }}>
        oldIcon 兼容图标
      </h1>
      <p style={{ color: 'var(--Colors-Use-Neutral-Text-2-Primary)', lineHeight: 1.6, margin: 0 }}>
        这里收录 Yakit 迁移期间仍需保留的旧 SVG。它们通过 <code>{oldIconImportPath}</code>{' '}
        独立导入，不进入正式图标 registry。以现有 assets SVG 为准，素材、组件及入口手工维护。
      </p>
    </header>
    <div
      data-oldicon-summary
      style={{
        background: 'var(--Colors-Use-Neutral-Bg)',
        border: '1px solid var(--Colors-Use-Neutral-Border)',
        borderRadius: 6,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        padding: 18,
      }}
    >
      <span>
        <strong>{oldIconEntries.length}</strong> public exports
      </span>
    </div>
    <p style={{ color: 'var(--Colors-Use-Neutral-Text-2-Primary)', lineHeight: 1.6, margin: 0 }}>
      该兼容集合没有可靠的 Outline、Solid 或 Colorful family 元数据，因此不会按正式 family
      分类。请在 <strong>All Icons</strong>{' '}
      页面查看全部导出；列表按导出名排序，可使用浏览器页面查找快速定位。
    </p>
    <pre
      style={{
        background: 'var(--Colors-Use-Neutral-Bg)',
        borderRadius: 6,
        color: 'var(--Colors-Use-Neutral-Text-1-Title)',
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
      <h1 style={{ color: 'var(--Colors-Use-Neutral-Text-1-Title)', marginBottom: 8 }}>
        oldIcon 全部导出
      </h1>
      <p
        data-oldicon-total={oldIconEntries.length}
        style={{ color: 'var(--Colors-Use-Neutral-Text-2-Primary)', margin: 0 }}
      >
        {oldIconEntries.length} public exports
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
