import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';

import { outlineIconRegistry } from '../../src/icons';
import type { IconDefinition } from '../../src/icons/registry';

const defectNames = new Set([
  'ArchiveRestoreOutlined',
  'ArrowBigUpOutlined',
  'FileUpOutlined',
  'FigmaIcon2017756Outlined',
  'StethoscopeOutlined',
  'FigmaIcon22915169930Outlined',
  'FigmaIcon2338925Outlined',
  'Play2Outlined',
  'FigmaIcon28011794Outlined',
  'Link2OffOutlined',
  'Link2Figma28376288Outlined',
  'ArrowsOutlined',
  'Trash2Outlined',
  'RobotOutlined',
  'FigmaIcon34227111184Outlined',
  'FigmaIcon34227111185Outlined',
  'FigmaIcon348196674Outlined',
  'FigmaIcon35020585Outlined',
  'ScreenShareOutlined',
  'ScreenShareOffOutlined',
  'PositionOutlined',
  'List2Outlined',
  'List1Outlined',
  'PillOutlined',
  'AnnotationCloseOutlined',
  'FigmaIcon4866167279Outlined',
  'FigmaIcon5237120699Outlined',
  'FigmaIcon6480193584Outlined',
  'ChromeOutlined',
  'FigmaIcon6708131177Outlined',
  'PlugsOutlined',
  'LogOutlined',
  'Log2Outlined',
  'LinkoutOutlined',
  'Link2Outlined',
  'BugOutlined',
  'StarOutlined',
  'PaperAirplaneOutlined',
  'EmojiHappyOutlined',
  'EmojiSadOutlined',
  'ThumbUpOutlined',
  'ThumbDownOutlined',
]);

const collisionNames = new Set([
  'AddPayloadOutlined',
  'Wrench1Outlined',
  'StarOffOutlined',
  'LogoOutlined',
  'Goal2Outlined',
]);

const byExportName = new Map(
  outlineIconRegistry.map((definition) => [definition.exportName, definition]),
);
const defects = outlineIconRegistry.filter(({ exportName }) => defectNames.has(exportName));
const controls = outlineIconRegistry.filter(
  ({ exportName }) =>
    !defectNames.has(exportName) &&
    exportName !== 'NotebookOutlined' &&
    exportName !== 'LandPlotOutlined',
);
const compatibility = outlineIconRegistry.filter(
  ({ exportName }) => exportName === 'LandPlotOutlined' || exportName === 'NotebookOutlined',
);
const collisions = outlineIconRegistry.filter(({ exportName }) => collisionNames.has(exportName));
const Star = byExportName.get('StarOutlined')?.Component;

const tileStyle: CSSProperties = {
  alignItems: 'center',
  border: '1px solid #e6e8ed',
  display: 'grid',
  gap: 8,
  gridTemplateColumns: '24px minmax(0, 1fr)',
  minWidth: 0,
  padding: 8,
};

const IconTile = ({ definition, size = 24 }: { definition: IconDefinition; size?: number }) => {
  const { Component, exportName, name, sourceStatus } = definition;
  return (
    <div data-icon-name={name} data-testid={`icon-audit-${exportName}`} style={tileStyle}>
      <Component size={size} />
      <div style={{ minWidth: 0 }}>
        <code
          style={{ display: 'block', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {name}
        </code>
        <small style={{ color: '#6B7280' }}>{sourceStatus}</small>
      </div>
    </div>
  );
};

const Section = ({ icons, title }: { icons: IconDefinition[]; title: string }) => (
  <section data-audit-section={title.toLowerCase().replace(/\s+/g, '-')}>
    <h2>
      {title} ({icons.length})
    </h2>
    <div
      style={{
        display: 'grid',
        gap: 8,
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      }}
    >
      {icons.map((definition) => (
        <IconTile definition={definition} key={definition.exportName} />
      ))}
    </div>
  </section>
);

const IconAudit = () => (
  <main data-testid="outline-icon-audit" style={{ color: '#353639', display: 'grid', gap: 32 }}>
    <Section icons={defects} title="Remediation 42" />
    <Section icons={compatibility} title="LandPlot and legacy Notebook" />
    <section data-audit-section="collision-runtime">
      <h2>Fragment collision runtime</h2>
      <div
        style={{
          display: 'grid',
          gap: 8,
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        }}
      >
        {[...collisions, ...collisions].map((definition, index) => (
          <IconTile definition={definition} key={`${definition.exportName}-${index}`} />
        ))}
      </div>
    </section>
    <section data-audit-section="color-and-size" style={{ display: 'grid', gap: 12 }}>
      <h2>Color and size contract</h2>
      {(['#f8f9fa', '#111827', 'transparent'] as const).map((background) => (
        <div
          data-background={background}
          key={background}
          style={{ background, display: 'flex', gap: 12, padding: 16 }}
        >
          {Star && <Star size={24} />}
          {Star && <Star color="#f28c28" size={20} />}
          {Star && <Star color="inherit" size={24} />}
        </div>
      ))}
    </section>
    <Section icons={controls} title="Frozen controls 298" />
  </main>
);

const meta = {
  title: 'YakitUi/通用/IconAudit',
  component: IconAudit,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof IconAudit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OutlineRemediation: Story = {};
