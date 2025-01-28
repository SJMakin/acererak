import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { StoryGenerationResponse, isValidStoryResponse } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_KEY;
if (!API_KEY) {
  console.warn('GEMINI_KEY environment variable not found, using mock responses');
}
const genAI = new GoogleGenerativeAI(API_KEY || 'dummy-key');

export async function generateStoryNode(
  context: string,
  characterSheet?: string
): Promise<StoryGenerationResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Enhanced prompt to ensure structured story generation
    const result = await model.generateContent({
      // Properly typed content structure for Gemini API
      contents: [{
        role: 'user',
        parts: [{
          text: `You are a creative dungeon master - Acererak the twisted - crafting an RPG adventure.

Current Character:
${characterSheet || 'No character sheet available'}

Based on this context: 

===

${context}

===

Generate the next story segment and 1-5 possible choices.

Ensure the story includes fantasy elements and RPG-appropriate descriptions. Make each choice distinct and maintain consistency with previous events. 

When the player choice or events affect the character (damage, healing, items, notes etc), include characterUpdates in your response to modify the character sheet using exact text replacements. 

For choices that require skill checks, combat rolls, or other chance-based outcomes, include requiredRolls in your response. Each roll should specify:
- type: 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', or 'd100'
- count: number of dice to roll
- modifier: bonus/penalty to add (optional)
- difficulty: DC for skill checks (optional)
- skill: relevant skill being checked (optional)
- description: what this roll represents

Example roll for a stealth check: { type: 'd20', count: 1, modifier: 2, difficulty: 15, skill: 'Stealth', description: 'Stealth check to sneak past guards' }

Do your best to keep it interesting and fun - not for kids - use your ability to create choices to create a game. Move the plot quickly! The user needs to feel thier choices *did something*. 

In combat update the character sheet when the plater gets attacked. Use the dice for all the things an advanced DM would. One of your goals should be to level the player up, and put them in touch and go situations where a dice roll might decide thier life. 

Make the story mad like Quentin Tarantino + Michael Bay made a heavy fantasy DND film together..  assume the consumer likes all sorts of cool wierd stuff.`
        }]
      }],
      generationConfig: {
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            story: {
              type: SchemaType.OBJECT,
              properties: {
                content: { type: SchemaType.STRING },
                summary: { type: SchemaType.STRING }
              },
              required: ['content', 'summary']
            },
            choices: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  text: { type: SchemaType.STRING },
                  nextNodeId: { type: SchemaType.STRING },
                  requiredRolls: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        type: { type: SchemaType.STRING },
                        count: { type: SchemaType.NUMBER },
                        modifier: { type: SchemaType.NUMBER },
                        difficulty: { type: SchemaType.NUMBER },
                        skill: { type: SchemaType.STRING },
                        description: { type: SchemaType.STRING }
                      },
                      required: ['type', 'count', 'description', 'difficulty']
                    }
                  }
                },
                required: ['text', 'nextNodeId', 'requiredRolls']
              }
            },
            characterUpdates: {
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
            }
          },
          required: ['story', 'choices', 'characterUpdates']
        },
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: "application/json"
      },
    });

    const response = await result.response;
    const textContent = response.text();
    
    try {
      // Response should already be JSON due to response_mime_type
      const parsedContent = JSON.parse(textContent);
      
      console.log(parsedContent);

      // Validate response structure using type guard
      if (!isValidStoryResponse(parsedContent)) {
        console.error('Invalid AI response structure:', parsedContent);
        throw new Error('AI response does not match expected structure');
      }

      // Clean and validate the response
      const cleanedResponse = {
        story: {
          content: parsedContent.story.content.trim(),
          summary: parsedContent.story.summary.trim()
        },
        characterUpdates: parsedContent.characterUpdates || [],
        choices: parsedContent.choices.map(choice => {
          const cleanedText = choice.text.trim();
          if (cleanedText.length < 10) {
            throw new Error('Choice text too short (minimum 10 characters)');
          }
          return {
            text: cleanedText,
            nextNodeId: choice.nextNodeId || `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            requiredRolls: choice.requiredRolls || [{ type: 'd20', count: 1, description: 'Basic check' }] // Ensure requiredRolls is always present
          };
        })
      };

      // Validate choices are unique
      const choiceTexts = new Set(cleanedResponse.choices.map(c => c.text.toLowerCase()));
      if (choiceTexts.size !== cleanedResponse.choices.length) {
        throw new Error('Duplicate choices detected');
      }

      return cleanedResponse;
    } catch (parseError) {
      console.error('Failed to parse or validate AI response:', parseError);
      console.error('Raw response:', textContent);      
      throw parseError;
    }
  } catch (error) {
    console.error('Error generating story node:', error);
    
    throw new Error(
      error instanceof Error
        ? `Story generation failed: ${error.message}`
        : 'Failed to generate story due to an unknown error'
    );
  }
}