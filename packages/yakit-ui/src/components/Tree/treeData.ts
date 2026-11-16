import type { TreeDataNode } from 'antd';
import type { Key } from 'react';

export const readNodeKey = (node: TreeDataNode, keyName: string): Key => {
  const record = node as unknown as Record<string, unknown>;
  return (record[keyName] ?? node.key) as Key;
};

export const readNodeChildren = (
  node: TreeDataNode,
  childrenName: string,
): TreeDataNode[] | undefined => {
  const record = node as unknown as Record<string, unknown>;
  const children = record[childrenName];
  return Array.isArray(children) ? (children as TreeDataNode[]) : undefined;
};

export const collectFolders = (
  nodes: TreeDataNode[] | undefined,
  keyName: string,
  childrenName: string,
  folders: Set<Key>,
  lazy: boolean,
) => {
  nodes?.forEach((node) => {
    const key = readNodeKey(node, keyName);
    const children = readNodeChildren(node, childrenName);
    const hasChildren = !!children && children.length > 0;
    // 传了 loadData 且没标成叶子时，还没子节点的也是目录。否则单击会当成文件选中。
    const directory = node.isLeaf === false || hasChildren || (lazy && node.isLeaf !== true);
    if (directory) folders.add(key);
    if (hasChildren) collectFolders(children, keyName, childrenName, folders, lazy);
  });
};

/** 对齐 antd DirectoryTree：只在第一次用 default* 算出展开，之后把这份列表传给树。 */
export const initialExpandedKeys = (
  nodes: TreeDataNode[] | undefined,
  keyName: string,
  childrenName: string,
  expandedKeys: Key[] | undefined,
  defaultExpandedKeys: Key[] | undefined,
  defaultExpandAll: boolean | undefined,
  defaultExpandParent: boolean | undefined,
) => {
  if (expandedKeys !== undefined) return expandedKeys;
  const allKeys: Key[] = [];
  const parentOf = new Map<Key, Key>();
  const disabled = new Set<Key>();
  const visit = (list: TreeDataNode[] | undefined, parent?: Key) => {
    list?.forEach((node) => {
      const key = readNodeKey(node, keyName);
      allKeys.push(key);
      if (node.disabled) disabled.add(key);
      if (parent !== undefined) parentOf.set(key, parent);
      const children = readNodeChildren(node, childrenName);
      if (children && children.length > 0) visit(children, key);
    });
  };
  visit(nodes);
  if (defaultExpandAll) return allKeys;
  const listed = defaultExpandedKeys ?? [];
  if (defaultExpandParent === false) return listed;
  const expanded = new Set<Key>();
  const includeParents = (key: Key) => {
    if (expanded.has(key)) return;
    expanded.add(key);
    // 对齐 rc-tree conductExpandParent：禁用节点不再往上补祖先。
    if (disabled.has(key)) return;
    const parent = parentOf.get(key);
    if (parent !== undefined) includeParents(parent);
  };
  listed.forEach(includeParents);
  return [...expanded];
};

export const uniqueKeys = (keys: Key[]) => {
  const seen = new Set<Key>();
  const out: Key[] = [];
  keys.forEach((key) => {
    if (seen.has(key)) return;
    seen.add(key);
    out.push(key);
  });
  return out;
};

export const sameKeyList = (left: Key[], right: Key[]) => {
  if (left.length !== right.length) return false;
  const seen = new Set(left);
  return seen.size === right.length && right.every((key) => seen.has(key));
};

/** 两个 key 之间、当前展开能看见的范围。规则对齐 antd DirectoryTree 的 `calcRangeKeys`。 */
export const calcRangeKeys = ({
  treeData,
  expandedKeys,
  startKey,
  endKey,
  keyName,
  childrenName,
}: {
  treeData: TreeDataNode[] | undefined;
  expandedKeys: Key[];
  startKey: Key;
  endKey: Key;
  keyName: string;
  childrenName: string;
}) => {
  if (startKey === endKey) return [startKey];
  const expanded = new Set(expandedKeys);
  const keys: Key[] = [];
  let record: 0 | 1 | 2 = 0;
  const visit = (nodes: TreeDataNode[] | undefined): boolean => {
    if (!nodes) return false;
    for (const node of nodes) {
      if (record === 2) return true;
      const key = readNodeKey(node, keyName);
      const children = readNodeChildren(node, childrenName);
      if (key === startKey || key === endKey) {
        keys.push(key);
        record = record === 0 ? 1 : 2;
        if (record === 2) return true;
      } else if (record === 1 && !node.disabled && node.selectable !== false) {
        keys.push(key);
      }
      if (children && children.length > 0 && expanded.has(key) && visit(children)) {
        return true;
      }
    }
    return record === 2;
  };
  visit(treeData);
  return keys;
};

export const nodesForKeys = (
  treeData: TreeDataNode[] | undefined,
  keys: Key[],
  keyName: string,
  childrenName: string,
) => {
  const wanted = new Set(keys);
  const nodes: TreeDataNode[] = [];
  const visit = (list: TreeDataNode[] | undefined) => {
    list?.forEach((node) => {
      if (wanted.has(readNodeKey(node, keyName))) nodes.push(node);
      const children = readNodeChildren(node, childrenName);
      if (children) visit(children);
    });
  };
  visit(treeData);
  return nodes;
};
