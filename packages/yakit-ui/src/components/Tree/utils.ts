import type { ReactNode } from 'react';

import type { TreeDataNode, TreeFieldNames, TreeKey } from './type';

const DEFAULT_FIELD_NAMES: Required<TreeFieldNames> = {
  title: 'title',
  key: 'key',
  children: 'children',
};

/**
 * 按 fieldNames 规范化 treeData：写入标准 key/title/children，同时保留原始字段。
 */
export const mapTreeDataByFieldNames = (
  nodes: TreeDataNode[] | undefined,
  fieldNames?: TreeFieldNames,
): TreeDataNode[] => {
  if (!nodes?.length) return [];
  const names = { ...DEFAULT_FIELD_NAMES, ...fieldNames };
  const needMap = names.title !== 'title' || names.key !== 'key' || names.children !== 'children';
  if (!needMap) return nodes;

  const walk = (list: TreeDataNode[]): TreeDataNode[] =>
    list.map((node) => {
      const raw = node as Record<string, unknown>;
      const mappedKey = (raw[names.key] ?? node.key) as TreeKey;
      const mappedTitle = (raw[names.title] ?? node.title) as ReactNode;
      const rawChildren = raw[names.children] as TreeDataNode[] | undefined;
      const children = Array.isArray(rawChildren) ? walk(rawChildren) : undefined;
      return {
        ...node,
        key: mappedKey,
        title: mappedTitle,
        children,
      };
    });

  return walk(nodes);
};

export const collectParentKeys = (nodes: TreeDataNode[] | undefined, out: TreeKey[] = []) => {
  nodes?.forEach((node) => {
    if (node.children?.length) {
      out.push(node.key);
      collectParentKeys(node.children, out);
    }
  });
  return out;
};

/** 收集某 key 的全部祖先 key（不含自身） */
const collectAncestorKeys = (
  nodes: TreeDataNode[] | undefined,
  target: TreeKey,
  path: TreeKey[] = [],
): TreeKey[] | null => {
  if (!nodes) return null;
  for (const node of nodes) {
    if (String(node.key) === String(target)) return path;
    const found = collectAncestorKeys(node.children, target, [...path, node.key]);
    if (found) return found;
  }
  return null;
};

/** autoExpandParent：把 expandedKeys 的祖先一并并入 */
export const withAutoExpandParents = (
  nodes: TreeDataNode[] | undefined,
  keys: TreeKey[],
): TreeKey[] => {
  const set = new Set(keys.map(String));
  const out: TreeKey[] = [...keys];
  keys.forEach((key) => {
    const ancestors = collectAncestorKeys(nodes, key) ?? [];
    ancestors.forEach((ancestor) => {
      if (!set.has(String(ancestor))) {
        set.add(String(ancestor));
        out.push(ancestor);
      }
    });
  });
  return out;
};

export const findNode = (nodes: TreeDataNode[] | undefined, key: TreeKey): TreeDataNode | null => {
  if (!nodes) return null;
  for (const node of nodes) {
    if (String(node.key) === String(key)) return node;
    const child = findNode(node.children, key);
    if (child) return child;
  }
  return null;
};

export const flattenVisible = (
  nodes: TreeDataNode[] | undefined,
  expanded: Set<string>,
  level = 0,
  acc: Array<{ node: TreeDataNode; level: number }> = [],
) => {
  nodes?.forEach((node) => {
    acc.push({ node, level });
    const hasChildren = Boolean(node.children?.length);
    const isLeaf = node.isLeaf ?? !hasChildren;
    if (!isLeaf && hasChildren && expanded.has(String(node.key))) {
      flattenVisible(node.children, expanded, level + 1, acc);
    }
  });
  return acc;
};

export const collectDescendantKeys = (node: TreeDataNode, out: TreeKey[] = []) => {
  out.push(node.key);
  node.children?.forEach((child) => collectDescendantKeys(child, out));
  return out;
};

/** Bottom-up: fill parent checked / halfChecked from leaf/child status (antd-like). */
export const conductCheck = (nodes: TreeDataNode[] | undefined, checkedKeys: Iterable<TreeKey>) => {
  const checked = new Set([...checkedKeys].map(String));
  const half = new Set<string>();

  const walk = (list: TreeDataNode[] | undefined): void => {
    list?.forEach((node) => {
      if (!node.children?.length) return;
      walk(node.children);
      let checkedCount = 0;
      let halfCount = 0;
      node.children.forEach((child) => {
        const key = String(child.key);
        if (checked.has(key)) checkedCount += 1;
        else if (half.has(key)) halfCount += 1;
      });
      const key = String(node.key);
      if (checkedCount === node.children.length && halfCount === 0) {
        checked.add(key);
        half.delete(key);
      } else if (checkedCount > 0 || halfCount > 0) {
        checked.delete(key);
        half.add(key);
      } else {
        checked.delete(key);
        half.delete(key);
      }
    });
  };

  walk(nodes);
  return {
    checked: [...checked] as TreeKey[],
    halfChecked: [...half] as TreeKey[],
  };
};
