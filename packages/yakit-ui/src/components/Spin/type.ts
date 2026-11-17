import type { ReactElement, ReactNode } from 'react';

import type { BaseProps } from '../../types/common';

/**
 * Spin 尺寸。不传时为 `medium`。
 */
export type SpinSize = 'small' | 'medium' | 'large';

/**
 * 自定义指示器。不传时使用默认圆点。
 * 传 `null` 或空片段可以藏掉默认圆点，同时保留遮罩。
 * 片段里如果有真实节点，会当作自定义指示器渲染，并加上 `yakit-spin-custom`。旋转由指示器自己负责，例如 `<LoadingOutlined spin />`。
 */
export type SpinIndicator = ReactElement | null;

/**
 * 根节点 `div` 的 ref。
 * 使用 `getContainer` 时，指向 portal 到目标容器里的遮罩；解析不到目标时不会挂载，ref 为 `null`。
 */
export type SpinRef = HTMLDivElement;

/**
 * 遮罩挂载的目标容器。可以是节点、返回节点的函数，或选择器。
 * 传入后，遮罩和指示器会渲染到该容器内并铺满；不传时仍按原样包住子节点。
 * 目标是 `document.body` 或 `document.documentElement` 时使用固定定位，覆盖视口。
 * 函数必须是纯函数，且返回值在同一轮渲染里保持稳定。
 */
export type SpinGetContainer = HTMLElement | (() => HTMLElement | null | undefined) | string;

export interface SpinProps extends BaseProps {
  /**
   * 是否处于加载中。
   * @default true
   */
  spinning?: boolean;
  /**
   * 尺寸。
   * @default medium
   */
  size?: SpinSize;
  /**
   * 加载提示。没有子节点时仍会显示，并留出一块至少 32px 高的占位，让转圈撑满所在容器。
   */
  tip?: ReactNode;
  /**
   * 延迟显示加载，避免状态闪烁，单位毫秒。
   * @default 0
   */
  delay?: number;
  /**
   * 自定义指示器。不传时使用默认圆点。传 `null` 或空片段可以藏掉默认圆点，同时保留遮罩。
   * 片段里如果有真实节点，会当作自定义指示器渲染。
   * 自定义节点会加上 `yakit-spin-custom`，不会套用默认圆点的宽高。旋转由指示器自己负责，例如 `indicator={<LoadingOutlined spin />}`。
   * 对本库图标，未显式传入时会补上 `color="currentColor"`，以及随 Spin `size` 变化的 `size`（14 / 20 / 32）。其他自定义组件不会被注入这两个属性。
   * 如果图标被 `React.memo` 等再包一层，`isYakitIcon` 标记会丢失，此时不会自动注入。
   */
  indicator?: SpinIndicator;
  /**
   * 把遮罩和指示器挂到指定容器上，而不是包住子节点。
   * 不传时保持原来的就地遮罩。目标如果是静态定位，会临时改成 `relative`，卸载时还原；不会改 `body` 的定位。
   * 解析不到目标时不渲染指示器和遮罩，只渲染子节点（若有）。
   * 传入函数时必须是纯函数，同一轮渲染里多次调用应返回同一个节点；返回值来回变化可能触发 `Too many re-renders`。
   * 服务端和 hydration 首帧不会解析容器，hydration 完成后再同步挂上遮罩。客户端直接渲染时，已知节点或选择器在首帧就能拿到 ref。
   */
  getContainer?: SpinGetContainer;
  /**
   * 被遮罩包裹的内容。`null`、`false`、空字符串、空数组和空片段视为没有内容，不会走遮罩布局。
   */
  children?: ReactNode;
}
