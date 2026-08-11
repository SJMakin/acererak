import { expect, test } from '@playwright/test';
import {
  evaluateNumericExpression,
  SAFE_EXPRESSION_LIMITS,
  SafeExpressionError,
} from '../../src/services/safeExpression';
import { resolveVariables } from '../../src/services/diceParser';

test.describe('safe numeric expression evaluator', () => {
  test('evaluates arithmetic with precedence, grouping, unary operators, and powers', () => {
    expect(evaluateNumericExpression('2 + 3 * 4')).toBe(14);
    expect(evaluateNumericExpression('(2 + 3) * 4')).toBe(20);
    expect(evaluateNumericExpression('-2^2')).toBe(-4);
    expect(evaluateNumericExpression('2^3^2')).toBe(512);
    expect(evaluateNumericExpression('2^-2')).toBe(0.25);
    expect(evaluateNumericExpression('10 % 4')).toBe(2);
  });

  test('uses only explicitly supplied finite numeric variables', () => {
    expect(evaluateNumericExpression('STR + PROF * 2', { STR: 18, PROF: 3 })).toBe(24);
    expect(evaluateNumericExpression('half_value + 1.5e1', { half_value: 0.5 })).toBe(15.5);

    const inherited = Object.create({ STR: 99 }) as Record<string, number>;
    expect(() => evaluateNumericExpression('STR', inherited)).toThrow(/Unknown variable/);
    expect(() => evaluateNumericExpression('missing', {})).toThrow(/Unknown variable/);
    expect(() => evaluateNumericExpression('STR', { STR: Number.NaN })).toThrow(/must be finite/);
  });

  test('resolves safe nested expressions in dice formulas', () => {
    expect(resolveVariables('1d20 + {{ STR + PROF }}', { STR: 10, PROF: '2' })).toBe('1d20 + 12');
    expect(resolveVariables('1d20 + {{ 1 / 0 }}', {})).toBe('1d20 + 1 / 0');
  });

  test('rejects code-like syntax, calls, property access, and dangerous identifiers', () => {
    const rejected = [
      'Math.max(1, 2)',
      'player.hp',
      'values[0]',
      'x = 1',
      '1; globalThis.alert(1)',
      'constructor',
      '__proto__',
      'prototype',
    ];

    for (const expression of rejected) {
      expect(() => evaluateNumericExpression(expression, { constructor: 1 })).toThrow(SafeExpressionError);
    }
  });

  test('rejects non-finite operations and excessive size, depth, or token counts', () => {
    expect(() => evaluateNumericExpression('1 / 0')).toThrow(/Division by zero/);
    expect(() => evaluateNumericExpression('1 % 0')).toThrow(/Modulo by zero/);
    expect(() => evaluateNumericExpression('10^101')).toThrow(/Exponent exceeds/);
    expect(() => evaluateNumericExpression('1000000000000 + 1')).toThrow(/numeric range/);
    expect(() => evaluateNumericExpression('('.repeat(40) + '1' + ')'.repeat(40))).toThrow(/nesting depth/);
    expect(() => evaluateNumericExpression('1+'.repeat(70) + '1')).toThrow(/tokens/);
    expect(() => evaluateNumericExpression('1'.repeat(SAFE_EXPRESSION_LIMITS.maxLength + 1))).toThrow(/characters/);
  });

  test('rejects malformed or incomplete expressions', () => {
    for (const expression of ['', ' ', '1 +', '(1 + 2', '1 2', '.', '1e', '()']) {
      expect(() => evaluateNumericExpression(expression)).toThrow(SafeExpressionError);
    }
  });
});
