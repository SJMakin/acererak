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
          text: `You are a creative dungeon master crafting an RPG adventure.

Current Character:
${characterSheet || 'No character sheet available'}

Based on this context: "${context}", generate the next story segment and 2-5 possible choices.

Ensure the story includes fantasy elements and RPG-appropriate descriptions. Make each choice distinct and maintain consistency with previous events.

When events affect the character (damage, healing, items, etc), include characterUpdates in your response to modify the character sheet using exact text replacements.

Do your best to keep it interesting and fun - use your ability to create choices to create a game. Move the plot quickly, and make it like if Quentin Tarantino and Michael Bay made a DND film together..`
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
                  nextNodeId: { type: SchemaType.STRING }
                },
                required: ['text', 'nextNodeId']
              }
            },
            characterUpdates: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  oldText: { type: SchemaType.STRING },
                  newText: { type: SchemaType.STRING }
                },
                required: ['oldText', 'newText']
              }
            }
          },
          required: ['story', 'choices']
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
            nextNodeId: choice.nextNodeId || `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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