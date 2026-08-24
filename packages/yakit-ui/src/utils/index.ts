export function returnOrFalse<T = string>(flag: T): false | T {
  return flag === 'default' ? false : flag;
}
