import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../../types/token';

const WaveStyle = (prefixCls: string, token: GlobalToken): CSSInterpolation => {
  return {
    [`.${prefixCls}`]: {
      position: 'relative',
      overflow: 'visible',

      ['&-holder']: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
        pointerEvents: 'none',
        boxSizing: 'border-box',
        overflow: 'visible',
      },

      [`&-effect`]: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
        boxShadow: `0 0 0 0 ${token.colorPrimary}`,
        transition: 'box-shadow 0.6s ease-out, opacity 0.6s ease-out',
      },
    },
  };
};

export default WaveStyle;
