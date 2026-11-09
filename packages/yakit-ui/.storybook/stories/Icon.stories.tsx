import type { Meta, StoryObj } from '@storybook/react';

import '@yakit-libs/yakit-ui-icons/icon.css';
import { BugOutlined, HomeOutlined, Loading, StarOffOutlined } from '@yakit-libs/yakit-ui-icons';
import visualWeightReviews from '../../../yakit-ui-icons/test/fixtures/icons/reference/visual-weight-v2/reviews.json';
import {
  colorfulIconRegistry,
  outlineIconRegistry,
  solidIconRegistry,
  type ColorfulIconCategory,
  type IconDefinition,
} from '@yakit-libs/yakit-ui-icons/registry';

import { colorfulStoryGroups } from './icon-colorful.generated';

const colorfulIconGroups = colorfulStoryGroups.map(({ nodeIds, ...presentation }) => {
  const icons = colorfulIconRegistry.filter(({ category }) => category === presentation.category);
  const positions = new Map(nodeIds.map((id, index) => [id, index]));
  if (
    positions.size !== icons.length ||
    icons.some(({ sourceNodeId }) => !positions.has(sourceNodeId))
  ) {
    throw new Error(
      `Storybook icon data is stale for ${presentation.category}; run pnpm icons:update and rebuild the icon package`,
    );
  }
  return {
    ...presentation,
    icons: [...icons].sort(
      (left, right) => positions.get(left.sourceNodeId)! - positions.get(right.sourceNodeId)!,
    ),
  };
});

const IconSection = ({
  icons,
  category,
  headingLevel = 'h2',
  id,
  intrinsicPreview = false,
  size,
  subtitle,
  title,
}: {
  category?: ColorfulIconCategory;
  headingLevel?: 'h2' | 'h3';
  id?: string;
  icons: IconDefinition[];
  intrinsicPreview?: boolean;
  size?: number;
  subtitle: string;
  title: string;
}) => {
  const Heading = headingLevel;
  return (
    <section data-colorful-category={category} id={id}>
      <div style={{ alignItems: 'baseline', display: 'flex', gap: 12, marginBottom: 16 }}>
        <Heading
          style={{
            color: '#353639',
            fontSize: headingLevel === 'h2' ? 28 : 20,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {title}
        </Heading>
        <span style={{ color: '#8c8f95', fontSize: 14 }}>{subtitle}</span>
        <span style={{ color: '#8c8f95', fontSize: 12 }}>({icons.length})</span>
      </div>
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: `repeat(auto-fill, minmax(${intrinsicPreview ? 380 : 255}px, 1fr))`,
        }}
      >
        {icons.map(({ Component, exportName, family, figmaName, name, sourceStatus }) => (
          <div
            data-icon-category={category}
            data-icon-export={exportName}
            data-icon-family={family}
            key={exportName}
            style={{
              alignItems: 'center',
              border: '1px solid #e7e8eb',
              borderRadius: 4,
              display: 'grid',
              gap: 12,
              gridTemplateColumns: `${intrinsicPreview ? 148 : 24}px minmax(0, 1fr)`,
              padding: 12,
            }}
          >
            {intrinsicPreview ? (
              <div
                style={{
                  alignItems: 'center',
                  background: '#f7f8fa',
                  border: '1px solid #e7e8eb',
                  borderRadius: 4,
                  display: 'flex',
                  height: 56,
                  justifyContent: 'center',
                  width: 148,
                }}
              >
                <Component
                  style={{
                    display: 'block',
                    height: 'auto',
                    maxHeight: 48,
                    maxWidth: 136,
                    width: 'auto',
                  }}
                />
              </div>
            ) : (
              <Component size={size} />
            )}
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
                style={{
                  color: '#8c8f95',
                  display: intrinsicPreview ? 'block' : undefined,
                  fontSize: 11,
                  overflowWrap: intrinsicPreview ? 'anywhere' : undefined,
                }}
              >{`import { ${exportName} } from '@yakit-libs/yakit-ui';`}</code>
              <code
                style={{
                  color: '#8c8f95',
                  display: 'block',
                  fontSize: 11,
                  overflowWrap: intrinsicPreview ? 'anywhere' : undefined,
                }}
              >{`<${exportName} />`}</code>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const ColorfulIconGallery = () => (
  <section>
    <div style={{ alignItems: 'baseline', display: 'flex', gap: 12, marginBottom: 16 }}>
      <h2 style={{ color: '#353639', fontSize: 28, lineHeight: 1.2, margin: 0 }}>Colorful</h2>
      <span style={{ color: '#8c8f95', fontSize: 14 }}>
        Fixed multicolor artwork · intrinsic Figma size
      </span>
      <span style={{ color: '#8c8f95', fontSize: 12 }}>({colorfulIconRegistry.length})</span>
    </div>
    <nav
      aria-label="Colorful icon categories"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}
    >
      {colorfulIconGroups.map(({ category, icons, label }) => (
        <a
          href={`#colorful-${category}`}
          key={category}
          style={{
            background: '#f7f8fa',
            border: '1px solid #e7e8eb',
            borderRadius: 4,
            color: '#353639',
            fontSize: 12,
            padding: '6px 8px',
            textDecoration: 'none',
          }}
        >
          {label} · {icons.length}
        </a>
      ))}
    </nav>
    <div style={{ display: 'grid', gap: 36 }}>
      {colorfulIconGroups.map(({ category, icons, label }) => (
        <IconSection
          category={category}
          headingLevel="h3"
          icons={icons}
          id={`colorful-${category}`}
          intrinsicPreview
          key={category}
          subtitle={`${category} · intrinsic Figma size`}
          title={label}
        />
      ))}
    </div>
  </section>
);

const ColorfulCategoryGallery = ({ category }: { category: ColorfulIconCategory }) => {
  const group = colorfulIconGroups.find((candidate) => candidate.category === category);
  if (!group) throw new Error(`Unknown colorful icon category: ${category}`);
  return (
    <IconSection
      category={group.category}
      icons={group.icons}
      intrinsicPreview
      subtitle={`${group.category} · intrinsic Figma size`}
      title={group.label}
    />
  );
};

const IconGallery = () => (
  <div style={{ display: 'grid', gap: 48 }}>
    <IconSection
      icons={outlineIconRegistry}
      size={24}
      subtitle="24×24 · default stroke 1 · filled details retain their shape"
      title="Outline"
    />
    <IconSection
      icons={solidIconRegistry}
      size={20}
      subtitle="Solid fill, 1 SVG unit for stroked details, 20×20 bounding box"
      title="Solid"
    />
    <ColorfulIconGallery />
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

export const Overview: Story = {
  name: 'Overview',
};

export const Outline: Story = {
  name: 'Outline',
  render: () => (
    <IconSection
      icons={outlineIconRegistry}
      size={24}
      subtitle="24×24 · default stroke 1 · filled details retain their shape"
      title="Outline"
    />
  ),
};

export const Solid: Story = {
  name: 'Solid',
  render: () => (
    <IconSection
      icons={solidIconRegistry}
      size={20}
      subtitle="Solid fill, 1 SVG unit for stroked details, 20×20 bounding box"
      title="Solid"
    />
  ),
};

// BEGIN GENERATED COLORFUL STORIES
export const PrimaryFunctionMenu: Story = {
  name: 'Colorful · 一级功能菜单',
  render: () => <ColorfulCategoryGallery category="primary-function-menu" />,
};

export const SecondaryMenu: Story = {
  name: 'Colorful · 二级功能菜单',
  render: () => <ColorfulCategoryGallery category="secondary-menu" />,
};

export const Basic: Story = {
  name: 'Colorful · 基础图标 · Solid + Outline',
  render: () => <ColorfulCategoryGallery category="basic" />,
};

export const YakitLogo: Story = {
  name: 'Colorful · Yakit 品牌标识',
  render: () => <ColorfulCategoryGallery category="yakit-logo" />,
};

export const PenetrationLogo: Story = {
  name: 'Colorful · PenetraX 品牌标识',
  render: () => <ColorfulCategoryGallery category="penetration-logo" />,
};

export const AiModel: Story = {
  name: 'Colorful · AI 模型',
  render: () => <ColorfulCategoryGallery category="ai-model" />,
};

export const ColorfulIcon: Story = {
  name: 'Colorful · 彩色图标',
  render: () => <ColorfulCategoryGallery category="colorful-icon" />,
};

export const Avatar: Story = {
  name: 'Colorful · 头像',
  render: () => <ColorfulCategoryGallery category="avatar" />,
};

export const PluginSource: Story = {
  name: 'Colorful · 插件来源',
  render: () => <ColorfulCategoryGallery category="plugin-source" />,
};

export const RiskLevel: Story = {
  name: 'Colorful · 风险等级',
  render: () => <ColorfulCategoryGallery category="risk-level" />,
};

export const LogTaskNode: Story = {
  name: 'Colorful · 日志与任务节点',
  render: () => <ColorfulCategoryGallery category="log-task-node" />,
};

export const FileType: Story = {
  name: 'Colorful · 文件类型',
  render: () => <ColorfulCategoryGallery category="file-type" />,
};

export const Browser: Story = {
  name: 'Colorful · 浏览器',
  render: () => <ColorfulCategoryGallery category="browser" />,
};

export const OperatingSystem: Story = {
  name: 'Colorful · 操作系统',
  render: () => <ColorfulCategoryGallery category="operating-system" />,
};

export const SocialMedia: Story = {
  name: 'Colorful · 社交平台',
  render: () => <ColorfulCategoryGallery category="social-media" />,
};

export const Coding: Story = {
  name: 'Colorful · 编程技术',
  render: () => <ColorfulCategoryGallery category="coding" />,
};

export const Cursor: Story = {
  name: 'Colorful · 鼠标指针',
  render: () => <ColorfulCategoryGallery category="cursor" />,
};
// END GENERATED COLORFUL STORIES

const StrokeWidthGallery = ({ strokeWidth }: { strokeWidth: number }) => (
  <section style={{ display: 'grid', gap: 16 }}>
    <p>描边宽度：{strokeWidth}。可调 Outline 与 Loading 默认宽度为 1.5；0 隐藏描边。</p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      {[BugOutlined, HomeOutlined, StarOffOutlined, Loading].map((Icon) => (
        <div key={Icon.displayName} style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
          <Icon size={32} svgProps={{ strokeWidth }} />
          <span>{Icon.displayName}</span>
        </div>
      ))}
    </div>
    <p>二维码等轮廓已恢复为可调描边；实心圆点、舷窗等填充细节保留原样。</p>
  </section>
);

export const StrokeWidth: StoryObj<typeof StrokeWidthGallery> = {
  name: '描边宽度',
  args: { strokeWidth: 1.5 },
  argTypes: { strokeWidth: { control: { type: 'range', min: 0, max: 3, step: 0.5 } } },
  render: (args) => <StrokeWidthGallery {...args} />,
};

const originalWeightSources = import.meta.glob<string>(
  '../../../yakit-ui-icons/test/fixtures/icons/reference/visual-weight-v2/original/*.svg',
  { eager: true, import: 'default', query: '?raw' },
);
const revisedWeightIcons = visualWeightReviews.reviews.map(({ exportName, file }) => {
  const sourceNodeId = file.replace(/\.svg$/, '').replace('-', ':');
  const icon = outlineIconRegistry.find((entry) => entry.sourceNodeId === sourceNodeId);
  const original =
    originalWeightSources[
      `../../../yakit-ui-icons/test/fixtures/icons/reference/visual-weight-v2/original/${file}`
    ];
  if (!icon || !original) throw new Error(`Missing visual-weight comparison: ${exportName}`);
  return { ...icon, original };
});

const VisualWeightGallery = ({ strokeWidth }: { strokeWidth: number }) => (
  <section style={{ display: 'grid', gap: 24 }}>
    <p>
      左侧历史快照保留修复前的问题，供对照；右侧为当前组件，响应下方线宽控制。 每组依次展示
      16、24、32px。当前线宽：{strokeWidth}。
    </p>
    {['light', 'dark'].map((theme) => (
      <section
        key={theme}
        style={{
          background: theme === 'light' ? '#f8f9fa' : '#202225',
          color: theme === 'light' ? '#353639' : '#f0f2f5',
          padding: 20,
          display: 'grid',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span>默认线重参照</span>
          <HomeOutlined color="inherit" size={24} />
          <BugOutlined color="inherit" size={24} />
        </div>
        {revisedWeightIcons.map(({ Component, exportName, original }) => (
          <div
            key={exportName}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}
          >
            <span style={{ width: 250 }}>{exportName}</span>
            <figure style={{ margin: 0, display: 'grid', gap: 8 }}>
              <figcaption>修复前（历史快照）</figcaption>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                {[16, 24, 32].map((size) => (
                  <img
                    key={size}
                    alt={`${exportName} 修复前 ${size}px`}
                    width={size}
                    height={size}
                    src={`data:image/svg+xml,${encodeURIComponent(original.replace('<svg ', `<svg style="color:${theme === 'light' ? '#353639' : '#f0f2f5'}" `))}`}
                  />
                ))}
              </div>
            </figure>
            <span aria-hidden="true">→</span>
            <figure style={{ margin: 0, display: 'grid', gap: 8 }}>
              <figcaption>当前组件</figcaption>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                {[16, 24, 32].map((size) => (
                  <Component key={size} color="inherit" size={size} svgProps={{ strokeWidth }} />
                ))}
              </div>
            </figure>
          </div>
        ))}
        <p>实心细节与遮挡参照</p>
        <div style={{ display: 'flex', gap: 24 }}>
          {outlineIconRegistry
            .filter(({ exportName }) =>
              [
                'ChatOutlined',
                'QuestionMarkCircleOutlined',
                'RocketOutlined',
                'MCPOutlined',
                'AIOutlined',
                'StarOffOutlined',
              ].includes(exportName),
            )
            .map(({ Component, exportName }) => (
              <div key={exportName} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
                <Component color="inherit" size={24} svgProps={{ strokeWidth }} />
                <small>{exportName}</small>
              </div>
            ))}
        </div>
      </section>
    ))}
  </section>
);

export const VisualWeight: StoryObj<typeof VisualWeightGallery> = {
  name: '线条粗细对照',
  args: { strokeWidth: 1.5 },
  argTypes: { strokeWidth: { control: { type: 'range', min: 0, max: 3, step: 0.5 } } },
  render: (args) => <VisualWeightGallery {...args} />,
};
