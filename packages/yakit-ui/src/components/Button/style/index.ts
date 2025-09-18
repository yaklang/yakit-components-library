import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../types/common';

const buttonStyle = (prefixCls: string, token: GlobalToken): CSSInterpolation => {
  console.log('token:', token);
  return {
    [`.${prefixCls}`]: {
      cursor: 'pointer',
    },
  };
};
export default buttonStyle;
