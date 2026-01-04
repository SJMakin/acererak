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
