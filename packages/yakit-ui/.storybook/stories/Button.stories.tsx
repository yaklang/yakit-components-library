import type { Meta, StoryObj } from '@storybook/react';

import Button from '../../src/components/Button';
import type { ButtonProps, ButtonType } from '../../src/components/Button/type';

const PlusIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const outlineProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ZoomInIcon = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M17.5 17.5L12.5 12.5M8.33333 5.83333V8.33333M8.33333 8.33333V10.8333M8.33333 8.33333H10.8333M8.33333 8.33333H5.83333M14.1667 8.33333C14.1667 11.555 11.555 14.1667 8.33333 14.1667C5.11167 14.1667 2.5 11.555 2.5 8.33333C2.5 5.11167 5.11167 2.5 8.33333 2.5C11.555 2.5 14.1667 5.11167 14.1667 8.33333Z"
      {...outlineProps}
    />
  </svg>
);

const ZoomOutIcon = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M17.5 17.5L12.5 12.5M10.8333 8.33333H5.83333M14.1667 8.33333C14.1667 11.555 11.555 14.1667 8.33333 14.1667C5.11167 14.1667 2.5 11.555 2.5 8.33333C2.5 5.11167 5.11167 2.5 8.33333 2.5C11.555 2.5 14.1667 5.11167 14.1667 8.33333Z"
      {...outlineProps}
    />
  </svg>
);

const YakMarkIcon = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z"
      fill="#FF7B00"
    />
    <path
      d="M7.31588 11.7055L6.80328 11.1929L7.87316 10.131L7.03102 9.29071L6.80035 9.05894L7.31625 8.54267L8.64757 9.87399C8.71543 9.94254 8.75349 10.0351 8.75349 10.1316C8.75349 10.228 8.71543 10.3206 8.64757 10.3892L8.39126 10.6455L7.32394 11.704L7.31588 11.7055ZM11.7485 11.7055H9.98547V10.9856H11.7485V11.7055ZM14.1694 10.9783V10.2584H14.8878V10.324C14.8878 10.5422 14.8854 10.7601 14.8805 10.9776L14.1694 10.9783Z"
      fill="#fff"
    />
    <path
      d="M17.501 7.43692C17.501 7.47354 17.501 7.50795 17.4977 7.54384C17.4946 7.6068 17.4878 7.66952 17.4772 7.73167C17.4049 8.18068 17.1686 8.58692 16.8141 8.87186C16.8121 8.87307 16.8101 8.87442 16.8083 8.87588C16.7237 8.9374 16.6373 8.99561 16.5472 9.05054C16.5442 9.05267 16.541 9.05463 16.5377 9.0564C16.0722 9.34054 15.5514 9.52216 15.0101 9.58914C14.9691 9.5939 14.9277 9.59866 14.886 9.60196C14.7688 9.61331 14.6495 9.6188 14.5297 9.6188C14.41 9.6188 14.2862 9.61331 14.1669 9.60196C14.1632 9.228 14.1555 8.85489 14.1438 8.48264C14.1438 8.43614 14.1405 8.39001 14.1398 8.34424C14.1303 8.07036 14.1181 7.79684 14.1032 7.5237C14.1035 7.51736 14.1035 7.511 14.1032 7.50466C14.1009 7.48089 14.0938 7.45783 14.0823 7.43692C14.0684 7.41079 14.0485 7.38838 14.0241 7.37156C13.9998 7.35474 13.9718 7.34401 13.9424 7.34026C14.9348 7.33971 14.927 7.33971 14.9194 7.34026L13.8212 7.3322C13.5847 7.31573 13.3482 7.29962 13.1116 7.28534C12.3911 7.24286 11.6683 7.21516 10.9433 7.20222C10.7042 7.19746 10.4655 7.1949 10.2257 7.19416C10.1554 7.19416 10.0891 7.19416 10.0188 7.19416C9.8478 7.19416 9.67791 7.19416 9.50618 7.19636C9.35606 7.19819 9.20484 7.20039 9.05472 7.20295C8.95403 7.20295 8.85334 7.20698 8.75265 7.20991C8.12483 7.22455 7.4992 7.25092 6.87577 7.289C6.64241 7.30291 6.40967 7.31865 6.17753 7.33623C6.14348 7.33879 6.10979 7.34099 6.07537 7.34429C6.06732 7.34429 6.05926 7.34429 6.05157 7.34429C6.02276 7.34794 5.99522 7.35834 5.97117 7.37462C5.94713 7.3909 5.92726 7.41262 5.91317 7.43802C5.90201 7.45862 5.89469 7.48107 5.89157 7.50429C5.89157 7.51235 5.89157 7.5193 5.89157 7.52736V7.53139C5.87802 7.79758 5.86667 8.0634 5.85788 8.33032C5.85788 8.38232 5.85458 8.43504 5.85312 8.48703C5.84092 8.85758 5.83323 9.22934 5.83005 9.60232C5.82822 9.70631 5.82822 9.81066 5.82749 9.91538C5.82749 9.98495 5.82749 10.0545 5.82749 10.1234C5.82749 10.7177 5.83762 11.3105 5.85788 11.9017C5.86667 12.1702 5.8779 12.4377 5.89157 12.704C5.89157 12.7109 5.89157 12.7182 5.89157 12.7256C5.89655 12.7669 5.91523 12.8054 5.94462 12.835C5.97401 12.8645 6.01243 12.8833 6.05377 12.8885H6.06256H6.07537C6.34376 12.9101 6.61141 12.9284 6.8809 12.9445C7.50335 12.9838 8.12763 13.0109 8.75375 13.0258C9.00468 13.0324 9.25586 13.0369 9.50728 13.0394C9.62848 13.0412 9.75077 13.0419 9.87343 13.0427C9.91004 13.0427 9.94922 13.0427 9.9862 13.0427H10.0803C11.0975 13.0427 12.1105 13.0131 13.1193 12.954C13.3863 12.939 13.6524 12.9207 13.9175 12.9013H13.9179C13.9286 12.9015 13.9393 12.9004 13.9498 12.898C13.9517 12.8983 13.9537 12.8983 13.9556 12.898C13.9928 12.8909 14.0269 12.8723 14.0531 12.845C14.0794 12.8176 14.0965 12.7828 14.1021 12.7453C14.1035 12.7364 14.1043 12.7273 14.1043 12.7182V12.7095C14.1179 12.4392 14.1292 12.1684 14.138 11.897C14.1441 11.7234 14.1491 11.55 14.153 11.3767H14.8721C14.8618 11.8314 14.8172 12.838 14.8161 12.8413C14.7959 13.0156 14.7232 13.1798 14.6077 13.3119C14.4921 13.4441 14.3392 13.538 14.1691 13.5813C14.1304 13.591 14.0912 13.598 14.0515 13.6021C12.6375 13.7122 11.2084 13.7649 9.76432 13.7603C9.679 13.7603 9.59259 13.7603 9.50801 13.7603C9.2561 13.7576 9.00492 13.7533 8.75448 13.7475C7.83569 13.7265 6.92301 13.6815 6.01642 13.6124H6.03876C6.0318 6.6124 6.02374 6.6124 6.01642 6.6124C5.99262 6.6124 5.96772 6.6091 5.94319 6.6076C5.9391 6.6075 5.93504 6.6069 5.93111 6.6058C5.89572 6.6023 5.86061 6.5964 5.82602 6.5882C5.6539 6.5447 5.49931 6.4493 5.38324 6.315C5.26717 6.1807 5.19524 6.0139 5.17721 5.8372C5.17686 5.8357 5.17686 5.8341 5.17721 5.8325C5.17757 5.826 5.17757 5.8195 5.17721 5.8131C5.17721 5.7926 5.17721 5.771 5.17391 5.7494C5.12778 4.8106 5.10618 3.8657 5.10911 2.91465C5.10911 2.81066 5.10911 2.70777 5.11167 2.60379C5.07103 2.60049 5.03002 2.59573 4.99011 2.59097C4.44907 2.52399 3.92854 2.34236 3.46327 2.05823C3.45631 2.05493 3.44972 2.05017 3.44276 2.04614H3.4402C3.35892 2.99635 3.27983 2.94289 3.20294 2.88687H3.20074C2.84107 2.60363 2.60057 2.19592 2.52666 1.74412C2.5155 1.67967 2.50805 1.61463 2.50433 1.54933C2.50176 1.51271 2.50103 1.4783 2.50103 1.44241C2.50103 1.29863 2.51786 1.15535 2.55119 1.01548C2.60612 0.78484 2.70563 0.56717 2.84411 0.37472C2.85986 0.35239 2.87597 0.33005 2.89354 0.30845C2.89977 0.29966 2.90636 0.29198 2.91331 0.28319C2.93301 0.26393 2.9578 0.25071 2.98476 0.24506C3.01172 0.23941 3.03973 0.24158 3.0655 0.25131C3.09127 0.26104 3.11372 0.27793 3.13022 0.29999C3.14672 0.32204 3.15658 0.34835 3.15863 0.37582C3.15902 0.37935 3.15902 0.38291 3.15863 0.38644C3.1613 0.60814 3.2268 0.82453 3.34755 1.01048C3.4683 1.19643 3.63933 1.3443 3.84077 1.43692C3.93393 1.47994 4.03245 1.51024 4.13369 1.52699C4.19861 1.53836 4.2644 1.54399 4.33031 1.54384H5.17245C5.17245 1.50722 5.17575 1.47061 5.17794 1.43692C5.17819 1.43042 5.1788 1.42394 5.17977 1.41752C5.19569 1.22061 5.27888 1.03519 5.41536 0.89237C5.55184 0.74956 5.7333 0.65805 5.92928 0.63323C5.93402 0.63269 5.93881 0.63269 5.94356 0.63323C5.94586 0.63287 5.94821 0.63287 5.95052 0.63323C5.96516 0.63323 5.97944 0.63066 5.99482 0.62993C5.99982 0.62955 6.00483 0.62955 6.00983 0.62993C6.01361 0.62957 6.01741 0.62957 6.02118 0.62993C6.92435 0.56036 7.83508 0.51423 8.75338 0.49153C8.92425 0.48738 9.09512 0.4842 9.26599 0.48201C9.34581 0.48201 9.426 0.47981 9.50582 0.47871C9.74625 0.47725 9.98669 0.47725 10.2271 0.47871C10.3948 0.47871 10.5629 0.48127 10.7299 0.48347C11.8202 0.49763 12.902 0.54584 13.975 0.6281C13.9768 0.62774 13.9787 0.62774 13.9805 0.6281C13.9845 0.62756 13.9886 0.62756 13.9926 0.6281H14.0047C14.0204 0.6281 14.0358 0.6303 14.0508 0.63213H14.0596C14.247 0.65483 14.4219 0.73787 14.558 0.86871C14.694 0.99956 14.7839 1.1711 14.8139 1.35747C14.8142 1.35928 14.8142 1.36115 14.8139 1.36296C14.8139 1.38053 14.8139 1.39957 14.8164 1.41642C14.8164 1.42374 14.8164 1.43179 14.8164 1.43985C14.8183 1.47646 14.8197 1.51088 14.8212 1.54677H15.6388C15.6491 1.54677 15.6586 1.54677 15.6692 1.54677C15.6798 1.54677 15.689 1.54677 15.6996 1.54677C15.761 1.54557 15.8223 1.5392 15.8827 1.52773C15.9779 1.51017 16.0705 1.48065 16.1584 1.43985C16.3605 1.34639 16.532 1.19741 16.6528 1.01026C16.7735 0.82312 16.8386 0.6055 16.8405 0.38278C16.8401 0.37962 16.8401 0.37642 16.8405 0.37326C16.8423 0.34557 16.852 0.31898 16.8685 0.29668C16.8851 0.27438 16.9077 0.25732 16.9336 0.24754C16.9596 0.23776 16.9878 0.23569 17.015 0.24155C17.0421 0.24742 17.0669 0.26099 17.0866 0.28062C17.0933 0.28735 17.0992 0.29485 17.1041 0.30296C17.1224 0.32529 17.1407 0.34836 17.155 0.3718C17.3779 0.68242 17.4988 1.05461 17.501 1.43692Z"
      fill="#fff"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M15.8333 7.5L10 13.3333L4.16667 7.5" {...outlineProps} />
  </svg>
);

const exampleLabel = {
  fontSize: 11,
  letterSpacing: '0.5px',
  lineHeight: '14px',
};

const JoinedExamples = ({ shape }: { shape?: 'round' }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 40 }}>
    <Button.Group shape={shape} size="huge">
      <Button icon={<ZoomInIcon />} aria-label="放大" isHover />
      <Button icon={<ZoomOutIcon />} aria-label="缩小" />
    </Button.Group>
    <Button.Group shape={shape} size="huge">
      <Button icon={<YakMarkIcon />} style={exampleLabel}>
        YakLang
      </Button>
      <Button icon={<ChevronDownIcon />} aria-label="展开" />
    </Button.Group>
  </div>
);

const COMPONENT_DOCS = [
  '触发一个操作的按钮。',
  '',
  '## 何时使用',
  '',
  '- 需要用户点击来提交、确认或执行一个动作。',
  '- 需要把几个相关动作收成一组。',
  '',
  '按钮表示一次操作，点击只触发 `onClick`，行为对齐 antd `Button`；视觉按 Figma 设计稿实现，状态样式由 CSS `:hover` / `:active` / `:disabled` 承担。互斥切换交给 RadioButton。',
  '',
  '## 要点',
  '',
  '- `href` 存在时渲染 `<a>`（`disabled` 时移除 `href` 并设 `tabIndex=-1`、`aria-disabled`）。button-only 的原生属性（`formAction`、`name` 等）不会泄漏到 `<a>` 上。',
  '- `loading` 为 `true` 时按钮禁用、图标替换为加载图标；`loading={{ delay }}` 只延迟图标的显示，**期间不会禁用按钮**，点击仍触发 `onClick`——需要防重复提交请在 `onClick` 内自行加锁。与 antd 一致：Button 不设置 `aria-busy`。',
  '- `colors` 与 `danger` 同时存在时以 `colors` 为准；`danger` 仅在未传 `colors` 时生效。',
  '- 内部无障碍状态（`aria-disabled`）与 `data-theme` / `dir`（来自 ConfigProvider）由组件控制，不会被子元素 props 覆盖。',
  '- 波纹动画在文本/链接按钮、`disabled`、`loading` 状态下自动关闭。',
  '',
  '## 代码演示',
  '',
  '下方按「总览（Controls）→ 尺寸 → 形状 → 图标 → 类型 → 颜色 → 错误色 → 加载 → 链接 → 禁用 → Yakit 状态 → 按钮组」组织示例。',
  '',
  '## API',
  '',
  '### Button',
  '',
  '| 参数 | 说明 | 类型 | 默认值 |',
  '| --- | --- | --- | --- |',
  '| type | 按钮类型 | `primary` \\| `secondary1` \\| `secondary2` \\| `outline1` \\| `outline2` \\| `text` \\| `text2` \\| `link1` \\| `link2` | `primary` |',
  '| colors | 语义色。和 `danger` 同时存在时以 `colors` 为准 | `primary` \\| `success` \\| `danger` \\| `infoBlue` | - |',
  '| danger | 错误色，仅在未传 `colors` 时生效 | `boolean` | `false` |',
  '| size | 尺寸 | `small` \\| `medium` \\| `large` \\| `huge` | `medium` |',
  '| shape | 圆角形态。`round` 为全圆角 | `default` \\| `round` | `default` |',
  '| icon | 图标 | `ReactNode` | - |',
  '| iconPosition | 图标位置 | `start` \\| `end` | `start` |',
  '| loading | 加载状态。`{ delay }` 只延迟图标显示，期间不禁用、可点击 | `boolean` \\| `{ delay?: number; icon?: ReactNode }` | `false` |',
  '| disabled | 禁用。未传时继承 ConfigProvider | `boolean` | `false` |',
  '| block | 宽度撑满容器 | `boolean` | `false` |',
  '| href | 传入后渲染为 `<a>`，`disabled` / `loading` 时移除链接 | `string` | - |',
  '| target / rel | 与 `href` 配合的锚点属性 | `string` | - |',
  '| htmlType | 原生 button 的 type | `button` \\| `submit` \\| `reset` | `button` |',
  '| radius | 圆角。`true` 为 8px，数字按像素，字符串按 CSS 值（如 `"8px"`） | `boolean` \\| `number` \\| `string` | - |',
  '| animation | 点击波纹。文本/链接按钮和禁用、加载状态自动关闭 | `wave` \\| `false` | `wave` |',
  '| isHover | 保持悬停样式，供示例和静态场景使用 | `boolean` | `false` |',
  '| isActive | 保持按下样式，优先于 `isHover` | `boolean` | `false` |',
  '| classNames | 语义化类名，当前支持 `icon` | `{ icon?: string }` | - |',
  '| styles | 语义化样式，当前支持 `icon` | `{ icon?: CSSProperties }` | - |',
  '| onClick | 点击回调。`disabled` / `loading` 时不触发 | `(event) => void` | - |',
  '| children | 内容 | `ReactNode` | - |',
  '| aria-label | 仅图标按钮的无障碍名称 | `string` | - |',
  '| ...rest | 其余原生 button 属性透传 | `ButtonHTMLAttributes` | - |',
  '',
  'Ref 转发到根元素：有 `href` 时为 `HTMLAnchorElement`，否则为 `HTMLButtonElement`。',
  '',
  '### Button.Group',
  '',
  '把若干按钮拼成一组。只负责拼接（透明背景、图标次级色、悬停灰底），不记录当前项，也不提供选中态。互斥切换交给 RadioButton。原生 `div` 属性（`id`、`data-*` 等）可透传。',
  '',
  '| 参数 | 说明 | 类型 | 默认值 |',
  '| --- | --- | --- | --- |',
  '| size | 统一子按钮尺寸。子按钮自己的 `size` 优先 | `ButtonSize` | - |',
  '| shape | `round` 为全圆角轨道 | `default` \\| `round` | `default` |',
  '| children | 子按钮 | `ReactNode` | - |',
  '',
  '### 标记类（公共 API）',
  '',
  '组件输出的以下类名没有对应样式，但属于公共契约，供消费方覆盖样式或测试定位：`yakit-btn-loading`、`yakit-btn-icon-end`、`yakit-btn-in-group`。禁用态请使用 `:disabled` / `[aria-disabled]`。',
].join('\n');

const storyLayout = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap' as const,
};

const meta: Meta<typeof Button> = {
  title: 'YakitUi/通用/Button',
  component: Button,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: COMPONENT_DOCS,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      description: '按钮类型',
      table: { defaultValue: { summary: 'primary' } },
      control: { type: 'select' },
      options: [
        'primary',
        'secondary1',
        'secondary2',
        'outline1',
        'outline2',
        'text',
        'text2',
        'link1',
        'link2',
      ],
    },
    colors: {
      description: '语义色。与 YakitButton 一致，colors 和 danger 同时存在时以 colors 为准',
      control: { type: 'select' },
      options: ['primary', 'success', 'danger', 'infoBlue'],
    },
    size: {
      description: '按钮尺寸',
      table: { defaultValue: { summary: 'medium' } },
      control: { type: 'select' },
      options: ['small', 'medium', 'large', 'huge'],
    },
    shape: {
      description: '按钮形状。round 为设计稿全圆角',
      table: { defaultValue: { summary: 'default' } },
      control: { type: 'select' },
      options: ['default', 'round'],
    },
    block: {
      description: '宽度是否撑满容器',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    danger: {
      description: '错误色。仅在未传 colors 时生效',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    isHover: {
      description: '保持悬停样式',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    isActive: {
      description: '保持按下样式，优先于 isHover',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    radius: {
      description: '圆角。true 为 8px，数字为像素，字符串为 CSS 值',
      control: 'text',
    },
    animation: {
      description: '点击时的波纹动画效果',
      table: { defaultValue: { summary: 'wave' } },
      control: { type: 'select' },
      options: ['wave', false],
    },
    icon: {
      description: '按钮图标（ReactNode）',
      control: false,
    },
    iconPosition: {
      description: '图标位置',
      table: { defaultValue: { summary: 'start' } },
      control: { type: 'select' },
      options: ['start', 'end'],
    },
    children: {
      description: '按钮内容',
      control: 'text',
    },
    disabled: {
      description: '是否禁用按钮',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    loading: {
      description: '是否开启加载。{ delay } 只延迟图标显示，期间不禁用',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    className: {
      description: '自定义类名',
      control: 'text',
    },
    onClick: {
      description: '点击按钮时触发的回调',
      action: 'clicked',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 总览：绑定 Controls 的可调示例 */
export const Default: Story = {
  name: '总览',
  parameters: {
    docs: {
      description: {
        story: '单个按钮；下方 Controls 可改类型、尺寸、颜色和状态。',
      },
    },
  },
  args: {
    children: 'Button',
    type: 'primary',
    size: 'medium',
    shape: 'default',
    animation: 'wave',
    disabled: false,
    loading: false,
    iconPosition: 'start',
  },
};

/** 尺寸 */
export const Sizes: Story = {
  name: '尺寸',
  parameters: {
    docs: {
      description: {
        story:
          '`small` 20px、`medium` 24px、`large` 28px、`huge` 32px。没有 antd 的 `middle` / `max` 这两个名字。',
      },
    },
  },
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      <Button {...args} size="small">
        Small
      </Button>
      <Button {...args} size="medium">
        Medium
      </Button>
      <Button {...args} size="large">
        Large
      </Button>
      <Button {...args} size="huge">
        Huge
      </Button>
    </div>
  ),
};

/** 形状 */
export const Shapes: Story = {
  name: '形状',
  parameters: {
    docs: {
      description: {
        story: '`default` 为 4px 圆角，`round` 为全圆角。',
      },
    },
  },
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      <Button {...args} shape="default">
        Default
      </Button>
      <Button {...args} shape="round">
        全圆角
      </Button>
    </div>
  ),
};

/** 图标 */
export const WithIcon: Story = {
  name: '图标',
  parameters: {
    docs: {
      description: {
        story: '支持仅图标、图标在前、图标在后。仅图标时请传 `aria-label`。',
      },
    },
  },
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      <Button {...args} icon={<PlusIcon />} aria-label="添加" />
      <Button {...args} icon={<PlusIcon />}>
        添加
      </Button>
      <Button {...args} icon={<PlusIcon />} iconPosition="end">
        添加
      </Button>
    </div>
  ),
};

/** 类型 */
export const Types: Story = {
  name: '类型',
  parameters: {
    docs: {
      description: {
        story: '九种类型对应设计稿的 Primary、Secondary、Outline、Text、Link。没有单独的 `text1`。',
      },
    },
  },
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      {(
        [
          'primary',
          'secondary1',
          'secondary2',
          'outline1',
          'outline2',
          'text',
          'text2',
          'link1',
          'link2',
        ] as ButtonType[]
      ).map((t) => (
        <Button {...args} type={t} key={t}>
          {t}
        </Button>
      ))}
    </div>
  ),
};

/** 语义色 */
export const Colors: Story = {
  name: '颜色',
  parameters: {
    docs: {
      description: {
        story:
          '语义色走 CSS 变量，并随主题切换。`colors` 与 `danger` 同时传入时，以 `colors` 为准。',
      },
    },
  },
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      {(['primary', 'success', 'danger', 'infoBlue'] as const).map((colors) => (
        <Button {...args} key={colors} colors={colors}>
          {colors}
        </Button>
      ))}
    </div>
  ),
};

/** 错误色 */
export const ErrorVariants: Story = {
  name: '错误色',
  parameters: {
    docs: {
      description: {
        story:
          '`danger` 只在没传 `colors` 时把按钮切到错误色。各类型的悬停和按下按设计稿的 Error 状态处理。',
      },
    },
  },
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      {(
        ['primary', 'secondary1', 'secondary2', 'outline1', 'outline2', 'text', 'link1'] as const
      ).map((type) => (
        <Button {...args} key={type} type={type} danger>
          {type}
        </Button>
      ))}
    </div>
  ),
};

/** 加载 */
export const Loading: Story = {
  name: '加载',
  parameters: {
    docs: {
      description: {
        story:
          '`loading` 为 true 时显示加载图标并禁用按钮。`{ delay }` 只延迟图标的显示，期间按钮仍可点击（与 antd 一致）——防重复提交请在 `onClick` 内自行加锁。与 antd 一致：Button 不设置 `aria-busy`。',
      },
    },
  },
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      <Button {...args}>加载</Button>
      <Button {...args} loading={{ delay: 5000 }}>
        delay 期间可点击
      </Button>
      <Button {...args} loading={{ icon: '…' }}>
        自定义图标
      </Button>
    </div>
  ),
  args: {
    children: '加载',
    loading: true,
  },
};

/** 链接按钮 */
export const LinkButton: Story = {
  name: '链接',
  parameters: {
    docs: {
      description: {
        story:
          '传入 `href` 渲染为 `<a>`，可配合 `target` / `rel`。`disabled` 或 `loading` 时移除 `href`、设 `tabIndex=-1` 和 `aria-disabled`，点击不跳转。button-only 的原生属性（`formAction`、`name` 等）不会传到 `<a>` 上。',
      },
    },
  },
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      <Button {...args} href="https://yaklang.com" target="_blank" rel="noreferrer">
        新窗口打开
      </Button>
      <Button {...args} type="outline1" href="#anchor">
        锚点链接
      </Button>
      <Button {...args} disabled href="https://yaklang.com">
        禁用链接
      </Button>
    </div>
  ),
};

/** 禁用 */
export const Disabled: Story = {
  name: '禁用',
  parameters: {
    docs: {
      description: {
        story:
          '禁用后不可点击、波纹关闭，`aria-disabled` 置真。未传 `disabled` 时跟随 ConfigProvider 的整组禁用。',
      },
    },
  },
  args: {
    type: 'primary',
    children: 'Disabled Button',
    disabled: true,
  },
};

/** Yakit 兼容状态 */
export const YakitStates: Story = {
  name: 'Yakit 状态',
  parameters: {
    docs: {
      description: {
        story:
          '`isHover`、`isActive`、`radius` 对齐现有 YakitButton。`isActive` 优先于 `isHover`。`colors="primary"` 时 `danger` 不生效。',
      },
    },
  },
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      <Button {...args} isHover>
        Hover
      </Button>
      <Button {...args} isActive>
        Active
      </Button>
      <Button {...args} isHover isActive>
        Active 优先
      </Button>
      <Button {...args} radius>
        圆角 8
      </Button>
      <Button {...args} radius={16}>
        圆角 16
      </Button>
      <Button {...args} colors="success" danger>
        colors 优先
      </Button>
      <Button {...args} type="text" colors="danger">
        text
      </Button>
    </div>
  ),
};

/** 按钮组：只拼接按钮，不负责互斥选中 */
export const Groups: Story = {
  name: '按钮组',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          '对应设计稿里放大/缩小和 YakLang 这两组。上面一排是全圆角，下面一排是默认圆角。放大按钮保持悬停态。Tab 和工具栏的选中态不在这里。',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 20 }}>
      <JoinedExamples shape="round" />
      <JoinedExamples />
    </div>
  ),
};
