import { useContext } from 'react';

import { YakitConfigContext } from '../context/YakitConfigContext';

export const useYakitConfig = () => useContext(YakitConfigContext);

export default useYakitConfig;
