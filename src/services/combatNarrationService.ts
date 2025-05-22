import OpenAI from 'openai';
import { Entity, CombatAction } from '../types';
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

// Store the current model for combat narration
let currentModel: ModelOption | null = null;

// Function to set the current model
export function setCurrentModel(model: ModelOption): void {
  currentModel = model;
  console.log(`Combat narration service using model: ${model.name} (${model.id})`);
}


// Define the interface for combat round results
export interface CombatRoundResult {
  narrative: {
    summary: string;
    detailedDescription: string;
  };
  entityUpdates: Array<{
    entityId: string;
    updates: Array<{
      oldText: string;
      newText: string;
      description: string;
    }>;
  }>;
  combatStatus: {
    roundComplete: boolean;
    combatComplete: boolean;
    victor?: string;
    specialEvents?: string[];
  };
}

/**
 * Process a combat round using AI to generate narrative and entity updates
 * @param entities All entities involved in combat
 * @param actions All actions taken during the round
 * @param roundNumber The current round number
 * @returns A structured result with narrative, entity updates, and combat status
 */
export async function processCombatRound(
  entities: Entity[],
  actions: CombatAction[],
  roundNumber: number
): Promise<CombatRoundResult> {
  try {
    if (!currentModel) {
      throw new Error('Model not set - please set a model before processing combat round');
    }
    
    // Build prompt with all entity sheets and actions
    const prompt = `You are narrating a combat round in a D&D game.

Current Entities:
${entities.map(e => `--- ${e.id} (${e.type}) ---\n${e.sheet}`).join('\n\n')}

Actions This Round:
${actions.map(a => `- ${a.description} (Roll: ${a.roll.total})`).join('\n')}

Round Number: ${roundNumber}

===

Analyze the actions and generate:
1. A narrative description of what happened this round
2. Updates to each entity's markdown sheet
3. Combat status information

For each entity that needs updating, provide the exact text to replace and what to replace it with.
Focus on updating HP, status effects, and adding notes about significant events.

For HP updates, look for the current HP in the format "HP: X/Y" and update the X value based on damage taken or healing received.
For status effects, add them to the Status section.
Be creative and dramatic in your narrative, but precise in your markdown updates.

Determine if combat should continue or end based on entity states. Combat ends when all enemies are defeated (HP reduced to 0) or the player is defeated.`;

    console.log('Combat round prompt:', prompt);

    const openRouter = getOpenRouterClient();
    // Using the OpenAI client with OpenRouter
    const response = await openRouter.chat.completions.create({
      model: currentModel.id,
      messages: [
        {
          role: 'system',
          content: 'You are narrating a combat round in a D&D game. Provide a structured response with narrative description, entity updates, and combat status.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      top_p: 0.95,
      response_format: { type: 'json_object' }
    });

    // Extract the text from the response
    const textContent = response.choices[0].message.content || '';

    try {
      console.log('Combat round raw response:', textContent);
      
      // Try to parse the JSON, handling potential markdown code blocks
      let jsonContent = textContent;
      // Check if response is wrapped in markdown code block
      if (jsonContent.startsWith('```') && jsonContent.includes('```')) {
        // Extract content between first ``` and last ```
        const startIndex = jsonContent.indexOf('\n') + 1;
        const endIndex = jsonContent.lastIndexOf('```');
        if (startIndex > 0 && endIndex > startIndex) {
          jsonContent = jsonContent.substring(startIndex, endIndex).trim();
        }
      }
      
      const parsedContent = JSON.parse(jsonContent) as CombatRoundResult;
      
      // Validate the response
      if (!parsedContent.narrative || !parsedContent.entityUpdates || !parsedContent.combatStatus) {
        throw new Error('Invalid AI response structure');
      }
      
      // Validate entity updates
      for (const entityUpdate of parsedContent.entityUpdates) {
        const entity = entities.find(e => e.id === entityUpdate.entityId);
        if (!entity) {
          console.warn(`Update references unknown entity: ${entityUpdate.entityId}`);
          continue;
        }
        
        for (const update of entityUpdate.updates) {
          if (!entity.sheet.includes(update.oldText)) {
            console.warn(`Update contains oldText that doesn't match entity sheet: ${update.oldText}`);
            // Don't throw error, just log warning
          }
        }
      }
      
      console.log('Processed combat round:', parsedContent);
      return parsedContent;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error processing combat round';
      console.error('Combat round processing error:', { error: message, response: textContent });
      throw new Error(message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during combat round processing';
    console.error('Combat round processing failed:', message);
    
    // Return a fallback result
    return {
      narrative: {
        summary: 'Combat continues...',
        detailedDescription: 'The battle rages on with both sides exchanging blows.'
      },
      entityUpdates: [],
      combatStatus: {
        roundComplete: true,
        combatComplete: false
      }
    };
  }
}
