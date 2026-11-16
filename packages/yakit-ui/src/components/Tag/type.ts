import type { ReactNode, MouseEvent, CSSProperties } from 'react';

import type { BaseProps } from '../../types/common';

export type TagSize = 'small' | 'medium' | 'large';

/**
 * 标签颜色（与 Figma TagColor 命名一致；运行时不含 antd 色名别名）。
 *
 * 语义色：
 * default — 默认（中性灰）
 * primary — 主色 / 品牌色
 * success — 成功
 * warning — 警告
 * error — 错误 / 危险
 *
 * 扩展色（主题色板）：
 * purple — 紫色
 * magenta — 品红
 * blue — 蓝色
 * lake-blue — 湖蓝
 * cyan — 青色
 * orange — 橙色
 * yellow — 黄色
 * black — 黑色 / 标题色
 *
 * 风险 / 状态等级（对应主题 `--Colors-Use-Status-*` token）：
 * serious — 严重
 * high — 高危
 * medium — 中危
 * low — 低危
 * safe — 安全
 * unknown — 未知
 */
export type TagColor =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'purple'
  | 'magenta'
  | 'blue'
  | 'lake-blue'
  | 'cyan'
  | 'orange'
  | 'yellow'
  | 'black'
  | 'serious'
  | 'high'
  | 'medium'
  | 'low'
  | 'safe'
  | 'unknown';

/**
 * 标签填充样式（与 Figma Tag variant 命名一致）。
 *
 * soft — 浅色填充 + 边框（小圆角/有边框）
 * solid — 实色填充（Tags - Full color）
 * borderless — 浅色填充、无边框
 */
export type TagVariant = 'soft' | 'solid' | 'borderless';

/**
 * 标签圆角形态（与 Figma Tag shape 命名一致）。
 *
 * default — 默认小圆角
 * round — 全圆角 / 胶囊形
 */
export type TagShape = 'default' | 'round';

export interface TagProps extends BaseProps {
  /**
   * 标签尺寸。与 YakitComponentSize 对齐（无 huge；ConfigProvider 的 huge 会回落为 large）。
   * @default medium
   */
  size?: TagSize;
  /**
   * 标签颜色。仅接受 Figma TagColor 命名；风险等级映射到 `--Colors-Use-Status-*` token。
   * @default default
   */
  color?: TagColor;
  /**
   * 标签填充样式。见 TagVariant：soft / solid / borderless。
   * 传入 `extra` 启用分栏时，运行时固定为 `soft`（忽略 solid / borderless，以及 bordered→borderless 回落）；分栏仅 soft（左软底 + 右白底）。
   * 开启 `checkable` 时仅支持 soft / borderless；传入 `solid` 时运行时回落为 `borderless`。
   * @default soft
   */
  variant?: TagVariant;
  /**
   * 是否显示边框。仅在 `variant` 为 `soft` 时生效；`solid` / `borderless` 下忽略。
   * 未传 `variant` 且 `bordered={false}` 时，会回落为 `borderless`。
   * 无边框软填充更推荐直接使用 `variant="borderless"`。
   * 命名与 antd Tag `bordered` 一致（antd 6 更推荐 `variant`；此处两者并存）。
   * @default true（当 variant 为 soft 时）
   */
  bordered?: boolean;
  /**
   * 标签圆角形态。见 TagShape：default / round。
   * @default default
   */
  shape?: TagShape;
  /** 设置图标 */
  icon?: ReactNode;
  /** 前置头像 */
  avatar?: ReactNode;
  /**
   * 是否在内容前显示状态圆点。
   * @default false
   */
  dot?: boolean;
  /**
   * 右侧附加内容。传入后启用左右分栏：左侧彩色软底（children / 可选点或图标）| 竖向分隔线 | 右侧白底中性区（如评分 `9.8`）。
   * 分栏仅支持 `variant="soft"`（与 Figma 一致：左 soft fill + 右白底）；传入 `extra` 时其它 variant / bordered→borderless 路径会被忽略并回落为 soft。
   * 与 `closable` 同时使用时，关闭按钮位于右侧附加内容之后。
   * 按 React 渲染语义判定是否有内容：`null` / `undefined` / `''` / 布尔值（条件渲染哨兵，如 `cond && <X/>`）/ 空数组视为无 extra（单段 Tag）；`0` / `NaN` 会渲染为文本，仍启用分栏。
   */
  extra?: ReactNode;
  /**
   * 是否显示关闭按钮。
   * @default false
   */
  closable?: boolean;
  /**
   * 自定义关闭图标。
   * `true` / 未传时使用默认 ×。
   * 传入函数时先调用，再用返回的节点（对齐 antd Select `removeIcon` 的 `RenderNode`）。
   */
  closeIcon?: ReactNode | boolean | ((props: any) => ReactNode);
  /**
   * 点击关闭时的回调。调用 `e.preventDefault()` 可保持标签可见。
   */
  onClose?: (e: MouseEvent<HTMLElement>) => void;
  /**
   * 点击回调（对齐 antd Tag 的 HTMLAttributes.onClick）。
   * 开启 `checkable` 时，在切换选中态之后触发。
   */
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
  /**
   * 可选择模式（类似 Checkbox）。
   * 未选中静态外观固定 soft/default（见样式）；`variant` 仍接受 soft/borderless（solid 回落 borderless）。
   */
  checkable?: boolean;
  /** 受控选中态（配合 `checkable`） */
  checked?: boolean;
  /** 非受控默认选中态（配合 `checkable`；`Tag.CheckableTag` 不支持） */
  defaultChecked?: boolean;
  /** 选中变化回调（仅 `checkable`） */
  onChange?: (checked: boolean) => void;
  /**
   * 长文案单行省略（需限宽；分栏时左右两侧均省略）。
   * 为 `false`（默认）时：宽度足够则完整单行展示；限宽时自然换行。
   * 省略需配合 `style.maxWidth` / `style.width`（或父级限宽）才能生效。
   * `ellipsis` 开启后，仅在文案实际被截断时设置 `title`。
   * @default false
   */
  ellipsis?: boolean;
  /**
   * 是否显示复制按钮。
   * - `true`：复制内容为纯文本 children
   * - `{ text?: string }`：显式指定剪贴板文本；未传 `text` 时同 `true`
   * 可与 `closable` 并排。成功反馈仅为图标态；文案提示请用 `onCopy` 接通知组件。
   * @default false
   */
  copy?: boolean | { text?: string };
  /**
   * 复制结束后的回调（业务可在此弹出通知等）；`info.ok` 表示是否写入剪贴板成功。
   */
  onCopy?: (e: MouseEvent, info: { text: string; ok: boolean }) => void;
  disabled?: boolean;
  children?: ReactNode;
  /** 仅图标标签的无障碍名称 */
  'aria-label'?: string;
  style?: CSSProperties;
}

/**
 * 独立复制按钮属性（供 Tag 内嵌与业务单独使用）。
 */
export interface TagCopyProps {
  className?: string;
  /** 写入剪贴板的文本 */
  copyText: string;
  /**
   * 图标色。独立使用默认 `primary`；也可传任意 CSS 颜色（如 `#f60`、`rgb(...)`、`var(--brand)`）。
   * 嵌在 Tag 内请传 `currentColor`，跟随标签文字色。
   * @default primary
   */
  color?: string;
  /** 图标尺寸，对齐 Tag `size`（独立使用时生效；嵌在 Tag 内可由外层 size 控制） */
  size?: TagSize;
  /** 复制完成后的回调（业务通知等）；`info.ok` 表示是否成功 */
  onCopy?: (e: MouseEvent, info: { text: string; ok: boolean }) => void;
  /** 禁用复制 */
  disabled?: boolean;
}

/** 可选择标签可用的填充样式（不含 solid）。 */
export type CheckableTagVariant = Exclude<TagVariant, 'solid'>;

/**
 * 对齐 antd `Tag.CheckableTag` 的受控可选择标签属性。
 * 等价于 `<Tag checkable checked onChange />`；不支持非受控用法。
 * 可选择支持 soft / borderless，不支持 solid（传入 solid 时运行时回落为 borderless）。
 * 未选中静态外观由样式固定为 soft/default（对齐 Figma）；soft 与 borderless 在可选择下视觉差异很小，主要用于 API 对齐。
 */
export interface CheckableTagProps
  extends Omit<TagProps, 'checkable' | 'defaultChecked' | 'checked' | 'onChange' | 'variant'> {
  /** 选中状态（必填；完全受控） */
  checked: boolean;
  /** 点击切换选中态时的回调 */
  onChange?: (checked: boolean) => void;
  /**
   * 填充样式。可选择仅支持 `soft` / `borderless`，不支持 `solid`。
   * 若经 `Tag checkable` 传入 `solid`，运行时回落为 `borderless`。
   * 未选中态样式固定 soft/default；与非 checkable 的 soft/borderless 差异不同。
   * @default soft（未传时同 Tag 的 resolveVariant）
   */
  variant?: CheckableTagVariant;
}

/** CheckableTagGroup 选项值类型（对齐 antd） */
export type CheckableTagValue = string | number;

/**
 * CheckableTagGroup 单个选项。
 * 对象类型可单独设置 `className` / `style` / `disabled`；也可直接传 `string` / `number`。
 */
export interface CheckableTagOption<T extends CheckableTagValue = CheckableTagValue> {
  value: T;
  label: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 禁用该选项 */
  disabled?: boolean;
  /** 该选项选中时的颜色，覆盖 Group 的 color */
  color?: TagColor;
}

interface CheckableTagGroupSingleProps<T extends CheckableTagValue> {
  /** 单选模式（类似 RadioGroup）；默认 */
  multiple?: false;
  /** 受控选中值；取消选中时为 `null` */
  value?: T | null;
  /** 非受控初始选中值 */
  defaultValue?: T | null;
  /** 选中变化回调 */
  onChange?: (value: T | null) => void;
}

interface CheckableTagGroupMultipleProps<T extends CheckableTagValue> {
  /** 多选模式（类似 CheckboxGroup） */
  multiple: true;
  /** 受控选中值列表 */
  value?: T[];
  /** 非受控初始选中值列表 */
  defaultValue?: T[];
  /** 选中变化回调 */
  onChange?: (value: T[]) => void;
}

/**
 * 对齐 antd `Tag.CheckableTagGroup`：通过 `options` 渲染一组可选择标签。
 * `multiple` 为多选（CheckboxGroup），否则为单选（RadioGroup，可取消为 `null`）。
 */
export type CheckableTagGroupProps<T extends CheckableTagValue = CheckableTagValue> = {
  /** 选项列表；支持 `{ value, label, className?, style?, disabled?, color? }` 或原始值 */
  options?: Array<CheckableTagOption<T> | T>;
  /**
   * 标签颜色 class（选中态 soft / 选中与未选中 hover 均读此色的 border token）。
   * 未选中静态外观由 CSS 固定为 soft/default，不随此 prop 切换 class。
   * @default 'primary'
   */
  color?: TagColor;
  /** 禁用整组选中 */
  disabled?: boolean;
  className?: string;
  rootClassName?: string;
  style?: CSSProperties;
  id?: string;
} & (CheckableTagGroupSingleProps<T> | CheckableTagGroupMultipleProps<T>);
