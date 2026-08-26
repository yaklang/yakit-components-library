import type { CSSProperties } from 'react';

import type { GlobalToken } from '../types/token';

export type YakitCSSProperties = CSSProperties &
  Partial<Record<`--${string}`, string | number | undefined>>;

const toKebabCase = (value: string) =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export const getYakitTokenVariables = (token: GlobalToken): YakitCSSProperties => {
  const variables: Record<string, string> = {};

  for (const [key, value] of Object.entries(token)) {
    if (typeof value === 'string') variables[`--yakit-${toKebabCase(key)}`] = value;
  }

  return variables as YakitCSSProperties;
};
