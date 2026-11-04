import classNames from 'classnames';
import {
  type ElementType,
  type FC,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { ChevronDownOutlined } from '../../icons';
import { getYakitTokenVariables } from '../../styles/tokenVariables';
import type { YakitCSSProperties } from '../../styles/tokenVariables';
import { Dropdown } from '../Dropdown';

import { useMenuContext } from './MenuContext';
import './style/index.css';
import type { MenuItemProps } from './type';

const prefixCls = 'yakit-menu-item';

const isLabelVisible = (label: MenuItemProps['label']) => {
  // ReactNode 里的 false/null 用于条件渲染，不应渲染成文案
  if (label == null || label === false) return false;
  if (typeof label === 'string' && label.trim() === '') return false;
  return true;
};

export const MenuItem: FC<MenuItemProps> = ({
  icon,
  label,
  vertical = true,
  size = 'large',
  select = false,
  active: activeProp,
  disabled: disabledProp,
  selectIcon,
  component = 'button',
  'aria-label': ariaLabel,
  rootClassName,
  className,
  style,
  onClick,
  itemKey,
  title,
  href,
  target,
  rel,
  menu,
  dropdown,
  overlay,
  ...rest
}) => {
  const config = useYakitConfig();
  const menuCtx = useMenuContext();
  const disabled = disabledProp ?? config.componentDisabled;
  const showLabel = isLabelVisible(label);
  const Component = component as ElementType;
  const active =
    activeProp ?? (itemKey != null && menuCtx.activeKey != null && itemKey === menuCtx.activeKey);

  // 避免调用方 rest 覆盖无障碍 role
  const { role: _ignoredRole, ...safeRest } = rest as Record<string, unknown> & {
    role?: string;
  };

  const classes = classNames(
    prefixCls,
    {
      [`${prefixCls}-vertical`]: vertical,
      [`${prefixCls}-horizontal`]: !vertical,
      [`${prefixCls}-${size}`]: size,
      [`${prefixCls}-select`]: select,
      [`${prefixCls}-active`]: active,
      [`${prefixCls}-disabled`]: disabled,
      [`${prefixCls}-icon-only`]: !showLabel,
    },
    className,
    rootClassName,
  );

  const chevron = selectIcon ?? (
    <ChevronDownOutlined className={`${prefixCls}-chevron`} aria-hidden />
  );

  const content = (
    <>
      <span className={`${prefixCls}-icon-wrap`}>
        {icon ? <span className={`${prefixCls}-icon`}>{icon}</span> : null}
        {select && vertical ? <span className={`${prefixCls}-select-icon`}>{chevron}</span> : null}
      </span>
      {showLabel ? <span className={`${prefixCls}-label`}>{label}</span> : null}
      {select && !vertical ? <span className={`${prefixCls}-select-icon`}>{chevron}</span> : null}
    </>
  );

  const handleActivate = (e: MouseEvent<HTMLElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
    if (itemKey != null) {
      menuCtx.onItemSelect?.(itemKey, e);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (disabled) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (component !== 'button' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleActivate(e as unknown as MouseEvent<HTMLElement>);
    }
  };

  const sharedProps = {
    ...safeRest,
    className: classes,
    'data-theme': config.mode,
    dir: config.direction,
    style: {
      ...getYakitTokenVariables(config.token),
      ...style,
    } as YakitCSSProperties,
    role: 'menuitem',
    title,
    'aria-label': ariaLabel ?? (typeof label === 'string' ? label : undefined),
    'aria-disabled': disabled || undefined,
    'aria-current': active ? ('page' as const) : undefined,
    onClick: handleActivate,
    onKeyDown: handleKeyDown,
  };

  let itemNode: ReactElement;

  if (component === 'button') {
    itemNode = (
      <button type="button" disabled={disabled} {...sharedProps}>
        {content}
      </button>
    );
  } else if (component === 'a') {
    itemNode = (
      <a
        href={disabled ? undefined : href}
        target={target}
        rel={rel}
        tabIndex={disabled ? -1 : 0}
        {...sharedProps}
      >
        {content}
      </a>
    );
  } else {
    itemNode = (
      <Component tabIndex={disabled ? -1 : 0} {...sharedProps}>
        {content}
      </Component>
    );
  }

  const dropdownMenu = menu ?? dropdown?.menu;
  const hasDropdown = select && (dropdownMenu != null || overlay != null || dropdown != null);

  if (!hasDropdown) {
    return itemNode;
  }

  const {
    menu: _dropMenu,
    popupRender,
    dropdownRender,
    disabled: dropdownDisabled,
    trigger,
    ...dropdownRest
  } = dropdown ?? {};

  const resolvedPopupRender = overlay != null ? () => overlay : (popupRender ?? dropdownRender);

  return (
    <Dropdown
      trigger={trigger ?? ['click']}
      disabled={disabled || dropdownDisabled}
      menu={dropdownMenu}
      popupRender={resolvedPopupRender}
      {...dropdownRest}
    >
      {itemNode}
    </Dropdown>
  );
};
