import { Entity } from '../types';
import { ModelOption } from '../contexts/ModelContext';
import {
  getOpenRouterClient,
  setCurrentModel as setSharedModel,
  getCurrentModel,
} from './openRouterClient';

// Re-export setCurrentModel for backward compatibility
export function setCurrentModel(model: ModelOption): void {
  setSharedModel(model);
}

interface EntityGenerationParams {
  type: 'npc' | 'enemy';
  role?: string; // e.g. "merchant", "guard", "cultist"
  level?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  context?: string; // Story context for thematic appropriateness
}

export async function generateEntity(
  params: EntityGenerationParams
): Promise<Entity> {
  try {
    const currentModel = getCurrentModel();

    const prompt = `${params.type === 'npc' ? 'NPC' : 'ENEMY'} for dark D&D.
${params.role ? `Role: ${params.role}` : ''}${params.level ? ` | Lvl ${params.level}` : ''}${params.difficulty ? ` | ${params.difficulty}` : ''}
${params.context ? `Context: ${params.context}` : ''}

Markdown format:

NPCs:
# NPC Sheet
Name: {DISTINCT name}
Role: {role}
Level: {1-20}
## Stats
HP: {curr}/{max} | AC: {#} | Init: {+/-#}
## Actions
- {action}: {dice} {type}
(2-3 actions, dice notation: 1d8+2)
## Personality
{traits/motivations}
## Status
{conditions}

ENEMIES:
# Enemy Sheet
Name: {SPECIFIC name - "Skullgnaw the Fleshripper" NOT "Orc"}
Type: {variant}
Challenge: {easy/medium/hard}
## Combat Stats
HP: {curr}/{max} | AC: {#} | Init: {+/-#}
## Attacks
- {attack}: {dice} {type}
(2-4 attacks: 2d6+3)
## Special Abilities
- {ability}: {effect}
(1-3 abilities)
## Status
{conditions}

Scale: Easy=30-50HP/AC12-14/1-2atk | Med=60-100HP/AC14-16/2-3atk+1ability | Hard=120-200HP/AC16-18/3-4atk+2-3ability

Make them MEMORABLE. Enemies need NAMES with PUNCH.`;

    console.log('Entity generation prompt:', {
      type: params.type,
      role: params.role,
      level: params.level,
      difficulty: params.difficulty,
      context: params.context,
    });

    const openRouter = getOpenRouterClient();
    // Using the OpenAI client with OpenRouter
    const response = await openRouter.chat.completions.create({
      model: currentModel.id,
      messages: [
        {
          role: 'system',
          content: `Generate ${params.type === 'npc' ? 'NPCs' : 'enemies'} with teeth. Make them visceral.`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      top_p: 0.95,
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
      type: params.type, // params.type is already correctly typed as 'npc' | 'enemy'
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

export async function generateEnemyGroup(params: {
  enemies: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  environment?: string;
  context?: string;
}): Promise<Entity[]> {
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
