import { ChevronDownOutlined, ChevronRightOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import type { ReactNode } from 'react'

import type { TreeVariant } from './type'

export type SwitcherNode = {
  disabled?: boolean
  expanded?: boolean
  isLeaf?: boolean
  selected?: boolean
}

const chevron = (expanded: boolean | undefined, color: string, size: number) =>
  expanded ? (
    <ChevronDownOutlined className="yakit-tree-switcher-icon" color={color} size={size} />
  ) : (
    <ChevronRightOutlined className="yakit-tree-switcher-icon" color={color} size={size} />
  )

/**
 * 三种皮肤共用一套箭头。选中、禁用的最终颜色仍由 CSS 盖在 currentColor 上；
 * 这里只给图标一个起点，避免三份 Chevron 各写一遍。
 */
export const renderSwitcherIcon = (variant: TreeVariant, node: SwitcherNode, treeDisabled: boolean): ReactNode => {
  if (variant === 'file') {
    if (node.isLeaf) return null
    return chevron(node.expanded, 'var(--Colors-Use-Neutral-Text-3-Secondary)', 16)
  }
  if (variant === 'website') {
    // 选中用 currentColor，让 Action 或禁用选中条把箭头涂白。
    // 未选中的禁用（单节点或整树）箭头保持次要色。
    const color = node.selected
      ? 'currentColor'
      : treeDisabled || node.disabled
        ? 'var(--Colors-Use-Neutral-Text-3-Secondary)'
        : 'currentColor'
    return chevron(node.expanded, color, 12)
  }
  return chevron(node.expanded, 'currentColor', 12)
}
