import classNames from 'classnames';
import { type FC } from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';
import { returnOrFalse } from '../../utils';
import Wave from '../Animation/Wave';

import buttonStyle from './style';
import type { ButtonProps } from './type';

const prefixCls = 'yakit-btn';

export const Button: FC<ButtonProps> = ({
  type = 'primary',
  size = 'medium',
  shape = 'default',
  animation = 'wave',
  disabled,
  children,
  className,
  rootClassName,
  onClick,
}) => {
  const { wrapSSR, hashId } = useComponentStyle(prefixCls, buttonStyle);

  const classes = classNames(
    prefixCls,
    hashId,
    {
      [`${prefixCls}-${type}`]: type,
      [`${prefixCls}-${size}`]: size,
      [`${prefixCls}-${shape}`]: returnOrFalse(shape),
      [`${prefixCls}-disabled`]: disabled,
    },
    className,
    rootClassName,
  );

  return wrapSSR(
    <Wave animation={animation}>
      <button disabled={disabled} onClick={onClick} className={classes}>
        {children}
      </button>
    </Wave>,
  );
};
