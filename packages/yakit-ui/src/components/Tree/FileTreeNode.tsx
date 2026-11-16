import {
  DocumentOutlined,
  FolderOpenOutlined,
  FolderOutlined,
} from '@yakit-libs/yakit-ui-icons/outline';
import type { TreeDataNode } from 'antd';
import classNames from 'classnames';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import Input, { type InputRef } from '../Input';

import { customNodeIcon } from './nodeIcon';
import type { TreeEditingSelection } from './type';

export interface FileTreeNodeProps {
  node: TreeDataNode;
  expanded: boolean;
  editing: boolean;
  /** 焦点描边；可与 antd selected 同时存在且不必相同。 */
  focused?: boolean;
  editingValue?: string;
  editingSelection?: TreeEditingSelection;
  title: ReactNode;
  suffix?: ReactNode;
  /** false 隐藏行内文件/文件夹图标。不传仍显示。 */
  showIcon?: boolean;
  /** 树级 icon。showIcon 为 true 时，节点没设 icon 就用它。 */
  icon?: ReactNode | ((node: TreeDataNode & { expanded: boolean }) => ReactNode);
  onEditSubmit?: (value: string) => void;
}

const nodeIcon = (
  node: TreeDataNode,
  expanded: boolean,
  treeIcon?: FileTreeNodeProps['icon'],
): ReactNode => {
  const props = { ...node, expanded };
  const custom = customNodeIcon(node, expanded);
  if (custom) return custom.value;
  if (typeof treeIcon === 'function') return treeIcon(props);
  if (treeIcon) return treeIcon;
  const isLeaf = node.isLeaf ?? !node.children?.length;
  if (isLeaf) return <DocumentOutlined size={16} color="currentColor" />;
  return expanded ? (
    <FolderOpenOutlined size={16} color="currentColor" />
  ) : (
    <FolderOutlined size={16} color="currentColor" />
  );
};

export const FileTreeNode = ({
  node,
  expanded,
  editing,
  focused = false,
  editingValue = '',
  editingSelection,
  title,
  suffix,
  showIcon = true,
  icon,
  onEditSubmit,
}: FileTreeNodeProps) => {
  const [draft, setDraft] = useState(editingValue);
  const [draftSource, setDraftSource] = useState({
    editing,
    editingValue,
    key: node.key,
  });
  const submitted = useRef(false);
  const inputRef = useRef<InputRef>(null);

  if (
    draftSource.editing !== editing ||
    draftSource.editingValue !== editingValue ||
    draftSource.key !== node.key
  ) {
    setDraftSource({ editing, editingValue, key: node.key });
    setDraft(editingValue);
  }

  const submit = (value: string) => {
    if (submitted.current) return;
    submitted.current = true;
    onEditSubmit?.(value);
  };

  const selectEditingText = (input: HTMLInputElement) => {
    const length = input.value.length;
    if (!editingSelection || editingSelection.end < 0) {
      input.select();
      return;
    }
    const start = Math.min(Math.max(editingSelection.start, 0), length);
    const end = Math.min(Math.max(editingSelection.end, start), length);
    input.setSelectionRange(start, end);
  };

  const selectionStart = editingSelection?.start;
  const selectionEnd = editingSelection?.end;

  useLayoutEffect(() => {
    submitted.current = false;
  }, [editing, editingValue, node.key]);

  useLayoutEffect(() => {
    if (!editing) return;
    const input = inputRef.current?.input;
    if (!input) return;
    selectEditingText(input);
  }, [editing, editingValue, node.key, selectionStart, selectionEnd]);

  return (
    <div
      className={classNames('yakit-tree-file-row', {
        'yakit-tree-file-editing': editing,
        'yakit-tree-file-focused': focused && !editing,
      })}
    >
      <span className="yakit-tree-file-cluster">
        <span className="yakit-tree-file-main">
          {showIcon ? (
            <span className="yakit-tree-file-icon">{nodeIcon(node, expanded, icon)}</span>
          ) : null}
          {editing ? (
            <Input
              ref={inputRef}
              autoFocus
              className="yakit-tree-file-input"
              size="small"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onFocus={(event) => {
                event.stopPropagation();
                submitted.current = false;
                selectEditingText(event.currentTarget);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                submit(draft);
              }}
              onBlur={() => submit(draft)}
            />
          ) : (
            <span className="yakit-tree-file-title">{title}</span>
          )}
        </span>
      </span>
      {suffix ? <span className="yakit-tree-file-suffix">{suffix}</span> : null}
    </div>
  );
};
