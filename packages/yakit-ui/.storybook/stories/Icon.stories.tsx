import type { Meta, StoryObj } from '@storybook/react';

import '../../../yakit-ui-icons/icon.css';
import { BugOutlined, HomeOutlined, Loading, StarOffOutlined } from '../../src/icons';
import visualWeightReviews from '../../test/fixtures/icons/reference/visual-weight-v2/reviews.json';
import {
  colorfulIconRegistry,
  outlineIconRegistry,
  solidIconRegistry,
  type ColorfulIconCategory,
  type IconDefinition,
} from '../../src/icons/registry';

interface ColorfulCategoryPresentation {
  category: ColorfulIconCategory;
  label: string;
}

const colorfulCategoryPresentation = [
  { category: 'primary-function-menu', label: '一级功能菜单' },
  { category: 'secondary-menu', label: '二级功能菜单' },
  { category: 'basic', label: '基础图标 · Solid + Outline' },
  { category: 'yakit-logo', label: 'Yakit 品牌标识' },
  { category: 'penetration-logo', label: 'PenetraX 品牌标识' },
  { category: 'ai-model', label: 'AI 模型' },
  { category: 'avatar', label: '头像' },
  { category: 'plugin-source', label: '插件来源' },
  { category: 'risk-level', label: '风险等级' },
  { category: 'log-task-node', label: '日志与任务节点' },
  { category: 'file-type', label: '文件类型' },
  { category: 'browser', label: '浏览器' },
  { category: 'operating-system', label: '操作系统' },
  { category: 'social-media', label: '社交平台' },
  { category: 'coding', label: '编程技术' },
  { category: 'cursor', label: '鼠标指针' },
] as const satisfies readonly ColorfulCategoryPresentation[];

const sourceNodeIds = (value: string) => value.trim().split(/\s+/);

const colorfulFigmaNodeOrder: Partial<Record<ColorfulIconCategory, string[]>> = {
  basic: sourceNodeIds(`
    37151:15203 37151:15202 37151:15201 37151:15200 37151:15199 37151:15198 37151:15197 37151:15196
    37151:15188 37151:15195 37151:15194 37151:15193 37151:15192 37151:15191 37151:15190 37151:15189
    37151:15187 37151:15186 37151:15185 37151:15184 37151:15183 37151:15182 37151:15181 37151:15180
    37151:15169 37151:15179 37151:15176 37151:15174 37151:15173 37151:15172 37151:15171 37151:15170
    37151:15168 37151:15167 37151:15166 37560:24987 37560:24988 37560:24989 38051:63673 38723:89101
    44984:1932
    45:955 46:887 46:914 46:929 46:943 66:1969 70:2017 74:2045
    77:1722 78:1750 78:1778 78:1791 86:1736 86:1761 88:1820 89:1870
    89:1898 92:1713 92:1761 2581:76280 2970:81535 2970:81496 2970:81207 2960:81120
    2960:81053 2956:81015 2956:80990 2956:80711 2956:80557 37151:13886 2743:86612 14476:204436
    14476:204482 14476:204653 15311:236843 37560:24990 37560:24991 37560:24992 38051:62408 38723:88885
    44983:1900
  `),
  'yakit-logo': sourceNodeIds(`
    15444:242046 37221:35186 37221:35146 15454:242111 37221:35164 37221:35129
    37154:12492 37221:35443 37221:35427 37154:12490 37221:35332 37221:35328
    44518:10212 44520:3491 44520:1884 44520:3547 44520:3560 44520:3632
    44520:5040 44521:5060 44521:5122 44521:5198 44521:5204 44522:5642
  `),
  'ai-model': sourceNodeIds(`
    38864:130867 38803:60735 38808:60821 38808:60837 38808:60849 38808:67833 38808:67860
    38808:67883 38808:67896 39233:7592 39233:7605 39233:7631 45038:1909 45594:5407
    38864:130874 38808:67916 38808:67857 38808:67851 38808:67848 38808:67843 38808:67874
    38808:67893 38808:67907 39233:7601 39233:7642 39233:7669 45038:1923 45594:5420
  `),
  avatar: sourceNodeIds(`
    37202:11853 37202:11830 37202:11824 37221:35748 37221:35732 37221:35740 37221:35736
    37221:35744 37221:35731
  `),
  'plugin-source': sourceNodeIds(`3409:103588 3409:103589 3409:103590 37153:16224 3054:91957`),
  'log-task-node': sourceNodeIds(`
    14012:175288 14586:211780 14586:211782 14586:211797 31042:85219 14586:211801 15752:248591
    14586:211810 13807:174539 13807:174540 13807:174541 13807:174542 13807:174543 13807:174544
    13807:174545 37153:13731 37153:13733 37153:13735 37153:13737 37153:13739
    45425:2032 45425:2030 45425:2003 45425:2011 45425:2005
    45428:2113 45428:2123 45428:2083 45428:2093 45428:2103
  `),
  'file-type': sourceNodeIds(`
    32338:71077 45132:119394 32338:71076 32338:71075 32338:71074 32338:71073 32338:71072
    32338:71082
  `),
  coding: sourceNodeIds(`
    37155:20116 37155:20119 37155:20123 37155:20127 37155:20130 37155:20132 37155:20137
    37155:20140 37155:20145 37155:20148 37155:20152 37155:20156 37155:20158 37155:20161
    37155:20168 37155:20188 37155:20193 37155:20197 37155:20200 37155:20206 37155:20209
    22799:2274 22801:2402 22801:2406 22801:2404
  `),
  cursor: sourceNodeIds(`256:9484 266:9426 13394:167118 37153:13454 14666:220525`),
};

const orderColorfulIcons = (
  category: ColorfulIconCategory,
  icons: IconDefinition<'colorful'>[],
) => {
  const sourceOrder = colorfulFigmaNodeOrder[category];
  if (!sourceOrder) return icons;

  const positionByNodeId = new Map(sourceOrder.map((nodeId, index) => [nodeId, index]));
  const missingNodeIds = icons
    .filter(({ sourceNodeId }) => !positionByNodeId.has(sourceNodeId))
    .map(({ sourceNodeId }) => sourceNodeId);
  if (
    positionByNodeId.size !== sourceOrder.length ||
    sourceOrder.length !== icons.length ||
    missingNodeIds.length > 0
  ) {
    throw new Error(
      `Invalid Figma icon order for ${category}: expected ${sourceOrder.length}, received ${icons.length}, missing ${missingNodeIds.join(', ') || 'none'}`,
    );
  }

  return [...icons].sort(
    (left, right) =>
      positionByNodeId.get(left.sourceNodeId)! - positionByNodeId.get(right.sourceNodeId)!,
  );
};

const colorfulIconGroups = colorfulCategoryPresentation.map((presentation) => ({
  ...presentation,
  icons: orderColorfulIcons(
    presentation.category,
    colorfulIconRegistry.filter(({ category }) => category === presentation.category),
  ),
}));

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

const StrokeWidthGallery = ({ strokeWidth }: { strokeWidth: number }) => (
  <section style={{ display: 'grid', gap: 16 }}>
    <p>描边宽度：{strokeWidth}。可调 Outline 与 Loading 默认宽度为 1；0 隐藏描边。</p>
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
  args: { strokeWidth: 1 },
  argTypes: { strokeWidth: { control: { type: 'range', min: 0, max: 3, step: 0.5 } } },
  render: (args) => <StrokeWidthGallery {...args} />,
};

const originalWeightSources = import.meta.glob<string>(
  '../../test/fixtures/icons/reference/visual-weight-v2/original/*.svg',
  { eager: true, import: 'default', query: '?raw' },
);
const revisedWeightIcons = visualWeightReviews.reviews.map(({ exportName, file }) => {
  const sourceNodeId = file.replace(/\.svg$/, '').replace('-', ':');
  const icon = outlineIconRegistry.find((entry) => entry.sourceNodeId === sourceNodeId);
  const original =
    originalWeightSources[`../../test/fixtures/icons/reference/visual-weight-v2/original/${file}`];
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
  args: { strokeWidth: 1 },
  argTypes: { strokeWidth: { control: { type: 'range', min: 0, max: 3, step: 0.5 } } },
  render: (args) => <VisualWeightGallery {...args} />,
};
