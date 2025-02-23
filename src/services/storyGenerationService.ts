import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { StoryGenerationResponse, isValidStoryResponse } from '../types';

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

async function generateStoryPlan(): Promise<string> {
  console.log('🎲 Generating new story themes...');
  
  const selectedCategories = themeCategories
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
    
  const selectedThemes = selectedCategories.map((category, i) => {
    const word = category[Math.floor(Math.random() * category.length)];
    const categoryName = 
      category === environments ? 'Environment' :
      category === emotions ? 'Emotion' :
      category === objects ? 'Object' :
      category === concepts ? 'Concept' :
      category === creatures ? 'Creature' :
      category === rituals ? 'Ritual' :
      category === factions ? 'Faction' : 'Unknown';
    
    console.log(`🎯 Theme ${i + 1}: ${word} (${categoryName})`);
    return word;
  });
  
  console.log('📖 Story seed:', selectedThemes.join(' + '));
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{
        text: `Create a brief D&D campaign outline using these themes: ${selectedThemes.join(', ')}. Include a main conflict with some idea of how to end the game, key locations, and potential major events. Keep it under 300 words.`
      }]
    }]
  });

  const storyText = result.response.text();
  console.log(`\n📜 Generated Story Plan:\n${storyText}\n`);
  return storyText;
}

export async function generateStoryNode(
  context: string,
  entities: { player: string; npcs?: string[]; enemies?: string[] }
): Promise<StoryGenerationResponse> {
  if (!storyPlan) {
    storyPlan = await generateStoryPlan();
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are a creative dungeon master - Acererak the twisted - crafting an RPG adventure.

Current Player Character:
${entities.player}

${entities.npcs ? `NPCs in Scene:\n${entities.npcs.join('\n')}` : ''}

${entities.enemies ? `Enemies in Scene:\n${entities.enemies.join('\n')}` : ''}

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

Make the story mad like Quentin Tarantino + Michael Bay made a heavy fantasy DND film together, targeted at someone that likes all sorts of cool weird stuff.`,
            },
          ],
        },
      ],
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
        maxOutputTokens: 1024,
      },
    });

    const response = await result.response;
    const textContent = response.text();

    try {
      const parsedContent = JSON.parse(textContent);

      if (!isValidStoryResponse(parsedContent)) {
        console.error('Invalid AI response structure:', parsedContent);
        throw new Error('AI response does not match expected structure');
      }

      // Clean and validate the response
      const cleanedResponse = {
        story: {
          content: parsedContent.story.content.trim(),
          summary: parsedContent.story.summary.trim(),
        },
        choices: parsedContent.choices.map(choice => {
          const cleanedText = choice.text.trim();
          if (cleanedText.length < 10) {
            throw new Error('Choice text too short (minimum 10 characters)');
          }
          return {
            text: cleanedText,
            nextNodeId: choice.nextNodeId || `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: choice.type || 'story',
            requiredRolls: choice.requiredRolls || [],
            combatData: choice.type === 'combat' ? choice.combatData : undefined,
          };
        }),
      };

      // Validate choices are unique
      const choiceTexts = new Set(cleanedResponse.choices.map(c => c.text.toLowerCase()));
      if (choiceTexts.size !== cleanedResponse.choices.length) {
        throw new Error('Duplicate choices detected');
      }

      console.log(`\n📰 Generated Story Node:`);
      console.log(`📖 Content: ${cleanedResponse.story.content}`);
      console.log(`📋 Summary: ${cleanedResponse.story.summary}`);
      console.log(`🕹️ Choices:${cleanedResponse.choices.map(c => '\n - ' + c.text).join('')}`);

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
