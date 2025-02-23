import { Entity } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || 'dummy-key');

interface EntityGenerationParams {
  type: 'npc' | 'enemy';
  role?: string;  // e.g. "merchant", "guard", "cultist"
  level?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  context?: string;  // Story context for thematic appropriateness
}

export async function generateEntity(params: EntityGenerationParams): Promise<Entity> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate a ${params.type === 'npc' ? 'non-player character' : 'enemy'} for a D&D game.

Parameters:
${params.role ? `Role: ${params.role}` : ''}
${params.level ? `Level: ${params.level}` : ''}
${params.difficulty ? `Difficulty: ${params.difficulty}` : ''}
${params.context ? `Context: ${params.context}` : ''}

Create a character sheet in this markdown format:

For NPCs:
# NPC Sheet
Name: {creative name}
Role: {role or occupation}
Level: {1-20}

## Stats
HP: {current}/{max}
AC: {number}
Initiative: {modifier}

## Actions
- {action_name}: {dice_roll} {damage_type}
(2-3 actions that make sense for their role)

## Personality
- {key traits and motivations}

## Status
- {current conditions if any}

For Enemies:
# Enemy Sheet
Name: {creative name}
Type: {creature type}
Challenge: {easy/medium/hard}

## Combat Stats
HP: {current}/{max}
AC: {number}
Initiative: {modifier}

## Attacks
- {attack_name}: {dice_roll} {damage_type}
(2-4 attacks depending on difficulty)

## Special Abilities
- {ability_name}: {description}
(1-3 special abilities)

## Status
- {current conditions if any}

Make it interesting and thematic. For enemies, scale stats and abilities based on difficulty:
- Easy: ~30-50 HP, AC 12-14, 1-2 basic attacks
- Medium: ~60-100 HP, AC 14-16, 2-3 attacks + 1 special ability
- Hard: ~120-200 HP, AC 16-18, 3-4 attacks + 2-3 special abilities`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const sheet = result.response.text();

    // Validate the generated sheet has the required sections
    if (!sheet.includes('HP:') || !sheet.includes('AC:')) {
      throw new Error('Generated sheet missing required stats');
    }

    const id = `${params.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      type: params.type === 'npc' ? 'npc' : 'enemy',
      sheet,
    };
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
