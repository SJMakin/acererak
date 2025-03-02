const backgrounds = [
  'Acolyte',
  'Criminal',
  'Folk Hero',
  'Noble',
  'Sage',
  'Soldier',
  'Hermit',
  'Outlander',
  'Sailor',
  'Merchant',
];

const feats = [
  'Alert',
  'Athlete',
  'Actor',
  'Charger',
  'Crossbow Expert',
  'Defensive Duelist',
  'Dual Wielder',
  'Dungeon Delver',
  'Durable',
  'Elemental Adept',
  'Grappler',
  'Great Weapon Master',
  'Healer',
  'Heavy Armor Master',
  'Inspiring Leader',
  'Lucky',
  'Mage Slayer',
  'Magic Initiate',
  'Martial Adept',
  'Mobile',
  'Mounted Combatant',
  'Observant',
  'Polearm Master',
  'Resilient',
  'Ritual Caster',
  'Savage Attacker',
  'Sentinel',
  'Sharpshooter',
  'Shield Master',
  'Skilled',
  'Skulker',
  'Spell Sniper',
  'Tough',
  'War Caster',
];

const races = [
  'Human',
  'Elf',
  'Dwarf',
  'Halfling',
  'Gnome',
  'Half-Elf',
  'Half-Orc',
  'Tiefling',
  'Dragonborn',
  'Aasimar',
];
const classes = [
  'Fighter',
  'Wizard',
  'Rogue',
  'Cleric',
  'Ranger',
  'Paladin',
  'Barbarian',
  'Druid',
  'Sorcerer',
  'Warlock',
  'Monk',
  'Artificer',
];
const names = {
  Human: ['John', 'Mary', 'James', 'Sarah', 'William', 'Elizabeth'],
  Elf: ['Aerindril', 'Caelynn', 'Thalanil', 'Eldarin', 'Sylvaria'],
  Dwarf: ['Thorin', 'Dwalin', 'Balin', 'Gimli', 'Thrain'],
  Halfling: ['Bilbo', 'Frodo', 'Sam', 'Pippin', 'Merry'],
  Gnome: ['Fizban', 'Wilby', 'Zigby', 'Tinker', 'Wobble'],
  'Half-Elf': ['Aelor', 'Shaera', 'Tyrion', 'Lyra', 'Varis'],
  'Half-Orc': ['Grok', 'Thokk', 'Azka', 'Morg', 'Karg'],
  Tiefling: ['Ash', 'Malice', 'Shade', 'Crimson', 'Raven'],
  Dragonborn: ['Kharax', 'Rhogar', 'Vex', 'Donaar', 'Kriv'],
  Aasimar: ['Celeste', 'Lucius', 'Seraph', 'Aurora', 'Dawnstar'],
};

const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const rollStat = () => {
  // 4d6 drop lowest
  const rolls = Array(4)
    .fill(0)
    .map(() => randomInt(1, 6));
  rolls.sort((a, b) => b - a);
  return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
};

const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const racialTraits: Record<string, string[]> = {
  Human: ['Versatile (+1 to all abilities)', 'Extra Language'],
  Elf: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'],
  Dwarf: [
    'Darkvision',
    'Dwarven Resilience',
    'Stonecunning',
    'Tool Proficiency',
  ],
  Halfling: ['Lucky', 'Brave', 'Halfling Nimbleness'],
  Gnome: ['Darkvision', 'Gnome Cunning', 'Small Size'],
  'Half-Elf': ['Darkvision', 'Fey Ancestry', 'Skill Versatility'],
  'Half-Orc': ['Darkvision', 'Relentless Endurance', 'Savage Attacks'],
  Tiefling: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'],
  Dragonborn: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
  Aasimar: [
    'Darkvision',
    'Celestial Resistance',
    'Healing Hands',
    'Light Bearer',
  ],
};

const classSkillChoices: Record<string, string[]> = {
  Fighter: [
    'Acrobatics',
    'Animal Handling',
    'Athletics',
    'History',
    'Insight',
    'Intimidation',
    'Perception',
    'Survival',
  ],
  Wizard: [
    'Arcana',
    'History',
    'Insight',
    'Investigation',
    'Medicine',
    'Religion',
  ],
  Rogue: [
    'Acrobatics',
    'Athletics',
    'Deception',
    'Insight',
    'Intimidation',
    'Investigation',
    'Perception',
    'Performance',
    'Persuasion',
    'Sleight of Hand',
    'Stealth',
  ],
  Cleric: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
  Ranger: [
    'Animal Handling',
    'Athletics',
    'Insight',
    'Investigation',
    'Nature',
    'Perception',
    'Stealth',
    'Survival',
  ],
  Paladin: [
    'Athletics',
    'Insight',
    'Intimidation',
    'Medicine',
    'Persuasion',
    'Religion',
  ],
  Barbarian: [
    'Animal Handling',
    'Athletics',
    'Intimidation',
    'Nature',
    'Perception',
    'Survival',
  ],
  Druid: [
    'Arcana',
    'Animal Handling',
    'Insight',
    'Medicine',
    'Nature',
    'Perception',
    'Religion',
    'Survival',
  ],
  Sorcerer: [
    'Arcana',
    'Deception',
    'Insight',
    'Intimidation',
    'Persuasion',
    'Religion',
  ],
  Warlock: [
    'Arcana',
    'Deception',
    'History',
    'Intimidation',
    'Investigation',
    'Nature',
    'Religion',
  ],
  Monk: [
    'Acrobatics',
    'Athletics',
    'History',
    'Insight',
    'Religion',
    'Stealth',
  ],
  Artificer: [
    'Arcana',
    'History',
    'Investigation',
    'Medicine',
    'Nature',
    'Perception',
    'Sleight of Hand',
  ],
};

const classFeatures: Record<string, string[]> = {
  Fighter: ['Second Wind', 'Fighting Style: Defense'],
  Wizard: ['Arcane Recovery', 'Spellcasting'],
  Rogue: ['Sneak Attack', "Thieves's Cant"],
  Cleric: ['Divine Domain', 'Spellcasting'],
  Ranger: ['Favored Enemy', 'Natural Explorer'],
  Paladin: ['Divine Sense', 'Lay on Hands'],
  Barbarian: ['Rage', 'Unarmored Defense'],
  Druid: ['Druidic', 'Spellcasting', 'Wild Shape'],
  Sorcerer: ['Sorcerous Origin', 'Spellcasting'],
  Warlock: ['Otherworldly Patron', 'Pact Magic'],
  Monk: ['Unarmored Defense', 'Martial Arts'],
  Artificer: ['Magical Tinkering', 'Spellcasting'],
};

const getSkillProficiencies = (
  characterClass: string,
  background: string
): string[] => {
  const numClassSkills = characterClass === 'Rogue' ? 4 : 2;
  const classSkills = [];
  const availableSkills = [...classSkillChoices[characterClass]];

  for (let i = 0; i < numClassSkills; i++) {
    if (availableSkills.length > 0) {
      const index = Math.floor(Math.random() * availableSkills.length);
      classSkills.push(availableSkills.splice(index, 1)[0]);
    }
  }

  // Add background skills
  const backgroundSkills: Record<string, string[]> = {
    Acolyte: ['Insight', 'Religion'],
    Criminal: ['Deception', 'Stealth'],
    'Folk Hero': ['Animal Handling', 'Survival'],
    Noble: ['History', 'Persuasion'],
    Sage: ['Arcana', 'History'],
    Soldier: ['Athletics', 'Intimidation'],
    Hermit: ['Medicine', 'Religion'],
    Outlander: ['Athletics', 'Survival'],
    Sailor: ['Athletics', 'Perception'],
    Merchant: ['Persuasion', 'Insight'],
  };

  return [
    ...new Set([...classSkills, ...(backgroundSkills[background] || [])]),
  ];
};

const getFeats = (race: string, characterClass: string): string[] => {
  const numFeats = race === 'Human' ? 1 : 0; // Variant humans get a feat
  if (numFeats === 0) return [];

  // Filter feats based on class suitability
  let suitableFeats = [...feats];
  if (
    characterClass === 'Wizard' ||
    characterClass === 'Sorcerer' ||
    characterClass === 'Warlock'
  ) {
    suitableFeats = suitableFeats.filter(
      feat =>
        ![
          'Heavy Armor Master',
          'Great Weapon Master',
          'Shield Master',
        ].includes(feat)
    );
  }

  const selectedFeats = [];
  for (let i = 0; i < numFeats; i++) {
    const index = Math.floor(Math.random() * suitableFeats.length);
    selectedFeats.push(suitableFeats.splice(index, 1)[0]);
  }

  return selectedFeats;
};

const generateStartingEquipment = (characterClass: string): string[] => {
  const basicEquipment = ['Backpack', 'Bedroll', 'Waterskin'];
  const classEquipment: Record<string, string[]> = {
    Fighter: ['Longsword', 'Shield', 'Chain mail'],
    Wizard: ['Quarterstaff', 'Spellbook', 'Component pouch'],
    Rogue: ['Shortsword', 'Leather armor', "Thieves' tools"],
    Cleric: ['Mace', 'Scale mail', 'Holy symbol'],
    Ranger: ['Longbow', 'Leather armor', 'Quiver of arrows'],
    Paladin: ['Longsword', 'Chain mail', 'Holy symbol'],
    Barbarian: ['Greataxe', 'Hide armor', "Explorer's pack"],
    Druid: ['Wooden shield', 'Scimitar', 'Leather armor', 'Druidic focus'],
  };

  return [...basicEquipment, ...(classEquipment[characterClass] || [])];
};

const getBackgroundFeatures = (background: string): string[] => {
  const features: Record<string, string[]> = {
    Acolyte: ['Shelter of the Faithful', 'Languages: Two of your choice'],
    Criminal: ['Criminal Contact', 'Gaming set proficiency'],
    'Folk Hero': ['Rustic Hospitality', 'Land vehicle proficiency'],
    Noble: ['Position of Privilege', 'Gaming set proficiency'],
    Sage: ['Researcher', 'Languages: Two of your choice'],
    Soldier: ['Military Rank', 'Gaming set proficiency'],
    Hermit: ['Discovery', 'Herbalism kit proficiency'],
    Outlander: ['Wanderer', 'Musical instrument proficiency'],
    Sailor: ["Ship's Passage", "Navigator's tools proficiency"],
    Merchant: ['Guild Membership', 'Negotiation proficiency'],
  };
  return features[background] || [];
};

const getLanguages = (race: string): string[] => {
  const commonLanguages = [
    'Common',
    'Dwarvish',
    'Elvish',
    'Halfling',
    'Gnomish',
    'Draconic',
  ];
  const languages = ['Common'];

  const racialLanguages: Record<string, string[]> = {
    Elf: ['Elvish'],
    Dwarf: ['Dwarvish'],
    'Half-Elf': ['Elvish'],
    Tiefling: ['Infernal'],
    Dragonborn: ['Draconic'],
  };

  if (racialLanguages[race]) {
    languages.push(...racialLanguages[race]);
  }

  // Some races get extra languages
  const extraLanguages = race === 'Human' ? 1 : 0;
  for (let i = 0; i < extraLanguages; i++) {
    const availableLanguages = commonLanguages.filter(
      lang => !languages.includes(lang)
    );
    if (availableLanguages.length > 0) {
      languages.push(getRandomItem(availableLanguages));
    }
  }

  return languages;
};

// Generate class-specific actions
const generateClassActions = (characterClass: string): string[] => {
  const actions: string[] = [];
  
  switch(characterClass) {
    case 'Fighter':
      actions.push(
        'Sword Slash: Attack with sword (1d8+2 slashing damage)',
        'Shield Bash: Bash with shield (1d4+2 bludgeoning damage)',
        'Second Wind: Regain 1d10+1 hit points'
      );
      break;
    case 'Wizard':
      actions.push(
        'Magic Missile: Cast Magic Missile spell (1d4+1 force damage)',
        'Fire Bolt: Cast Fire Bolt cantrip (1d10 fire damage)',
        'Staff Strike: Hit with quarterstaff (1d6 bludgeoning damage)'
      );
      break;
    case 'Rogue':
      actions.push(
        'Sneak Attack: Attack with advantage (1d8+1d6+2 piercing damage)',
        'Dagger Throw: Throw dagger (1d4+2 piercing damage)',
        'Cunning Action: Bonus action to Dash, Disengage, or Hide'
      );
      break;
    case 'Cleric':
      actions.push(
        'Mace Strike: Hit with mace (1d6+1 bludgeoning damage)',
        'Healing Word: Cast Healing Word spell (1d4+3 healing)',
        'Sacred Flame: Cast Sacred Flame cantrip (1d8 radiant damage)'
      );
      break;
    case 'Ranger':
      actions.push(
        'Longbow Shot: Fire arrow (1d8+2 piercing damage)',
        'Shortsword Strike: Attack with shortsword (1d6+2 piercing damage)',
        'Hunter\'s Mark: Mark target for extra 1d6 damage on hits'
      );
      break;
    case 'Paladin':
      actions.push(
        'Longsword Strike: Attack with longsword (1d8+2 slashing damage)',
        'Divine Smite: Add 2d8 radiant damage to a successful attack',
        'Lay on Hands: Heal for 5 hit points'
      );
      break;
    case 'Barbarian':
      actions.push(
        'Greataxe Swing: Attack with greataxe (1d12+3 slashing damage)',
        'Reckless Attack: Advantage on attack rolls, but attacks against you have advantage',
        'Rage: +2 damage on melee attacks and resistance to physical damage'
      );
      break;
    case 'Druid':
      actions.push(
        'Shillelagh: Enchanted staff attack (1d8+3 bludgeoning damage)',
        'Produce Flame: Fiery ranged attack (1d8 fire damage)',
        'Healing Word: Cast Healing Word spell (1d4+3 healing)'
      );
      break;
    case 'Sorcerer':
      actions.push(
        'Chromatic Orb: Cast spell (3d8 elemental damage)',
        'Fire Bolt: Cast Fire Bolt cantrip (1d10 fire damage)',
        'Shield: Reaction to increase AC by 5 until next turn'
      );
      break;
    case 'Warlock':
      actions.push(
        'Eldritch Blast: Cast cantrip (1d10 force damage)',
        'Hex: Mark target to take extra 1d6 necrotic damage',
        'Dagger Strike: Attack with dagger (1d4+2 piercing damage)'
      );
      break;
    case 'Monk':
      actions.push(
        'Unarmed Strike: Martial arts attack (1d4+2 bludgeoning damage)',
        'Flurry of Blows: Two bonus unarmed strikes (1d4+2 each)',
        'Deflect Missiles: Reduce ranged attack damage by 1d10+5'
      );
      break;
    case 'Artificer':
      actions.push(
        'Fire Bolt: Cast Fire Bolt cantrip (1d10 fire damage)',
        'Thunderwave: Cast Thunderwave spell (2d8 thunder damage)',
        'Warhammer Strike: Attack with warhammer (1d8+1 bludgeoning damage)'
      );
      break;
    default:
      actions.push(
        'Basic Attack: Attack with weapon (1d8 damage)',
        'Dodge: Take the Dodge action',
        'Use Item: Use an item from inventory'
      );
  }
  
  return actions;
};

export const generateCharacterSheet = (): string => {
  const race = getRandomItem(races);
  const background = getRandomItem(backgrounds);
  const characterClass = getRandomItem(classes);
  const name = getRandomItem(names[race as keyof typeof names]);
  const stats = {
    Str: rollStat(),
    Dex: rollStat(),
    Con: rollStat(),
    Int: rollStat(),
    Wis: rollStat(),
    Cha: rollStat(),
  };

  const equipment = generateStartingEquipment(characterClass);
  const baseHP =
    characterClass === 'Wizard'
      ? 6
      : characterClass === 'Barbarian'
        ? 12
        : characterClass === 'Fighter' || characterClass === 'Paladin'
          ? 10
          : 8;
  const hp = baseHP + Math.floor((stats.Con - 10) / 2);
  
  // Generate actions based on class
  const actions = generateClassActions(characterClass);

  return `# Character Sheet

## Basic Info
Name: ${name}
Class: ${characterClass}
Level: 1 (XP:0/300)
Race: ${race}
Background: ${background}

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

## Actions
${actions.map(action => `- ${action}`).join('\n')}

## Class Features
${classFeatures[characterClass]?.map(feature => `- ${feature}`).join('\n') || '- None'}

## Background Features
${getBackgroundFeatures(background)
  .map(feature => `- ${feature}`)
  .join('\n')}

## Racial Traits
${racialTraits[race]?.map(trait => `- ${trait}`).join('\n') || '- None'}

## Skill Proficiencies
${getSkillProficiencies(characterClass, background)
  .map(skill => `- ${skill}`)
  .join('\n')}

## Languages
${getLanguages(race)
  .map(lang => `- ${lang}`)
  .join('\n')}

## Feats
${
  getFeats(race, characterClass)
    .map(feat => `- ${feat}`)
    .join('\n') || '- None'
}

## Notes
- Character created on ${new Date().toISOString().split('T')[0]}`;
};
