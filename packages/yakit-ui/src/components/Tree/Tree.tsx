import classNames from 'classnames';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type FC,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type UIEvent,
} from 'react';

import useYakitConfig from '../../hooks/useYakitConfig';
import { ChevronDownOutlined, ChevronRightOutlined, DocumentOutlined } from '../../icons/outline';
import { FolderOpenSolid, FolderSolid } from '../../icons/solid';
import { getYakitTokenVariables, type YakitCSSProperties } from '../../styles/tokenVariables';

import './style/index.css';

import type {
  TreeCheckInfo,
  TreeDataNode,
  TreeExpandInfo,
  TreeIcon,
  TreeKey,
  TreeNodeIconProps,
  TreeNodeSwitcherProps,
  TreeProps,
  TreeRef,
  TreeSelectInfo,
  TreeSwitcherIcon,
} from './type';
import {
  collectDescendantKeys,
  collectParentKeys,
  conductCheck,
  findNode,
  flattenVisible,
  mapTreeDataByFieldNames,
  withAutoExpandParents,
} from './utils';

const prefix = 'yakit-tree';

const toKeySet = (keys: TreeKey[] | undefined) => new Set((keys ?? []).map(String));

const getCheckedArrays = (
  value: TreeProps['checkedKeys'],
): { checked: TreeKey[]; halfChecked: TreeKey[] } => {
  if (Array.isArray(value)) return { checked: value, halfChecked: [] };
  return {
    checked: value?.checked ?? [],
    halfChecked: value?.halfChecked ?? [],
  };
};

const DefaultSwitcherIcon = ({ expanded, isLeaf }: TreeNodeSwitcherProps) => {
  if (isLeaf) return null;
  const Icon = expanded ? ChevronDownOutlined : ChevronRightOutlined;
  return <Icon className={`${prefix}-switcher-icon`} color="currentColor" size={12} />;
};

const DefaultTreeIcon = ({ isLeaf, expanded }: TreeNodeIconProps) => {
  if (isLeaf) {
    return (
      <DocumentOutlined
        className={`${prefix}-node-icon ${prefix}-icon-leaf`}
        color="currentColor"
        size={16}
      />
    );
  }
  const FolderIcon = expanded ? FolderOpenSolid : FolderSolid;
  return (
    <FolderIcon
      className={`${prefix}-node-icon ${prefix}-icon-folder`}
      color="currentColor"
      size={16}
    />
  );
};

const renderMaybeFn = <T,>(value: ReactNode | ((props: T) => ReactNode) | undefined, props: T) => {
  if (typeof value === 'function') return (value as (props: T) => ReactNode)(props);
  return value;
};

type TreeNodeRowProps = {
  node: TreeDataNode;
  level: number;
  indent: number;
  expanded: boolean;
  selected: boolean;
  checked: boolean;
  halfChecked: boolean;
  showIcon: boolean;
  checkable?: boolean;
  selectable: boolean;
  disabledTree?: boolean;
  switcherIcon?: TreeSwitcherIcon;
  icon?: TreeIcon;
  titleRender?: (node: TreeDataNode) => ReactNode;
  onToggleExpand: (node: TreeDataNode, event: ReactMouseEvent) => void;
  onSelectNode: (node: TreeDataNode, event: ReactMouseEvent) => void;
  onCheckNode: (node: TreeDataNode, event: ReactMouseEvent) => void;
  onRightClick?: TreeProps['onRightClick'];
  loading?: boolean;
  expandAction?: TreeProps['expandAction'];
  draggable?: boolean;
  dragging?: boolean;
  dragOver?: boolean;
  onDragStart?: (node: TreeDataNode, event: ReactDragEvent) => void;
  onDragEnter?: (node: TreeDataNode, event: ReactDragEvent) => void;
  onDragOver?: (node: TreeDataNode, event: ReactDragEvent) => void;
  onDragLeave?: (node: TreeDataNode, event: ReactDragEvent) => void;
  onDragEnd?: (node: TreeDataNode, event: ReactDragEvent) => void;
  onDrop?: (node: TreeDataNode, event: ReactDragEvent) => void;
};

const TreeNodeRow: FC<TreeNodeRowProps> = ({
  node,
  level,
  indent,
  expanded,
  selected,
  checked,
  halfChecked,
  showIcon,
  checkable,
  selectable,
  disabledTree,
  switcherIcon,
  icon,
  titleRender,
  onToggleExpand,
  onSelectNode,
  onCheckNode,
  onRightClick,
  loading = false,
  expandAction = false,
  draggable = false,
  dragging = false,
  dragOver = false,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
}) => {
  const hasChildren = Boolean(node.children?.length);
  const isLeaf = node.isLeaf ?? !hasChildren;
  const disabled = Boolean(disabledTree || node.disabled);
  const nodeSelectable = selectable && node.selectable !== false && !disabled;
  const nodeCheckable = Boolean(checkable && node.checkable !== false && !node.disableCheckbox);

  const switcherProps: TreeNodeSwitcherProps = {
    eventKey: node.key,
    expanded,
    selected,
    isLeaf,
    loading,
  };
  const iconProps: TreeNodeIconProps = {
    eventKey: node.key,
    expanded,
    selected,
    isLeaf,
    title: node.title,
  };

  // switcherIcon={null} 表示不展示角标（对齐 antd），不能用 ?? 回退
  const resolvedSwitcher =
    switcherIcon !== undefined ? (
      renderMaybeFn(switcherIcon, switcherProps)
    ) : (
      <DefaultSwitcherIcon {...switcherProps} />
    );
  const nodeIcon = node.icon !== undefined ? node.icon : icon;
  const resolvedIcon = showIcon
    ? (renderMaybeFn(nodeIcon, iconProps) ?? <DefaultTreeIcon {...iconProps} />)
    : null;
  const title = titleRender ? titleRender(node) : node.title;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (nodeSelectable) onSelectNode(node, event as unknown as ReactMouseEvent);
    }
    if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && !isLeaf) {
      event.preventDefault();
      if ((event.key === 'ArrowRight' && !expanded) || (event.key === 'ArrowLeft' && expanded)) {
        onToggleExpand(node, event as unknown as ReactMouseEvent);
      }
    }
  };

  const handleContentActivate = (event: ReactMouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, button, a, .yakit-tree-edit-input')) {
      event.stopPropagation();
      return;
    }
    if (!isLeaf && expandAction === 'click') {
      onToggleExpand(node, event);
    }
    if (!nodeSelectable) return;
    onSelectNode(node, event);
  };

  const handleContentDoubleClick = (event: ReactMouseEvent) => {
    if (!isLeaf && expandAction === 'doubleClick') {
      onToggleExpand(node, event);
    }
  };

  return (
    <div
      aria-disabled={disabled || undefined}
      aria-expanded={isLeaf ? undefined : expanded}
      aria-selected={selected}
      className={classNames(`${prefix}-treenode`, node.className, {
        [`${prefix}-treenode-selected`]: selected,
        [`${prefix}-treenode-disabled`]: disabled,
        [`${prefix}-treenode-leaf`]: isLeaf,
        [`${prefix}-treenode-loading`]: loading,
        [`${prefix}-treenode-dragging`]: dragging,
        [`${prefix}-treenode-drag-over`]: dragOver,
      })}
      data-tree-key={String(node.key)}
      data-tree-level={level}
      draggable={draggable && !disabled}
      onDragEnd={
        draggable
          ? (event) => {
              event.stopPropagation();
              onDragEnd?.(node, event);
            }
          : undefined
      }
      onDragEnter={
        draggable
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              onDragEnter?.(node, event);
            }
          : undefined
      }
      onDragLeave={
        draggable
          ? (event) => {
              event.stopPropagation();
              onDragLeave?.(node, event);
            }
          : undefined
      }
      onDragOver={
        draggable
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              onDragOver?.(node, event);
            }
          : undefined
      }
      onDragStart={
        draggable
          ? (event) => {
              event.stopPropagation();
              try {
                event.dataTransfer.setData('text/plain', String(node.key));
                event.dataTransfer.effectAllowed = 'move';
              } catch {
                /* ignore */
              }
              onDragStart?.(node, event);
            }
          : undefined
      }
      onDrop={
        draggable
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              onDrop?.(node, event);
            }
          : undefined
      }
      role="treeitem"
      style={
        {
          ...node.style,
          '--yakit-tree-level-indent': `${level * indent}px`,
          paddingLeft: `${level * indent}px`,
        } as YakitCSSProperties
      }
    >
      <span
        aria-hidden={isLeaf || undefined}
        className={classNames(`${prefix}-switcher`, {
          [`${prefix}-switcher-noop`]: isLeaf,
          [`${prefix}-switcher-open`]: !isLeaf && expanded,
          [`${prefix}-switcher-close`]: !isLeaf && !expanded,
        })}
        onClick={(event) => {
          if (isLeaf || disabled) return;
          event.stopPropagation();
          onToggleExpand(node, event);
        }}
      >
        {resolvedSwitcher}
      </span>

      {nodeCheckable ? (
        <label className={`${prefix}-checkbox`} onClick={(event) => event.stopPropagation()}>
          <input
            checked={checked}
            disabled={disabled}
            onChange={(event) => onCheckNode(node, event.nativeEvent as unknown as ReactMouseEvent)}
            ref={(input) => {
              if (input) input.indeterminate = halfChecked && !checked;
            }}
            type="checkbox"
          />
        </label>
      ) : null}

      <div
        className={classNames(`${prefix}-node-content-wrapper`, {
          [`${prefix}-node-selected`]: selected,
        })}
        onClick={handleContentActivate}
        onContextMenu={(event) => onRightClick?.({ event, node })}
        onDoubleClick={handleContentDoubleClick}
        onKeyDown={onKeyDown}
        role={nodeSelectable ? 'button' : undefined}
        tabIndex={nodeSelectable ? 0 : -1}
      >
        {resolvedIcon ? <span className={`${prefix}-iconEle`}>{resolvedIcon}</span> : null}
        <span className={`${prefix}-title`}>{title}</span>
      </div>
    </div>
  );
};

export const Tree = forwardRef<TreeRef, TreeProps>((props, ref) => {
  const {
    className,
    rootClassName,
    classNameWrapper,
    style,
    treeData = [],
    showIcon = true,
    showLine = false,
    indent = 10,
    emptyText = '暂无数据',
    defaultExpandAll = false,
    defaultExpandedKeys,
    expandedKeys,
    onExpand,
    autoExpandParent = false,
    defaultSelectedKeys,
    selectedKeys,
    selectable = true,
    multiple = false,
    onSelect,
    checkable,
    checkStrictly = false,
    defaultCheckedKeys,
    checkedKeys,
    onCheck,
    switcherIcon,
    icon,
    titleRender,
    disabled,
    height,
    itemHeight,
    onRightClick,
    loadData,
    loadedKeys,
    onScroll,
    blockNode,
    fieldNames,
    expandAction = false,
    draggable,
    onDragStart,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDragEnd,
    onDrop,
  } = props;

  const config = useYakitConfig();
  const treeToken = config.token.YakitTree;
  const showLineEnabled = typeof showLine === 'object' ? true : Boolean(showLine);
  const showLineLeafIcon = typeof showLine === 'object' ? showLine.showLeafIcon !== false : true;
  const effectiveIndent = treeToken?.indent
    ? Number.parseInt(String(treeToken.indent), 10) || indent
    : indent;

  const normalizedData = useMemo(
    () => mapTreeDataByFieldNames(treeData, fieldNames),
    [treeData, fieldNames],
  );

  const [innerExpanded, setInnerExpanded] = useState<TreeKey[]>(() => {
    if (defaultExpandAll) return collectParentKeys(normalizedData);
    return defaultExpandedKeys ?? [];
  });
  const [innerSelected, setInnerSelected] = useState<TreeKey[]>(defaultSelectedKeys ?? []);
  const [innerChecked, setInnerChecked] = useState<TreeKey[]>(() => {
    if (!Array.isArray(defaultCheckedKeys)) return [];
    if (checkStrictly) return defaultCheckedKeys;
    return conductCheck(normalizedData, defaultCheckedKeys).checked;
  });
  const [innerHalfChecked, setInnerHalfChecked] = useState<TreeKey[]>(() => {
    if (!Array.isArray(defaultCheckedKeys) || checkStrictly) return [];
    return conductCheck(normalizedData, defaultCheckedKeys).halfChecked;
  });
  const [innerLoadedKeys, setInnerLoadedKeys] = useState<TreeKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState<TreeKey[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const dragNodeRef = useRef<TreeDataNode | null>(null);

  useEffect(() => {
    if (expandedKeys !== undefined || !defaultExpandAll) return;
    setInnerExpanded(collectParentKeys(normalizedData));
  }, [defaultExpandAll, expandedKeys, normalizedData]);

  const expandedListRaw = expandedKeys ?? innerExpanded;
  const expandedList = useMemo(
    () =>
      autoExpandParent ? withAutoExpandParents(normalizedData, expandedListRaw) : expandedListRaw,
    [autoExpandParent, expandedListRaw, normalizedData],
  );
  const selectedList = selectedKeys ?? innerSelected;
  const checkedState =
    checkedKeys !== undefined
      ? getCheckedArrays(checkedKeys)
      : { checked: innerChecked, halfChecked: innerHalfChecked };

  const expandedSet = useMemo(() => toKeySet(expandedList), [expandedList]);
  const selectedSet = useMemo(() => toKeySet(selectedList), [selectedList]);
  const checkedSet = useMemo(() => toKeySet(checkedState.checked), [checkedState.checked]);
  const halfCheckedSet = useMemo(
    () => toKeySet(checkedState.halfChecked),
    [checkedState.halfChecked],
  );
  const loadedList = loadedKeys ?? innerLoadedKeys;
  const loadedSet = useMemo(() => toKeySet(loadedList), [loadedList]);
  const loadingSet = useMemo(() => toKeySet(loadingKeys), [loadingKeys]);

  const visibleNodes = useMemo(
    () => flattenVisible(normalizedData, expandedSet),
    [normalizedData, expandedSet],
  );

  const rowHeight = itemHeight ?? 24;
  const virtualEnabled = height != null && itemHeight != null && itemHeight > 0;
  const virtualSlice = useMemo(() => {
    if (!virtualEnabled || height == null) {
      return {
        start: 0,
        nodes: visibleNodes,
        offsetY: 0,
        totalHeight: undefined as number | undefined,
      };
    }
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
    const visibleCount = Math.ceil(height / rowHeight) + 4;
    const end = Math.min(visibleNodes.length, start + visibleCount);
    return {
      start,
      nodes: visibleNodes.slice(start, end),
      offsetY: start * rowHeight,
      totalHeight: visibleNodes.length * rowHeight,
    };
  }, [height, rowHeight, scrollTop, virtualEnabled, visibleNodes]);

  const setExpanded = useCallback(
    (next: TreeKey[], info: TreeExpandInfo) => {
      if (expandedKeys === undefined) setInnerExpanded(next);
      onExpand?.(next, info);
    },
    [expandedKeys, onExpand],
  );

  const onToggleExpand = useCallback(
    (node: TreeDataNode, event: ReactMouseEvent) => {
      const key = node.key;
      const open = expandedSet.has(String(key));
      const next = open
        ? expandedListRaw.filter((item) => String(item) !== String(key))
        : [...expandedListRaw, key];
      setExpanded(next, { node, expanded: !open, nativeEvent: event.nativeEvent });

      if (!open && loadData && !loadedSet.has(String(key)) && !loadingSet.has(String(key))) {
        const hasChildren = Boolean(node.children?.length);
        const isLeaf = node.isLeaf ?? !hasChildren;
        if (!isLeaf && !hasChildren) {
          setLoadingKeys((prev) => [...prev, key]);
          Promise.resolve(loadData(node))
            .catch(() => undefined)
            .finally(() => {
              setLoadingKeys((prev) => prev.filter((item) => String(item) !== String(key)));
              if (loadedKeys === undefined) {
                setInnerLoadedKeys((prev) =>
                  prev.some((item) => String(item) === String(key)) ? prev : [...prev, key],
                );
              }
            });
        }
      }
    },
    [expandedListRaw, expandedSet, loadData, loadedKeys, loadedSet, loadingSet, setExpanded],
  );

  const onSelectNode = useCallback(
    (node: TreeDataNode, event: ReactMouseEvent) => {
      const key = node.key;
      const already = selectedSet.has(String(key));
      let next: TreeKey[];
      if (multiple) {
        next = already
          ? selectedList.filter((item) => String(item) !== String(key))
          : [...selectedList, key];
      } else {
        next = already ? [] : [key];
      }
      if (selectedKeys === undefined) setInnerSelected(next);
      const selectedNodes = next
        .map((item) => findNode(normalizedData, item))
        .filter(Boolean) as TreeDataNode[];
      const info: TreeSelectInfo = {
        event: 'select',
        selected: !already,
        node,
        selectedNodes,
        nativeEvent: event.nativeEvent,
      };
      onSelect?.(next, info);
    },
    [multiple, normalizedData, onSelect, selectedKeys, selectedList, selectedSet],
  );

  const onCheckNode = useCallback(
    (node: TreeDataNode, event: ReactMouseEvent) => {
      const key = node.key;
      const currentlyChecked = checkedSet.has(String(key));
      let nextChecked = new Set(checkedSet);
      let nextHalf = new Set(halfCheckedSet);

      if (checkStrictly) {
        if (currentlyChecked) nextChecked.delete(String(key));
        else nextChecked.add(String(key));
        nextHalf.clear();
      } else {
        const keys = collectDescendantKeys(node).map(String);
        if (currentlyChecked) keys.forEach((item) => nextChecked.delete(item));
        else keys.forEach((item) => nextChecked.add(item));
        const conducted = conductCheck(normalizedData, nextChecked);
        nextChecked = new Set(conducted.checked.map(String));
        nextHalf = new Set(conducted.halfChecked.map(String));
      }

      const checkedKeysNext = [...nextChecked] as TreeKey[];
      const halfCheckedKeysNext = [...nextHalf] as TreeKey[];
      if (checkedKeys === undefined) {
        setInnerChecked(checkedKeysNext);
        setInnerHalfChecked(halfCheckedKeysNext);
      }

      const checkedNodes = checkedKeysNext
        .map((item) => findNode(normalizedData, item))
        .filter(Boolean) as TreeDataNode[];
      const info: TreeCheckInfo = {
        event: 'check',
        checked: !currentlyChecked,
        node,
        checkedNodes,
        halfCheckedKeys: halfCheckedKeysNext,
        nativeEvent: event.nativeEvent,
      };
      if (checkStrictly) {
        onCheck?.({ checked: checkedKeysNext, halfChecked: halfCheckedKeysNext }, info);
      } else {
        onCheck?.(checkedKeysNext, info);
      }
    },
    [checkStrictly, checkedKeys, checkedSet, halfCheckedSet, normalizedData, onCheck],
  );

  const isNodeDraggable = useCallback(
    (node: TreeDataNode) => {
      if (typeof draggable === 'function') return draggable(node);
      return Boolean(draggable);
    },
    [draggable],
  );

  const handleDragStart = useCallback(
    (node: TreeDataNode, event: ReactDragEvent) => {
      dragNodeRef.current = node;
      setDraggingKey(String(node.key));
      onDragStart?.({ event, node });
    },
    [onDragStart],
  );

  const handleDragEnter = useCallback(
    (node: TreeDataNode, event: ReactDragEvent) => {
      setDragOverKey(String(node.key));
      onDragEnter?.({ event, node });
    },
    [onDragEnter],
  );

  const handleDragOver = useCallback(
    (node: TreeDataNode, event: ReactDragEvent) => {
      setDragOverKey(String(node.key));
      onDragOver?.({ event, node });
    },
    [onDragOver],
  );

  const handleDragLeave = useCallback(
    (node: TreeDataNode, event: ReactDragEvent) => {
      setDragOverKey((prev) => (prev === String(node.key) ? null : prev));
      onDragLeave?.({ event, node });
    },
    [onDragLeave],
  );

  const handleDragEnd = useCallback(
    (node: TreeDataNode, event: ReactDragEvent) => {
      setDraggingKey(null);
      setDragOverKey(null);
      onDragEnd?.({ event, node });
      dragNodeRef.current = null;
    },
    [onDragEnd],
  );

  const handleDrop = useCallback(
    (node: TreeDataNode, event: ReactDragEvent) => {
      const dragNode = dragNodeRef.current;
      setDraggingKey(null);
      setDragOverKey(null);
      if (!dragNode || String(dragNode.key) === String(node.key)) return;

      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const offsetY = event.clientY - rect.top;
      let dropPosition: -1 | 0 | 1 = 0;
      let dropToGap = false;
      if (offsetY < rect.height * 0.25) {
        dropPosition = -1;
        dropToGap = true;
      } else if (offsetY > rect.height * 0.75) {
        dropPosition = 1;
        dropToGap = true;
      }

      onDrop?.({
        event,
        node,
        dragNode,
        dragNodesKeys: [dragNode.key],
        dropPosition,
        dropToGap,
      });
      dragNodeRef.current = null;
    },
    [onDrop],
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      scrollTo: ({ key, align = 'auto', offset = 0 }) => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const index = visibleNodes.findIndex((item) => String(item.node.key) === String(key));
        if (index < 0) return;
        const targetTop = index * rowHeight;
        const viewHeight = el.clientHeight || height || 0;
        let nextTop = targetTop;
        if (align === 'middle') {
          nextTop = Math.max(0, targetTop - Math.max(0, (viewHeight - rowHeight) / 2));
        } else if (align === 'bottom') {
          nextTop = Math.max(0, targetTop - Math.max(0, viewHeight - rowHeight));
        } else if (align === 'auto') {
          const current = el.scrollTop;
          if (targetTop < current) nextTop = targetTop;
          else if (targetTop + rowHeight > current + viewHeight) {
            nextTop = targetTop - Math.max(0, viewHeight - rowHeight);
          } else {
            nextTop = current;
          }
        }
        nextTop = Math.max(0, nextTop + offset);
        el.scrollTop = nextTop;
        if (virtualEnabled) setScrollTop(nextTop);
      },
    }),
    [height, rowHeight, virtualEnabled, visibleNodes],
  );

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (virtualEnabled) setScrollTop(event.currentTarget.scrollTop);
      onScroll?.(event);
    },
    [onScroll, virtualEnabled],
  );

  const wrapperClassName = classNames(prefix, classNameWrapper, rootClassName, className, {
    [`${prefix}-show-line`]: showLineEnabled,
    [`${prefix}-show-line-hide-leaf-icon`]: showLineEnabled && !showLineLeafIcon,
    [`${prefix}-block-node`]: Boolean(blockNode),
  });

  const tokenStyle = {
    ...getYakitTokenVariables(config.token),
    ...(treeToken?.itemHeight ? { '--yakit-tree-item-height': treeToken.itemHeight } : null),
    ...(itemHeight ? { '--yakit-tree-item-height': `${itemHeight}px` } : null),
    ...(treeToken?.switcherWidth
      ? { '--yakit-tree-switcher-width': treeToken.switcherWidth }
      : null),
    ...(treeToken?.fontSize ? { '--yakit-tree-font-size': treeToken.fontSize } : null),
    ...(treeToken?.borderRadius ? { '--yakit-tree-radius': treeToken.borderRadius } : null),
    ...(height ? { maxHeight: height, overflow: 'auto' } : null),
    ...style,
  } as YakitCSSProperties;

  if (!normalizedData.length) {
    return (
      <div
        className={wrapperClassName}
        data-theme={config.mode}
        dir={config.direction}
        style={tokenStyle}
      >
        <div className={`${prefix}-empty`}>{emptyText}</div>
      </div>
    );
  }

  const renderRows = virtualEnabled ? virtualSlice.nodes : visibleNodes;

  return (
    <div
      className={wrapperClassName}
      data-theme={config.mode}
      dir={config.direction}
      onScroll={handleScroll}
      ref={scrollContainerRef}
      role="tree"
      style={tokenStyle}
    >
      <div
        className={`${prefix}-list`}
        style={
          virtualEnabled && virtualSlice.totalHeight != null
            ? { height: virtualSlice.totalHeight, position: 'relative' }
            : undefined
        }
      >
        <div
          className={`${prefix}-list-holder-inner`}
          style={
            virtualEnabled
              ? {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: virtualSlice.offsetY,
                  width: '100%',
                }
              : undefined
          }
        >
          {renderRows.map(({ node, level }) => (
            <TreeNodeRow
              checkable={checkable}
              checked={checkedSet.has(String(node.key))}
              disabledTree={disabled}
              dragOver={dragOverKey === String(node.key)}
              draggable={isNodeDraggable(node)}
              dragging={draggingKey === String(node.key)}
              expandAction={expandAction}
              expanded={expandedSet.has(String(node.key))}
              halfChecked={halfCheckedSet.has(String(node.key))}
              icon={icon}
              indent={effectiveIndent}
              key={String(node.key)}
              level={level}
              loading={loadingSet.has(String(node.key))}
              node={node}
              onCheckNode={onCheckNode}
              onDragEnd={handleDragEnd}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onRightClick={onRightClick}
              onSelectNode={onSelectNode}
              onToggleExpand={onToggleExpand}
              selectable={selectable}
              selected={selectedSet.has(String(node.key))}
              showIcon={showIcon}
              switcherIcon={switcherIcon}
              titleRender={titleRender}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

(Tree as { displayName?: string }).displayName = 'Tree';

export default Tree;
