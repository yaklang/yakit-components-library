import type { TreeDataNode } from 'antd';
import { useState, type Key } from 'react';

import { initialExpandedKeys } from './treeData';

/**
 * 文件树内部展开列表。只在第一次挂载时用 defaultExpandAll / defaultExpandedKeys /
 * defaultExpandParent 算一次。之后始终把这份列表传给 antd。
 * 首屏 treeData 为空时，后到的数据不会补展开。
 */
export const useInnerExpanded = (
  enabled: boolean,
  treeData: TreeDataNode[] | undefined,
  keyName: string,
  childrenName: string,
  expandedKeys: Key[] | undefined,
  defaultExpandedKeys: Key[] | undefined,
  defaultExpandAll: boolean | undefined,
  defaultExpandParent: boolean | undefined,
) => {
  const [innerExpanded, setInnerExpanded] = useState<Key[]>(() =>
    enabled
      ? initialExpandedKeys(
          treeData,
          keyName,
          childrenName,
          expandedKeys,
          defaultExpandedKeys,
          defaultExpandAll,
          defaultExpandParent,
        )
      : [],
  );
  const expanded = enabled ? (expandedKeys ?? innerExpanded) : expandedKeys;
  return { expanded, setInnerExpanded };
};
