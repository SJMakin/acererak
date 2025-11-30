import { describe, it, expect } from 'vitest';
import { performRoll, performRolls } from '../diceService';
import { DiceRoll } from '../../types';

describe('Dice Service', () => {
  describe('performRoll', () => {
    it('should handle basic dice roll', () => {
      const roll: DiceRoll = {
        type: 'd20',
        count: 1,
        description: 'Test roll',
      };

      const result = performRoll(roll);

      expect(result.roll).toBe(roll);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toBeGreaterThanOrEqual(1);
      expect(result.results[0]).toBeLessThanOrEqual(20);
      expect(result.total).toBe(result.results[0]);
    });

    it('should handle multiple dice', () => {
      const roll: DiceRoll = {
        type: 'd6',
        count: 3,
        description: 'Multiple dice',
      };

      const result = performRoll(roll);

      expect(result.results).toHaveLength(3);
      result.results.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      });
      expect(result.total).toBe(
        result.results.reduce((sum, val) => sum + val, 0)
      );
    });

    it('should apply modifiers correctly', () => {
      const roll: DiceRoll = {
        type: 'd20',
        count: 1,
        modifier: 5,
        description: 'Roll with modifier',
      };

      const result = performRoll(roll);

      expect(result.total).toBe(result.results[0] + 5);
    });

    it('should handle skill checks with difficulty', () => {
      const roll: DiceRoll = {
        type: 'd20',
        count: 1,
        modifier: 5,
        difficulty: 15,
        description: 'Skill check',
      };

      const result = performRoll(roll);

      expect(result.success).toBeDefined();
      expect(result.success).toBe(result.total >= 15);
    });
  });

  describe('performRolls', () => {
    it('should handle multiple roll sets', () => {
      const rolls: DiceRoll[] = [
        {
          type: 'd20',
          count: 1,
          description: 'Attack roll',
        },
        {
          type: 'd6',
          count: 2,
          modifier: 3,
          description: 'Damage roll',
        },
      ];

      const results = performRolls(rolls);

      expect(results).toHaveLength(2);

      // Attack roll checks
      expect(results[0].results).toHaveLength(1);
      expect(results[0].results[0]).toBeGreaterThanOrEqual(1);
      expect(results[0].results[0]).toBeLessThanOrEqual(20);

      // Damage roll checks
      expect(results[1].results).toHaveLength(2);
      results[1].results.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      });
      expect(results[1].total).toBe(
        results[1].results.reduce((sum, val) => sum + val, 0) + 3
      );
    });
  });
});
