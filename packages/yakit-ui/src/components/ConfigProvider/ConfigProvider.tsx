import { ConfigProvider as AntdConfigProvider, type ConfigProviderProps } from 'antd';
import type { ComponentType, FC } from 'react';

import type { CustomConfigProviderProps } from '../../types/common';

const CP = AntdConfigProvider as ComponentType<ConfigProviderProps>;

export const ConfigProvider: FC<CustomConfigProviderProps> = (props) => <CP {...props} />;
