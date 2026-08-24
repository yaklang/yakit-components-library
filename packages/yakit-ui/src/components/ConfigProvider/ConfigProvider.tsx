import { ConfigProvider as AntdConfigProvider, type ConfigProviderProps } from 'antd';
import type { ComponentType, FC } from 'react';

import type { YakitConfigProviderProps } from '../../types/token';

const CP = AntdConfigProvider as ComponentType<ConfigProviderProps>;

export const ConfigProvider: FC<YakitConfigProviderProps> = (props) => <CP {...props} />;
