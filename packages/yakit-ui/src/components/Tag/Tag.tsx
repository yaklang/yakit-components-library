import classNames from 'classnames';
import type { FC, ReactNode, MouseEvent } from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';
import type { BaseProps } from '../../types/common';

import tagStyle from './style';

export interface TagProps extends BaseProps {
  children?: ReactNode;
  icon?: ReactNode;
  bordered?: boolean;
  closeIcon?: ReactNode | boolean;
  size?: 'small' | 'middle' | 'large';
  color?:
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
    | 'neutral'
    | 'yellow';
  onClose?: (e: MouseEvent<HTMLSpanElement>) => void;
}

const prefixCls = 'yakit-tag';

export const Tag: FC<TagProps> = ({
  bordered = true,
  size = 'middle',
  color = 'default',
  children,
  rootClassName,
  className,
  style,
}) => {
  const { wrapSSR, hashId } = useComponentStyle(prefixCls, tagStyle);

  const classes = classNames(prefixCls, hashId, className, rootClassName, {
    [`${prefixCls}-bordered`]: !bordered,
    [`${prefixCls}-${size}`]: size,
    [`${prefixCls}-${color}`]: color,
  });

  return wrapSSR(
    <span className={classes} style={style}>
      {children}
    </span>,
  );
};
