import type { CSSProperties } from 'react';

import type { GlobalToken } from '../types/token';

export type YakitCSSProperties = CSSProperties &
  Partial<Record<`--${string}`, string | number | undefined>>;

const toKebabCase = (value: string) =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/**
 * 同一 token 引用只展开一次，避免 Button/Tag 等成批渲染时重复 Object.entries。
 * token 须视为不可变：原地修改字段不会使缓存失效，换主题请换新对象引用（ConfigProvider 已如此）。
 * 返回值经 Object.freeze：这是分发给所有组件的共享对象，冻结使误改在开发期直接抛错，
 * 而不是静默污染同主题下的全部实例。请始终以 spread 方式消费（现有用法均如此）。
 */
const tokenVariablesCache = new WeakMap<object, YakitCSSProperties>();

export const getYakitTokenVariables = (token: GlobalToken): YakitCSSProperties => {
  const cached = tokenVariablesCache.get(token as object);
  if (cached) return cached;

  const variables: Record<string, string> = {};

  for (const [key, value] of Object.entries(token)) {
    if (typeof value === 'string') variables[`--yakit-${toKebabCase(key)}`] = value;
  }

  const result = Object.freeze(variables) as YakitCSSProperties;
  tokenVariablesCache.set(token as object, result);
  return result;
};
