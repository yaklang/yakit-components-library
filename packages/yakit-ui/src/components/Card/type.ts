import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

import type { BaseProps } from '../../types/common';

export type CardSize = 'default' | 'small';

export type CardVariant = 'outlined' | 'borderless';

export interface CardStyles {
  header?: CSSProperties;
  body?: CSSProperties;
}

/**
 * Card 卡片
 * 对齐主项目 YakitCard / antd Card 常用 API，库侧命名为 Card
 */
export interface CardProps
  extends BaseProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'className' | 'style'> {
  /** 标题 */
  title?: ReactNode;
  /** 头部右侧额外内容 */
  extra?: ReactNode;
  /**
   * 是否有边框（与 variant 并存时以 variant 为准）
   * @default true
   */
  bordered?: boolean;
  /**
   * 卡片尺寸，影响 header 高度 / 字号 / padding
   * @default default
   */
  size?: CardSize;
  /**
   * 悬停时显示阴影并显示手型
   * @default false
   */
  hoverable?: boolean;
  /**
   * loading 遮罩（覆盖整卡，含 header）
   * @default false
   */
  loading?: boolean;
  /** 头部自定义样式（与 styles.header 可并存，styles.header 优先） */
  headStyle?: CSSProperties;
  /** 内容区自定义样式（与 styles.body 可并存，styles.body 优先） */
  bodyStyle?: CSSProperties;
  /**
   * antd5 styles API：`{ header, body }`
   * 与 headStyle / bodyStyle 可并存，同名字段以 styles 为准
   */
  styles?: CardStyles;
  /** 头部自定义 className */
  headClassName?: string;
  /** 内容区自定义 className */
  bodyClassName?: string;
  /**
   * 边框变体，映射 bordered
   * - outlined：有边框
   * - borderless：无边框
   */
  variant?: CardVariant;
  /** 卡片内容 */
  children?: ReactNode;
}

/** 主项目同名别名 */
export type YakitCardProps = CardProps;
