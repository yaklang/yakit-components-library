import { createContext } from 'react';

import type { ButtonSize } from './type';

export interface ButtonGroupContextValue {
  size?: ButtonSize;
}

export const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(null);
