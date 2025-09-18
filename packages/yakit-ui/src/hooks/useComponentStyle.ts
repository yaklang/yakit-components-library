import type { CSSInterpolation } from '@ant-design/cssinjs';
import { useStyleRegister, useToken, type GlobalToken } from 'antd/es/theme/internal';

const useComponentStyle = <T extends GlobalToken = GlobalToken>(
  prefixCls: string,
  genStyle: (prefixCls: string, token: T) => CSSInterpolation,
) => {
  const [theme, token, hashId] = useToken();

  const wrapSSR = useStyleRegister(
    {
      theme,
      token,
      path: [prefixCls],
      hashId,
    },
    () => genStyle(prefixCls, token as T),
  );
  return {
    wrapSSR,
    hashId,
  };
};

export default useComponentStyle;
