import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Entity } from '../types';
import { markdownTextExists } from './markdownUtils';
import { debugLog } from './debugUtils';

const API_KEY = import.meta.env.VITE_GEMINI_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || 'dummy-key');

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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    // Define schema for character updates
    const characterUpdateSchema = {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          oldText: { type: SchemaType.STRING },
          newText: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING }
        },
        required: ['oldText', 'newText', 'description']
      }
    };

const prompt = `You are updating a character sheet based on recent events in a D&D game.

Current Character Sheet:
${entity.sheet}

Recent Events:
${events.join('\n')}

Context:
${context}

${combatDetails ? `Combat Details:
Attacker: ${combatDetails.attacker ? combatDetails.attacker.sheet.split('\n')[0] : 'Unknown'}
Action Used: ${combatDetails.action || 'Unknown'}
Roll Result: ${combatDetails.rollResult || 'Unknown'}` : ''}

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
      context
    });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseSchema: characterUpdateSchema as any, // Type cast needed due to SDK limitations
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    const response = await result.response;
    const textContent = response.text();

    try {
      console.log('Character update raw response:', textContent);
      debugLog('CHARACTER_UPDATES', 'Raw AI response', textContent);
      
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
      
      const updates = JSON.parse(jsonContent);

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
            description: update.description
          });
          throw new Error(error);
        }
        
        debugLog('CHARACTER_UPDATES', 'Valid update found', {
          oldText: update.oldText,
          newText: update.newText,
          description: update.description
        });
        
        return update;
      });

      console.log('Character updates:', validUpdates);
      return validUpdates;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error processing updates';
      console.error('Character update error:', { error: message, response: textContent });
      throw new Error(message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error generating updates';
    console.error('Character update failed:', message);
    throw new Error(message);
  }
}
