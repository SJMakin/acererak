import { getOpenRouterClient, getCurrentModel } from './openRouterClient';

export interface CharacterGenerationOptions {
  system: string;
  preferences?: string;
}

export async function generateAICharacterSheet(
  options: CharacterGenerationOptions
): Promise<string> {
  try {
    const currentModel = getCurrentModel();

    // Build the prompt based on the RPG system and any user preferences
    const prompt = `${options.system} character sheet. ${options.preferences || 'Random, system-appropriate.'}

Markdown format. Include: stats, abilities, gear, background.
Dice notation if applicable (1d8+2, 2d6 fire, etc).
Balanced for play. Make them MEMORABLE.`;

    console.log('Character generation prompt:', prompt);

    const openRouter = getOpenRouterClient();
    // Using the OpenAI client with OpenRouter
    const response = await openRouter.chat.completions.create({
      model: currentModel.id,
      messages: [
        {
          role: 'system',
          content: 'Generate brutal, playable RPG characters. No fluff.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      top_p: 0.95,
    });

    // Extract the text from the response
    const characterSheet = response.choices[0].message.content || '';
    return characterSheet;
  } catch (error) {
    console.error('AI character generation failed:', error);
    throw error; // Fail loud and proud
  }
}
