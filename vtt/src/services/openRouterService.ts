import { generateText, streamText, generateObject, listModels } from 'xsai';
import type { Message } from 'xsai';
import type { Schema } from 'xsschema';
import type { AIModelInfo } from '../types/ai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/';

/** Raw model shape from OpenRouter's /models endpoint */
interface OpenRouterModel {
  id: string;
  name: string;
  pricing?: { prompt: string; completion: string; image?: string };
  context_length?: number;
  architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] };
  top_provider?: { is_moderated?: boolean };
}

/** Fetch and categorize models from OpenRouter (richer metadata than xsai's Model type) */
export async function fetchModels(apiKey: string): Promise<AIModelInfo[]> {
  const response = await fetch(`${OPENROUTER_BASE_URL}models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }

  const json = await response.json() as { data: OpenRouterModel[] };

  return json.data.map((m): AIModelInfo => {
    const promptPrice = parseFloat(m.pricing?.prompt || '0');
    const completionPrice = parseFloat(m.pricing?.completion || '0');
    const isFree = promptPrice === 0 && completionPrice === 0;

    // Determine model type from output modalities or ID heuristics
    const outputModalities = m.architecture?.output_modalities || [];
    const isImage = outputModalities.includes('image') ||
      m.id.includes('dall-e') ||
      m.id.includes('stable-diffusion') ||
      m.id.includes('flux') ||
      m.id.includes('midjourney');

    // Extract provider from model ID (e.g., "openai/gpt-4o" → "openai")
    const provider = m.id.includes('/') ? m.id.split('/')[0] : 'unknown';

    // JSON support: most text models support it, but we check modality
    const supportsJson = !isImage;

    return {
      id: m.id,
      name: m.name || m.id,
      provider,
      supportsJson,
      isFree,
      modelType: isImage ? 'image' : 'text',
      pricing: { prompt: promptPrice, completion: completionPrice },
    };
  });
}

/** Generate text completion */
export function createTextCompletion(
  apiKey: string,
  model: string,
  messages: Message[],
  opts?: Record<string, unknown>,
) {
  return generateText({ apiKey, baseURL: OPENROUTER_BASE_URL, model, messages, ...opts });
}

/** Stream text completion */
export function createTextStream(
  apiKey: string,
  model: string,
  messages: Message[],
  opts?: Record<string, unknown>,
) {
  return streamText({ apiKey, baseURL: OPENROUTER_BASE_URL, model, messages, ...opts });
}

/** Generate an image via OpenRouter chat completions (images come back in message.images[]) */
export async function createImageGeneration(
  apiKey: string,
  model: string,
  prompt: string,
  _opts?: Record<string, unknown>,
): Promise<{ blob: Blob; revisedPrompt?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000); // 90s timeout

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Image generation timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Image generation failed (HTTP ${response.status})`);
  }

  const json = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type: string; text?: string; image_url?: { url?: string } }>;
        images?: Array<{ image_url?: { url?: string } }>;
      };
    }>;
  };

  const message = json.choices?.[0]?.message;

  // Primary: OpenRouter images array
  let imageUrl = message?.images?.[0]?.image_url?.url;

  // Fallback: some models return images as multipart content blocks
  if (!imageUrl && Array.isArray(message?.content)) {
    const imagePart = message.content.find(
      (p) => p.type === 'image_url' && p.image_url?.url,
    );
    imageUrl = imagePart?.image_url?.url;
  }

  if (!imageUrl) {
    // Log the response shape for debugging (keys only, no sensitive data)
    const msgKeys = message ? Object.keys(message) : [];
    const contentType = Array.isArray(message?.content) ? 'array' : typeof message?.content;
    console.warn('[AI Image] No image in response. message keys:', msgKeys, 'content type:', contentType);
    throw new Error('No image returned from model');
  }

  // Extract text content for revisedPrompt (content may be string or multipart array)
  const revisedPrompt = typeof message?.content === 'string'
    ? message.content || undefined
    : Array.isArray(message?.content)
      ? message.content.find((p) => p.type === 'text')?.text || undefined
      : undefined;

  // Handle data URI (base64-encoded image)
  if (imageUrl.startsWith('data:')) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URI format');
    const [, mimeType, base64Data] = match;
    const byteChars = atob(base64Data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    return { blob: new Blob([byteArray], { type: mimeType }), revisedPrompt };
  }

  // Handle regular URL
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) throw new Error('Failed to fetch generated image');
  return { blob: await imgResponse.blob(), revisedPrompt };
}

/** Generate a structured JSON object */
export function createObjectGeneration<T extends Schema>(
  apiKey: string,
  model: string,
  messages: Message[],
  schema: T,
  opts?: Record<string, unknown>,
) {
  return generateObject({ apiKey, baseURL: OPENROUTER_BASE_URL, model, messages, schema, ...opts });
}

/** Validate API key with a lightweight models list call */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const models = await listModels({ apiKey, baseURL: OPENROUTER_BASE_URL });
    return Array.isArray(models) && models.length > 0;
  } catch {
    return false;
  }
}
