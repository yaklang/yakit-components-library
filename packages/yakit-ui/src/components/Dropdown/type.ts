import type { CSSProperties, KeyboardEvent, MouseEvent, ReactElement, ReactNode } from 'react';

import type { BaseProps } from '../../types/common';

/** 对齐 antd Dropdown placement（含 6.x 左右扩展） */
export type DropdownPlacement =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'
  | 'top'
  | 'bottom'
  | 'left'
  | 'leftTop'
  | 'leftBottom'
  | 'right'
  | 'rightTop'
  | 'rightBottom';

export type DropdownTrigger = 'click' | 'hover' | 'contextMenu';

export type DropdownArrowOptions = {
  pointAtCenter?: boolean;
};

/** Figma：md→28 / lg→32；middle 兼容别名（等同 medium/md） */
export type DropdownMenuSize = 'medium' | 'large' | 'middle' | 'md' | 'lg';

/** 菜单类型：对齐主项目 YakitMenu type（primary 选中橙底，grey 灰底悬停） */
export type DropdownMenuType = 'primary' | 'grey';

export type DropdownMenuItemType = 'success' | 'danger' | 'info' | 'text' | 'error';

export interface DropdownMenuItem {
  key: string;
  label?: ReactNode;
  icon?: ReactNode;
  /** 右侧额外内容（快捷键 / Action） */
  extra?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  /** 对齐主项目单项 type；danger 优先于本字段 */
  itemType?: DropdownMenuItemType;
  /** 副文案（Figma Sub Text） */
  description?: ReactNode;
  children?: DropdownMenuItem[];
  onClick?: (info: DropdownMenuInfo) => void;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export interface DropdownMenuDivider {
  type: 'divider';
  key?: string;
  dashed?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface DropdownMenuGroup {
  type: 'group';
  key?: string;
  label?: ReactNode;
  children?: DropdownMenuItemTypeUnion[];
  className?: string;
  style?: CSSProperties;
}

export type DropdownMenuItemTypeUnion =
  | DropdownMenuItem
  | DropdownMenuDivider
  | DropdownMenuGroup
  | null
  | undefined
  | false;

export interface DropdownMenuInfo {
  key: string;
  keyPath: string[];
  item: DropdownMenuItem;
  domEvent: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>;
}

/** 对齐 antd MenuProps 子集（Dropdown.menu） */
export interface DropdownMenuProps {
  items?: DropdownMenuItemTypeUnion[];
  selectable?: boolean;
  selectedKeys?: string[];
  defaultSelectedKeys?: string[];
  onClick?: (info: DropdownMenuInfo) => void;
  onSelect?: (info: DropdownMenuInfo) => void;
  /** 菜单项尺寸，对齐 Figma md/lg */
  size?: DropdownMenuSize;
  /** 选中高亮风格，对齐主项目 YakitMenu type */
  type?: DropdownMenuType;
  className?: string;
  style?: CSSProperties;
  /** 菜单最小宽度（主项目 width 习惯） */
  width?: number | string;
}

export type DropdownSemanticClassNames = {
  root?: string;
  item?: string;
  itemTitle?: string;
  itemIcon?: string;
  itemContent?: string;
};

export type DropdownSemanticStyles = {
  root?: CSSProperties;
  item?: CSSProperties;
  itemTitle?: CSSProperties;
  itemIcon?: CSSProperties;
  itemContent?: CSSProperties;
};

export type DropdownSemanticInfo = {
  props: Readonly<DropdownProps>;
};

type SemanticValue<T> = T | ((info: DropdownSemanticInfo) => T);

export interface DropdownProps extends BaseProps {
  menu?: DropdownMenuProps;
  autoFocus?: boolean;
  arrow?: boolean | DropdownArrowOptions;
  trigger?: DropdownTrigger[];
  /** @deprecated 请使用 popupRender */
  dropdownRender?: (originNode: ReactNode) => ReactNode;
  popupRender?: (originNode: ReactNode) => ReactNode;
  onOpenChange?: (open: boolean, info: { source: 'trigger' | 'menu' }) => void;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  /** @deprecated 请使用 destroyOnHidden */
  destroyPopupOnHide?: boolean;
  destroyOnHidden?: boolean;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  prefixCls?: string;
  placement?: DropdownPlacement;
  /** @deprecated 请使用 classNames.root */
  overlayClassName?: string;
  /** @deprecated 请使用 styles.root */
  overlayStyle?: CSSProperties;
  forceRender?: boolean;
  mouseEnterDelay?: number;
  mouseLeaveDelay?: number;
  openClassName?: string;
  children?: ReactNode;
  autoAdjustOverflow?: boolean;
  classNames?: SemanticValue<DropdownSemanticClassNames>;
  styles?: SemanticValue<DropdownSemanticStyles>;
}

/** 主项目 YakitDropdownMenu：dropdown + menu 拆分 */
export interface YakitDropdownMenuProps {
  dropdown?: Omit<DropdownProps, 'menu' | 'children' | 'overlay' | 'popupRender'>;
  menu: DropdownMenuProps & {
    /** 主项目外层装饰 className */
    menuWrapperClassName?: string;
  };
  children?: ReactNode;
}

export type DropdownButtonType =
  | 'default'
  | 'primary'
  | 'dashed'
  | 'link'
  | 'text'
  | 'secondary1'
  | 'secondary2'
  | 'outline1'
  | 'outline2'
  | 'text1'
  | 'text2';

export interface DropdownButtonProps
  extends Omit<DropdownProps, 'children'>,
    Pick<BaseProps, 'className' | 'style' | 'rootClassName'> {
  type?: DropdownButtonType;
  danger?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  buttonsRender?: (buttons: [ReactNode, ReactNode]) => [ReactNode, ReactNode];
}

export type { ReactElement };
