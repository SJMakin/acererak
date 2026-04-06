// Sheet templates for the generic markdown-based content pad system

export type TemplateId = 'dnd5e' | 'pf2e' | 'osr' | 'blank' | 'token-stat' | 'location' | 'note';

export interface SheetTemplate {
  id: TemplateId;
  name: string;
  description: string;
  content: string; // TipTap JSON document
  defaultStats: Record<string, string | number>;
  category?: string;
}

export const sheetTemplates: SheetTemplate[] = [
  {
    id: 'dnd5e',
    name: 'D&D 5e',
    description: 'Standard Dungeons & Dragons 5th Edition character sheet',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{Character Name}' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Level {Level} ' },
            { type: 'text', marks: [{ type: 'italic' }], text: '{Race} {Class}' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Core Stats' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'HP:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{HP}' },
            { type: 'text', text: ' / MaxHP:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{MaxHP}' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'AC:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{AC}' },
            { type: 'text', text: ' | Speed:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{Speed}' },
            { type: 'text', text: ' ft' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Proficiency Bonus:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{Proficiency}' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Ability Scores' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'STR:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{STR}' },
            { type: 'text', text: ' (' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{STR_mod}' },
            { type: 'text', text: ') | DEX:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{DEX}' },
            { type: 'text', text: ' (' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{DEX_mod}' },
            { type: 'text', text: ')' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'CON:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{CON}' },
            { type: 'text', text: ' (' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{CON_mod}' },
            { type: 'text', text: ') | INT:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{INT}' },
            { type: 'text', text: ' (' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{INT_mod}' },
            { type: 'text', text: ')' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'WIS:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{WIS}' },
            { type: 'text', text: ' (' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{WIS_mod}' },
            { type: 'text', text: ') | CHA:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{CHA}' },
            { type: 'text', text: ' (' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{CHA_mod}' },
            { type: 'text', text: ')' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Skills & Saves' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Saving Throws: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'STR_save' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'DEX_save' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'CON_save' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'INT_save' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'WIS_save' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'CHA_save' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Actions & Abilities' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Add your character abilities here using transclusion: !{[[Ability Name]]}' }],
        },
      ],
    }),
    defaultStats: {
      HP: 10,
      MaxHP: 10,
      AC: 10,
      Speed: 30,
      Proficiency: 2,
      Level: 1,
      STR: 10,
      DEX: 10,
      CON: 10,
      INT: 10,
      WIS: 10,
      CHA: 10,
    },
  },
  {
    id: 'pf2e',
    name: 'Pathfinder 2e',
    description: 'Pathfinder Second Edition character sheet',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{Character Name}' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Level {Level} ' },
            { type: 'text', marks: [{ type: 'italic' }], text: '{Ancestry} {Class}' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Defenses & Health' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'HP:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{HP}' },
            { type: 'text', text: ' / MaxHP:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{MaxHP}' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'AC:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{AC}' },
            { type: 'text', text: ' | Fortitude:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{Fort}' },
            { type: 'text', text: ' | Reflex:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{Ref}' },
            { type: 'text', text: ' | Will:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{Will}' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Perception:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{Perception}' },
            { type: 'text', text: ' | Speed:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{Speed}' },
            { type: 'text', text: ' ft' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Ability Scores' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'STR:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{STR}' },
            { type: 'text', text: ' | DEX:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{DEX}' },
            { type: 'text', text: ' | CON:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{CON}' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'INT:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{INT}' },
            { type: 'text', text: ' | WIS:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{WIS}' },
            { type: 'text', text: ' | CHA:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{CHA}' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Class DC & Proficiency' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'ClassDC:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{ClassDC}' },
            { type: 'text', text: ' | PROF:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '+{PROF}' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Resources' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'HeroPoints:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{HeroPoints}' },
            { type: 'text', text: ' | FocusPoints:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{FocusPoints}' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Actions & Feats' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Add strikes, spells, and class feats here.' }],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Skills' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Acrobatics, Arcana, Athletics, Crafting, Deception, Diplomacy, Intimidation, Lore, Medicine, Nature, Occultism, Performance, Religion, Society, Stealth, Survival, Thievery' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Equipment & Notes' }],
        },
      ],
    }),
    defaultStats: {
      HP: 20,
      MaxHP: 20,
      AC: 15,
      Fort: 5,
      Ref: 5,
      Will: 5,
      Perception: 5,
      Speed: 25,
      STR: 10,
      DEX: 10,
      CON: 10,
      INT: 10,
      WIS: 10,
      CHA: 10,
      ClassDC: 15,
      PROF: 2,
      Level: 1,
      HeroPoints: 1,
      FocusPoints: 0,
    },
  },
  {
    id: 'osr',
    name: 'OSR',
    description: 'Old-School Revival - Simple stat block',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{Character Name}' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '{Class} ' },
            { type: 'text', marks: [{ type: 'italic' }], text: 'Level {Level}' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'HP:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{HP}' },
            { type: 'text', text: ' / MaxHP:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{MaxHP}' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'AC:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{AC}' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'STR:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{STR}' },
            { type: 'text', text: ' | DEX:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{DEX}' },
            { type: 'text', text: ' | WIL:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{WIL}' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Equipment & Notes' }],
        },
      ],
    }),
    defaultStats: {
      HP: 4,
      MaxHP: 4,
      AC: 9,
      STR: 12,
      DEX: 12,
      WIL: 10,
      Level: 1,
    },
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    content: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    }),
    defaultStats: {},
  },
  {
    id: 'token-stat',
    name: 'Token Stat Block',
    description: 'Simple stat block for tokens on the canvas',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{Token Name}' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'HP:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{HP}' },
            { type: 'text', text: ' / MaxHP:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{MaxHP}' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'AC:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{AC}' },
            { type: 'text', text: ' | Speed:: ' },
            { type: 'text', marks: [{ type: 'bold' }], text: '{Speed}' },
            { type: 'text', text: ' ft' },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Abilities' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Add abilities and actions here.' }],
        },
      ],
    }),
    defaultStats: {
      HP: 10,
      MaxHP: 10,
      AC: 10,
      Speed: 30,
    },
    category: 'Token',
  },
  {
    id: 'location',
    name: 'Location',
    description: 'A location or place in the world',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{Location Name}' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Describe this location...' }],
        },
      ],
    }),
    defaultStats: {},
    category: 'Location',
  },
  {
    id: 'note',
    name: 'Note',
    description: 'A simple note or reminder',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{Note Title}' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Write your note here...' }],
        },
      ],
    }),
    defaultStats: {},
    category: 'Note',
  },
];

export function getTemplateById(id: TemplateId): SheetTemplate | undefined {
  return sheetTemplates.find((template) => template.id === id);
}

export function getAllTemplates(): SheetTemplate[] {
  return sheetTemplates;
}
