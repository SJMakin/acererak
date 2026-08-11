import { expect, test } from '@playwright/test';
import { executeDiceRoll, parseDiceFormula } from '../../src/services/diceParser';

test.describe('safe dice parser', () => {
  test('supports bounded groups, modifiers, advantage, and disadvantage', () => {
    const grouped = executeDiceRoll('2d6+1d4+3');
    expect(grouped.result).toBeGreaterThanOrEqual(6);
    expect(grouped.result).toBeLessThanOrEqual(19);

    expect(parseDiceFormula('1d20 advantage').advantage).toBe('advantage');
    expect(parseDiceFormula('1d20 disadvantage').advantage).toBe('disadvantage');
    expect(executeDiceRoll('4d6 drop lowest').rolls[0]).toHaveLength(4);
  });

  test('rejects formulas that could exhaust or confuse the renderer', () => {
    const invalid = [
      '',
      '101d6',
      '1d1',
      '1d100001',
      '1d20-1d4',
      '2d20 advantage',
      '4d6 drop lowest 4',
      '4d6 drop lowest 0',
      '4d6+1d4 drop lowest',
      '1d20+1000001',
      '1d20 + alert(1)',
      `1d20+${'1'.repeat(300)}`,
    ];

    for (const formula of invalid) {
      expect(() => executeDiceRoll(formula), formula).toThrow();
    }
  });
});
