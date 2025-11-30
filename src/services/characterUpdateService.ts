import { Entity } from '../types';
import { markdownTextExists } from './markdownUtils';
import { debugLog } from './debugUtils';
import {
  getOpenRouterClient,
  stripMarkdownCodeBlock,
  getCurrentModel,
} from './openRouterClient';

export interface CharacterUpdate {
  oldText: string;
  newText: string;
  description: string;
}

export async function generateCharacterUpdates(
  entity: Entity,
  events: string[],
  context: string,
  combatDetails?: {
    attacker?: Entity;
    action?: string;
    rollResult?: number;
  }
): Promise<CharacterUpdate[]> {
  try {
    const currentModel = getCurrentModel();

    const prompt = `You are updating a character sheet based on recent events in a D&D game.

Current Character Sheet:
${entity.sheet}

Recent Events:
${events.join('\n')}

Context:
${context}

${
  combatDetails
    ? `Combat Details:
Attacker: ${combatDetails.attacker ? combatDetails.attacker.sheet.split('\n')[0] : 'Unknown'}
Action Used: ${combatDetails.action || 'Unknown'}
Roll Result: ${combatDetails.rollResult || 'Unknown'}`
    : ''
}

===

Analyze the events and generate updates to the character sheet. Consider:
1. HP changes from damage or healing
2. XP gains from combat or achievements
3. New items acquired or lost
4. Status effects gained or removed
5. Notes about significant events
6. Level ups if XP threshold reached

Return a JSON array of updates, each with:
- oldText: text to replace (should match content but can have slight whitespace differences)
- newText: new text to insert
- description: explanation of the change

Example:
[
  {
    "oldText": "HP: 20/20",
    "newText": "HP: 15/20",
    "description": "Took 5 damage from goblin attack"
  }
]

Special handling for list items:
- For list items (lines starting with *, -, +, or numbers), focus on matching the content after the list marker
- The system can handle differences in whitespace after list markers (e.g., "* Item" vs "*   Item")
- Keep the same list marker type in both oldText and newText (e.g., if it's "*" in oldText, use "*" in newText)

Only include changes that are directly supported by the events. For oldText, focus on matching the content rather than exact whitespace - the system can handle differences in whitespace, especially in markdown formatting.`;

    console.log('Character update prompt:', {
      entityType: entity.type,
      events,
      context,
    });

    const openRouter = getOpenRouterClient();
    // Using the OpenAI client with OpenRouter
    const response = await openRouter.chat.completions.create({
      model: currentModel.id,
      messages: [
        {
          role: 'system',
          content:
            'You are updating a character sheet based on recent events in a D&D game.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      top_p: 0.95,
      response_format: { type: 'json_object' },
    });

    // Extract the text from the response
    const textContent = response.choices[0].message.content || '';

    try {
      console.log('Character update raw response:', textContent);
      debugLog('CHARACTER_UPDATES', 'Raw AI response', textContent);

      // Try to parse the JSON, handling potential markdown code blocks
      const processedContent = stripMarkdownCodeBlock(textContent);
      const updates = JSON.parse(processedContent);

      if (!Array.isArray(updates)) {
        throw new Error('Updates must be an array');
      }

      const validUpdates = updates.map((update, i) => {
        if (!update.oldText || !update.newText || !update.description) {
          const error = 'Missing required fields in update';
          debugLog('CHARACTER_UPDATES', error, update);
          throw new Error(error);
        }

        const exists = markdownTextExists(entity.sheet, update.oldText);
        if (!exists) {
          const error = `Update contains oldText that doesn't match sheet: "${update.oldText}"`;
          debugLog('CHARACTER_UPDATES', error, {
            oldText: update.oldText,
            newText: update.newText,
            description: update.description,
          });
          throw new Error(error);
        }

        debugLog('CHARACTER_UPDATES', 'Valid update found', {
          oldText: update.oldText,
          newText: update.newText,
          description: update.description,
        });

        return update;
      });

      console.log('Character updates:', validUpdates);
      return validUpdates;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error processing updates';
      console.error('Character update error:', {
        error: message,
        response: textContent,
      });
      // If the error is related to JSON parsing, log more details
      if (message.includes('JSON')) {
        console.error('JSON parsing error details:', {
          rawResponse: textContent,
          responseType: typeof textContent,
        });
      }
      throw new Error(message);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error generating updates';
    console.error('Character update failed:', message);
    throw new Error(message);
  }
}
