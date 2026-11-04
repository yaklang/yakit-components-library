import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';

import type { BaseProps } from '../../types/common';
import type { DropdownMenuProps, DropdownProps } from '../Dropdown';

export type MenuItemSize = 'medium' | 'large';

export interface MenuSelectInfo {
  key: string;
  domEvent: MouseEvent<HTMLElement>;
}

export interface MenuItemProps extends BaseProps {
  /**
   * 菜单项图标
   */
  icon?: ReactNode;
  /**
   * 菜单项文案；不传 / null / 空字符串则仅展示图标
   */
  label?: ReactNode;
  /**
   * 是否纵向排布（图标在上、文案在下）
   * @default true
   */
  vertical?: boolean;
  /**
   * 尺寸：large 对应设计稿 L（一级 44px 图标），medium 对应 M（二级 32px）
   * @default 'large'
   */
  size?: MenuItemSize;
  /**
   * 是否展示下拉箭头；为 true 时可配合 menu / dropdown / overlay 打开面板
   * @default false
   */
  select?: boolean;
  /**
   * 选中 / 激活态（导航语义会映射为 aria-current="page"）
   * @default false
   */
  active?: boolean;
  /**
   * 禁用
   * @default false
   */
  disabled?: boolean;
  /**
   * 自定义下拉箭头；默认使用 ChevronDownOutlined
   */
  selectIcon?: ReactNode;
  /**
   * 根节点 HTML 标签
   * @default 'button'
   */
  component?: 'button' | 'div' | 'a';
  /**
   * 无障碍名称（纯图标时建议提供）
   */
  'aria-label'?: string;
  /**
   * 点击回调
   */
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  /**
   * 稳定 key，配合 Menu 的 activeKey / onSelect
   */
  itemKey?: string;
  /**
   * 原生 title 提示
   */
  title?: string;
  /**
   * component="a" 时的链接地址
   */
  href?: string;
  /**
   * component="a" 时的 target
   */
  target?: string;
  /**
   * component="a" 时的 rel
   */
  rel?: string;
  /**
   * select 模式下透传给 Dropdown 的 menu（与 DropdownButton 一致）
   */
  menu?: DropdownMenuProps;
  /**
   * select 模式下的 Dropdown 配置（可含 menu）；也可只传 overlay ReactNode
   */
  dropdown?: Omit<DropdownProps, 'children'>;
  /**
   * select 模式下自定义下拉内容（等价于 Dropdown popupRender / 旧 overlay）
   */
  overlay?: ReactNode;
}

export interface MenuGroupProps extends BaseProps {
  /**
   * 组内菜单项
   */
  children?: ReactNode;
  /**
   * 是否显示右侧分隔线
   * @default true
   */
  divided?: boolean;
  /**
   * 共享父级文案（Fuzzer 等多图标共用一个标题）；启用后布局对齐 yakit parent-menu-wrapper
   */
  parentLabel?: ReactNode;
  /**
   * 父级区域点击（子项可 stopPropagation）
   */
  onClick?: (e: MouseEvent<HTMLElement>) => void;
}

/**
 * 多图标共用一个标题的子组，布局对齐 yakit MenuMode 的 parent-menu-wrapper
 */
export interface MenuSubGroupProps extends BaseProps {
  /**
   * 共享标题（显示在图标行下方）
   */
  label: ReactNode;
  /**
   * 图标子项（通常为 icon-only 的 Menu.Item）
   */
  children?: ReactNode;
  /**
   * 父级区域点击
   */
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  /**
   * 禁用整组
   */
  disabled?: boolean;
}

export interface MenuProps extends BaseProps, Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /**
   * Menu.Item / Menu.Group / Menu.SubGroup 等内容
   */
  children?: ReactNode;
  /**
   * 受控激活项（对应 Menu.Item 的 itemKey）
   */
  activeKey?: string;
  /**
   * 非受控初始激活项
   */
  defaultActiveKey?: string;
  /**
   * 子项被选中时回调（需提供 itemKey）
   */
  onSelect?: (info: MenuSelectInfo) => void;
}
