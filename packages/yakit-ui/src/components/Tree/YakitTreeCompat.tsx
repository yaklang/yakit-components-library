import type { FC } from 'react';

import { Tree } from './Tree';
import type { YakitTreeCompatProps } from './type';

/**
 * 对齐主项目 `YakitTree` 的默认行为：
 * - showIcon 默认 true
 * - showLine 默认 true
 * - classNameWrapper 透传
 */
export const YakitTreeCompat: FC<YakitTreeCompatProps> = (props) => {
  const { showLine = true, showIcon = true, ...rest } = props;
  return <Tree {...rest} showIcon={showIcon} showLine={showLine} />;
};

(YakitTreeCompat as { displayName?: string }).displayName = 'YakitTreeCompat';

export default YakitTreeCompat;
