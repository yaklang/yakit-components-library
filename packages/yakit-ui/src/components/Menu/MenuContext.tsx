import { createContext, useContext } from 'react';
import type { MouseEvent } from 'react';

export type MenuContextValue = {
  activeKey?: string;
  onItemSelect?: (key: string, domEvent: MouseEvent<HTMLElement>) => void;
};

export const MenuContext = createContext<MenuContextValue>({});

export const useMenuContext = () => useContext(MenuContext);
