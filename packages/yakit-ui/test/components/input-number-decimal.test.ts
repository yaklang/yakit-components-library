import { describe, expect, it } from 'vitest';

import {
  addDecimal,
  clampDecimal,
  compareDecimal,
  decimalToString,
  divideDecimalByTen,
  multiplyDecimal,
  parseDecimal,
  roundDecimal,
  type Decimal,
} from '../../src/components/InputNumber/decimal';

const decimal = (value: string | number): Decimal => {
  const parsed = parseDecimal(value);
  if (!parsed) throw new Error(`expected ${String(value)} to be a valid decimal`);
  return parsed;
};

describe('InputNumber decimal helpers', () => {
  it.each([
    ['42', '42'],
    ['  -12.50  ', '-12.50'],
    ['.25', '0.25'],
    ['1e3', '1000'],
    ['1.2e-2', '0.012'],
    ['-0', '-0'],
    ['-0.00', '-0.00'],
  ])('parses %s into exact canonical decimal text', (source, expected) => {
    expect(decimalToString(decimal(source))).toBe(expected);
  });

  it.each(['', '.', '+', '-', 'word', '1.2.3', 'NaN', 'Infinity', '1e10001'])(
    'rejects invalid decimal source %s',
    (source) => {
      expect(parseDecimal(source)).toBeNull();
    },
  );

  it.each([
    ['0.1', '0.2', '0.3'],
    ['1.25', '-0.5', '0.75'],
    ['9007199254740993', '0.01', '9007199254740993.01'],
    ['-2.50', '-0.25', '-2.75'],
  ])('adds %s and %s exactly', (left, right, expected) => {
    expect(decimalToString(addDecimal(decimal(left), decimal(right)))).toBe(expected);
  });

  it.each([
    ['1.25', 10, '12.50'],
    ['-2.5', 3, '-7.5'],
    ['9007199254740993', 10, '90071992547409930'],
    ['0.00', -1, '0.00'],
  ])('multiplies %s by %s exactly', (source, multiplier, expected) => {
    expect(decimalToString(multiplyDecimal(decimal(source), multiplier))).toBe(expected);
  });

  it.each([
    ['12', '1.2'],
    ['0.1', '0.01'],
    ['-5.00', '-0.500'],
    ['9007199254740993', '900719925474099.3'],
  ])('divides %s by ten without number coercion', (source, expected) => {
    expect(decimalToString(divideDecimalByTen(decimal(source)))).toBe(expected);
  });

  it.each([
    ['1.49', 0, '1'],
    ['1.50', 0, '2'],
    ['-1.55', 1, '-1.6'],
    ['9.995', 2, '10.00'],
    ['2', 3, '2.000'],
    ['-0.004', 2, '0.00'],
  ])('rounds %s to precision %s as %s', (source, precision, expected) => {
    expect(decimalToString(roundDecimal(decimal(source), precision))).toBe(expected);
  });

  it.each([
    ['1', '1.0', 0],
    ['-2', '-1.999', -1],
    ['9007199254740993', '9007199254740992', 1],
    ['0.001', '0.01', -1],
  ])('compares %s with %s by aligned scale', (left, right, expected) => {
    expect(compareDecimal(decimal(left), decimal(right))).toBe(expected);
  });

  it.each([
    ['0', '1', '5', '1'],
    ['6', '1', '5', '5'],
    ['3', '1', '5', '3'],
    ['3', null, '2', '2'],
    ['3', '4', null, '4'],
    ['2.0', '2', '2.00', '2.0'],
  ])('clamps %s between %s and %s as %s', (source, min, max, expected) => {
    expect(
      decimalToString(
        clampDecimal(
          decimal(source),
          min === null ? null : decimal(min),
          max === null ? null : decimal(max),
        ),
      ),
    ).toBe(expected);
  });

  it.each([
    [{ coefficient: 0n, negativeZero: false, scale: 0 }, '0'],
    [{ coefficient: 0n, negativeZero: true, scale: 0 }, '-0'],
    [{ coefficient: 123n, negativeZero: false, scale: 0 }, '123'],
    [{ coefficient: 123n, negativeZero: false, scale: 5 }, '0.00123'],
    [{ coefficient: -1230n, negativeZero: false, scale: 2 }, '-12.30'],
  ])('serializes decimal structure without losing scale %#', (source, expected) => {
    expect(decimalToString(source)).toBe(expected);
  });
});
