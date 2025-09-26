import type { CSSInterpolation } from '@ant-design/cssinjs';

import type { GlobalToken } from '../../../../types/token';

const WaveStyle = (prefixCls: string, _: GlobalToken): CSSInterpolation => {
  return {
    [`.${prefixCls}`]: {
      position: 'relative',
      overflow: 'visible',

      ['&-holder']: {
        position: 'absolute',
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
        boxShadow: `0 0 0 0 var(----wave-color)`,
        transition: 'box-shadow 0.4s ease-out, opacity 0.4s ease-out',
      },
    },
  };
};

export default WaveStyle;
