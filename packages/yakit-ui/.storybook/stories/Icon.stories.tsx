import type { Meta, StoryObj } from '@storybook/react';

import { outlineIconRegistry, solidIconRegistry } from '../../src/icons';
import type { IconDefinition } from '../../src/icons/registry';

const IconSection = ({
  icons,
  size,
  subtitle,
  title,
}: {
  icons: IconDefinition[];
  size: number;
  subtitle: string;
  title: string;
}) => (
  <section>
    <div style={{ alignItems: 'baseline', display: 'flex', gap: 12, marginBottom: 16 }}>
      <h2 style={{ color: '#353639', fontSize: 28, lineHeight: 1.2, margin: 0 }}>{title}</h2>
      <span style={{ color: '#8c8f95', fontSize: 14 }}>{subtitle}</span>
      <span style={{ color: '#8c8f95', fontSize: 12 }}>({icons.length})</span>
    </div>
    <div
      style={{
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fill, minmax(255px, 1fr))',
      }}
    >
      {icons.map(({ Component, exportName, figmaName, name, sourceStatus }) => (
        <div
          key={exportName}
          style={{
            alignItems: 'center',
            border: '1px solid #e7e8eb',
            borderRadius: 4,
            display: 'grid',
            gap: 12,
            gridTemplateColumns: '24px minmax(0, 1fr)',
            padding: 12,
          }}
        >
          <Component size={size} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: '#353639',
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </div>
            <small style={{ color: '#8c8f95', display: 'block', fontSize: 10 }}>
              {sourceStatus}
              {figmaName === null ? ' · Figma name unavailable' : ''}
            </small>
            <code
              style={{ color: '#8c8f95', fontSize: 11 }}
            >{`import { ${exportName} } from 'yakit-ui';`}</code>
            <code
              style={{ color: '#8c8f95', display: 'block', fontSize: 11 }}
            >{`<${exportName} />`}</code>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const IconGallery = () => (
  <div style={{ display: 'grid', gap: 48 }}>
    <IconSection
      icons={outlineIconRegistry}
      size={24}
      subtitle="2px stroke weight, 24×24 bounding box"
      title="Outline"
    />
    <IconSection
      icons={solidIconRegistry}
      size={20}
      subtitle="Solid fill, 20×20 bounding box"
      title="Solid"
    />
  </div>
);

const meta = {
  title: 'YakitUi/通用/Icon',
  component: IconGallery,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof IconGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
