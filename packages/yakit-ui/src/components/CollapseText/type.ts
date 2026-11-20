import type { BaseProps } from '../../types/common';

/** 根节点 `div` 的 ref。 */
export type CollapseTextRef = HTMLDivElement;

export interface CollapseTextProps extends BaseProps {
  /** 内容。只适合纯文字。 */
  content: string;
  /**
   * 折叠时展示的行数。
   * @default 3
   */
  rows?: number;
  /**
   * 内容单行行高，单位 px。
   * @default 16
   */
  lineHeight?: number;
  /**
   * 文字大小，单位 px。
   * @default 12
   */
  fontSize?: number;
  /**
   * 兼容 yakit 的根节点类名，与 `className` / `rootClassName` 一并加在根节点上。
   */
  wrapperClassName?: string;
}
