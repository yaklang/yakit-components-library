import classNames from 'classnames';
import { type FC } from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';

import inputStyle from './style';
import type { InputProps } from './type';

const prefixCls = 'yakit-input';

export const Input: FC<InputProps> = ({
  size = 'large',
  prefix,
  suffix,
  error = false,
  className,
  rootClassName,
  style,
  disabled,
  ...inputProps
}) => {
  const { wrapSSR, hashId } = useComponentStyle(prefixCls, inputStyle);
  const classes = classNames(prefixCls, hashId, className, rootClassName, {
    [`${prefixCls}-${size}`]: size,
    [`${prefixCls}-error`]: error,
    [`${prefixCls}-disabled`]: disabled,
    [`${prefixCls}-with-prefix`]: prefix,
    [`${prefixCls}-with-suffix`]: suffix,
  });

  return wrapSSR(
    <span className={classes} style={style}>
      {prefix && <span className={classNames(`${prefixCls}-prefix`, hashId)}>{prefix}</span>}
      <input
        disabled={disabled}
        className={classNames(`${prefixCls}-element`, hashId)}
        {...inputProps}
      />
      {suffix && <span className={classNames(`${prefixCls}-suffix`, hashId)}>{suffix}</span>}
    </span>,
  );
};
