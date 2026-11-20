import type { TreeDataNode } from 'antd'
import { useEffect, useRef, useState, type Key } from 'react'

import { calcRangeKeys, nodesForKeys, sameKeyList, uniqueKeys } from './treeData'
import type { YakitTreeProps } from './type'

type SelectInfo = Parameters<NonNullable<YakitTreeProps['onSelect']>>[1]

/**
 * 文件树选中。四份 ref 的锚点约定对齐 antd DirectoryTree：
 * - lastSelectedKey：下一次 Shift 范围的终点。单击和 Ctrl 单击会更新它。
 *   调用方从外面换掉 selectedKeys，且换的不是这次提交回写的同一份列表时，锚点清空。
 * - cachedSelectedKeys：Shift 范围要保留的已选集合。和锚点一起，在外部换选中时改成那份新列表。
 * - committedSelection：刚交给 onSelect 的列表。受控回写同一份时不当成外部重置。
 * - selectionSnapshot：上一轮受控 selectedKeys，用来判断列表有没有变。
 */
export const useFileTreeSelection = ({
  active,
  selectedKeys,
  defaultSelectedKeys,
  multiple,
  selectDirectory,
  folders,
  treeData,
  keyName,
  childrenName,
  expandedKeys,
  onSelect,
  bumpFocused,
  activeFocused,
}: {
  active: boolean
  selectedKeys: Key[] | undefined
  defaultSelectedKeys: Key[] | undefined
  multiple: boolean | undefined
  selectDirectory: boolean
  folders: Set<Key>
  treeData: TreeDataNode[] | undefined
  keyName: string
  childrenName: string
  expandedKeys: Key[] | undefined
  onSelect: YakitTreeProps['onSelect']
  bumpFocused: (key: Key | undefined) => void
  activeFocused: Key | undefined
}) => {
  const lastSelectedKeyRef = useRef<Key | null>(null)
  const cachedSelectedKeysRef = useRef<Key[] | null>(null)
  const selectionSnapshotRef = useRef<Key[] | null>(null)
  const committedSelectionRef = useRef<Key[] | null>(null)
  // 没传 selectedKeys 时留空，defaultSelectedKeys 交给 antd。点过之后才记下。
  const [innerSelected, setInnerSelected] = useState<Key[] | undefined>(selectedKeys)
  const rawSelected = selectedKeys ?? innerSelected

  useEffect(() => {
    if (selectedKeys !== undefined) setInnerSelected(selectedKeys)
  }, [selectedKeys])

  useEffect(() => {
    if (!active || selectedKeys === undefined) return
    const previous = selectionSnapshotRef.current
    selectionSnapshotRef.current = selectedKeys
    if (previous && sameKeyList(previous, selectedKeys)) return
    const committed = committedSelectionRef.current
    if (committed && sameKeyList(committed, selectedKeys)) {
      committedSelectionRef.current = null
      return
    }
    cachedSelectedKeysRef.current = [...selectedKeys]
    lastSelectedKeyRef.current = null
  }, [active, selectedKeys])

  const fileSelected =
    rawSelected === undefined
      ? undefined
      : selectDirectory
        ? rawSelected
        : rawSelected.filter((key) => !folders.has(key))

  const selectFile = (keys: Key[], info: SelectInfo) => {
    const native = info.nativeEvent
    const ctrl = !!(native && (native.ctrlKey || native.metaKey))
    const shift = !!(native && native.shiftKey)
    const folder = info.node.isLeaf === false || folders.has(info.node.key)
    const base = rawSelected ?? defaultSelectedKeys ?? []
    const key = info.node.key
    const commit = (next: Key[], selected: boolean) => {
      committedSelectionRef.current = next
      if (selectedKeys === undefined) setInnerSelected(next)
      onSelect?.(next, {
        ...info,
        selected,
        selectedNodes: nodesForKeys(treeData, next, keyName, childrenName),
      })
    }
    const focusFor = (next: Key[]) => {
      if (next.some((item) => item === key)) bumpFocused(key)
      else if (activeFocused === key) bumpFocused(undefined)
    }

    // 默认点目录只展开。按住 Ctrl 仍把这个 key 交出去，但不画选中描边。
    if (folder && !selectDirectory && !(multiple && shift)) {
      if (!(multiple && ctrl)) {
        bumpFocused(key)
        // antd 会先把目录写进自己的选中。这里把点击前的结果传回去，描边才不会留下。
        if (selectedKeys === undefined) setInnerSelected(base)
        return
      }
      const has = base.some((item) => item === key)
      const next = has ? base.filter((item) => item !== key) : [...base, key]
      focusFor(next)
      lastSelectedKeyRef.current = key
      cachedSelectedKeysRef.current = next
      commit(next, !has)
      return
    }

    if (multiple && shift) {
      const anchor = lastSelectedKeyRef.current
      if (anchor == null) {
        const next = uniqueKeys([...(cachedSelectedKeysRef.current ?? base), key])
        lastSelectedKeyRef.current = key
        cachedSelectedKeysRef.current = next
        focusFor(next)
        commit(next, true)
        return
      }
      const range = calcRangeKeys({
        treeData,
        expandedKeys: expandedKeys ?? [],
        startKey: key,
        endKey: anchor,
        keyName,
        childrenName,
      })
      const added = selectDirectory ? range : range.filter((item) => !folders.has(item))
      const next = uniqueKeys([...(cachedSelectedKeysRef.current ?? base), ...added])
      focusFor(next)
      commit(
        next,
        next.some((item) => item === key),
      )
      return
    }

    if (multiple && ctrl) {
      const keptFolders = selectDirectory ? [] : base.filter((item) => folders.has(item))
      const fromTree = selectDirectory ? keys : keys.filter((item) => !folders.has(item))
      const next = uniqueKeys([...keptFolders, ...fromTree])
      focusFor(next)
      lastSelectedKeyRef.current = key
      cachedSelectedKeysRef.current = next
      commit(
        next,
        next.some((item) => item === key),
      )
      return
    }

    bumpFocused(key)
    lastSelectedKeyRef.current = key
    cachedSelectedKeysRef.current = [key]
    commit([key], true)
  }

  return { fileSelected, selectFile }
}
