import { createContext, useContext } from 'react';

import type { CheckboxGroupContextValue } from './type';

export const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null);

export const useCheckboxGroup = () => useContext(CheckboxGroupContext);
