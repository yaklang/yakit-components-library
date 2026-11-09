import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  Key,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  UIEvent,
} from 'react';

import type { BaseProps } from '../../types/common';

/** Tree 节点 key，对齐 antd / yakit */
export type TreeKey = Key;

export interface TreeDataNode {
  key: TreeKey;
  title?: ReactNode;
  children?: TreeDataNode[];
  disabled?: boolean;
  disableCheckbox?: boolean;
  selectable?: boolean;
  checkable?: boolean;
  isLeaf?: boolean;
  icon?: ReactNode | ((props: TreeNodeIconProps) => ReactNode);
  className?: string;
  style?: CSSProperties;
  /** 业务扩展字段 */
  [customProp: string]: unknown;
}

export interface TreeNodeIconProps {
  eventKey: TreeKey;
  expanded: boolean;
  selected: boolean;
  isLeaf: boolean;
  title?: ReactNode;
}

export interface TreeNodeSwitcherProps {
  eventKey: TreeKey;
  expanded: boolean;
  selected: boolean;
  isLeaf: boolean;
  loading?: boolean;
}

export type TreeSwitcherIcon = ReactNode | ((props: TreeNodeSwitcherProps) => ReactNode);

export type TreeIcon = ReactNode | ((props: TreeNodeIconProps) => ReactNode);

/** 自定义字段名映射（对齐 antd Tree.fieldNames） */
export interface TreeFieldNames {
  title?: string;
  key?: string;
  children?: string;
}

export interface TreeSelectInfo {
  event: 'select';
  selected: boolean;
  node: TreeDataNode;
  selectedNodes: TreeDataNode[];
  nativeEvent: MouseEvent;
}

export interface TreeExpandInfo {
  node: TreeDataNode;
  expanded: boolean;
  nativeEvent: MouseEvent;
}

export interface TreeCheckInfo {
  event: 'check';
  checked: boolean;
  node: TreeDataNode;
  checkedNodes: TreeDataNode[];
  halfCheckedKeys: TreeKey[];
  nativeEvent: MouseEvent;
}

/** 基础 HTML5 拖拽信息（简化对齐 antd；不会自动改 treeData） */
export interface TreeDragInfo {
  event: ReactDragEvent;
  node: TreeDataNode;
}

export interface TreeDropInfo {
  event: ReactDragEvent;
  node: TreeDataNode;
  dragNode: TreeDataNode;
  dragNodesKeys: TreeKey[];
  /** -1 落到节点上方，0 落到节点上（作为子），1 落到节点下方 */
  dropPosition: -1 | 0 | 1;
  dropToGap: boolean;
}

/**
 * 点击标题时是否联动展开。
 * DirectoryTree 默认 'click'。
 */
export type TreeExpandAction = false | 'click' | 'doubleClick';

export interface TreeProps extends BaseProps {
  treeData?: TreeDataNode[];
  /**
   * 是否展示节点图标。默认展示（对齐 yakit YakitTree）。
   * @default true
   */
  showIcon?: boolean;
  /**
   * 是否展示连接线。Figma 默认无连线；YakitTreeCompat 默认 true。
   * 兼容 antd：也可传 `{ showLeafIcon: false }`。
   * @default false
   */
  showLine?: boolean | { showLeafIcon?: boolean };
  /**
   * 层级缩进。Figma Tree 每级 10px。
   * @default 10
   */
  indent?: number;
  /** 外层包裹 class（对齐 yakit `classNameWrapper`） */
  classNameWrapper?: string;
  /** 空数据占位 */
  emptyText?: ReactNode;
  /** 默认展开全部 */
  defaultExpandAll?: boolean;
  defaultExpandedKeys?: TreeKey[];
  expandedKeys?: TreeKey[];
  onExpand?: (expandedKeys: TreeKey[], info: TreeExpandInfo) => void;
  /**
   * 展开子节点时是否自动展开父节点（对齐 antd）。
   * @default false（Figma/基础 Tree）；DirectoryTree 可自行打开
   */
  autoExpandParent?: boolean;
  defaultSelectedKeys?: TreeKey[];
  selectedKeys?: TreeKey[];
  /** @default true */
  selectable?: boolean;
  multiple?: boolean;
  onSelect?: (selectedKeys: TreeKey[], info: TreeSelectInfo) => void;
  checkable?: boolean;
  checkStrictly?: boolean;
  defaultCheckedKeys?: TreeKey[];
  checkedKeys?: TreeKey[] | { checked: TreeKey[]; halfChecked: TreeKey[] };
  onCheck?: (
    checked:
      | TreeKey[]
      | {
          checked: TreeKey[];
          halfChecked: TreeKey[];
        },
    info: TreeCheckInfo,
  ) => void;
  switcherIcon?: TreeSwitcherIcon;
  icon?: TreeIcon;
  titleRender?: (node: TreeDataNode) => ReactNode;
  disabled?: boolean;
  /** 虚拟列表高度；与 itemHeight 同时传入时启用窗口虚拟滚动 */
  height?: number;
  /**
   * 行高（px）。FileTree 常用 22；与 height 一起启用虚拟列表。
   * 仅传 height 时仍为普通滚动容器。
   */
  itemHeight?: number;
  onRightClick?: (info: { event: ReactMouseEvent; node: TreeDataNode }) => void;
  /**
   * 异步加载子节点（对齐 antd Tree.loadData）。
   * 展开节点且无子节点时触发；返回 Promise。
   */
  loadData?: (node: TreeDataNode) => Promise<unknown>;
  /** 已加载节点 key（受控）；不传则内部跟踪 */
  loadedKeys?: TreeKey[];
  /** 滚动回调（对齐 antd onScroll，挂在可滚动容器上） */
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  /** 节点整行可点（对齐 antd blockNode，仅样式） */
  blockNode?: boolean;
  /**
   * 字段名映射。例如 FileTree：`{ title: 'name', key: 'path', children: 'children' }`。
   * 映射后节点仍保留原始字段，便于 titleRender 读 name/path。
   */
  fieldNames?: TreeFieldNames;
  /**
   * 点击/双击标题是否展开。false 则仅 switcher 展开。
   * @default false
   */
  expandAction?: TreeExpandAction;
  /**
   * 是否可拖拽。也可传函数按节点决定。
   * 限制：仅 HTML5 拖拽回调，不自动重排 treeData；落点计算简化。
   */
  draggable?: boolean | ((node: TreeDataNode) => boolean);
  onDragStart?: (info: TreeDragInfo) => void;
  onDragEnter?: (info: TreeDragInfo) => void;
  onDragOver?: (info: TreeDragInfo) => void;
  onDragLeave?: (info: TreeDragInfo) => void;
  onDragEnd?: (info: TreeDragInfo) => void;
  onDrop?: (info: TreeDropInfo) => void;
}

/** scrollTo 参数（对齐 antd Tree scrollTo） */
export interface TreeScrollToOptions {
  key: TreeKey;
  align?: 'top' | 'bottom' | 'middle' | 'auto';
  offset?: number;
}

/** Tree 命令式句柄 */
export interface TreeRef {
  scrollTo: (options: TreeScrollToOptions) => void;
}

export type DirectoryTreeProps = TreeProps;

export type YakitTreeCompatProps = TreeProps;
