import classNames from 'classnames';
import type { FC, KeyboardEvent, MouseEvent } from 'react';

import './style/index.css';
import type { MenuGroupProps } from './type';

const prefixCls = 'yakit-menu-group';

export const MenuGroup: FC<MenuGroupProps> = ({
  children,
  divided = true,
  parentLabel,
  onClick,
  className,
  rootClassName,
  style,
}) => {
  const isParent = parentLabel != null && parentLabel !== '';

  const classes = classNames(
    prefixCls,
    {
      [`${prefixCls}-divided`]: divided,
      [`${prefixCls}-parent`]: isParent,
    },
    className,
    rootClassName,
  );

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    onClick?.(e);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e as unknown as MouseEvent<HTMLElement>);
    }
  };

  if (isParent) {
    return (
      <div
        className={classes}
        style={style}
        role="group"
        aria-label={typeof parentLabel === 'string' ? parentLabel : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={onClick ? handleKeyDown : undefined}
      >
        <div className={`${prefixCls}-parent-children`}>{children}</div>
        <div className={`${prefixCls}-parent-label`}>{parentLabel}</div>
      </div>
    );
  }

  return (
    <div className={classes} style={style} role="group">
      {children}
    </div>
  );
};
