// Character templates for the Reactive Character Sheet System

export type TemplateId = 'dnd5e' | 'osr' | 'blank';

export interface CharacterTemplate {
  id: TemplateId;
  name: string;
  description: string;
  content: string; // TipTap JSON document
  defaultStats: Record<string, string | number>;
}

export const characterTemplates: CharacterTemplate[] = [
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
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '{Character Name}' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Add your character details here. Use ' },
            { type: 'text', marks: [{ type: 'code' }], text: 'StatName:: value' },
            { type: 'text', text: ' to declare stats, and ' },
            { type: 'text', marks: [{ type: 'code' }], text: '{{ formula }}' },
            { type: 'text', text: ' for expressions.' },
          ],
        },
      ],
    }),
    defaultStats: {},
  },
];

export function getTemplateById(id: TemplateId): CharacterTemplate | undefined {
  return characterTemplates.find((template) => template.id === id);
}

export function getAllTemplates(): CharacterTemplate[] {
  return characterTemplates;
}
