import classNames from 'classnames';
import { useCallback, useRef, useState, type FC, type KeyboardEvent, type MouseEvent } from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';

import { MenuContext } from './MenuContext';
import { MenuGroup } from './MenuGroup';
import { MenuItem } from './MenuItem';
import { MenuSubGroup } from './MenuSubGroup';
import './style/index.css';
import type { MenuProps } from './type';

const prefixCls = 'yakit-menu';

/**
 * 顶栏 menubar。
 * a11y 已覆盖：menuitem role、aria-current、禁用/非 button 焦点与 Enter/Space、
 * 以及同 menubar 内左右方向键在可聚焦 menuitem 间移动。
 * 未实现（有意留白）：Home/End、垂直菜单方向键、roving tabindex 完整模式、SubGroup 内焦点环。
 */
export const Menu: FC<MenuProps> & {
  Item: typeof MenuItem;
  Group: typeof MenuGroup;
  SubGroup: typeof MenuSubGroup;
} = ({
  children,
  className,
  rootClassName,
  style,
  activeKey: activeKeyProp,
  defaultActiveKey,
  onSelect,
  onKeyDown,
  ...rest
}) => {
  const config = useYakitConfig();
  const rootRef = useRef<HTMLDivElement>(null);
  const [innerActiveKey, setInnerActiveKey] = useState(defaultActiveKey);
  const activeKey = activeKeyProp ?? innerActiveKey;

  const classes = classNames(prefixCls, className, rootClassName);

  const onItemSelect = useCallback(
    (key: string, domEvent: MouseEvent<HTMLElement>) => {
      if (activeKeyProp === undefined) {
        setInnerActiveKey(key);
      }
      onSelect?.({ key, domEvent });
    },
    [activeKeyProp, onSelect],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'),
    ).filter((el) => {
      const tabIndex = el.getAttribute('tabindex');
      return tabIndex !== '-1' || el === document.activeElement;
    });

    if (items.length === 0) return;

    const currentIndex = items.findIndex((el) => el === document.activeElement);
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + delta + items.length) % items.length;

    e.preventDefault();
    items[nextIndex]?.focus();
  };

  // role 由组件固定为 menubar，避免被 rest 覆盖
  const { role: _ignoredRole, ...safeRest } = rest;

  return (
    <MenuContext.Provider value={{ activeKey, onItemSelect }}>
      <div
        ref={rootRef}
        data-theme={config.mode}
        dir={config.direction}
        className={classes}
        style={
          {
            ...getYakitTokenVariables(config.token),
            ...style,
          } as YakitCSSProperties
        }
        onKeyDown={handleKeyDown}
        {...safeRest}
        role="menubar"
      >
        {children}
      </div>
    </MenuContext.Provider>
  );
};

Menu.Item = MenuItem;
Menu.Group = MenuGroup;
Menu.SubGroup = MenuSubGroup;
