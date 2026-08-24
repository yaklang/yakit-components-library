import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';

import { solidIconRegistry } from '../../src/icons';
import type { IconDefinition } from '../../src/icons/registry';
import placement from '../../test/fixtures/icons/reference/figma-solid-placement-provenance-v1.json';
import prechange from '../../test/fixtures/icons/reference/solid-local-prechange-controls-v1.json';

const byExportName = new Map(
  solidIconRegistry.map((definition) => [definition.exportName, definition]),
);
const exportByNodeId = new Map(
  prechange.records.map((record) => [record.nodeId, record.exportName]),
);
const definitionsForNodeIds = (nodeIds: string[], section: string) =>
  nodeIds.map((nodeId) => {
    const exportName = exportByNodeId.get(nodeId);
    const definition = exportName ? byExportName.get(exportName) : undefined;
    if (!definition) throw new Error(`${section}: missing Solid definition for ${nodeId}`);
    return definition;
  });
const dragNodeId = '2281:144183';
const controls = definitionsForNodeIds(
  placement.targetSymbols.map(({ nodeId }) => nodeId).filter((nodeId) => nodeId !== dragNodeId),
  'Frozen controls',
);
const focus = definitionsForNodeIds(
  [dragNodeId, '1:2967', '16035:380989', '22425:254718', '37831:7379'],
  'Repair and semantic focus',
);
const supplements = definitionsForNodeIds(
  placement.supplementalSources.map(({ nodeId }) => nodeId),
  'Compatibility supplements',
);
if (controls.length !== 250 || focus.length !== 5 || supplements.length !== 4) {
  throw new Error(
    'Solid Storybook audit partition must remain 250 controls + 5 focus + 4 supplements',
  );
}
const fragments = definitionsForNodeIds(
  [
    '1:2967',
    '22425:254718',
    '37831:7379',
    ...placement.supplementalSources.map(({ nodeId }) => nodeId),
  ],
  'Fragment collision runtime',
);
const Drag = byExportName.get('FigmaIcon2281144183Filled')?.Component;
const Import = byExportName.get('FigmaIcon16035380989Filled')?.Component;
const Pill = byExportName.get('PillFilled')?.Component;

const tileStyle: CSSProperties = {
  alignItems: 'center',
  border: '1px solid #e6e8ed',
  display: 'grid',
  gap: 8,
  gridTemplateColumns: '20px minmax(0, 1fr)',
  minWidth: 0,
  padding: 8,
};
const IconTile = ({ definition }: { definition: IconDefinition }) => {
  const { Component, name, sourceNodeId, sourceStatus } = definition;
  return (
    <div data-figma-node-id={sourceNodeId} data-icon-name={name} style={tileStyle}>
      <Component size={20} />
      <div style={{ minWidth: 0 }}>
        <code
          style={{ display: 'block', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {name}
        </code>
        <small style={{ color: '#6B7280' }}>
          {sourceStatus} · {sourceNodeId}
        </small>
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

const SolidIconAudit = () => (
  <main
    data-testid="solid-icon-audit"
    style={{ background: '#F8F9FA', color: '#353639', display: 'grid', gap: 32, padding: 24 }}
  >
    <Section icons={focus} title="Repair and semantic focus" />
    <Section icons={supplements} title="Compatibility supplements" />
    <section data-audit-section="fragment-collision-runtime">
      <h2>Fragment collision runtime (two instances each)</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {[...fragments, ...fragments].map((definition, index) => (
          <IconTile definition={definition} key={`${definition.exportName}-${index}`} />
        ))}
      </div>
    </section>
    <section data-audit-section="color-and-size" style={{ display: 'grid', gap: 12 }}>
      <h2>Color, size, secondary, and cutout contract</h2>
      {(['#F8F9FA', '#111827', 'transparent'] as const).map((background) => (
        <div
          data-background={background}
          key={background}
          style={{
            background,
            color: background === '#111827' ? '#F3F4F6' : '#353639',
            display: 'flex',
            gap: 16,
            padding: 16,
          }}
        >
          {Drag && <Drag size={20} />}
          {Drag && <Drag color="#F28C28" size={32} />}
          {Import && <Import color="inherit" size={20} />}
          {Pill && <Pill color="#2563EB" size={20} />}
        </div>
      ))}
    </section>
    <Section icons={controls} title="Frozen unchanged controls in Figma order" />
  </main>
);

const meta = {
  title: 'YakitUi/通用/SolidIconAudit',
  component: SolidIconAudit,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SolidIconAudit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SolidRemediation: Story = {};
