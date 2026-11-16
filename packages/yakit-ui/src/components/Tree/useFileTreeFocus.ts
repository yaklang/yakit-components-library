import { useEffect, useState, type Key } from 'react';

export const hasFocusedKey = (key: Key | null | undefined): key is Key =>
  key !== undefined && key !== null && key !== '';

/** 文件树焦点。可以和 selectedKeys 不是同一行。受控时只回报，不自己改内部值。 */
export const useFileTreeFocus = (
  focusedKey: Key | null | undefined,
  defaultFocusedKey: Key | undefined,
  onFocusedKeyChange: ((key: Key | undefined) => void) | undefined,
) => {
  const [innerFocused, setInnerFocused] = useState<Key | undefined>(() =>
    hasFocusedKey(focusedKey) ? focusedKey : defaultFocusedKey,
  );

  useEffect(() => {
    if (focusedKey !== undefined) {
      setInnerFocused(hasFocusedKey(focusedKey) ? focusedKey : undefined);
    }
  }, [focusedKey]);

  const bumpFocused = (key: Key | undefined) => {
    if (focusedKey === undefined) setInnerFocused(key);
    onFocusedKeyChange?.(key);
  };

  const activeFocused =
    focusedKey !== undefined ? (hasFocusedKey(focusedKey) ? focusedKey : undefined) : innerFocused;

  return { activeFocused, bumpFocused };
};
