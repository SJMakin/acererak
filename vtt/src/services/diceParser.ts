// Dice formula parser for VTT
// Supports formulas like: "2d6+3", "1d20", "4d6 drop lowest", "1d20 advantage", "1d20 disadvantage"

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
  
  const result: ParsedFormula = {
    diceGroups: [],
    modifier: 0,
  };

  // Check for advantage/disadvantage
  if (normalized.includes('advantage') || normalized.includes('adv')) {
    result.advantage = 'advantage';
  } else if (normalized.includes('disadvantage') || normalized.includes('dis')) {
    result.advantage = 'disadvantage';
  }

  // Check for drop lowest/highest
  const dropLowestMatch = normalized.match(/drop\s+lowest\s*(\d+)?/);
  if (dropLowestMatch) {
    result.dropLowest = parseInt(dropLowestMatch[1] || '1', 10);
  }

  const dropHighestMatch = normalized.match(/drop\s+highest\s*(\d+)?/);
  if (dropHighestMatch) {
    result.dropHighest = parseInt(dropHighestMatch[1] || '1', 10);
  }

  // Remove modifiers text for dice parsing
  let cleanFormula = normalized
    .replace(/advantage|adv|disadvantage|dis/g, '')
    .replace(/drop\s+(lowest|highest)\s*\d*/g, '')
    .trim();

  // Parse dice groups (e.g., "2d6", "1d20")
  const diceRegex = /(\d+)?d(\d+)/g;
  let match;
  while ((match = diceRegex.exec(cleanFormula)) !== null) {
    const count = parseInt(match[1] || '1', 10);
    const sides = parseInt(match[2], 10);
    result.diceGroups.push({ count, sides });
  }

  // Parse modifier (e.g., "+3", "-2")
  const modifierRegex = /([+-]\s*\d+)/g;
  let modMatch;
  while ((modMatch = modifierRegex.exec(cleanFormula)) !== null) {
    const mod = parseInt(modMatch[1].replace(/\s/g, ''), 10);
    result.modifier += mod;
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
      if (group.count < 1 || group.count > 100) return false;
      if (group.sides < 2 || group.sides > 100) return false;
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
  
  // We'll use expr-eval for expressions if available
  let Parser;
  try {
    Parser = require('expr-eval').Parser;
  } catch {
    // expr-eval not available, leave expressions as-is
    Parser = null;
  }
  
  const expressions: Array<{ start: number; end: number; value: string; result: string }> = [];
  
  while ((expressionMatch = expressionRegex.exec(resolved)) !== null) {
    const expression = expressionMatch[1].trim();
    let result = expression;
    
    if (Parser) {
      try {
        const parser = new Parser();
        const expr = parser.parse(expression);
        
        // Prepare variables from shadow state
        const variables: Record<string, number> = {};
        for (const [key, value] of Object.entries(shadowState)) {
          if (typeof value === 'number') {
            variables[key] = value;
          } else if (typeof value === 'string') {
            const parsed = parseFloat(value);
            if (!isNaN(parsed)) {
              variables[key] = parsed;
            }
          }
        }
        
        const evalResult = expr.evaluate(variables);
        if (typeof evalResult === 'number') {
          result = Number.isInteger(evalResult) ? evalResult.toString() : evalResult.toFixed(2).replace(/\.?0+$/, '');
        }
      } catch {
        // Keep original if evaluation fails
        result = expression;
      }
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
