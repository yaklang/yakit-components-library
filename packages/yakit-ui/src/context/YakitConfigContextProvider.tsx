import { useMemo, type FC } from 'react';

import type { YakitConfigProviderProps } from '../types/token';

import {
  mergeDefined,
  mergeYakitLocale,
  YakitConfigContext,
  type YakitConfigContextValue,
} from './YakitConfigContext';

export const YakitConfigContextProvider: FC<
  YakitConfigProviderProps & { parent: YakitConfigContextValue }
> = ({ children, componentDisabled, componentSize, direction, locale, parent, theme }) => {
  const value = useMemo<YakitConfigContextValue>(
    () => ({
      componentDisabled: componentDisabled ?? parent.componentDisabled,
      componentSize: componentSize ?? parent.componentSize,
      direction: direction ?? parent.direction,
      locale: mergeYakitLocale(parent.locale, locale),
      mode: theme?.mode ?? parent.mode,
      token: {
        ...mergeDefined(parent.token, theme?.token),
        YakitButton: mergeDefined(parent.token.YakitButton ?? {}, theme?.components?.YakitButton),
        YakitCheckbox: mergeDefined(
          parent.token.YakitCheckbox ?? {},
          theme?.components?.YakitCheckbox,
        ),
        YakitRadio: mergeDefined(parent.token.YakitRadio ?? {}, theme?.components?.YakitRadio),
        YakitSelect: mergeDefined(parent.token.YakitSelect ?? {}, theme?.components?.YakitSelect),
        YakitSwitch: mergeDefined(parent.token.YakitSwitch ?? {}, theme?.components?.YakitSwitch),
        YakitTag: mergeDefined(parent.token.YakitTag ?? {}, theme?.components?.YakitTag),
        YakitTree: mergeDefined(parent.token.YakitTree ?? {}, theme?.components?.YakitTree),
      },
    }),
    [componentDisabled, componentSize, direction, locale, parent, theme],
  );

  return <YakitConfigContext.Provider value={value}>{children}</YakitConfigContext.Provider>;
};
