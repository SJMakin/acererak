import { type OpenRouterProviderSettings } from '@openrouter/ai-sdk-provider';
import OpenAI from 'openai';
import { StoryGenerationResponse, isValidStoryResponse } from '../types';
import { SelectedTheme } from '../components/ThemeSelector';
import { ModelOption } from '../contexts/ModelContext';

const API_KEY = import.meta.env.VITE_OPENROUTER_KEY || 'missing-key';

// Environments and other thematic categories
const environments = ['desert', 'jungle', 'mountain', 'underwater', 'space', 'volcano', 'city', 'forest', 'underdark', 'abyss', 'hell', 'shadowfell', 'necropolis', 'void', 'astral-plane', 'blood-marsh', 'crystal-cavern', 'bone-wastes'];
const emotions = ['revenge', 'love', 'greed', 'fear', 'pride', 'betrayal', 'hatred', 'madness', 'despair', 'ecstasy', 'paranoia', 'bloodlust'];
const objects = ['crystal', 'sword', 'book', 'crown', 'portal', 'artifact', 'phylactery', 'grimoire', 'relic', 'altar', 'throne', 'sacrifice-dagger', 'soul-gem', 'demon-chain', 'void-shard'];
const concepts = ['time', 'death', 'life', 'chaos', 'order', 'magic', 'corruption', 'sacrifice', 'destiny', 'damnation', 'ascension', 'immortality', 'torment', 'transformation'];
const creatures = ['dragon', 'demon', 'angel', 'undead', 'elemental', 'beast', 'lich', 'mindflayer', 'aboleth', 'elder-brain', 'nightwalker', 'death-knight', 'vampire-lord', 'pit-fiend'];
const rituals = ['blood-sacrifice', 'soul-binding', 'flesh-warping', 'mind-breaking', 'void-calling', 'demon-pact', 'lichdom', 'ascension'];
const factions = ['cult', 'cabal', 'inquisition', 'dark-council', 'blood-court', 'shadow-conclave', 'void-seekers', 'flesh-shapers'];

const themeCategories = [environments, emotions, objects, concepts, creatures, rituals, factions];

let storyPlan: string | null = null;
let userSelectedThemes: SelectedTheme[] | null = null;
let currentModel: ModelOption | null = null;

const categoryNames = {
  [environments.toString()]: 'Environment',
  [emotions.toString()]: 'Emotion',
  [objects.toString()]: 'Object',
  [concepts.toString()]: 'Concept',
  [creatures.toString()]: 'Creature',
  [rituals.toString()]: 'Ritual',
  [factions.toString()]: 'Faction'
};

// Use the OpenAI client with OpenRouter base URL
const openRouter = new OpenAI({
  apiKey: API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  dangerouslyAllowBrowser: true // Allow client to run in browser environment
});

// Function to set user-selected themes
export function setSelectedThemes(themes: SelectedTheme[] | null): void {
  userSelectedThemes = themes;
  // Reset story plan when themes change
  storyPlan = null;
}

// Function to set the current model
export function setCurrentModel(model: ModelOption): void {
  currentModel = model;
  console.log(`Model set to: ${model.name} (${model.id})`);
}

async function generateStoryPlan(model: ModelOption): Promise<string> {
  let selectedThemes: string[];
  
  if (userSelectedThemes) {
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
        category: categoryNames[selectedCategories[i].toString()] || 'Unknown'
      }))
    });
  }
  
  const prompt = `Create a brief D&D campaign outline using these themes: ${selectedThemes.join(', ')}. Include a main conflict with some idea of how to end the game, key locations, and potential major events. Keep it under 300 words.`;
  
  console.log('Story plan prompt:', prompt);
  
  try {
    // Using the OpenAI client with OpenRouter
    const response = await openRouter.chat.completions.create({
      model: model.id,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      top_p: 0.95
    });

    // Extract the text from the response
    const storyText = response.choices[0].message.content || '';
    console.log('Story plan response:', storyText);
    return storyText;
  } catch (error) {
    console.error('Failed to generate story plan:', error);
    return 'Failed to generate a story plan. Please try again.';
  }
}

export async function generateStoryNode(
  context: string,
  entities: { player: string; npcs?: string[]; enemies?: string[]; customRules?: string[] }
): Promise<StoryGenerationResponse> {
  if (!currentModel) {
    throw new Error('Model not set - please set a model before generating story');
  }

  if (!storyPlan) {
    storyPlan = await generateStoryPlan(currentModel);
  }

  try {
    const systemMessage = `You are a creative dungeon master - Acererak the twisted - crafting an RPG adventure. You will respond with a valid JSON object that includes a story section with content and summary fields, and a choices array with options for the player.`;

    const prompt = `Current Player Character:
${entities.player}

${entities.npcs ? `NPCs in Scene:\n${entities.npcs.join('\n')}` : ''}

${entities.enemies ? `Enemies in Scene:\n${entities.enemies.join('\n')}` : ''}

${entities.customRules ? `Custom Rules:\n${entities.customRules.join('\n')}` : ''}

Story Plan:
${storyPlan}

Current Context:
${context}

Follow the story plan loosely. Use the current context to generate the next story segment and 2-5 possible choices.

Ensure the story includes fantasy elements and RPG-appropriate descriptions. Make each choice distinct and maintain consistency with previous events. 

For choices that require skill checks, combat rolls, or other chance-based outcomes, include requiredRolls in your response. Each roll should specify:
- type: 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', or 'd100'
- count: number of dice to roll
- modifier: bonus/penalty to add (optional)
- difficulty: DC for skill checks (optional)
- skill: relevant skill being checked (optional)
- description: what this roll represents

When generating choices, indicate if a choice will initiate combat by setting its type to 'combat' and including combatData with:
- enemies: array of enemy types to spawn
- difficulty: 'easy', 'medium', or 'hard'
- environment: optional combat arena description

Your response MUST be a valid JSON object with this structure:
{
  "story": {
    "content": "detailed story text here",
    "summary": "brief summary here"
  },
  "choices": [
    {
      "text": "Option text here",
      "nextNodeId": "unique-id-here",
      "type": "story or combat or other type",
      "requiredRolls": [
        {
          "type": "d20",
          "count": 1,
          "modifier": 0,
          "difficulty": 15,
          "skill": "Perception",
          "description": "Spot hidden danger"
        }
      ],
      "combatData": {
        "enemies": ["Enemy Type 1", "Enemy Type 2"],
        "difficulty": "medium",
        "environment": "environment description"
      }
    }
  ]
}

Make the story mad like Quentin Tarantino + Michael Bay made a heavy fantasy DND film together, targeted at someone that likes all sorts of cool weird stuff.`;

    console.log('Story node prompt:', prompt);

    try {
      // Using the OpenAI client with OpenRouter
      const response = await openRouter.chat.completions.create({
        model: currentModel.id,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        top_p: 0.95,
        response_format: { type: 'json_object' }
      });

      // Extract the text from the response
      const jsonContent = response.choices[0].message.content || '';
      console.log('Story node raw response:', jsonContent);
      
      // Try to parse the JSON, handling potential markdown code blocks
      let processedContent = jsonContent;
      
      // Check if response is wrapped in markdown code block
      if (processedContent.startsWith('```') && processedContent.includes('```')) {
        // Extract content between first ``` and last ```
        const startIndex = processedContent.indexOf('\n') + 1;
        const endIndex = processedContent.lastIndexOf('```');
        if (startIndex > 0 && endIndex > startIndex) {
          processedContent = processedContent.substring(startIndex, endIndex).trim();
        }
      }
      
      const parsedContent = JSON.parse(processedContent);

      if (!isValidStoryResponse(parsedContent)) {
        throw new Error('Invalid AI response structure');
      }

      const cleanedResponse = {
        story: {
          content: parsedContent.story.content.trim(),
          summary: parsedContent.story.summary.trim(),
        },
        choices: parsedContent.choices.map(choice => ({
          text: choice.text.trim(),
          nextNodeId: choice.nextNodeId || `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: choice.type || 'story',
          requiredRolls: choice.requiredRolls || [],
          combatData: choice.type === 'combat' ? choice.combatData : undefined,
        })),
      };

      // Validate response
      if (cleanedResponse.choices.some(c => c.text.length < 10)) {
        throw new Error('Choice text too short (minimum 10 characters)');
      }
      
      const choiceTexts = new Set(cleanedResponse.choices.map(c => c.text.toLowerCase()));
      if (choiceTexts.size !== cleanedResponse.choices.length) {
        throw new Error('Duplicate choices detected');
      }

      console.log('Generated story node:', cleanedResponse);
      return cleanedResponse;
    } catch (error) {
      const parseError = error as Error;
      console.error('Story generation error:', { error: parseError.message });
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during story generation';
    console.error('Story generation failed:', message);
    throw new Error(message);
  }
}
