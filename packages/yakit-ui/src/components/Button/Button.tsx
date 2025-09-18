import classNames from 'classnames';
import type { FC, ReactNode, MouseEvent } from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';
import type { BaseProps } from '../../types/common';

import buttonStyle from './style';

interface ButtonProps extends BaseProps {
  /**
   * 按钮类型
   * @default default
   */
  type?: 'default' | 'primary' | 'secondary';
  /**
   * 按钮尺寸
   * @default md
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * 按钮内容
   */
  children?: ReactNode;
  /**
   * 按钮样式
   */
  className?: string;
  /**
   * 点击按钮时触发
   */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}

const prefixCls = 'yakit-btn';

export const Button: FC<ButtonProps> = ({
  type = 'default',
  size = 'md',
  children,
  className,
  rootClassName,
}) => {
  const { wrapSSR, hashId } = useComponentStyle(prefixCls, buttonStyle);

  const classes = classNames(
    prefixCls,
    hashId,
    {
      [`${prefixCls}-${type}`]: type,
      [`${prefixCls}-${size}`]: size,
    },
    className,
    rootClassName,
  );

  return wrapSSR(<button className={classes}>{children}</button>);
};
