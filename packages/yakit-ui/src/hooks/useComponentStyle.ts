import type { CSSInterpolation } from '@ant-design/cssinjs';
import { useStyleRegister, useToken } from 'antd/es/theme/internal';
import { useMemo } from 'react';

import '@yakit-libs/color/dist/index.css';
import '../styles/reset.css';
import yakitTheme from '../styles/theme';
import type { GlobalToken } from '../types/token';

const useComponentStyle = <T extends GlobalToken = GlobalToken>(
  prefixCls: string,
  genStyle: (prefixCls: string, token: T) => CSSInterpolation,
) => {
  const [theme, token, hashId] = useToken();

  const localToken = useMemo(() => ({ ...token, ...yakitTheme }), [token]);

  const wrapSSR = useStyleRegister(
    {
      theme,
      token,
      path: [prefixCls],
      hashId,
    },
    () => genStyle(prefixCls, localToken as T),
  );
  return {
    wrapSSR,
    hashId,
  };
};

export default useComponentStyle;
