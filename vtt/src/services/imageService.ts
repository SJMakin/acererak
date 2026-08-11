// Image processing service — WebP compression, SHA-256 hashing, ingestion pipeline

export interface EmbeddedImage {
  id: string;            // SHA-256 hex of the WebP blob
  blob: Blob;
  mimeType: string;      // 'image/webp'
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
  source: 'upload' | 'ai' | 'p2p';
  prompt?: string;
}

const MAX_IMAGE_DIMENSION = 8192;
const MAX_IMAGE_PIXELS = 40_000_000;

/** Compress any image Blob/File to WebP at quality 0.8 via offscreen canvas */
export async function compressToWebP(
  source: Blob | File,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(source);
  const { width, height } = bitmap;

  if (
    width < 1 ||
    height < 1 ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    bitmap.close();
    throw new Error('Image dimensions are too large');
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Image processing is not available');
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const webpBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
  return { blob: webpBlob, width, height };
}

/** SHA-256 hash of a Blob, returned as hex string */
export async function computeHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Full ingestion pipeline: compress → hash → construct EmbeddedImage record */
export async function ingestImage(
  source: Blob | File,
  opts?: { source?: EmbeddedImage['source']; prompt?: string },
): Promise<EmbeddedImage> {
  const { blob, width, height } = await compressToWebP(source);
  const id = await computeHash(blob);

  return {
    id,
    blob,
    mimeType: 'image/webp',
    width,
    height,
    sizeBytes: blob.size,
    createdAt: new Date().toISOString(),
    source: opts?.source ?? 'upload',
    prompt: opts?.prompt,
  };
}

/** Convert a Blob to base64 data string (no data URI prefix) */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Convert base64 string back to Blob */
export function base64ToBlob(b64: string, mime: string): Blob {
  const byteChars = atob(b64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteArray], { type: mime });
}
