import classNames from 'classnames';
import type { FC } from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';
import { returnOrFalse } from '../../utils';

import buttonStyle from './style';
import type { ButtonProps } from './type';

const prefixCls = 'yakit-btn';

export const Button: FC<ButtonProps> = ({
  type = 'primary',
  size = 'medium',
  shape = 'default',
  disabled,
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
      [`${prefixCls}-${shape}`]: returnOrFalse(shape),
    },
    className,
    rootClassName,
  );

  return wrapSSR(
    <button disabled={disabled} className={classes}>
      {children}
    </button>,
  );
};
