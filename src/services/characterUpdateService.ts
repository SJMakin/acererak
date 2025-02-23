import { GoogleGenerativeAI } from '@google/generative-ai';
import { Entity } from '../types';

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
  context: string
): Promise<CharacterUpdate[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `You are updating a character sheet based on recent events in a D&D game.

Current Character Sheet:
${entity.sheet}

Recent Events:
${events.join('\n')}

Context:
${context}

===

Analyze the events and generate updates to the character sheet. Consider:
1. HP changes from damage or healing
2. XP gains from combat or achievements
3. New items acquired or lost
4. Status effects gained or removed
5. Notes about significant events
6. Level ups if XP threshold reached

Return a JSON array of updates, each with:
- oldText: exact text to replace
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

Only include changes that are directly supported by the events. Ensure oldText matches the character sheet exactly.`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const response = await result.response;
    const textContent = response.text();

    try {
      const updates = JSON.parse(textContent);

      // Validate update structure
      if (!Array.isArray(updates)) {
        throw new Error('Updates must be an array');
      }

      updates.forEach((update, i) => {
        if (!update.oldText || !update.newText || !update.description) {
          throw new Error(`Update at index ${i} missing required fields`);
        }
        if (!entity.sheet.includes(update.oldText)) {
          throw new Error(`Update at index ${i} contains oldText that doesn't match sheet exactly`);
        }
      });

      return updates;
    } catch (parseError) {
      console.error('Failed to parse character updates:', parseError);
      console.error('Raw response:', textContent);
      throw parseError;
    }
  } catch (error) {
    console.error('Error generating character updates:', error);
    throw new Error(
      error instanceof Error
        ? `Character update generation failed: ${error.message}`
        : 'Failed to generate character updates due to an unknown error'
    );
  }
}
