import { useContext, type FC } from 'react';

import { YakitConfigContext } from '../../context/YakitConfigContext';
import { YakitConfigContextProvider } from '../../context/YakitConfigContextProvider';
import type { YakitConfigProviderProps } from '../../types/token';

export const ConfigProvider: FC<YakitConfigProviderProps> = (props) => {
  const parent = useContext(YakitConfigContext);

  return <YakitConfigContextProvider {...props} parent={parent} />;
};
