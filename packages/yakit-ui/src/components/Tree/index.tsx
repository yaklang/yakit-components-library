import type { ForwardRefExoticComponent, RefAttributes } from 'react';

import { DirectoryTree } from './DirectoryTree';
import { Tree as TreeBase } from './Tree';
import type { TreeProps, TreeRef } from './type';
import { YakitTreeCompat } from './YakitTreeCompat';

type TreeComponent = ForwardRefExoticComponent<TreeProps & RefAttributes<TreeRef>> & {
  DirectoryTree: typeof DirectoryTree;
};

const Tree = TreeBase as TreeComponent;
Tree.DirectoryTree = DirectoryTree;

export type {
  DirectoryTreeProps,
  TreeCheckInfo,
  TreeRef,
  TreeScrollToOptions,
  TreeDataNode,
  TreeDragInfo,
  TreeDropInfo,
  TreeExpandAction,
  TreeExpandInfo,
  TreeFieldNames,
  TreeIcon,
  TreeKey,
  TreeNodeIconProps,
  TreeNodeSwitcherProps,
  TreeProps,
  TreeSelectInfo,
  TreeSwitcherIcon,
  YakitTreeCompatProps,
} from './type';

export { DirectoryTree, Tree, YakitTreeCompat };
export default Tree;
