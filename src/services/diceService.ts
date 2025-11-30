import type { DiceRoll, RollResult } from '../types';

const getDiceSides = (type: DiceRoll['type']): number => {
  return parseInt(type.substring(1));
};

const rollDie = (sides: number): number => {
  return Math.floor(Math.random() * sides) + 1;
};

export const performRoll = (roll: DiceRoll): RollResult => {
  const sides = getDiceSides(roll.type);
  const results: number[] = [];

  console.log('performRoll:', {
    description: roll.description,
    type: roll.type,
    count: roll.count,
    modifier: roll.modifier,
    difficulty: roll.difficulty,
    sides,
  });

  // Perform the dice rolls
  for (let i = 0; i < roll.count; i++) {
    results.push(rollDie(sides));
  }

  // Calculate total with modifier
  const subtotal = results.reduce((sum, result) => sum + result, 0);
  const total = roll.modifier ? subtotal + roll.modifier : subtotal;

  // Determine success if this is a skill check
  const success = roll.difficulty ? total >= roll.difficulty : undefined;

  return {
    roll,
    results,
    total,
    success,
    formatted: `${roll.description}: Rolled ${results.join(', ')}${roll.modifier ? ` with modifier ${roll.modifier}` : ''}. Total: ${total}${roll.difficulty ? ` against DC ${roll.difficulty}` : ''}. ${success !== undefined ? (success ? 'Success' : 'Failure') : ''}`,
  };
};

export const performRolls = (rolls: DiceRoll[]): RollResult[] => {
  return rolls.map(roll => performRoll(roll));
};

// Format a single roll result for display
export const formatRollResult = (result: RollResult): string => {
  const { roll, results, total, success } = result;
  const rollText = results.join(' + ');
  const modifierText = roll.modifier ? ` + ${roll.modifier}` : '';
  const skillText = roll.skill ? ` (${roll.skill})` : '';
  const dcText = roll.difficulty ? ` vs DC ${roll.difficulty}` : '';
  const successText =
    success !== undefined ? ` [${success ? 'SUCCESS' : 'FAILURE'}]` : '';

  return `${roll.description}${skillText}: [${rollText}]${modifierText} = ${total}${dcText}${successText}`;
};

// Format multiple roll results for display
export const formatRollResults = (results: RollResult[]): string => {
  return results.map(formatRollResult).join('\\n');
};
