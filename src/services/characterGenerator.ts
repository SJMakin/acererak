const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf', 'Half-Orc'];
const classes = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Paladin', 'Barbarian'];
const names = {
  Human: ['John', 'Mary', 'James', 'Sarah', 'William', 'Elizabeth'],
  Elf: ['Aerindril', 'Caelynn', 'Thalanil', 'Eldarin', 'Sylvaria'],
  Dwarf: ['Thorin', 'Dwalin', 'Balin', 'Gimli', 'Thrain'],
  Halfling: ['Bilbo', 'Frodo', 'Sam', 'Pippin', 'Merry'],
  Gnome: ['Fizban', 'Wilby', 'Zigby', 'Tinker', 'Wobble'],
  'Half-Elf': ['Aelor', 'Shaera', 'Tyrion', 'Lyra', 'Varis'],
  'Half-Orc': ['Grok', 'Thokk', 'Azka', 'Morg', 'Karg']
};

const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const rollStat = () => {
  // 4d6 drop lowest
  const rolls = Array(4).fill(0).map(() => randomInt(1, 6));
  rolls.sort((a, b) => b - a);
  return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
};

const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const generateStartingEquipment = (characterClass: string): string[] => {
  const basicEquipment = ['Backpack', 'Bedroll', 'Waterskin'];
  const classEquipment: Record<string, string[]> = {
    Fighter: ['Longsword', 'Shield', 'Chain mail'],
    Wizard: ['Quarterstaff', 'Spellbook', 'Component pouch'],
    Rogue: ['Shortsword', 'Leather armor', 'Thieves\' tools'],
    Cleric: ['Mace', 'Scale mail', 'Holy symbol'],
    Ranger: ['Longbow', 'Leather armor', 'Quiver of arrows'],
    Paladin: ['Longsword', 'Chain mail', 'Holy symbol'],
    Barbarian: ['Greataxe', 'Hide armor', 'Explorer\'s pack']
  };

  return [...basicEquipment, ...(classEquipment[characterClass] || [])];
};

export const generateCharacterSheet = (): string => {
  const race = getRandomItem(races);
  const characterClass = getRandomItem(classes);
  const name = getRandomItem(names[race as keyof typeof names]);
  const stats = {
    Str: rollStat(),
    Dex: rollStat(),
    Con: rollStat(),
    Int: rollStat(),
    Wis: rollStat(),
    Cha: rollStat()
  };
  
  const equipment = generateStartingEquipment(characterClass);
  const baseHP = characterClass === 'Wizard' ? 6 : 
                 characterClass === 'Barbarian' ? 12 : 
                 characterClass === 'Fighter' || characterClass === 'Paladin' ? 10 : 8;
  const hp = baseHP + Math.floor((stats.Con - 10) / 2);
  
  return `# Character Sheet

## Basic Info
Name: ${name}
Class: ${characterClass}
Level: 1
Race: ${race}

## Stats
HP: ${hp}/${hp}
AC: ${10 + Math.floor((stats.Dex - 10) / 2)}
Str: ${stats.Str}
Dex: ${stats.Dex}
Con: ${stats.Con}
Int: ${stats.Int}
Wis: ${stats.Wis}
Cha: ${stats.Cha}

## Equipment
${equipment.map(item => `- ${item}`).join('\n')}

## Inventory
- Coins: ${randomInt(2, 20)} gold pieces

## Status
- None

## Notes
- Character created on ${new Date().toISOString().split('T')[0]}`;
};