import { generateText, streamText, generateImage, generateObject, listModels } from 'xsai';
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

/** Generate an image */
export function createImageGeneration(
  apiKey: string,
  model: string,
  prompt: string,
  opts?: Record<string, unknown>,
) {
  return generateImage({ apiKey, baseURL: OPENROUTER_BASE_URL, model, prompt, ...opts });
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
