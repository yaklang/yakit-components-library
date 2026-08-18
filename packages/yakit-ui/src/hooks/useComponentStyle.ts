import type { CSSInterpolation } from '@ant-design/cssinjs';
import { useStyleRegister, useToken } from 'antd/es/theme/internal';
import type { ReactElement } from 'react';

import '@yakit-libs/color/dist/index.css';
import '../styles/reset.css';

import type { GlobalToken } from '../types/token';

import useNewToken from './useToken';

interface ComponentStyleResult {
  hashId: string;
  token: GlobalToken;
  wrapSSR: (node: ReactElement) => ReactElement;
}

const useComponentStyle = <T extends GlobalToken = GlobalToken>(
  prefixCls: string,
  genStyle: (prefixCls: string, token: T) => CSSInterpolation,
  extraStyle?: CSSInterpolation,
): ComponentStyleResult => {
  const [theme, token, hashId] = useToken();
  const [_, localToken] = useNewToken();
  const wrapSSR = useStyleRegister(
    {
      theme,
      token,
      path: [prefixCls],
      hashId,
    },
    () => {
      const baseStyle = genStyle(prefixCls, localToken as T);
      if (extraStyle && typeof baseStyle === 'object' && !Array.isArray(baseStyle)) {
        return { ...baseStyle, ...(extraStyle as object) };
      }

      return baseStyle;
    },
  );
  return {
    wrapSSR,
    hashId,
    token: localToken as GlobalToken,
  };
};

export default useComponentStyle;
