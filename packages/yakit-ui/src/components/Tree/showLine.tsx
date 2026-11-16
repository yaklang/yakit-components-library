import { DocumentOutlined } from '@yakit-libs/yakit-ui-icons/outline';

import type { TreeVariant, YakitTreeProps } from './type';

type ShowLine = YakitTreeProps['showLine'];

const leafIconColor = (treeDisabled: boolean, node: { selected?: boolean; disabled?: boolean }) =>
  // 可用时用 currentColor：网站树选中由 CSS 在 Action 上涂白；
  // 默认树选中的箭头位没有 Action，仍是次要色。
  // 禁用且选中：Neutral-Disable 条上用 Basic-White。
  // 未选中的禁用（单节点或整树）：Neutral-Disable。
  treeDisabled || node.disabled
    ? node.selected
      ? 'var(--Colors-Use-Basic-White)'
      : 'var(--Colors-Use-Neutral-Disable)'
    : 'currentColor';

const makeLeafLineIcon =
  (treeDisabled: boolean) => (node: { selected?: boolean; disabled?: boolean }) => (
    <DocumentOutlined
      className="ant-tree-switcher-line-icon yakit-tree-leaf-icon"
      color={leafIconColor(treeDisabled, node)}
      size={12}
    />
  );

/** 文件树叶子图标放在 24px 箭头列里，和文件夹箭头同一列。
 * 颜色交给 CSS，这样禁用且选中的行在浅底上仍是 Neutral-Disable。 */
const makeFileLeafIcon = () => () => (
  <DocumentOutlined
    className="ant-tree-switcher-line-icon yakit-tree-leaf-icon"
    color="currentColor"
    size={14}
  />
);

/**
 * `showLine` 在三种皮肤上的含义：
 *
 * | 传入 | 默认树 | 网站树 | 文件树 |
 * | --- | --- | --- | --- |
 * | 不传 | 不出线（antd） | 出线，不画叶子图标 | 不出线 |
 * | `false` | 不出线 | 不出线 | 不出线 |
 * | `true` | 只出线，叶子图标仍交给 antd | 出线，并画叶子图标 | 出线，不画叶子图标 |
 * | `{ showLeafIcon: false }` | 只出线 | 只出线 | 只出线 |
 * | `{ showLeafIcon: true }` | 出线，换成可变色叶子图标 | 出线，换成可变色叶子图标 | 出线，画文件叶子图标 |
 */
export const resolveTreeShowLine = (
  variant: TreeVariant,
  showLine: ShowLine,
  treeDisabled: boolean,
): ShowLine => {
  if (variant === 'file') {
    // 打开后用 antd 的 24px 间距（见 theme.ts）。
    if (!showLine) return false;
    if (showLine === true) return { showLeafIcon: false };
    if (showLine.showLeafIcon === true) {
      return { ...showLine, showLeafIcon: makeFileLeafIcon() };
    }
    return showLine;
  }
  const resolved = showLine ?? (variant === 'website' ? { showLeafIcon: false } : false);
  if (resolved === false) return false;
  if (resolved === true) {
    return variant === 'website' ? { showLeafIcon: makeLeafLineIcon(treeDisabled) } : true;
  }
  // `showLeafIcon: true` 换成能随选中、禁用变色的图标。
  // 否则 Action 底被 antd 透明的 show-line 盖住时，白色会看不见。
  if (resolved.showLeafIcon === true) {
    return { ...resolved, showLeafIcon: makeLeafLineIcon(treeDisabled) };
  }
  return resolved;
};

export const isLeafIconEnabled = (showLine: ShowLine): boolean => {
  if (!showLine || showLine === true) return false;
  return !!showLine.showLeafIcon;
};
