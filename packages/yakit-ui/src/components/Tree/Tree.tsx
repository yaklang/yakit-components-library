import { ConfigProvider, Tree as AntTree } from 'antd';
import type { ThemeConfig, TreeDataNode } from 'antd';
import classNames from 'classnames';
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  type Key,
  type ReactElement,
  type ReactNode,
} from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';

import { FileTreeNode, type FileTreeNodeProps } from './FileTreeNode';
import { renderWebsiteIcon } from './nodeIcon';
import { isLeafIconEnabled, resolveTreeShowLine } from './showLine';
import './style/index.css';
import { renderSwitcherIcon, type SwitcherNode } from './switcher';
import { createTreeTheme } from './theme';
import { collectFolders } from './treeData';
import type {
  DirectoryTreeProps,
  TreeRef,
  TreeScrollTarget,
  TreeVariant,
  WebsiteTreeProps,
  YakitTreeProps,
} from './type';
import { hasFocusedKey, useFileTreeFocus } from './useFileTreeFocus';
import { useFileTreeSelection } from './useFileTreeSelection';
import { useInnerExpanded } from './useInnerExpanded';

/** 三种树共用的内部视图。目录树字段只有 `variant="file"` 时会读。 */
interface TreeViewProps extends YakitTreeProps {
  variant?: TreeVariant;
  editingKey?: DirectoryTreeProps['editingKey'];
  editingValue?: DirectoryTreeProps['editingValue'];
  editingSelection?: DirectoryTreeProps['editingSelection'];
  onEditSubmit?: DirectoryTreeProps['onEditSubmit'];
  suffix?: DirectoryTreeProps['suffix'];
  focusedKey?: DirectoryTreeProps['focusedKey'];
  defaultFocusedKey?: DirectoryTreeProps['defaultFocusedKey'];
  onFocusedKeyChange?: DirectoryTreeProps['onFocusedKeyChange'];
  selectDirectory?: DirectoryTreeProps['selectDirectory'];
}

// antd 的组件类型带着它自己解析到的 React。这里收成当前文件的 ReactNode，避免两份 @types/react 对不上。
const AntdConfigProvider = ConfigProvider as unknown as (props: {
  children?: ReactNode;
  direction?: 'ltr' | 'rtl';
  theme: ThemeConfig;
}) => ReactElement;

const AntdTreeView = AntTree as unknown as (
  props: YakitTreeProps & { ref?: unknown },
) => ReactElement;

const asNode = (value: unknown): ReactNode => value as unknown as ReactNode;

const renderTitle = (
  node: TreeDataNode,
  titleName: string,
  titleRender?: YakitTreeProps['titleRender'],
): ReactNode => {
  if (titleRender) return asNode(titleRender(node));
  const record = node as unknown as Record<string, unknown>;
  const named = record[titleName];
  const value = named !== undefined ? named : node.title;
  if (typeof value === 'function') {
    return asNode((value as (data: TreeDataNode) => ReactNode)(node));
  }
  return asNode(value);
};

const TreeView = forwardRef<TreeRef, TreeViewProps>(
  (
    {
      variant = 'default',
      className,
      editingKey,
      editingValue,
      editingSelection,
      onEditSubmit,
      suffix,
      focusedKey,
      defaultFocusedKey,
      onFocusedKeyChange,
      selectDirectory = false,
      showLine,
      showIcon,
      blockNode,
      switcherIcon,
      icon,
      itemHeight,
      expandedKeys,
      defaultExpandedKeys,
      defaultExpandAll,
      defaultExpandParent,
      expandAction,
      selectedKeys,
      defaultSelectedKeys,
      multiple,
      checkable,
      checkStrictly,
      checkedKeys,
      defaultCheckedKeys,
      onExpand,
      onSelect,
      onCheck,
      titleRender,
      loadData,
      treeData,
      fieldNames,
      height,
      draggable,
      disabled: disabledProp,
      ...rest
    },
    ref,
  ) => {
    const config = useYakitConfig();
    const disabled = disabledProp ?? config.componentDisabled;
    const innerRef = useRef<{ scrollTo?: (scroll: TreeScrollTarget) => void }>(null);
    const keyName = fieldNames?.key ?? 'key';
    const childrenName = fieldNames?.children ?? 'children';
    const titleName = fieldNames?.title ?? 'title';
    const fileTree = variant === 'file';
    const folders = useMemo(() => {
      const next = new Set<Key>();
      collectFolders(treeData, keyName, childrenName, next, !!loadData);
      return next;
    }, [childrenName, keyName, loadData, treeData]);
    const { expanded, setInnerExpanded } = useInnerExpanded(
      fileTree,
      treeData,
      keyName,
      childrenName,
      expandedKeys,
      defaultExpandedKeys,
      defaultExpandAll,
      defaultExpandParent,
    );
    const { activeFocused, bumpFocused } = useFileTreeFocus(
      focusedKey,
      defaultFocusedKey,
      onFocusedKeyChange,
    );
    const { fileSelected, selectFile } = useFileTreeSelection({
      active: fileTree,
      selectedKeys,
      defaultSelectedKeys,
      multiple,
      selectDirectory,
      folders,
      treeData,
      keyName,
      childrenName,
      expandedKeys: expanded,
      onSelect,
      bumpFocused,
      activeFocused,
    });

    useImperativeHandle(
      ref,
      () => ({
        scrollTo: (scroll) => {
          innerRef.current?.scrollTo?.(scroll);
        },
      }),
      [],
    );

    const expandedKeySet = useMemo(() => new Set(expanded ?? []), [expanded]);
    const fileExpandAction = expandAction ?? 'click';
    const passedExpandedKeys = fileTree ? expanded : expandedKeys;
    const passedSelectedKeys = fileTree ? fileSelected : selectedKeys;
    const resolvedShowLine = resolveTreeShowLine(variant, showLine, !!disabled);
    const lineVisible = !!resolvedShowLine;
    const theme = useMemo(
      () => createTreeTheme(variant, lineVisible, config.token.YakitTree),
      [config.token.YakitTree, lineVisible, variant],
    );
    // 用解析后的值：showLeafIcon 可能从布尔 true 换成图标函数。
    const leafIconEnabled = isLeafIconEnabled(fileTree ? false : resolvedShowLine);
    const mergedItemHeight = itemHeight ?? (fileTree ? 22 : variant === 'website' ? 24 : undefined);

    return (
      <div
        data-theme={config.mode}
        dir={config.direction}
        className={classNames(
          'yakit-tree',
          `yakit-tree-${variant}`,
          fileTree && selectDirectory ? 'yakit-tree-file-select-directory' : null,
          leafIconEnabled ? 'yakit-tree-show-leaf-icon' : null,
          className,
        )}
      >
        <AntdConfigProvider direction={config.direction} theme={theme}>
          <AntdTreeView
            {...rest}
            ref={innerRef as never}
            draggable={draggable}
            blockNode={blockNode ?? variant !== 'default'}
            checkable={checkable}
            checkStrictly={checkStrictly}
            defaultExpandAll={defaultExpandAll}
            defaultExpandParent={defaultExpandParent}
            defaultExpandedKeys={defaultExpandedKeys}
            defaultSelectedKeys={defaultSelectedKeys}
            defaultCheckedKeys={defaultCheckedKeys}
            expandAction={fileTree ? fileExpandAction : expandAction}
            multiple={multiple}
            {...(passedExpandedKeys !== undefined ? { expandedKeys: passedExpandedKeys } : {})}
            {...(passedSelectedKeys !== undefined ? { selectedKeys: passedSelectedKeys } : {})}
            {...(checkedKeys !== undefined ? { checkedKeys } : {})}
            fieldNames={fieldNames}
            height={height}
            loadData={loadData}
            icon={
              icon ??
              // 只有网站树注入文件夹/文件图标。默认树对齐 antd，不自动塞图标；
              // 打开 showIcon 时由调用方传树级 icon 或节点 icon。
              (variant === 'website' ? renderWebsiteIcon(!!disabled) : undefined)
            }
            itemHeight={mergedItemHeight}
            // 文件树的图标由 FileTreeNode 画；antd 的 showIcon 再画一次会叠两层。
            showIcon={fileTree ? false : (showIcon ?? variant === 'website')}
            disabled={disabled}
            showLine={resolvedShowLine}
            switcherIcon={
              switcherIcon ??
              ((node: SwitcherNode) => renderSwitcherIcon(variant, node, !!disabled))
            }
            titleRender={
              fileTree
                ? (node: TreeDataNode) => (
                    <FileTreeNode
                      editing={editingKey !== undefined && node.key === editingKey}
                      editingSelection={editingSelection}
                      editingValue={editingValue}
                      expanded={expandedKeySet.has(node.key)}
                      focused={hasFocusedKey(activeFocused) && node.key === activeFocused}
                      node={
                        folders.has(node.key) && node.isLeaf !== false
                          ? { ...node, isLeaf: false }
                          : node
                      }
                      showIcon={showIcon !== false}
                      icon={showIcon !== false ? (icon as FileTreeNodeProps['icon']) : undefined}
                      suffix={suffix?.(node)}
                      title={renderTitle(node, titleName, titleRender)}
                      onEditSubmit={(value) => onEditSubmit?.(value, node.key)}
                    />
                  )
                : titleRender
            }
            treeData={treeData}
            onExpand={(keys, info) => {
              if (fileTree) {
                setInnerExpanded(keys);
                bumpFocused(info.node.key);
              }
              onExpand?.(keys, info);
            }}
            onCheck={onCheck}
            onSelect={fileTree ? selectFile : onSelect}
          />
        </AntdConfigProvider>
      </div>
    );
  },
);

export const DefaultTree = forwardRef<TreeRef, YakitTreeProps>((props, ref) => (
  <TreeView ref={ref} {...props} variant="default" />
));
DefaultTree.displayName = 'Tree';

export const WebsiteTree = forwardRef<TreeRef, WebsiteTreeProps>((props, ref) => (
  <TreeView ref={ref} {...props} variant="website" />
));
WebsiteTree.displayName = 'WebsiteTree';

export const DirectoryTree = forwardRef<TreeRef, DirectoryTreeProps>((props, ref) => (
  <TreeView ref={ref} {...props} variant="file" />
));
DirectoryTree.displayName = 'DirectoryTree';
