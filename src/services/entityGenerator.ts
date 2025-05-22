import { Entity } from '../types';
import OpenAI from 'openai';
import { ModelOption } from '../contexts/ModelContext';

// Get API key from localStorage
const getApiKey = (): string => {
  return localStorage.getItem('openRouterApiKey') || '';
};

// Create a function to get OpenAI client with current API key
const getOpenRouterClient = (): OpenAI => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('OpenRouter API key is required. Please add your API key in settings.');
  }
  
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true // Allow client to run in browser environment
  });
};

// Store the current model for entity generation
let currentModel: ModelOption | null = null;

// Function to set the current model
export function setCurrentModel(model: ModelOption): void {
  currentModel = model;
  console.log(`Entity generation service using model: ${model.name} (${model.id})`);
}

interface EntityGenerationParams {
  type: 'npc' | 'enemy';
  role?: string;  // e.g. "merchant", "guard", "cultist"
  level?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  context?: string;  // Story context for thematic appropriateness
}

export async function generateEntity(params: EntityGenerationParams): Promise<Entity> {
  try {
    if (!currentModel) {
      throw new Error('Model not set - please set a model before generating entity');
    }

    const prompt = `Generate a ${params.type === 'npc' ? 'non-player character' : 'enemy'} for a D&D game.

Parameters:
${params.role ? `Role: ${params.role}` : ''}
${params.level ? `Level: ${params.level}` : ''}
${params.difficulty ? `Difficulty: ${params.difficulty}` : ''}
${params.context ? `Context: ${params.context}` : ''}

Create a character sheet in this markdown format:

For NPCs:
# NPC Sheet
Name: {creative and descriptive name that reflects their role}
Role: {role or occupation}
Level: {1-20}

## Stats
HP: {current}/{max}
AC: {number}
Initiative: {modifier}

## Actions
- {action_name}: {dice_roll} {damage_type}
(2-3 actions that make sense for their role, with clear dice notation like "1d8+2")

## Personality
- {key traits and motivations}

## Status
- {current conditions if any}

For Enemies:
# Enemy Sheet
Name: {descriptive and memorable name - NOT generic like "Goblin" but specific like "Razortooth the Goblin Chieftain"}
Type: {creature type with specific variant}
Challenge: {easy/medium/hard}

## Combat Stats
HP: {current}/{max}
AC: {number}
Initiative: {modifier}

## Attacks
- {specific attack name}: {dice_roll} {damage_type}
(2-4 attacks depending on difficulty, with clear dice notation like "2d6+3")

## Special Abilities
- {specific ability name}: {detailed description of what it does}
(1-3 special abilities)

## Status
- {current conditions if any}

Make it interesting and thematic. For enemies, scale stats and abilities based on difficulty:
- Easy: ~30-50 HP, AC 12-14, 1-2 basic attacks
- Medium: ~60-100 HP, AC 14-16, 2-3 attacks + 1 special ability
- Hard: ~120-200 HP, AC 16-18, 3-4 attacks + 2-3 special abilities

IMPORTANT: Give enemies distinctive, memorable names that reflect their nature and role. Avoid generic names like "Goblin" or "Orc" - instead use specific names like "Grimfang the Orc Warlord" or "Zik'thar the Venomous Spider Queen".`;

    console.log('Entity generation prompt:', {
      type: params.type,
      role: params.role,
      level: params.level,
      difficulty: params.difficulty,
      context: params.context
    });

    const openRouter = getOpenRouterClient();
    // Using the OpenAI client with OpenRouter
    const response = await openRouter.chat.completions.create({
      model: currentModel.id,
      messages: [
        {
          role: 'system',
          content: `You are generating a ${params.type === 'npc' ? 'non-player character' : 'enemy'} for a D&D game.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      top_p: 0.95
    });

    // Extract the text from the response
    const sheet = response.choices[0].message.content || '';
    console.log('Entity generation response:', sheet);

    // Validate the generated sheet has the required sections
    if (!sheet.includes('HP:') || !sheet.includes('AC:')) {
      console.error('Invalid entity sheet:', sheet);
      throw new Error('Generated sheet missing required stats');
    }

    const id = `${params.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const entity: Entity = {
      id,
      type: params.type,  // params.type is already correctly typed as 'npc' | 'enemy'
      sheet,
    };

    console.log('Generated entity:', entity);
    return entity;
  } catch (error) {
    console.error('Error generating entity:', error);
    throw new Error(
      error instanceof Error
        ? `Entity generation failed: ${error.message}`
        : 'Failed to generate entity due to an unknown error'
    );
  }
}

export async function generateEnemyGroup(
  params: {
    enemies: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    environment?: string;
    context?: string;
  }
): Promise<Entity[]> {
  try {
    return await Promise.all(
      params.enemies.map(role =>
        generateEntity({
          type: 'enemy',
          role,
          difficulty: params.difficulty,
          context: `${params.environment ? `Environment: ${params.environment}. ` : ''}${
            params.context || ''
          }`,
        })
      )
    );
  } catch (error) {
    console.error('Error generating enemy group:', error);
    throw error;
  }
}
