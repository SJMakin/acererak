import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { StoryGenerationResponse, isValidStoryResponse } from '../types';
import { SelectedTheme } from '../components/ThemeSelector';

const API_KEY = import.meta.env.VITE_GEMINI_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || 'dummy-key');

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

const categoryNames = {
  [environments.toString()]: 'Environment',
  [emotions.toString()]: 'Emotion',
  [objects.toString()]: 'Object',
  [concepts.toString()]: 'Concept',
  [creatures.toString()]: 'Creature',
  [rituals.toString()]: 'Ritual',
  [factions.toString()]: 'Faction'
};

// Function to set user-selected themes
export function setSelectedThemes(themes: SelectedTheme[] | null): void {
  userSelectedThemes = themes;
  // Reset story plan when themes change
  storyPlan = null;
}

async function generateStoryPlan(): Promise<string> {
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
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const prompt = `Create a brief D&D campaign outline using these themes: ${selectedThemes.join(', ')}. Include a main conflict with some idea of how to end the game, key locations, and potential major events. Keep it under 300 words.`;
  
  console.log('Story plan prompt:', prompt);
  
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }]
  });

  const storyText = result.response.text();
  console.log('Story plan response:', storyText);
  return storyText;
}

export async function generateStoryNode(
  context: string,
  entities: { player: string; npcs?: string[]; enemies?: string[]; customRules?: string[] }
): Promise<StoryGenerationResponse> {
  if (!storyPlan) {
    storyPlan = await generateStoryPlan();
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `You are a creative dungeon master - Acererak the twisted - crafting an RPG adventure.

Current Player Character:
${entities.player}

${entities.npcs ? `NPCs in Scene:\n${entities.npcs.join('\n')}` : ''}

${entities.enemies ? `Enemies in Scene:\n${entities.enemies.join('\n')}` : ''}

${entities.customRules ? `Custom Rules:\n${entities.customRules.join('\n')}` : ''}

Story Plan:
${storyPlan}

Current Context:
${context}

===

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

Example combat choice:
{
  "text": "Attack the cultists",
  "type": "combat",
  "combatData": {
    "enemies": ["Cultist Leader", "Cultist Acolyte", "Cultist Acolyte"],
    "difficulty": "medium",
    "environment": "dimly lit ritual chamber"
  }
}

Make the story mad like Quentin Tarantino + Michael Bay made a heavy fantasy DND film together, targeted at someone that likes all sorts of cool weird stuff.`;

    console.log('Story node prompt:', prompt);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            story: {
              type: SchemaType.OBJECT,
              properties: {
                content: { type: SchemaType.STRING },
                summary: { type: SchemaType.STRING },
              },
              required: ['content', 'summary'],
            },
            choices: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  text: { type: SchemaType.STRING },
                  nextNodeId: { type: SchemaType.STRING },
                  type: { type: SchemaType.STRING },
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
                        description: { type: SchemaType.STRING },
                      },
                      required: ['type', 'count', 'description'],
                    },
                  },
                  combatData: {
                    type: SchemaType.OBJECT,
                    properties: {
                      enemies: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING }
                      },
                      difficulty: { type: SchemaType.STRING },
                      environment: { type: SchemaType.STRING },
                    },
                    required: ['enemies', 'difficulty'],
                  },
                },
                required: ['text', 'nextNodeId', 'type'],
              },
            },
          },
          required: ['story', 'choices'],
        },
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    const response = await result.response;
    const textContent = response.text();

    try {
      console.log('Story node raw response:', textContent);
      
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
      
      const parsedContent = JSON.parse(jsonContent);

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
      console.error('Story generation error:', { error: parseError.message, response: textContent });
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during story generation';
    console.error('Story generation failed:', message);
    throw new Error(message);
  }
}
