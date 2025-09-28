import classNames from 'classnames';
import { useMemo, type FC } from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';
import { Loading } from '../../icons';
import { returnOrFalse } from '../../utils';
import Wave from '../Animation/Wave';

import { usePressed } from './hooks/usePressed';
import buttonStyle from './style';
import type { ButtonProps } from './type';

const prefixCls = 'yakit-btn';

export const Button: FC<ButtonProps> = ({
  type = 'primary',
  size = 'medium',
  shape = 'default',
  animation = 'wave',
  color = 'primary',
  htmlType = 'button',
  iconPosition = 'start',
  loading,
  style,
  icon,
  disabled,
  children,
  className,
  rootClassName,
  onClick,
}) => {
  const { wrapSSR, hashId } = useComponentStyle(prefixCls, buttonStyle);

  const { pressed, bind } = usePressed();

  const classes = classNames(
    prefixCls,
    hashId,
    {
      [`${prefixCls}-${type}`]: type,
      [`${prefixCls}-${size}`]: size,
      [`${prefixCls}-${shape}`]: returnOrFalse(shape),
      [`${prefixCls}-disabled`]: disabled,
      [`${prefixCls}-${type}-pressed`]: pressed,
      [`${prefixCls}-icon-only`]: icon && !children,
      [`${prefixCls}-color-${color}`]: color,
      [`${prefixCls}-icon-end`]: iconPosition === 'end',
      [`${prefixCls}-loading`]: loading,
    },
    className,
    rootClassName,
  );

  const childrenDom = useMemo(() => {
    let content;
    if (typeof children === 'string') {
      content = <span>{children}</span>;
    } else {
      content = children;
    }
    if (loading) {
      return (
        <>
          <Loading spin />
          {content}
        </>
      );
    }
    return (
      <>
        {icon && <span className={`${prefixCls}-icon`}>{icon}</span>}
        {content}
      </>
    );
  }, [children, icon, loading]);

  return wrapSSR(
    <Wave animation={animation}>
      <button
        style={style}
        type={htmlType}
        disabled={disabled}
        onClick={(e) => {
          if (disabled || loading) return;
          onClick?.(e);
        }}
        className={classes}
        {...bind}
      >
        {childrenDom}
      </button>
    </Wave>,
  );
};
