// AI image generation orchestration — ties OpenRouter generation to embedded image pipeline

import { nanoid } from 'nanoid';
import { createImageGeneration } from './openRouterService';
import { ingestImage } from './imageService';
import { useImageStore } from '../stores/imageStore';
import { db } from '../db/database';
import type { AIImage } from '../types/ai';

export interface GenerateResult {
  imageId: string;
  width: number;
  height: number;
}

/** Generate an image via OpenRouter, ingest into the embedded image pipeline, and record in AI history */
export async function generateAndStore(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<GenerateResult> {
  // 1. Generate image via OpenRouter
  const { blob } = await createImageGeneration(apiKey, model, prompt);

  // 2. Ingest into content-addressed image pipeline (compress → hash → EmbeddedImage)
  const embedded = await ingestImage(blob, { source: 'ai', prompt });

  // 3. Store in images table
  await useImageStore.getState().storeImage(embedded);

  // 4. Save AI history record
  const aiImage: AIImage = {
    id: nanoid(),
    prompt,
    imageId: embedded.id,
    modelId: model,
    createdAt: new Date().toISOString(),
  };
  await db.aiImages.put(aiImage);

  return {
    imageId: embedded.id,
    width: embedded.width,
    height: embedded.height,
  };
}

/** Load recent AI image history with resolved object URLs */
export async function getHistory(limit = 10): Promise<(AIImage & { url: string | null })[]> {
  const records = await db.aiImages
    .orderBy('createdAt')
    .reverse()
    .limit(limit)
    .toArray();

  const imgStore = useImageStore.getState();
  return Promise.all(
    records.map(async (record) => ({
      ...record,
      url: await imgStore.getImageUrl(record.imageId),
    })),
  );
}

/** Clear all AI image history records and prune unreferenced blobs */
export async function clearHistory(): Promise<void> {
  await db.aiImages.clear();
}
