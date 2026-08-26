import type { ReactElement } from 'react';

import type { GlobalToken } from '../types/token';

import useYakitToken from './useYakitToken';

interface ComponentStyleResult {
  hashId: string;
  token: GlobalToken;
  wrapSSR: (node: ReactElement) => ReactElement;
}

const useComponentStyle = <T extends GlobalToken = GlobalToken>(
  _prefixCls: string,
  _genStyle: (prefixCls: string, token: T) => unknown,
  _extraStyle?: unknown,
): ComponentStyleResult => {
  const token = useYakitToken();
  return {
    wrapSSR: (node) => node,
    hashId: '',
    token,
  };
};

export default useComponentStyle;
