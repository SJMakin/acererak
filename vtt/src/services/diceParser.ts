// Dice formula parser for VTT
// Supports formulas like: "2d6+3", "1d20", "4d6 drop lowest", "1d20 advantage", "1d20 disadvantage"

import { evaluateNumericExpression } from './safeExpression';

const MAX_FORMULA_LENGTH = 256;
const MAX_DICE_GROUPS = 20;
const MAX_TOTAL_DICE = 100;
const MAX_DIE_SIDES = 100_000;
const MAX_MODIFIER = 1_000_000;

export interface DiceRollResult {
  formula: string;
  result: number;
  breakdown: string;
  rolls: number[][];
}

interface ParsedFormula {
  diceGroups: DiceGroup[];
  modifier: number;
  advantage?: 'advantage' | 'disadvantage';
  dropLowest?: number;
  dropHighest?: number;
}

interface DiceGroup {
  count: number;
  sides: number;
}

/**
 * Parse a dice formula string
 */
export function parseDiceFormula(formula: string): ParsedFormula {
  const normalized = formula.toLowerCase().trim();
  if (!normalized || normalized.length > MAX_FORMULA_LENGTH) {
    throw new Error('Dice formula is empty or too long');
  }
  
  const result: ParsedFormula = {
    diceGroups: [],
    modifier: 0,
  };

  // Check for advantage/disadvantage
  if (/\b(?:disadvantage|dis)\b/.test(normalized)) {
    result.advantage = 'disadvantage';
  } else if (/\b(?:advantage|adv)\b/.test(normalized)) {
    result.advantage = 'advantage';
  }

  // Check for drop lowest/highest
  const dropLowestMatch = normalized.match(/drop\s+lowest\s*(\d+)?/);
  if (dropLowestMatch) {
    result.dropLowest = parseInt(dropLowestMatch[1] || '1', 10);
    if (!Number.isSafeInteger(result.dropLowest) || result.dropLowest < 1) {
      throw new Error('Drop count must be a positive integer');
    }
  }

  const dropHighestMatch = normalized.match(/drop\s+highest\s*(\d+)?/);
  if (dropHighestMatch) {
    result.dropHighest = parseInt(dropHighestMatch[1] || '1', 10);
    if (!Number.isSafeInteger(result.dropHighest) || result.dropHighest < 1) {
      throw new Error('Drop count must be a positive integer');
    }
  }

  // Remove modifiers text for dice parsing
  const cleanFormula = normalized
    .replace(/\b(?:disadvantage|advantage|dis|adv)\b/g, '')
    .replace(/drop\s+(lowest|highest)\s*\d*/g, '')
    .trim();
  const compactFormula = cleanFormula.replace(/\s/g, '');
  if (!/^\d*d\d+(?:\+\d*d\d+)*(?:[+-]\d+)*$/.test(compactFormula)) {
    throw new Error('Invalid dice formula');
  }

  // Parse dice groups (e.g., "2d6", "1d20")
  const diceRegex = /(\d+)?d(\d+)/g;
  let match;
  while ((match = diceRegex.exec(cleanFormula)) !== null) {
    const count = parseInt(match[1] || '1', 10);
    const sides = parseInt(match[2], 10);
    if (!Number.isSafeInteger(count) || count < 1 || count > MAX_TOTAL_DICE) {
      throw new Error(`Dice count must be between 1 and ${MAX_TOTAL_DICE}`);
    }
    if (!Number.isSafeInteger(sides) || sides < 2 || sides > MAX_DIE_SIDES) {
      throw new Error(`Die sides must be between 2 and ${MAX_DIE_SIDES}`);
    }
    result.diceGroups.push({ count, sides });
    if (result.diceGroups.length > MAX_DICE_GROUPS) throw new Error('Too many dice groups');
    if (result.diceGroups.reduce((sum, group) => sum + group.count, 0) > MAX_TOTAL_DICE) {
      throw new Error(`A roll may contain at most ${MAX_TOTAL_DICE} dice`);
    }
  }

  // Parse modifier (e.g., "+3", "-2")
  const modifierSource = compactFormula.replace(/\d*d\d+/g, '');
  const modifierRegex = /([+-]\d+)/g;
  let modMatch;
  while ((modMatch = modifierRegex.exec(modifierSource)) !== null) {
    const mod = parseInt(modMatch[1], 10);
    result.modifier += mod;
    if (!Number.isSafeInteger(result.modifier) || Math.abs(result.modifier) > MAX_MODIFIER) {
      throw new Error('Dice modifier is too large');
    }
  }

  if (result.advantage && (
    result.diceGroups.length !== 1
    || result.diceGroups[0].count !== 1
    || result.diceGroups[0].sides !== 20
  )) throw new Error('Advantage and disadvantage require exactly 1d20');

  const dropCount = (result.dropLowest ?? 0) + (result.dropHighest ?? 0);
  const firstGroupCount = result.diceGroups[0]?.count ?? 0;
  if (
    dropCount >= firstGroupCount
    || (dropCount > 0 && result.diceGroups.length !== 1)
    || (result.dropLowest && result.dropHighest)
  ) {
    throw new Error('Invalid drop rule');
  }

  return result;
}

/**
 * Roll a single die
 */
function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice
 */
function rollDice(count: number, sides: number): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides));
  }
  return rolls;
}

/**
 * Execute a dice roll based on a formula
 */
export function executeDiceRoll(formula: string): DiceRollResult {
  const parsed = parseDiceFormula(formula);
  const allRolls: number[][] = [];
  let total = 0;
  const breakdownParts: string[] = [];

  // Handle advantage/disadvantage (assumes single d20)
  if (parsed.advantage) {
    const roll1 = rollDie(20);
    const roll2 = rollDie(20);
    allRolls.push([roll1, roll2]);
    
    if (parsed.advantage === 'advantage') {
      total = Math.max(roll1, roll2);
      breakdownParts.push(`[${roll1}, ${roll2}] → ${total} (advantage)`);
    } else {
      total = Math.min(roll1, roll2);
      breakdownParts.push(`[${roll1}, ${roll2}] → ${total} (disadvantage)`);
    }
  } else {
    // Normal dice rolls
    for (const group of parsed.diceGroups) {
      const rolls = rollDice(group.count, group.sides);
      allRolls.push(rolls);
      
      let groupTotal = rolls.reduce((sum, r) => sum + r, 0);
      let rollsToUse = [...rolls];

      // Handle drop lowest/highest
      if (parsed.dropLowest && parsed.dropLowest > 0) {
        const sorted = [...rolls].sort((a, b) => a - b);
        const dropped = sorted.slice(0, parsed.dropLowest);
        rollsToUse = sorted.slice(parsed.dropLowest);
        groupTotal = rollsToUse.reduce((sum, r) => sum + r, 0);
        breakdownParts.push(
          `${group.count}d${group.sides}: [${rolls.join(', ')}] drop lowest ${parsed.dropLowest} [${dropped.join(', ')}] = ${groupTotal}`
        );
      } else if (parsed.dropHighest && parsed.dropHighest > 0) {
        const sorted = [...rolls].sort((a, b) => b - a);
        const dropped = sorted.slice(0, parsed.dropHighest);
        rollsToUse = sorted.slice(parsed.dropHighest);
        groupTotal = rollsToUse.reduce((sum, r) => sum + r, 0);
        breakdownParts.push(
          `${group.count}d${group.sides}: [${rolls.join(', ')}] drop highest ${parsed.dropHighest} [${dropped.join(', ')}] = ${groupTotal}`
        );
      } else {
        breakdownParts.push(`${group.count}d${group.sides}: [${rolls.join(', ')}]`);
      }

      total += groupTotal;
    }
  }

  // Add modifier
  if (parsed.modifier !== 0) {
    breakdownParts.push(`${parsed.modifier >= 0 ? '+' : ''}${parsed.modifier}`);
    total += parsed.modifier;
  }

  const breakdown = breakdownParts.join(' ') + ` = ${total}`;

  return {
    formula,
    result: total,
    breakdown,
    rolls: allRolls,
  };
}

/**
 * Validate a dice formula
 */
export function validateDiceFormula(formula: string): boolean {
  try {
    const parsed = parseDiceFormula(formula);
    
    // Must have at least one dice group or be advantage/disadvantage
    if (parsed.diceGroups.length === 0 && !parsed.advantage) {
      return false;
    }

    // Validate dice groups
    for (const group of parsed.diceGroups) {
      if (group.count < 1 || group.count > MAX_TOTAL_DICE) return false;
      if (group.sides < 2 || group.sides > MAX_DIE_SIDES) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get dice count and sides from a formula (for 3D rendering)
 */
export function getDiceFromFormula(formula: string): Array<{ sides: number }> {
  const parsed = parseDiceFormula(formula);
  const dice: Array<{ sides: number }> = [];

  if (parsed.advantage) {
    dice.push({ sides: 20 });
    dice.push({ sides: 20 });
  } else {
    for (const group of parsed.diceGroups) {
      for (let i = 0; i < group.count; i++) {
        dice.push({ sides: group.sides });
      }
    }
  }

  return dice;
}

/**
 * Resolve variables in a dice formula using shadow state values
 * Replaces variable names like "Strength" with their numeric values
 * Also handles {{ expression }} by evaluating nested expressions
 */
export function resolveVariables(
  formula: string,
  shadowState: Record<string, string | number>
): string {
  let resolved = formula;
  
  // Handle nested {{ expressions }} first
  const expressionRegex = /\{\{([^}]+)\}\}/g;
  let expressionMatch;
  
  const expressions: Array<{ start: number; end: number; value: string; result: string }> = [];
  
  while ((expressionMatch = expressionRegex.exec(resolved)) !== null) {
    const expression = expressionMatch[1].trim();
    let result = expression;
    
    try {
      const variables: Record<string, number> = {};
      for (const [key, value] of Object.entries(shadowState)) {
        if (typeof value === 'number') {
          variables[key] = value;
        } else if (typeof value === 'string' && value.trim()) {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) {
            variables[key] = parsed;
          }
        }
      }

      const evalResult = evaluateNumericExpression(expression, variables);
      result = Number.isInteger(evalResult) ? evalResult.toString() : evalResult.toFixed(2).replace(/\.?0+$/, '');
    } catch {
      // Keep the original expression when it is invalid or references missing data.
      result = expression;
    }
    
    expressions.push({
      start: expressionMatch.index,
      end: expressionMatch.index + expressionMatch[0].length,
      value: expressionMatch[0],
      result,
    });
  }
  
  // Replace expressions in reverse order to preserve positions
  for (let i = expressions.length - 1; i >= 0; i--) {
    const exp = expressions[i];
    resolved = resolved.substring(0, exp.start) + exp.result + resolved.substring(exp.end);
  }
  
  // Replace variable names with their values
  // Variable names must start with a letter and contain only letters, numbers, underscores
  const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  let varMatch;
  const variableReplacements: Array<{ start: number; end: number; value: string }> = [];
  
  // Keywords that shouldn't be replaced
  const keywords = new Set([
    'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100',
    'drop', 'lowest', 'highest', 'advantage', 'disadvantage', 'adv', 'dis',
  ]);
  
  while ((varMatch = variableRegex.exec(resolved)) !== null) {
    const varName = varMatch[1];
    
    // Skip if it's a dice notation (d followed by number)
    if (/^d\d+$/.test(varName)) continue;
    
    // Skip if it's a keyword
    if (keywords.has(varName.toLowerCase())) continue;
    
    // Check if this variable exists in shadow state
    if (varName in shadowState) {
      const value = shadowState[varName];
      if (typeof value === 'number') {
        variableReplacements.push({
          start: varMatch.index,
          end: varMatch.index + varName.length,
          value: value.toString(),
        });
      } else if (typeof value === 'string') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          variableReplacements.push({
            start: varMatch.index,
            end: varMatch.index + varName.length,
            value: parsed.toString(),
          });
        }
      }
    }
  }
  
  // Replace variables in reverse order
  for (let i = variableReplacements.length - 1; i >= 0; i--) {
    const v = variableReplacements[i];
    resolved = resolved.substring(0, v.start) + v.value + resolved.substring(v.end);
  }
  
  return resolved;
}
