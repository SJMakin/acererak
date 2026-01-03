import type { ModelOption } from '../contexts/ModelContext';
import type { StoryGenerationResponse, SelectedTheme, DiceRoll, LlmCallInfo } from '../types';
import { isValidStoryResponse } from '../types';

// ============================================================================
// LLM COST TRACKING
// ============================================================================

/**
 * Estimate cost based on model pricing and token counts
 * Uses pricing from the model object (fetched from OpenRouter API)
 */
export function estimateCost(
  modelPricing: { prompt: number; completion: number } | undefined,
  promptTokens: number,
  completionTokens: number
): number {
  // Default fallback pricing if model doesn't have pricing info (per 1M tokens)
  const pricing = modelPricing || { prompt: 1, completion: 2 };
  return (promptTokens * pricing.prompt + completionTokens * pricing.completion) / 1_000_000;
}

/**
 * Create LlmCallInfo from usage data
 * Uses dynamic pricing from the model object
 */
export function createLlmCallInfo(
  model: ModelOption,
  promptTokens: number,
  completionTokens: number,
  duration: number,
  type: LlmCallInfo['type']
): LlmCallInfo {
  return {
    id: `llm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date(),
    model: model.id,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCost: estimateCost(model.pricing, promptTokens, completionTokens),
    duration,
    type,
  };
}

import {
  generateImage,
  createImagePromptFromStory,
} from './imageGenerationService';
import {
  getOpenRouterClient,
  stripMarkdownCodeBlock,
  getCurrentModel,
} from './openRouterClient';

// Environments and other thematic categories
const environments = [
  'desert',
  'jungle',
  'mountain',
  'underwater',
  'space',
  'volcano',
  'city',
  'forest',
  'underdark',
  'abyss',
  'hell',
  'shadowfell',
  'necropolis',
  'void',
  'astral-plane',
  'blood-marsh',
  'crystal-cavern',
  'bone-wastes',
];
const emotions = [
  'revenge',
  'love',
  'greed',
  'fear',
  'pride',
  'betrayal',
  'hatred',
  'madness',
  'despair',
  'ecstasy',
  'paranoia',
  'bloodlust',
];
const objects = [
  'crystal',
  'sword',
  'book',
  'crown',
  'portal',
  'artifact',
  'phylactery',
  'grimoire',
  'relic',
  'altar',
  'throne',
  'sacrifice-dagger',
  'soul-gem',
  'demon-chain',
  'void-shard',
];
const concepts = [
  'time',
  'death',
  'life',
  'chaos',
  'order',
  'magic',
  'corruption',
  'sacrifice',
  'destiny',
  'damnation',
  'ascension',
  'immortality',
  'torment',
  'transformation',
];
const creatures = [
  'dragon',
  'demon',
  'angel',
  'undead',
  'elemental',
  'beast',
  'lich',
  'mindflayer',
  'aboleth',
  'elder-brain',
  'nightwalker',
  'death-knight',
  'vampire-lord',
  'pit-fiend',
];
const rituals = [
  'blood-sacrifice',
  'soul-binding',
  'flesh-warping',
  'mind-breaking',
  'void-calling',
  'demon-pact',
  'lichdom',
  'ascension',
];
const factions = [
  'cult',
  'cabal',
  'inquisition',
  'dark-council',
  'blood-court',
  'shadow-conclave',
  'void-seekers',
  'flesh-shapers',
];

const themeCategories = [
  environments,
  emotions,
  objects,
  concepts,
  creatures,
  rituals,
  factions,
];

let storyPlan: string | null = null;
let userSelectedThemes: SelectedTheme[] | null = null;
let imageGenerationEnabled: boolean = true; // Default to enabled

const categoryNames = {
  [environments.toString()]: 'Environment',
  [emotions.toString()]: 'Emotion',
  [objects.toString()]: 'Object',
  [concepts.toString()]: 'Concept',
  [creatures.toString()]: 'Creature',
  [rituals.toString()]: 'Ritual',
  [factions.toString()]: 'Faction',
};

// Function to set user-selected themes
export function setSelectedThemes(themes: SelectedTheme[] | null): void {
  userSelectedThemes = themes;
  // Reset story plan when themes change
  storyPlan = null;
}

// Function to enable/disable image generation
export function setImageGenerationEnabled(enabled: boolean): void {
  imageGenerationEnabled = enabled;
}

export function isImageGenerationEnabled(): boolean {
  return imageGenerationEnabled;
}

/**
 * Generate quick "filler" content to display while the main story is being generated
 * Uses a fast, lightweight prompt to keep the player engaged during wait times
 */
export async function generateFillerContent(
  context: string,
  type: 'thoughts' | 'omen' | 'flavor' = 'thoughts'
): Promise<string> {
  const currentModel = getCurrentModel();

  let prompt = '';

  switch (type) {
    case 'thoughts':
      prompt = `Based on this context: ${context.slice(0, 200)}
      
Generate a brief (2-3 sentences) internal monologue from the player character's perspective. Make it visceral, immediate, and reflective of their current situation. No formatting, just raw thought.`;
      break;
    case 'omen':
      prompt = `Based on this context: ${context.slice(0, 200)}
      
Generate a brief (1-2 sentences) cryptic omen or prophetic hint about what's to come. Make it mysterious and unsettling. No formatting, just the omen.`;
      break;
    case 'flavor':
      prompt = `Based on this context: ${context.slice(0, 200)}
      
Generate a brief (2-3 sentences) sensory detail about the environment. Focus on sounds, smells, textures, or background activity. Make it atmospheric and dark. No formatting, just description.`;
      break;
  }

  try {
    const openRouter = getOpenRouterClient();
    const response = await openRouter.chat.completions.create({
      model: currentModel.id,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 150, // Keep it short for speed
    });

    const fillerText = response.choices[0].message.content || '';
    console.log('Generated filler content:', fillerText);
    return fillerText;
  } catch (error) {
    console.error('Failed to generate filler content:', error);
    // Return a generic fallback
    return 'The tension builds as events unfold...';
  }
}

/**
 * Generate an image for a story node
 * Returns the image URL or undefined if generation fails or is disabled
 */
export async function generateStoryImage(
  storyContent: string,
  storySummary?: string,
  imagePrompt?: string
): Promise<string | undefined> {
  if (!imageGenerationEnabled) {
    console.log('Image generation is disabled');
    return undefined;
  }

  try {
    const finalImagePrompt = createImagePromptFromStory(storyContent, storySummary, imagePrompt);
    const imageUrl = await generateImage(finalImagePrompt);
    return imageUrl;
  } catch (error) {
    console.error('Failed to generate story image:', error);
    // Don't throw - just return undefined so the story can continue without an image
    return undefined;
  }
}

// Export the generateStoryPlan function for use in other components
export async function generateStoryPlan(
  model: ModelOption,
  customThemes: SelectedTheme[] | null = null
): Promise<string> {
  // Temporarily set themes for this generation if provided
  const originalThemes = userSelectedThemes;
  if (customThemes !== null) {
    userSelectedThemes = customThemes;
  }
  let selectedThemes: string[];

  if (userSelectedThemes && userSelectedThemes.length > 0) {
    // Use user-selected themes
    selectedThemes = userSelectedThemes.map(theme => theme.theme);

    if (userSelectedThemes[0].category === 'Custom') {
      console.log('Using custom free-text themes:', selectedThemes);
    } else {
      console.log('Using user-selected story themes:', userSelectedThemes);
    }
  } else {
    // Use random themes
    const selectedCategories = themeCategories
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    selectedThemes = selectedCategories.map(category => {
      const word = category[Math.floor(Math.random() * category.length)];
      return word;
    });

    console.log('Using random story themes:', {
      themes: selectedThemes.map((word, i) => ({
        theme: word,
        category: categoryNames[selectedCategories[i].toString()] || 'Unknown',
      })),
    });
  }

  const prompt = `Dark one-shot campaign. Themes: ${selectedThemes.join(', ')}. Give me conflict, ending, locations, major beats. Under 200 words. Make it VISCERAL.`;

  console.log('Story plan prompt:', prompt);

  try {
    const openRouter = getOpenRouterClient();
    // Using the OpenAI client with OpenRouter
    const response = await openRouter.chat.completions.create({
      model: model.id,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      top_p: 0.95,
    });

    // Extract the text from the response
    const storyText = response.choices[0].message.content || '';
    console.log('Story plan response:', storyText);
    // Restore original themes
    userSelectedThemes = originalThemes;
    return storyText;
  } catch (error) {
    // Restore original themes even if there's an error
    userSelectedThemes = originalThemes;
    console.error('Failed to generate story plan:', error);
    return 'Failed to generate a story plan. Please try again.';
  }
}

/**
 * Extended response type that includes LLM call info for cost tracking
 */
export interface StoryGenerationResult {
  response: StoryGenerationResponse;
  llmCall: LlmCallInfo;
}

/**
 * Generate a story node with streaming support
 * Calls onPartialContent callback as story content arrives
 * Returns both the story response and LLM call info for cost tracking
 */
export async function generateStoryNodeStreaming(
  context: string,
  entities: {
    player: string;
    npcs?: string[];
    enemies?: string[];
    customRules?: string[];
  },
  onPartialContent?: (content: string) => void
): Promise<StoryGenerationResult> {
  const currentModel = getCurrentModel();
  const startTime = Date.now();

  if (!storyPlan) {
    storyPlan = await generateStoryPlan(currentModel);
  }

  try {
    const systemMessage = `You are Acererak - chaos incarnate, death's architect. Weave dark fantasy nightmares. Respond ONLY in valid JSON: story object (content, summary), choices array.`;

    const prompt = `PC: ${entities.player}
${entities.npcs ? `\nNPCs: ${entities.npcs.join(', ')}` : ''}
${entities.enemies ? `\nEnemies: ${entities.enemies.join(', ')}` : ''}
${entities.customRules ? `\nRules: ${entities.customRules.join('; ')}` : ''}

PLAN: ${storyPlan}
CONTEXT: ${context}

Generate next beat + 2-5 brutal choices. JSON format:
{
  "story": {"content": "vivid scene", "summary": "tight beat"},
  "choices": [{
    "text": "choice",
    "nextNodeId": "id",
    "requiredRolls": [{"type": "d20", "count": 1, "modifier": 0, "difficulty": 15, "skill": "Skill", "description": "what"}]
  }]
}

requiredRolls: d4/d6/d8/d10/d12/d20/d100, count, modifier, difficulty, skill, description

WRITE LIKE: Cronenberg fever dream × Black Sabbath album × cosmic horror. Visceral. Weird. Dark. No mercy.`;

    console.log('Story node streaming prompt:', prompt);

    try {
      const openRouter = getOpenRouterClient();
      
      // Use streaming if callback provided
      if (onPartialContent) {
        const stream = await openRouter.chat.completions.create({
          model: currentModel.id,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          top_p: 0.95,
          stream: true,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'story_generation',
              schema: {
                type: 'object',
                properties: {
                  story: {
                    type: 'object',
                    properties: {
                      content: { type: 'string' },
                      summary: { type: 'string' },
                      imagePrompt: { type: 'string' },
                    },
                    required: ['content', 'summary', 'imagePrompt'],
                    additionalProperties: false,
                  },
                  choices: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        text: { type: 'string' },
                        nextNodeId: { type: 'string' },
                        imagePrompt: { type: 'string' },
                        requiredRolls: {
                          type: ['array', 'null'],
                          items: {
                            type: 'object',
                            properties: {
                              type: {
                                type: 'string',
                                enum: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'],
                              },
                              count: { type: 'number' },
                              modifier: { type: ['number', 'null'] },
                              difficulty: { type: ['number', 'null'] },
                              skill: { type: ['string', 'null'] },
                              description: { type: 'string' },
                            },
                            required: ['type', 'count', 'modifier', 'difficulty', 'skill', 'description'],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ['text', 'nextNodeId', 'imagePrompt', 'requiredRolls'],
                      additionalProperties: false,
                    },
                    minItems: 2,
                  },
                },
                required: ['story', 'choices'],
                additionalProperties: false,
              },
            },
          },
        });

        let accumulated = '';
        let lastContentLength = 0;
        let chunkCount = 0;

        console.log('Starting streaming story generation...');

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          accumulated += delta;
          chunkCount++;

          // Log every 10 chunks to see streaming progress
          if (chunkCount % 10 === 0) {
            console.log(`Streaming chunk ${chunkCount}, accumulated length: ${accumulated.length}`);
          }

          // Extract partial content using regex - more reliable than parsing incomplete JSON
          // Look for "content": " followed by any characters (including partial strings)
          const contentMatch = accumulated.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
          if (contentMatch && contentMatch[1]) {
            // Unescape the content
            let content = contentMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
            
            // Only update if content has grown
            if (content.length > lastContentLength) {
              console.log(`Content update: ${lastContentLength} -> ${content.length} chars`);
              lastContentLength = content.length;
              onPartialContent(content);
            }
          }
        }

        console.log(`Streaming complete: ${chunkCount} chunks, final length: ${accumulated.length}`);

        // Parse final complete JSON
        const processedContent = stripMarkdownCodeBlock(accumulated);
        const parsedContent = JSON.parse(processedContent);

        if (!isValidStoryResponse(parsedContent)) {
          throw new Error('Invalid AI response structure');
        }

        const cleanedResponse: StoryGenerationResponse = {
          story: {
            content: parsedContent.story.content.trim(),
            summary: parsedContent.story.summary.trim(),
            imagePrompt: parsedContent.story.imagePrompt?.trim() || '',
          },
          choices: parsedContent.choices.map((choice: { text: string; nextNodeId?: string; imagePrompt?: string; requiredRolls?: DiceRoll[] }) => ({
            text: choice.text.trim(),
            nextNodeId:
              choice.nextNodeId ||
              `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            imagePrompt: choice.imagePrompt?.trim() || '',
            requiredRolls: (choice.requiredRolls || []) as DiceRoll[],
          })),
        };

        // Validate response
        if (cleanedResponse.choices.some(c => c.text.length < 10)) {
          throw new Error('Choice text too short (minimum 10 characters)');
        }

        const choiceTexts = new Set(
          cleanedResponse.choices.map(c => c.text.toLowerCase())
        );
        if (choiceTexts.size !== cleanedResponse.choices.length) {
          throw new Error('Duplicate choices detected');
        }

        // Calculate duration and estimate tokens (streaming doesn't always provide usage)
        const duration = Date.now() - startTime;
        // Rough estimation: ~4 chars per token for English text
        const estimatedPromptTokens = Math.ceil((prompt.length + systemMessage.length) / 4);
        const estimatedCompletionTokens = Math.ceil(accumulated.length / 4);
        
        const llmCall = createLlmCallInfo(
          currentModel,
          estimatedPromptTokens,
          estimatedCompletionTokens,
          duration,
          'story'
        );

        console.log('Generated story node (streaming):', cleanedResponse);
        console.log('LLM call info:', llmCall);
        return { response: cleanedResponse, llmCall };
      } else {
        // Fall back to non-streaming if no callback provided
        const nonStreamingResult = await generateStoryNodeNonStreaming(context, entities, startTime);
        return nonStreamingResult;
      }
    } catch (error) {
      const parseError = error as Error;
      console.error('Story generation error:', { error: parseError.message });
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error during story generation';
    console.error('Story generation failed:', message);
    throw new Error(message);
  }
}

/**
 * Generate a story node (non-streaming implementation)
 * Internal function used by generateStoryNodeStreaming when no callback is provided
 */
async function generateStoryNodeNonStreaming(
  context: string,
  entities: {
    player: string;
    npcs?: string[];
    enemies?: string[];
    customRules?: string[];
  },
  startTime: number
): Promise<StoryGenerationResult> {
  const currentModel = getCurrentModel();

  if (!storyPlan) {
    storyPlan = await generateStoryPlan(currentModel);
  }

  try {
    const systemMessage = `You are Acererak - chaos incarnate, death's architect. Weave dark fantasy nightmares. Respond ONLY in valid JSON: story object (content, summary), choices array.`;

    const prompt = `PC: ${entities.player}
${entities.npcs ? `\nNPCs: ${entities.npcs.join(', ')}` : ''}
${entities.enemies ? `\nEnemies: ${entities.enemies.join(', ')}` : ''}
${entities.customRules ? `\nRules: ${entities.customRules.join('; ')}` : ''}

PLAN: ${storyPlan}
CONTEXT: ${context}

Generate next beat + 2-5 brutal choices. JSON format:
{
  "story": {"content": "vivid scene", "summary": "tight beat"},
  "choices": [{
    "text": "choice",
    "nextNodeId": "id",
    "requiredRolls": [{"type": "d20", "count": 1, "modifier": 0, "difficulty": 15, "skill": "Skill", "description": "what"}]
  }]
}

requiredRolls: d4/d6/d8/d10/d12/d20/d100, count, modifier, difficulty, skill, description

WRITE LIKE: Cronenberg fever dream × Black Sabbath album × cosmic horror. Visceral. Weird. Dark. No mercy.`;

    console.log('Story node prompt:', prompt);

    try {
      const openRouter = getOpenRouterClient();
      // Using the OpenAI client with OpenRouter
      const response = await openRouter.chat.completions.create({
        model: currentModel.id,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        top_p: 0.95,
        response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'story_generation',
              schema: {
                type: 'object',
                properties: {
                  story: {
                    type: 'object',
                    properties: {
                      content: { type: 'string' },
                      summary: { type: 'string' },
                      imagePrompt: { type: 'string' },
                    },
                    required: ['content', 'summary', 'imagePrompt'],
                    additionalProperties: false,
                  },
                choices: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      nextNodeId: { type: 'string' },
                      imagePrompt: { type: 'string' },
                      requiredRolls: {
                        type: ['array', 'null'],
                        items: {
                          type: 'object',
                          properties: {
                            type: {
                              type: 'string',
                              enum: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'],
                            },
                            count: { type: 'number' },
                            modifier: { type: ['number', 'null'] },
                            difficulty: { type: ['number', 'null'] },
                            skill: { type: ['string', 'null'] },
                            description: { type: 'string' },
                          },
                          required: ['type', 'count', 'modifier', 'difficulty', 'skill', 'description'],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ['text', 'nextNodeId', 'imagePrompt', 'requiredRolls'],
                    additionalProperties: false,
                  },
                  minItems: 2,
                },
              },
              required: ['story', 'choices'],
              additionalProperties: false,
            },
          },
        },
      });

      // Extract the text from the response
      const jsonContent = response.choices[0].message.content || '';
      console.log('Story node raw response:', jsonContent);

      // Try to parse the JSON, handling potential markdown code blocks
      const processedContent = stripMarkdownCodeBlock(jsonContent);
      const parsedContent = JSON.parse(processedContent);

      if (!isValidStoryResponse(parsedContent)) {
        throw new Error('Invalid AI response structure');
      }

      const cleanedResponse: StoryGenerationResponse = {
        story: {
          content: parsedContent.story.content.trim(),
          summary: parsedContent.story.summary.trim(),
          imagePrompt: parsedContent.story.imagePrompt?.trim() || '',
        },
        choices: parsedContent.choices.map((choice: { text: string; nextNodeId?: string; imagePrompt?: string; requiredRolls?: DiceRoll[] }) => ({
          text: choice.text.trim(),
          nextNodeId:
            choice.nextNodeId ||
            `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          imagePrompt: choice.imagePrompt?.trim() || '',
          requiredRolls: (choice.requiredRolls || []) as DiceRoll[],
        })),
      };

      // Validate response
      if (cleanedResponse.choices.some(c => c.text.length < 10)) {
        throw new Error('Choice text too short (minimum 10 characters)');
      }

      const choiceTexts = new Set(
        cleanedResponse.choices.map(c => c.text.toLowerCase())
      );
      if (choiceTexts.size !== cleanedResponse.choices.length) {
        throw new Error('Duplicate choices detected');
      }

      // Calculate duration and get token usage from response (or estimate if not available)
      const duration = Date.now() - startTime;
      const usage = response.usage;
      const promptTokens = usage?.prompt_tokens || Math.ceil((prompt.length + systemMessage.length) / 4);
      const completionTokens = usage?.completion_tokens || Math.ceil(jsonContent.length / 4);
      
      const llmCall = createLlmCallInfo(
        currentModel,
        promptTokens,
        completionTokens,
        duration,
        'story'
      );

      console.log('Generated story node:', cleanedResponse);
      console.log('LLM call info:', llmCall);
      return { response: cleanedResponse, llmCall };
    } catch (error) {
      const parseError = error as Error;
      console.error('Story generation error:', { error: parseError.message });
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error during story generation';
    console.error('Story generation failed:', message);
    throw new Error(message);
  }
}
