import OpenAI from 'openai';
import { ModelOption } from '../contexts/ModelContext';

const API_KEY = import.meta.env.VITE_OPENROUTER_KEY || 'missing-key';

// Use the OpenAI client with OpenRouter base URL
const openRouter = new OpenAI({
  apiKey: API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  dangerouslyAllowBrowser: true // Allow client to run in browser environment
});

// Store the current model for character generation
let currentModel: ModelOption | null = null;

// Function to set the current model
export function setCurrentModel(model: ModelOption): void {
  currentModel = model;
  console.log(`Character generation service using model: ${model.name} (${model.id})`);
}

export interface CharacterGenerationOptions {
  system: string;
  preferences?: string;
}

export async function generateAICharacterSheet(options: CharacterGenerationOptions): Promise<string> {
  try {
    if (!currentModel) {
      throw new Error('Model not set - please set a model before generating character');
    }

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

## Actions
[List 3-5 combat actions with clear dice notation]
- [Action Name]: [Brief description with dice notation like "1d8+3 slashing damage"]
- [Spell Name]: [Brief description with dice notation like "3d6 fire damage"]
- [Special Ability]: [Brief description of what it does]

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

    // Using the OpenAI client with OpenRouter
    const response = await openRouter.chat.completions.create({
      model: currentModel.id,
      messages: [
        { role: 'system', content: 'You are creating a detailed character sheet for a roleplaying game.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      top_p: 0.95
    });

    // Extract the text from the response
    const characterSheet = response.choices[0].message.content || '';
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

## Actions
- Sword Strike: Attack with sword (1d8+2 slashing damage)
- Shield Bash: Bash with shield (1d4+2 bludgeoning damage)
- Second Wind: Regain 1d10+1 hit points

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
