import type { Theme } from '@ant-design/cssinjs';
import { useToken as useAntdToken, type AliasToken, type SeedToken } from 'antd/es/theme/internal';
import { useMemo } from 'react';

import yakitTheme from '../styles/theme';
import type { GlobalToken } from '../types/token';

type UseTokenResult = [Theme<SeedToken, AliasToken>, GlobalToken, string];

const useToken = (): UseTokenResult => {
  const [theme, token, hashId] = useAntdToken();
  const localToken: GlobalToken = useMemo(() => ({ ...token, ...yakitTheme }), [token]);
  return [theme, localToken, hashId];
};
export default useToken;
