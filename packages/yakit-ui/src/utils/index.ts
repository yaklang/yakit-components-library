export function returnOrFalse<T = string>(flag: T): false | T {
  return flag === 'default' ? false : flag;
}

/** 去掉 `undefined` 字段，展开时才不会盖掉已有默认值。 */
export function defined<T extends object>(overrides?: T): Partial<T> {
  if (!overrides) return {};
  return Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
