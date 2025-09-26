import type { ReactNode, MouseEvent } from 'react';

import type { BaseProps } from '../../types/common';

export interface ButtonProps extends BaseProps {
  /**
   * 按钮类型
   * @default default
   */
  type?:
    | 'primary'
    | 'secondary1'
    | 'secondary2'
    | 'outline1'
    | 'outline2'
    | 'text1'
    | 'text2'
    | 'link1'
    | 'link2';

  /**
   * 按钮颜色
   * @default primary
   */
  color?: 'primary' | 'success' | 'warning' | 'error';
  /**
   * 按钮尺寸
   * @default md
   */
  size?: 'small' | 'medium' | 'large' | 'huge';
  /**
   * 按钮形状
   * @default default
   */
  shape?: 'default' | 'circle';
  /**
   * 按钮内容
   */
  children?: ReactNode;
  /**
   * 按钮样式
   */
  className?: string;
  /**
   * 按钮禁用
   */
  disabled?: boolean;
  /**
   * 按钮动画
   * @default wave
   */
  animation?: 'wave' | false;
  /**
   * 设置 button 原生的 type 值
   * @default button
   */
  htmlType?: 'button' | 'submit' | 'reset';
  /**
   * 设置按钮图标组件的位置
   * @default start
   */
  iconPosition?: 'start' | 'end';
  /**
   * 设置按钮的图标组件
   */
  icon?: ReactNode;
  /**
   * 点击按钮时触发
   */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}
