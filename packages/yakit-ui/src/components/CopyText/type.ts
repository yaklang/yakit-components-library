import type { CSSProperties, MouseEvent } from 'react';

import type { BaseProps } from '../../types/common';
import type { TagSize } from '../Tag';

/** 复制图标尺寸，对齐 TagCopy / Tag `size`。 */
export type CopyTextSize = TagSize;

/** 根节点 `div` 的 ref。 */
export type CopyTextRef = HTMLDivElement;

export interface CopyTextProps extends BaseProps {
  /** 展示的文字 */
  showText: string;
  /**
   * 写入剪贴板的文字。不传或为空字符串时，回退为 `showText`。
   * 与 yakit 的 `copyText || showText` 一致。
   */
  copyText?: string;
  /**
   * 复制尝试结束后的回调。`info.ok` 表示是否写入成功。
   * 与 yakit 的差异：yakit 在点击时立即触发且不返回结果；这里在写入完成（成功或失败）后触发。
   */
  onAfterCopy?: (e: MouseEvent, info: { text: string; ok: boolean }) => void;
  /**
   * 复制图标颜色。默认主色；可传任意 CSS 颜色。
   */
  iconColor?: string;
  /**
   * 兼容 yakit 的根节点样式，与 `style` 合并，`style` 优先。
   */
  wrapStyle?: CSSProperties;
  /**
   * 禁用复制。也可由 ConfigProvider `componentDisabled` 继承。
   */
  disabled?: boolean;
  /**
   * 复制图标尺寸，对齐独立使用的 TagCopy。
   * 不传时为 16px，与 yakit YakitCopyText 一致；传入后走 TagCopy 的 10 / 12 / 14px。
   */
  size?: CopyTextSize;
}
