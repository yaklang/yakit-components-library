import classNames from 'classnames';
import type { FC } from 'react';

import { Tree } from './Tree';
import type { DirectoryTreeProps } from './type';

/**
 * 对齐 antd Tree.DirectoryTree：
 * - showIcon 默认 true
 * - expandAction 默认 'click'（点标题也可展开）
 * - 附加 directory class，便于样式区分
 */
export const DirectoryTree: FC<DirectoryTreeProps> = (props) => {
  const { showIcon = true, expandAction = 'click', className, rootClassName, ...rest } = props;
  return (
    <Tree
      {...rest}
      className={classNames('yakit-tree-directory', className)}
      expandAction={expandAction}
      rootClassName={rootClassName}
      showIcon={showIcon}
    />
  );
};

(DirectoryTree as { displayName?: string }).displayName = 'DirectoryTree';

export default DirectoryTree;
