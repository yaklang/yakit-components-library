import classNames from 'classnames';
import { useMemo, type FC } from 'react';

import useComponentStyle from '../../hooks/useComponentStyle';
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

    return (
      <>
        {icon && <span className={`${prefixCls}-icon`}>{icon}</span>}
        {content}
      </>
    );
  }, [children, icon]);

  return wrapSSR(
    <Wave animation={animation}>
      <button type={htmlType} disabled={disabled} onClick={onClick} className={classes} {...bind}>
        {childrenDom}
      </button>
    </Wave>,
  );
};
