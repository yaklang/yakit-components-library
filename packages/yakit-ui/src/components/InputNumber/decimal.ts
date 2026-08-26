export interface Decimal {
  coefficient: bigint;
  negativeZero: boolean;
  scale: number;
}

const DECIMAL_PATTERN = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

export const parseDecimal = (input: string | number): Decimal | null => {
  const source = String(input).trim();
  const match = DECIMAL_PATTERN.exec(source);
  if (!match || (!match[2] && !match[3])) return null;

  const exponentSource = match[4] ?? '0';
  const exponentSign = exponentSource.startsWith('-') ? -1 : 1;
  const exponentDigits = exponentSource.replace(/^[+-]/, '');
  let exponent = 0;
  for (const digit of exponentDigits) {
    exponent = exponent * 10 + digit.charCodeAt(0) - 48;
    if (exponent > 10_000) return null;
  }
  exponent *= exponentSign;

  const digits = `${match[2] || '0'}${match[3] ?? ''}`.replace(/^0+(?=\d)/, '') || '0';
  let coefficient = BigInt(digits);
  if (match[1] === '-') coefficient = -coefficient;

  let scale = (match[3]?.length ?? 0) - exponent;
  if (scale < 0) {
    coefficient *= 10n ** BigInt(-scale);
    scale = 0;
  }

  return { coefficient, negativeZero: match[1] === '-' && coefficient === 0n, scale };
};

const align = (left: Decimal, right: Decimal): [bigint, bigint, number] => {
  const scale = Math.max(left.scale, right.scale);
  return [
    left.coefficient * 10n ** BigInt(scale - left.scale),
    right.coefficient * 10n ** BigInt(scale - right.scale),
    scale,
  ];
};

export const compareDecimal = (left: Decimal, right: Decimal) => {
  const [leftCoefficient, rightCoefficient] = align(left, right);
  return leftCoefficient === rightCoefficient ? 0 : leftCoefficient < rightCoefficient ? -1 : 1;
};

export const addDecimal = (left: Decimal, right: Decimal): Decimal => {
  const [leftCoefficient, rightCoefficient, scale] = align(left, right);
  const coefficient = leftCoefficient + rightCoefficient;
  return { coefficient, negativeZero: false, scale };
};

export const multiplyDecimal = (value: Decimal, multiplier: number): Decimal => ({
  coefficient: value.coefficient * BigInt(multiplier),
  negativeZero: false,
  scale: value.scale,
});

export const divideDecimalByTen = (value: Decimal): Decimal => ({
  ...value,
  scale: value.scale + 1,
});

export const roundDecimal = (value: Decimal, precision: number): Decimal => {
  const targetScale = Math.max(0, Math.trunc(precision));
  if (value.scale <= targetScale) {
    return {
      ...value,
      coefficient: value.coefficient * 10n ** BigInt(targetScale - value.scale),
      scale: targetScale,
    };
  }

  const divisor = 10n ** BigInt(value.scale - targetScale);
  const absolute = value.coefficient < 0n ? -value.coefficient : value.coefficient;
  const rounded = (absolute + divisor / 2n) / divisor;
  return {
    coefficient: value.coefficient < 0n ? -rounded : rounded,
    negativeZero: value.negativeZero && rounded === 0n,
    scale: targetScale,
  };
};

export const decimalToString = (value: Decimal): string => {
  const negative = value.coefficient < 0n || value.negativeZero;
  const digits = (value.coefficient < 0n ? -value.coefficient : value.coefficient).toString();
  if (value.scale === 0) return `${negative ? '-' : ''}${digits}`;

  const padded = digits.padStart(value.scale + 1, '0');
  const splitAt = padded.length - value.scale;
  return `${negative ? '-' : ''}${padded.slice(0, splitAt)}.${padded.slice(splitAt)}`;
};

export const clampDecimal = (value: Decimal, min?: Decimal | null, max?: Decimal | null) => {
  if (min && compareDecimal(value, min) < 0) return min;
  if (max && compareDecimal(value, max) > 0) return max;
  return value;
};
