import { createRef } from 'react'

import { Tree, type DirectoryTreeProps, type TreeRef, type WebsiteResourceType } from '../../src/components'

const { DirectoryTree } = Tree

const treeProps: DirectoryTreeProps = {
  expandAction: 'click',
  height: 120,
  itemHeight: 22,
  focusedKey: 'root',
  onFocusedKeyChange: (_key) => undefined,
  editingValue: 'Root',
  editingSelection: { start: 0, end: 4 },
  onEditSubmit: () => undefined,
}

export const treeRef = createRef<TreeRef>()

export const tree = <DirectoryTree ref={treeRef} {...treeProps} treeData={[{ key: 'root', title: 'Root' }]} />

const queryType: WebsiteResourceType = 'query'

export const website = (
  <Tree.WebsiteTree
    treeData={[
      {
        key: 'host',
        title: 'host',
        resourceType: 'dir',
        data: { ResourceType: 'dir', Url: 'https://example' },
        children: [{ key: 'q', title: 'q', resourceType: queryType, isLeaf: true }],
      },
    ]}
  />
)

export const rejectedVariant = (
  // @ts-expect-error variant 只在组件内部选择皮肤，调用方不能传。
  <Tree variant="website" treeData={[{ key: 'root', title: 'Root' }]} />
)

// 目录树专有字段不能进默认树和网站树。每条单独成行，类型错误才落在这一行上。
export const rejectedFocusedKeyOnDefault = (
  // @ts-expect-error focusedKey 只属于目录树
  <Tree focusedKey="root" treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedDefaultFocusedKeyOnDefault = (
  // @ts-expect-error defaultFocusedKey 只属于目录树
  <Tree defaultFocusedKey="root" treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedFocusedKeyChangeOnDefault = (
  // @ts-expect-error onFocusedKeyChange 只属于目录树
  <Tree onFocusedKeyChange={() => undefined} treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedSelectDirectoryOnDefault = (
  // @ts-expect-error selectDirectory 只属于目录树
  <Tree selectDirectory treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedEditingKeyOnDefault = (
  // @ts-expect-error editingKey 只属于目录树
  <Tree editingKey="root" treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedEditingValueOnDefault = (
  // @ts-expect-error editingValue 只属于目录树
  <Tree editingValue="root" treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedEditingSelectionOnDefault = (
  // @ts-expect-error editingSelection 只属于目录树
  <Tree editingSelection={{ start: 0, end: 1 }} treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedEditSubmitOnDefault = (
  // @ts-expect-error onEditSubmit 只属于目录树
  <Tree onEditSubmit={() => undefined} treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedSuffixOnDefault = (
  // @ts-expect-error suffix 只属于目录树
  <Tree suffix={() => null} treeData={[{ key: 'root', title: 'Root' }]} />
)

export const rejectedFocusedKeyOnWebsite = (
  // @ts-expect-error focusedKey 只属于目录树
  <Tree.WebsiteTree focusedKey="root" treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedDefaultFocusedKeyOnWebsite = (
  // @ts-expect-error defaultFocusedKey 只属于目录树
  <Tree.WebsiteTree defaultFocusedKey="root" treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedFocusedKeyChangeOnWebsite = (
  <Tree.WebsiteTree
    // @ts-expect-error onFocusedKeyChange 只属于目录树
    onFocusedKeyChange={() => undefined}
    treeData={[{ key: 'root', title: 'Root' }]}
  />
)
export const rejectedSelectDirectoryOnWebsite = (
  // @ts-expect-error selectDirectory 只属于目录树
  <Tree.WebsiteTree selectDirectory treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedEditingKeyOnWebsite = (
  // @ts-expect-error editingKey 只属于目录树
  <Tree.WebsiteTree editingKey="root" treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedEditingValueOnWebsite = (
  // @ts-expect-error editingValue 只属于目录树
  <Tree.WebsiteTree editingValue="root" treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedEditingSelectionOnWebsite = (
  <Tree.WebsiteTree
    // @ts-expect-error editingSelection 只属于目录树
    editingSelection={{ start: 0, end: 1 }}
    treeData={[{ key: 'root', title: 'Root' }]}
  />
)
export const rejectedEditSubmitOnWebsite = (
  // @ts-expect-error onEditSubmit 只属于目录树
  <Tree.WebsiteTree onEditSubmit={() => undefined} treeData={[{ key: 'root', title: 'Root' }]} />
)
export const rejectedSuffixOnWebsite = (
  // @ts-expect-error suffix 只属于目录树
  <Tree.WebsiteTree suffix={() => null} treeData={[{ key: 'root', title: 'Root' }]} />
)
