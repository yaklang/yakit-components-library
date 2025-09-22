import { useToken as useAntdToken } from 'antd/es/theme/internal';
import { useMemo } from 'react';

import yakitTheme from '../styles/theme';
import type { GlobalToken } from '../types/token';

const useToken = () => {
  const [theme, token, hashId] = useAntdToken();
  const localToken: GlobalToken = useMemo(() => ({ ...token, ...yakitTheme }), [token]);
  return [theme, localToken, hashId];
};
export default useToken;
