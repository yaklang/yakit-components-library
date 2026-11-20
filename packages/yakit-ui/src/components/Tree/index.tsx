import { DefaultTree, DirectoryTree, WebsiteTree } from './Tree'

const TreeWithStatics = Object.assign({}, DefaultTree, {
  DirectoryTree,
  WebsiteTree,
})
TreeWithStatics.displayName = DefaultTree.displayName

export type { DirectoryTreeProps, WebsiteResourceType, WebsiteTreeDataNode, WebsiteTreeProps } from './type'

export { TreeWithStatics as Tree, TreeWithStatics as default }
export type { TreeEditingSelection, TreeRef, TreeScrollTarget, YakitTreeProps } from './type'
