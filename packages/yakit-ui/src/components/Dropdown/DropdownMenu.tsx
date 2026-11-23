import classNames from 'classnames';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

import { ChevronRightOutlined } from '../../icons/outline';

import type {
  DropdownMenuInfo,
  DropdownMenuItem,
  DropdownMenuItemTypeUnion,
  DropdownMenuProps,
  DropdownMenuSize,
  DropdownSemanticClassNames,
  DropdownSemanticStyles,
} from './type';

const yakitPrefix = 'yakit-dropdown';
const antPrefix = 'ant-dropdown';

const resolveMenuSize = (size?: DropdownMenuSize): 'medium' | 'large' => {
  if (size === 'large' || size === 'lg') return 'large';
  return 'medium';
};

const isDivider = (
  item: DropdownMenuItemTypeUnion,
): item is Extract<DropdownMenuItemTypeUnion, { type: 'divider' }> =>
  !!item && typeof item === 'object' && 'type' in item && item.type === 'divider';

const isGroup = (
  item: DropdownMenuItemTypeUnion,
): item is Extract<DropdownMenuItemTypeUnion, { type: 'group' }> =>
  !!item && typeof item === 'object' && 'type' in item && item.type === 'group';

const isItem = (item: DropdownMenuItemTypeUnion): item is DropdownMenuItem =>
  !!item &&
  typeof item === 'object' &&
  !('type' in item && (item.type === 'divider' || item.type === 'group'));

const collectRootItems = (
  nodes: DropdownMenuItemTypeUnion[] | undefined,
): Array<{ key: string; disabled: boolean }> =>
  (nodes ?? []).flatMap((node) => {
    if (isDivider(node)) return [];
    if (isGroup(node)) return collectRootItems(node.children as DropdownMenuItemTypeUnion[]);
    if (!isItem(node)) return [];
    return [{ key: node.key, disabled: !!node.disabled }];
  });

interface DropdownMenuPanelProps extends DropdownMenuProps {
  prefixCls?: string;
  semanticClassNames?: DropdownSemanticClassNames;
  semanticStyles?: DropdownSemanticStyles;
  onItemClick?: (info: DropdownMenuInfo) => void;
}

type SubPlacement = 'right' | 'left';

type RenderItemOptions = {
  rootLevel?: boolean;
  activeKey?: string | null;
  onFocusItem?: (key: string) => void;
  /** antd 兼容的菜单 key 路径，不包含 root-/group- 等 React 兜底段 */
  menuPath?: string[];
};

type SubMenuBranchProps = {
  item: DropdownMenuItem;
  path: string[];
  yakit: string;
  ant: string;
  size: 'medium' | 'large';
  type: NonNullable<DropdownMenuProps['type']>;
  selectedSet: Set<string>;
  semanticClassNames?: DropdownSemanticClassNames;
  semanticStyles?: DropdownSemanticStyles;
  danger: boolean;
  itemTypeClass?: string;
  rootLevel?: boolean;
  activeKey?: string | null;
  onFocusItem?: (key: string) => void;
  menuPath: string[];
  renderItem: (
    raw: DropdownMenuItemTypeUnion,
    keyPath?: string[],
    options?: RenderItemOptions,
  ) => ReactNode;
};

/**
 * 一级子菜单：贴边可左右翻转，竖直方向尽量夹进视口（不必完美 antd 级联）。
 */
function SubMenuBranch({
  item,
  path,
  yakit,
  ant,
  size,
  type,
  selectedSet,
  semanticClassNames,
  semanticStyles,
  danger,
  itemTypeClass,
  rootLevel = false,
  activeKey,
  onFocusItem,
  menuPath,
  renderItem,
}: SubMenuBranchProps) {
  const itemKey = item.key;
  const selected = selectedSet.has(itemKey);
  const itemRef = useRef<HTMLLIElement | null>(null);
  const subRef = useRef<HTMLUListElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [subActiveKeyState, setSubActiveKey] = useState<string | null>(null);
  const [subPlacement, setSubPlacement] = useState<SubPlacement>('right');
  const [subOffset, setSubOffset] = useState<CSSProperties>({ top: 0 });
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressFocusOpen = useRef(false);
  const childItems = useMemo(
    () => collectRootItems(item.children as DropdownMenuItemTypeUnion[]),
    [item.children],
  );
  const firstChildKey = childItems.find((child) => !child.disabled)?.key;
  const subActiveKey =
    subActiveKeyState &&
    childItems.some((child) => child.key === subActiveKeyState && !child.disabled)
      ? subActiveKeyState
      : firstChildKey;

  const clearFocusTimer = () => {
    if (focusTimer.current == null) return;
    clearTimeout(focusTimer.current);
    focusTimer.current = null;
  };

  const focusFirstSubItem = () => {
    clearFocusTimer();
    focusTimer.current = window.setTimeout(() => {
      subRef.current
        ?.querySelector<HTMLElement>('[data-yakit-menu-item]:not([aria-disabled="true"])')
        ?.focus();
      focusTimer.current = null;
    }, 0);
  };

  const closeSubMenu = (restoreFocus = false) => {
    clearFocusTimer();
    setHovered(false);
    if (!restoreFocus) return;
    suppressFocusOpen.current = true;
    itemRef.current?.focus();
    window.setTimeout(() => {
      suppressFocusOpen.current = false;
    }, 0);
  };

  useEffect(() => () => clearFocusTimer(), []);

  useLayoutEffect(() => {
    if (!hovered) return;
    const parent = itemRef.current;
    const sub = subRef.current;
    if (!parent || !sub) return;

    const parentRect = parent.getBoundingClientRect();
    const subWidth = sub.offsetWidth || 160;
    const subHeight = sub.offsetHeight || 40;
    const gap = 4;
    const padding = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceRight = vw - padding - parentRect.right - gap;
    const spaceLeft = parentRect.left - padding - gap;
    let nextPlacement: SubPlacement = 'right';
    if (spaceRight < subWidth && spaceLeft > spaceRight) {
      nextPlacement = 'left';
    }

    let top = 0;
    const absBottom = parentRect.top + subHeight;
    if (absBottom > vh - padding) {
      top = Math.min(0, vh - padding - absBottom);
      // 不要把子菜单顶得高于视口上沿太多
      const absTop = parentRect.top + top;
      if (absTop < padding) {
        top += padding - absTop;
      }
    }

    setSubPlacement(nextPlacement);
    setSubOffset({ top });
  }, [hovered, item.children]);

  const handleSubMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'Escape') {
      if (!hovered) return;
      event.preventDefault();
      event.stopPropagation();
      closeSubMenu(true);
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const nodes = [
      ...(subRef.current?.querySelectorAll<HTMLElement>(
        '[data-yakit-menu-item]:not([aria-disabled="true"])',
      ) ?? []),
    ];
    if (!nodes.length) return;
    const current = nodes.indexOf(document.activeElement as HTMLElement);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? nodes.length - 1
          : event.key === 'ArrowDown'
            ? (current + 1 + nodes.length) % nodes.length
            : current <= 0
              ? nodes.length - 1
              : current - 1;
    nodes[nextIndex].focus();
  };

  return (
    <li
      ref={itemRef}
      key={itemKey}
      role="menuitem"
      tabIndex={item.disabled ? -1 : activeKey && activeKey !== itemKey ? -1 : 0}
      title={item.title}
      aria-disabled={item.disabled || undefined}
      aria-haspopup="menu"
      aria-expanded={hovered}
      data-yakit-menu-item="true"
      data-yakit-menu-root={rootLevel ? 'true' : undefined}
      data-yakit-menu-key={rootLevel ? itemKey : undefined}
      className={classNames(
        `${ant}-menu-item`,
        `${yakit}-menu-item`,
        `${yakit}-menu-item-${size}`,
        {
          [`${ant}-menu-item-disabled`]: item.disabled,
          [`${yakit}-menu-item-disabled`]: item.disabled,
          [`${ant}-menu-item-selected`]: selected,
          [`${yakit}-menu-item-selected`]: selected,
          [`${ant}-menu-item-danger`]: danger,
          [`${yakit}-menu-item-danger`]: danger,
          [`${yakit}-menu-item-has-children`]: true,
          [`${yakit}-menu-item-submenu-open`]: hovered,
        },
        itemTypeClass,
        semanticClassNames?.item,
        item.className,
      )}
      style={{ ...semanticStyles?.item, ...item.style }}
      onMouseEnter={() => {
        if (!item.disabled) setHovered(true);
      }}
      onMouseLeave={() => {
        // 键盘焦点在子菜单项上时保持展开，避免鼠标移出导致焦点丢失
        if (subRef.current?.contains(document.activeElement)) return;
        closeSubMenu();
      }}
      onFocus={() => {
        if (item.disabled) return;
        if (suppressFocusOpen.current) return;
        setHovered(true);
        onFocusItem?.(itemKey);
      }}
      onKeyDown={(event) => {
        if (item.disabled) return;
        if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          setHovered(true);
          focusFirstSubItem();
        } else if ((event.key === 'ArrowLeft' || event.key === 'Escape') && hovered) {
          event.preventDefault();
          event.stopPropagation();
          closeSubMenu(true);
        }
      }}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && itemRef.current?.contains(next)) return;
        closeSubMenu();
      }}
    >
      <div
        className={classNames(`${yakit}-menu-item-inner`, semanticClassNames?.itemContent)}
        style={semanticStyles?.itemContent}
      >
        {item.icon != null && (
          <span
            className={classNames(
              `${ant}-menu-item-icon`,
              `${yakit}-menu-item-icon`,
              semanticClassNames?.itemIcon,
            )}
            style={semanticStyles?.itemIcon}
          >
            {item.icon}
          </span>
        )}
        <span
          className={classNames(
            `${ant}-menu-title-content`,
            `${yakit}-menu-item-content`,
            semanticClassNames?.itemTitle,
          )}
          style={semanticStyles?.itemTitle}
        >
          <span className={`${yakit}-menu-item-label`}>{item.label}</span>
          {item.description != null && item.description !== false && item.description !== '' && (
            <span className={`${yakit}-menu-item-description`}>{item.description}</span>
          )}
        </span>
        {item.extra != null && <span className={`${yakit}-menu-item-extra`}>{item.extra}</span>}
        <span className={`${yakit}-menu-item-arrow`} aria-hidden>
          <ChevronRightOutlined size={12} />
        </span>
      </div>
      <ul
        ref={subRef}
        className={classNames(
          `${ant}-menu`,
          `${ant}-menu-sub`,
          `${yakit}-menu`,
          `${yakit}-menu-sub`,
          `${yakit}-menu-sub-placement-${subPlacement}`,
          `${yakit}-menu-${type}`,
          `${yakit}-menu-${size}`,
          { [`${yakit}-menu-sub-open`]: hovered },
        )}
        role="menu"
        data-yakit-menu-sub="true"
        onKeyDown={handleSubMenuKeyDown}
        style={subOffset}
      >
        {item.children!.map((child) =>
          renderItem(child, path, {
            rootLevel: false,
            activeKey: subActiveKey,
            onFocusItem: setSubActiveKey,
            menuPath,
          }),
        )}
      </ul>
    </li>
  );
}

export function DropdownMenuPanel({
  items = [],
  selectable,
  selectedKeys: selectedKeysProp,
  defaultSelectedKeys,
  onClick,
  onSelect,
  size: sizeProp,
  type = 'primary',
  className,
  style,
  prefixCls,
  semanticClassNames,
  semanticStyles,
  onItemClick,
}: DropdownMenuPanelProps) {
  const yakit = prefixCls ?? yakitPrefix;
  const ant = antPrefix;
  const size = resolveMenuSize(sizeProp);
  const [innerSelected, setInnerSelected] = useState<string[]>(defaultSelectedKeys ?? []);
  const selectedKeys = selectedKeysProp ?? innerSelected;
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const [activeKeyState, setActiveKey] = useState<string | null>(null);
  const rootItems = useMemo(() => collectRootItems(items), [items]);
  const firstRootKey = rootItems.find((item) => !item.disabled)?.key;
  const activeKey =
    activeKeyState && rootItems.some((item) => item.key === activeKeyState && !item.disabled)
      ? activeKeyState
      : firstRootKey;

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if ((event.target as HTMLElement).closest('[data-yakit-menu-sub="true"]')) return;
    const nodes = [
      ...(menuRef.current?.querySelectorAll<HTMLElement>(
        '[data-yakit-menu-root="true"]:not([aria-disabled="true"])',
      ) ?? []),
    ];
    if (!nodes.length || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = nodes.indexOf(document.activeElement as HTMLElement);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? nodes.length - 1
          : event.key === 'ArrowDown'
            ? (current + 1 + nodes.length) % nodes.length
            : current <= 0
              ? nodes.length - 1
              : current - 1;
    const next = nodes[nextIndex];
    next?.focus();
    const key = next?.dataset.yakitMenuKey;
    if (key) setActiveKey(key);
  };

  const handleSelect = (info: DropdownMenuInfo) => {
    if (selectable) {
      if (selectedKeysProp === undefined) {
        setInnerSelected([info.key]);
      }
      onSelect?.(info);
    }
    onClick?.(info);
    info.item.onClick?.(info);
    onItemClick?.(info);
  };

  const renderItem = (
    raw: DropdownMenuItemTypeUnion,
    keyPath: string[] = [],
    options: RenderItemOptions = {},
  ): ReactNode => {
    const { rootLevel = true, activeKey: itemActiveKey, onFocusItem, menuPath = [] } = options;
    if (!raw) return null;

    if (isDivider(raw)) {
      return (
        <li
          key={raw.key ?? `divider-${keyPath.join('-')}`}
          role="separator"
          className={classNames(
            `${ant}-menu-item-divider`,
            `${yakit}-menu-item-divider`,
            { [`${yakit}-menu-item-divider-dashed`]: raw.dashed },
            raw.className,
          )}
          style={raw.style}
        />
      );
    }

    if (isGroup(raw)) {
      return (
        <li
          key={raw.key ?? `group-${keyPath.join('-')}`}
          role="presentation"
          className={classNames(
            `${ant}-menu-item-group`,
            `${yakit}-menu-item-group`,
            raw.className,
          )}
          style={raw.style}
        >
          {raw.label != null && (
            <div
              className={classNames(
                `${ant}-menu-item-group-title`,
                `${yakit}-menu-item-group-title`,
              )}
            >
              {raw.label}
            </div>
          )}
          <ul
            className={classNames(`${ant}-menu-item-group-list`, `${yakit}-menu-item-group-list`)}
          >
            {(raw.children ?? []).map((child, index) =>
              renderItem(child, [...keyPath, raw.key ?? `g${index}`], options),
            )}
          </ul>
        </li>
      );
    }

    if (!isItem(raw)) return null;

    const item = raw;
    const itemKey = item.key;
    const path = [...keyPath, itemKey];
    const itemMenuPath = [...menuPath, itemKey];
    const selected = selectedSet.has(itemKey);
    const hasChildren = !!(item.children && item.children.length > 0);
    const danger = item.danger || item.itemType === 'danger' || item.itemType === 'error';
    const itemTypeClass =
      item.itemType && !item.danger ? `${yakit}-menu-item-${item.itemType}` : undefined;

    if (hasChildren) {
      return (
        <SubMenuBranch
          key={itemKey}
          item={item}
          path={path}
          yakit={yakit}
          ant={ant}
          size={size}
          type={type}
          selectedSet={selectedSet}
          semanticClassNames={semanticClassNames}
          semanticStyles={semanticStyles}
          danger={danger}
          itemTypeClass={itemTypeClass}
          rootLevel={rootLevel}
          activeKey={itemActiveKey}
          onFocusItem={onFocusItem}
          menuPath={itemMenuPath}
          renderItem={renderItem}
        />
      );
    }

    const onActivate = (domEvent: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
      if (item.disabled) return;
      handleSelect({ key: itemKey, keyPath: itemMenuPath, item, domEvent });
    };

    return (
      <li
        key={itemKey}
        role="menuitem"
        tabIndex={item.disabled ? -1 : itemActiveKey && itemActiveKey !== itemKey ? -1 : 0}
        title={item.title}
        aria-disabled={item.disabled || undefined}
        data-yakit-menu-item="true"
        data-yakit-menu-root={rootLevel ? 'true' : undefined}
        data-yakit-menu-key={rootLevel ? itemKey : undefined}
        className={classNames(
          `${ant}-menu-item`,
          `${yakit}-menu-item`,
          `${yakit}-menu-item-${size}`,
          {
            [`${ant}-menu-item-disabled`]: item.disabled,
            [`${yakit}-menu-item-disabled`]: item.disabled,
            [`${ant}-menu-item-selected`]: selected,
            [`${yakit}-menu-item-selected`]: selected,
            [`${ant}-menu-item-danger`]: danger,
            [`${yakit}-menu-item-danger`]: danger,
          },
          itemTypeClass,
          semanticClassNames?.item,
          item.className,
        )}
        style={{ ...semanticStyles?.item, ...item.style }}
        onFocus={() => {
          if (!item.disabled) onFocusItem?.(itemKey);
        }}
        onClick={(e) => onActivate(e)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onActivate(e);
          }
        }}
      >
        <div
          className={classNames(`${yakit}-menu-item-inner`, semanticClassNames?.itemContent)}
          style={semanticStyles?.itemContent}
        >
          {item.icon != null && (
            <span
              className={classNames(
                `${ant}-menu-item-icon`,
                `${yakit}-menu-item-icon`,
                semanticClassNames?.itemIcon,
              )}
              style={semanticStyles?.itemIcon}
            >
              {item.icon}
            </span>
          )}
          <span
            className={classNames(
              `${ant}-menu-title-content`,
              `${yakit}-menu-item-content`,
              semanticClassNames?.itemTitle,
            )}
            style={semanticStyles?.itemTitle}
          >
            <span className={`${yakit}-menu-item-label`}>{item.label}</span>
            {item.description != null && item.description !== false && item.description !== '' && (
              <span className={`${yakit}-menu-item-description`}>{item.description}</span>
            )}
          </span>
          {item.extra != null && <span className={`${yakit}-menu-item-extra`}>{item.extra}</span>}
        </div>
      </li>
    );
  };

  // width 由 Dropdown 外层 panel 设置，避免 padding/border 把总宽撑过 Figma
  const panelStyle = {
    ...style,
  };

  return (
    <ul
      ref={menuRef}
      role="menu"
      onKeyDown={handleMenuKeyDown}
      className={classNames(
        `${ant}-menu`,
        `${ant}-menu-root`,
        `${ant}-menu-vertical`,
        `${yakit}-menu`,
        `${yakit}-menu-${type}`,
        `${yakit}-menu-${size}`,
        className,
      )}
      style={panelStyle}
    >
      {items.map((item, index) =>
        renderItem(item, [`root-${index}`], {
          rootLevel: true,
          activeKey,
          onFocusItem: setActiveKey,
          menuPath: [],
        }),
      )}
    </ul>
  );
}

export default DropdownMenuPanel;
