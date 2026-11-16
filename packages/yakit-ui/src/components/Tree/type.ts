import type { TreeDataNode, TreeProps as AntTreeProps } from 'antd';
import type { Key, ReactNode } from 'react';

/** 内部皮肤。由三种树自己写入，不从包入口导出。 */
export type TreeVariant = 'default' | 'website' | 'file';

export interface TreeScrollTarget {
  key: Key;
  align?: 'top' | 'bottom' | 'auto';
  offset?: number;
}

export interface TreeRef {
  scrollTo: (scroll: TreeScrollTarget) => void;
}

export interface TreeEditingSelection {
  start: number;
  end: number;
}

/** 默认树和网站树的 props。文件树专有字段在 `DirectoryTreeProps`。 */
export type YakitTreeProps = AntTreeProps;

/** 网站节点种类。History 的 `ResourceType` 用同一组值。 */
export type WebsiteResourceType = 'dir' | 'file' | 'query' | 'path';

/**
 * 网站树节点。`resourceType` 决定图标：
 * `dir` 是文件夹开合，`path` 是链接，`query` 是参数，`file` 是文件。
 * 路径有子节点时仍用链接图标。
 * 不传时按层画：第一层文件夹，中间有子节点的是链接，叶子是变量。
 * 种类按 `resourceType`、`data.resourceType`、`data.ResourceType`、
 * `data.data.ResourceType`、`data.data.resourceType` 这个顺序认。节点自己的 `icon` 优先。
 */
export type WebsiteTreeDataNode = TreeDataNode & {
  resourceType?: WebsiteResourceType;
  data?: {
    ResourceType?: string;
    resourceType?: string;
    data?: { ResourceType?: string; resourceType?: string };
  } & Record<string, unknown>;
  children?: WebsiteTreeDataNode[];
};

/**
 * 网站树的 props。
 * 不传时：`blockNode` 和 `showIcon` 为真，`showLine` 为 `{ showLeafIcon: false }`，
 * 并按节点种类带上图标，行高 24。
 */
export interface WebsiteTreeProps extends Omit<YakitTreeProps, 'treeData'> {
  treeData?: WebsiteTreeDataNode[];
}

export interface DirectoryTreeProps extends YakitTreeProps {
  /** 文件树里正在编辑的节点。 */
  editingKey?: Key;
  /** 进入编辑时输入框里的文字。 */
  editingValue?: string;
  /** 聚焦时选中的文字范围。不传则选中整段。后缀算到哪个点由调用方决定。 */
  editingSelection?: TreeEditingSelection;
  /** 回车或失焦时交还当前文字。输入框留到调用方清掉 editingKey。保存请求留在调用方。 */
  onEditSubmit?: (value: string, key: Key) => void;
  /** 文件树行尾操作。不传则不占位。 */
  suffix?: (node: TreeDataNode) => ReactNode;
  /**
   * 文件树当前焦点行（可与 `selectedKeys` 不同）。
   * 受控；空字符串 / `null` / `undefined` 表示无焦点。
   * 展开节点时，焦点会移到该节点。
   */
  focusedKey?: Key | null;
  /** 非受控时的初始焦点行。 */
  defaultFocusedKey?: Key;
  /** 点击展开或选中时回报新的焦点 key；清空时为 `undefined`。 */
  onFocusedKeyChange?: (key: Key | undefined) => void;
  /**
   * 文件树是否允许选中目录。默认否：单击目录只展开。
   * 选中集合里的目录 key 不上色，包括调用方传入的 `selectedKeys`。
   * 多选时 Ctrl 点目录仍会把这个 key 放进选中集合，只是不画描边。
   * 设为 true 后，单击目录会选中并画出和文件一样的选中描边；Shift 范围也包含目录。
   */
  selectDirectory?: boolean;
  /**
   * 和 antd DirectoryTree 一样，展开结果总会传给树。
   * 不传时，只在挂载时用 `defaultExpandAll`、`defaultExpandedKeys`、`defaultExpandParent` 算一次，之后由组件记下。
   * 第一次挂上时空的 `treeData`，后到的数据不会展开。等数据到了再挂，或自己传 `expandedKeys`。
   * `defaultExpandedKeys` 会带上祖先，碰到禁用节点就停。`defaultExpandParent={false}` 时不补祖先。
   * 传了 `expandedKeys` 就要在 `onExpand` 里回写，否则展开后会弹回去。
   */
  expandedKeys?: Key[];
}
