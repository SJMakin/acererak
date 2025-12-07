import { getApiKey } from './openRouterClient';

// Default image generation model
const DEFAULT_IMAGE_MODEL = 'google/gemini-2.5-flash-image-preview';

let selectedImageModel = DEFAULT_IMAGE_MODEL;

export const setImageModel = (modelId: string): void => {
  selectedImageModel = modelId;
  console.log('Image generation model set to:', modelId);
};

export const getImageModel = (): string => {
  return selectedImageModel;
};

/**
 * Sync the image model with the ModelContext selection
 * This should be called when the user changes the image model
 */
export const syncImageModelFromContext = (modelId: string): void => {
  setImageModel(modelId);
};

/**
 * Generate an image using OpenRouter's chat completions API with modalities
 * @param prompt - The text prompt describing the image to generate
 * @returns The base64 data URL of the generated image
 */
export async function generateImage(prompt: string): Promise<string> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('OpenRouter API key is required for image generation');
  }

  try {
    console.log('Generating image with prompt:', prompt);
    console.log('Using image model:', selectedImageModel);

    // OpenRouter uses the standard chat completions endpoint with modalities
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          model: selectedImageModel,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          modalities: ['image', 'text'],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image generation failed:', errorText);
      throw new Error(
        `Image generation failed: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();

    // Extract image URL from response - it's in message.images array
    if (data.choices && data.choices.length > 0) {
      const message = data.choices[0].message;
      if (message.images && message.images.length > 0) {
        const imageUrl = message.images[0].image_url.url; // Base64 data URL
        console.log(
          'Image generated successfully (base64 length):',
          imageUrl.length
        );
        return imageUrl;
      }
    }

    throw new Error(
      'No image in response - model may not support image generation'
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error during image generation';
    console.error('Image generation error:', message);
    throw new Error(message);
  }
}

/**
 * Create an image generation prompt from story content
 * Extracts the most visual elements and creates a concise, vivid prompt
 */
export function createImagePromptFromStory(
  storyContent: string,
  storySummary?: string,
  imagePrompt?: string
): string {
  // Use dedicated imagePrompt if available, otherwise fall back to story content
  if (imagePrompt) {
    // Limit prompt length (most image models have token limits)
    return imagePrompt.slice(0, 500);
  }

  // Fallback: Use summary if available as it's more concise, otherwise use first part of content
  const baseText = storySummary || storyContent.slice(0, 300);

  // Create a dark fantasy styled prompt
  const stylePrompt = '';

  // Combine the story context with style guidance
  const prompt = `${baseText}. ${stylePrompt}`;

  // Limit prompt length (most image models have token limits)
  return prompt.slice(0, 500);
}
