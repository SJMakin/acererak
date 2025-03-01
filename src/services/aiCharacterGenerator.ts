import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || 'dummy-key');

export interface CharacterGenerationOptions {
  system: string;
  preferences?: string;
}

export async function generateAICharacterSheet(options: CharacterGenerationOptions): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Build the prompt based on the RPG system and any user preferences
    const prompt = `Create a detailed character sheet for a ${options.system} roleplaying game. 
${options.preferences ? `Player preferences: ${options.preferences}` : 'Create a completely random character.'}

The character sheet should be in Markdown format with the following structure:
# Character Sheet

## Basic Info
[Include name, class/archetype, level, race/species, background, etc. appropriate for the system]

## Stats
[Include primary statistics, health points, armor/defense, and other system-specific attributes]

## Equipment
[List starting equipment, weapons, armor, and items]

## Inventory
[Include any additional items, currency, etc.]

## Status
[Current conditions, if any]

## Abilities & Features
[List class features, racial traits, special abilities, etc.]

## Skills & Proficiencies
[List skills, proficiencies, talents, etc.]

## Background & Personality
[Brief character background and personality traits]

## Notes
[Any additional information relevant to the character]

Make sure the character is balanced and playable for a beginning adventure. Include all necessary details that would be found on a standard character sheet for ${options.system}.
Format everything in clean, readable Markdown that will display well when rendered.`;

    console.log('Character generation prompt:', prompt);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const characterSheet = result.response.text();
    console.log('Generated character sheet');
    return characterSheet;
  } catch (error) {
    console.error('Character generation failed:', error);
    return generateFallbackCharacterSheet(options.system);
  }
}

// Fallback function in case the AI generation fails
function generateFallbackCharacterSheet(system: string): string {
  return `# Character Sheet

## Basic Info
Name: Adventurer
System: ${system}
Class: Warrior
Level: 1
Race: Human
Background: Traveler

## Stats
HP: 10/10
Defense: 12
Strength: 14
Dexterity: 12
Constitution: 13
Intelligence: 10
Wisdom: 11
Charisma: 10

## Equipment
- Simple sword
- Leather armor
- Backpack
- Waterskin

## Inventory
- 10 gold pieces
- Torch
- Flint and steel

## Status
- None

## Abilities & Features
- Basic Combat Training
- Endurance

## Skills & Proficiencies
- Athletics
- Survival
- Intimidation

## Background & Personality
A simple traveler seeking adventure and fortune.

## Notes
- This is a fallback character sheet generated when AI generation failed.
- Please try again or create your own character.`;
}
