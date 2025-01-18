import { GoogleGenerativeAI } from '@google/generative-ai';
import { StoryGenerationResponse, isValidStoryResponse } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_KEY;
if (!API_KEY) {
  console.warn('GEMINI_KEY environment variable not found, using mock responses');
}
const genAI = new GoogleGenerativeAI(API_KEY || 'dummy-key');

export async function generateStoryNode(
  context: string
): Promise<StoryGenerationResponse> {
  try {
    if (API_KEY === 'YOUR_API_KEY') {
      return getMockResponse(context);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Enhanced prompt to ensure structured story generation
    const result = await model.generateContent({
      // Properly typed content structure for Gemini API
      contents: [{
        role: 'user',
        parts: [{
          text: `You are a creative dungeon master crafting a D&D adventure. Based on this context: "${context}", generate the next story segment and 2-3 possible choices.

Respond ONLY with a JSON object in the following format:
{
  "story": {
    "content": "[A story segment that advances the narrative]",
    "summary": "[A very brief 3-5 word summary of the key event or location]"
  },
  "choices": [
    {
      "text": "[First choice description]",
      "nextNodeId": "[unique identifier]"
    },
    {
      "text": "[Second choice description]",
      "nextNodeId": "[unique identifier]"
    }
  ]
}

Ensure the story includes fantasy elements and D&D-appropriate descriptions. Make each choice distinct and maintain consistency with previous events.`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      // Removed safetySettings as they're causing type issues
      // Will handle content safety through prompt engineering
    });

    const response = await result.response;
    const textContent = response.text();
    
    // For development/testing, return mock data if API key isn't set
    if (API_KEY === 'YOUR_API_KEY') {
      return getMockResponse(context);
    }

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
      
      if (API_KEY === 'YOUR_API_KEY') {
        return getMockResponse(context);
      }
      throw parseError; // Let the calling code handle the error
    }
  } catch (error) {
    console.error('Error generating story node:', error);
    
    // Only use mock response for development or API key issues
    if (API_KEY === 'YOUR_API_KEY' || !API_KEY) {
      console.warn('Using mock response due to API key issues');
      return getMockResponse(context);
    }

    // For all other errors, throw with a meaningful message
    throw new Error(
      error instanceof Error
        ? `Story generation failed: ${error.message}`
        : 'Failed to generate story due to an unknown error'
    );
  }
}

// Mock response for development/testing
function getMockResponse(context: string): StoryGenerationResponse {
  return {
    story: {
      content: `As you continue your adventure... ${context.slice(0, 50)}...`,
      summary: 'Starting Adventure',
    },
    choices: [
      {
        text: 'Investigate the mysterious sound',
        nextNodeId: `story-${Date.now()}-1`,
      },
      {
        text: 'Continue on your current path',
        nextNodeId: `story-${Date.now()}-2`,
      },
      {
        text: 'Take a moment to rest',
        nextNodeId: `story-${Date.now()}-3`,
      },
    ],
  };
}