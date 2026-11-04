import classNames from 'classnames';
import type { FC, KeyboardEvent, MouseEvent } from 'react';

import './style/index.css';
import type { MenuSubGroupProps } from './type';

const prefixCls = 'yakit-menu-subgroup';

/**
 * Fuzzer 式「多图标 + 共享标题」布局，对齐 yakit MenuMode 的 parent-menu-wrapper。
 */
export const MenuSubGroup: FC<MenuSubGroupProps> = ({
  label,
  children,
  onClick,
  disabled,
  className,
  rootClassName,
  style,
}) => {
  const classes = classNames(
    prefixCls,
    {
      [`${prefixCls}-disabled`]: disabled,
    },
    className,
    rootClassName,
  );

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    if (disabled) return;
    onClick?.(e);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e as unknown as MouseEvent<HTMLElement>);
    }
  };

  return (
    <div
      className={classes}
      style={style}
      role="group"
      aria-label={typeof label === 'string' ? label : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={`${prefixCls}-children`}>{children}</div>
      <div className={`${prefixCls}-label`}>{label}</div>
    </div>
  );
};
