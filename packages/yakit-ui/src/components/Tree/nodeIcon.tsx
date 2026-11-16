import {
  DocumentOutlined,
  Link2Outlined,
  VariableOutlined,
} from '@yakit-libs/yakit-ui-icons/outline';
import { FolderOpenSolid, FolderSolid } from '@yakit-libs/yakit-ui-icons/solid';
import type { TreeDataNode } from 'antd';
import type { ReactNode } from 'react';

import type { WebsiteResourceType } from './type';

const selectedIconColor = 'var(--Colors-Use-Basic-White)';
const disabledIconColor = 'var(--Colors-Use-Neutral-Disable)';
const websiteResourceTypes = new Set<WebsiteResourceType>(['dir', 'file', 'query', 'path']);

const readWebsiteResourceType = (value: unknown): WebsiteResourceType | undefined =>
  typeof value === 'string' && websiteResourceTypes.has(value as WebsiteResourceType)
    ? (value as WebsiteResourceType)
    : undefined;

/**
 * rc-tree 的 `pos` 从 `0-0` 起。第一层是 1，再往下递增。
 * 没有 `pos` 时返回 undefined。
 */
const websiteDepth = (pos: unknown): number | undefined => {
  if (typeof pos !== 'string' || pos.length === 0) return undefined;
  return pos.split('-').length - 1;
};

/**
 * 图标回调上的 `children` 会被 rc-tree 拿掉，子节点留在 `data.children`。
 * `isLeaf: false` 表示还没装上子节点，但这一层还能展开。
 */
const websiteNodeHasChildren = (node: {
  children?: unknown;
  data?: unknown;
  isLeaf?: boolean;
}): boolean => {
  if (node.isLeaf === true) return false;
  if (node.isLeaf === false) return true;
  const hasChildList = (value: unknown) => {
    if (!value || typeof value !== 'object' || !('children' in value)) return false;
    const children = (value as { children?: unknown }).children;
    return Array.isArray(children) && children.length > 0;
  };
  return hasChildList(node) || hasChildList(node.data);
};

/**
 * 没写种类时按网站树的层来认：
 * 第一层是文件夹，中间有子节点的是链接，叶子是变量。
 */
const inferredWebsiteKind = (node: {
  pos?: unknown;
  isLeaf?: boolean;
  children?: unknown;
  data?: unknown;
}): WebsiteResourceType => {
  const depth = websiteDepth(node.pos);
  if (depth === 1) return 'dir';
  if (!websiteNodeHasChildren(node)) return 'query';
  if (depth === undefined) return 'dir';
  return 'path';
};

/**
 * 网站节点种类，按这个顺序认：
 * `resourceType`、`data.resourceType`、`data.ResourceType`、
 * `data.data.ResourceType`、`data.data.resourceType`。
 * History 把种类放在 `data.ResourceType`；rc-tree 画图标时还会再包一层 `data`。
 */
export const websiteResourceType = (node: {
  resourceType?: unknown;
  data?: unknown;
}): WebsiteResourceType | undefined => {
  const record =
    node.data && typeof node.data === 'object'
      ? (node.data as {
          resourceType?: unknown;
          data?: unknown;
          ResourceType?: unknown;
        })
      : undefined;
  const nested =
    record?.data && typeof record.data === 'object'
      ? (record.data as { ResourceType?: unknown; resourceType?: unknown })
      : undefined;
  return (
    readWebsiteResourceType(node.resourceType) ??
    readWebsiteResourceType(record?.resourceType) ??
    readWebsiteResourceType(record?.ResourceType) ??
    readWebsiteResourceType(nested?.ResourceType) ??
    readWebsiteResourceType(nested?.resourceType)
  );
};

/**
 * 节点自己的 icon。没有自定义图标时返回 undefined。
 * 函数即使画出空节点也算用过，不再落到默认图标。
 */
export const customNodeIcon = (
  node: { icon?: TreeDataNode['icon'] },
  expanded: boolean,
): { value: ReactNode } | undefined => {
  const props = { ...node, expanded };
  if (typeof node.icon === 'function') {
    return { value: (node.icon as (iconProps: typeof props) => ReactNode)(props) };
  }
  if (node.icon) return { value: node.icon as ReactNode };
  return undefined;
};

export const renderWebsiteIcon =
  (treeDisabled: boolean) =>
  (node: {
    data?: unknown;
    disabled?: boolean;
    expanded?: boolean;
    isLeaf?: boolean;
    pos?: unknown;
    resourceType?: unknown;
    selected?: boolean;
    icon?: TreeDataNode['icon'];
  }) => {
    const custom = customNodeIcon(node, !!node.expanded);
    if (custom) return custom.value;
    const kind = websiteResourceType(node) ?? inferredWebsiteKind(node);
    const isDisabled = treeDisabled || !!node.disabled;
    const leafKind = kind === 'file' || kind === 'query' || kind === 'path';
    // 选中（含禁用）在选中条上用 Basic-White。
    // 未选中的禁用用 Neutral-Disable。文件、链接、变量用 currentColor，文件夹用 Orange-Primary。
    const color = node.selected
      ? selectedIconColor
      : isDisabled
        ? disabledIconColor
        : leafKind
          ? 'currentColor'
          : 'var(--Colors-Use-Orange-Primary)';
    if (kind === 'query') return <VariableOutlined size={16} color={color} />;
    if (kind === 'path') return <Link2Outlined size={16} color={color} />;
    if (kind === 'file') return <DocumentOutlined size={16} color={color} />;
    return node.expanded ? (
      <FolderOpenSolid size={16} color={color} />
    ) : (
      <FolderSolid size={16} color={color} />
    );
  };
