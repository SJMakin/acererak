import { generateText, streamText, generateObject, listModels } from 'xsai';
import type { Message } from 'xsai';
import type { Schema } from 'xsschema';
import type { AIModelInfo } from '../types/ai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/';
const MODEL_REQUEST_TIMEOUT_MS = 15_000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_GENERATED_IMAGE_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }

  const json = await response.json() as { data?: unknown };
  if (!Array.isArray(json.data)) {
    throw new Error('Model response was malformed');
  }

  return json.data
    .slice(0, 10_000)
    .filter((value): value is OpenRouterModel => (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { id?: unknown }).id === 'string'
    ))
    .map((m): AIModelInfo => {
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
    if (!ALLOWED_IMAGE_TYPES.has(mimeType.toLowerCase())) {
      throw new Error('Unsupported generated image type');
    }
    if (base64Data.length > Math.ceil(MAX_GENERATED_IMAGE_BYTES * 4 / 3) + 4) {
      throw new Error('Generated image is too large');
    }
    const byteChars = atob(base64Data);
    if (byteChars.length > MAX_GENERATED_IMAGE_BYTES) {
      throw new Error('Generated image is too large');
    }
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    return { blob: new Blob([byteArray], { type: mimeType }), revisedPrompt };
  }

  // Handle regular URL
  let parsedImageUrl: URL;
  try {
    parsedImageUrl = new URL(imageUrl);
  } catch {
    throw new Error('Generated image URL is invalid');
  }
  if (parsedImageUrl.protocol !== 'https:') {
    throw new Error('Generated image URL must use HTTPS');
  }

  const downloadController = new AbortController();
  const downloadTimeout = setTimeout(() => downloadController.abort(), IMAGE_DOWNLOAD_TIMEOUT_MS);
  try {
    const imgResponse = await fetch(parsedImageUrl, { signal: downloadController.signal });
    if (!imgResponse.ok) throw new Error('Failed to fetch generated image');
    if (new URL(imgResponse.url).protocol !== 'https:') {
      throw new Error('Generated image redirect must use HTTPS');
    }

    const contentType = (imgResponse.headers.get('content-type') || '').split(';', 1)[0].toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      throw new Error('Generated image response has an unsupported type');
    }
    const declaredLength = Number(imgResponse.headers.get('content-length') || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_GENERATED_IMAGE_BYTES) {
      throw new Error('Generated image is too large');
    }

    const blob = await imgResponse.blob();
    if (blob.size > MAX_GENERATED_IMAGE_BYTES) {
      throw new Error('Generated image is too large');
    }
    return { blob, revisedPrompt };
  } finally {
    clearTimeout(downloadTimeout);
  }
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
