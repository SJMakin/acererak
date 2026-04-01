import { create } from 'zustand';
import { db } from '../db/database';
import type { EmbeddedImage } from '../services/imageService';

// Deduplication map for concurrent getImageUrl calls (outside store to avoid re-renders)
const pendingUrlRequests = new Map<string, Promise<string | null>>();

// Callback for requesting missing images over P2P — set by useRoom
let onImageMissing: ((imageId: string) => void) | null = null;
// Track which IDs we've already requested to avoid spamming
const requestedImages = new Set<string>();

export function setImageMissingCallback(cb: ((imageId: string) => void) | null) {
  onImageMissing = cb;
  if (!cb) requestedImages.clear();
}

export function notifyImageMissing(imageId: string) {
  if (onImageMissing && !requestedImages.has(imageId)) {
    requestedImages.add(imageId);
    onImageMissing(imageId);
  }
}

interface ImageStoreState {
  urlCache: Map<string, string>;

  /** Get an object URL for an imageId. Checks memory cache, then IndexedDB. Deduplicates concurrent calls. */
  getImageUrl: (imageId: string) => Promise<string | null>;

  /** Store an EmbeddedImage in IndexedDB and return its imageId */
  storeImage: (image: EmbeddedImage) => Promise<string>;

  /** Quick existence check (always checks IndexedDB) */
  hasImage: (imageId: string) => Promise<boolean>;

  /** Full record from IndexedDB */
  getImage: (imageId: string) => Promise<EmbeddedImage | null>;

  /** Just the blob */
  getImageBlob: (imageId: string) => Promise<Blob | null>;

  /** All stored image IDs */
  getAllImageIds: () => Promise<string[]>;

  /** Remove images not in the referenced set */
  pruneUnreferenced: (referencedIds: Set<string>) => Promise<number>;

  /** Storage stats */
  getStorageUsage: () => Promise<{ count: number; totalBytes: number }>;
}

export const useImageStore = create<ImageStoreState>((set, get) => ({
  urlCache: new Map(),

  getImageUrl: async (imageId: string) => {
    // Check in-memory cache first
    const cached = get().urlCache.get(imageId);
    if (cached) return cached;

    // Deduplicate concurrent requests for the same imageId
    const pending = pendingUrlRequests.get(imageId);
    if (pending) return pending;

    const promise = (async (): Promise<string | null> => {
      try {
        const record = await db.images.get(imageId);
        if (!record) return null;

        // Create object URL and cache it (revoke old if exists)
        const objectUrl = URL.createObjectURL(record.blob);
        set((state) => {
          const newCache = new Map(state.urlCache);
          const oldUrl = newCache.get(imageId);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          newCache.set(imageId, objectUrl);
          return { urlCache: newCache };
        });
        return objectUrl;
      } finally {
        pendingUrlRequests.delete(imageId);
      }
    })();

    pendingUrlRequests.set(imageId, promise);
    return promise;
  },

  storeImage: async (image: EmbeddedImage) => {
    await db.images.put({
      id: image.id,
      blob: image.blob,
      mimeType: image.mimeType,
      width: image.width,
      height: image.height,
      sizeBytes: image.sizeBytes,
      createdAt: image.createdAt,
      source: image.source,
      prompt: image.prompt,
    });
    return image.id;
  },

  hasImage: async (imageId: string) => {
    // Always check IndexedDB for authoritative answer
    const count = await db.images.where('id').equals(imageId).count();
    return count > 0;
  },

  getImage: async (imageId: string) => {
    const record = await db.images.get(imageId);
    if (!record) return null;
    return record as EmbeddedImage;
  },

  getImageBlob: async (imageId: string) => {
    const record = await db.images.get(imageId);
    return record?.blob ?? null;
  },

  getAllImageIds: async () => {
    const all = await db.images.toCollection().primaryKeys();
    return all as string[];
  },

  pruneUnreferenced: async (referencedIds: Set<string>) => {
    const allIds = await db.images.toCollection().primaryKeys() as string[];
    const toDelete = allIds.filter((id) => !referencedIds.has(id));
    if (toDelete.length > 0) {
      // Revoke cached object URLs
      const cache = get().urlCache;
      const newCache = new Map(cache);
      for (const id of toDelete) {
        const url = newCache.get(id);
        if (url) {
          URL.revokeObjectURL(url);
          newCache.delete(id);
        }
      }
      set({ urlCache: newCache });
      await db.images.bulkDelete(toDelete);
    }
    return toDelete.length;
  },

  getStorageUsage: async () => {
    const all = await db.images.toArray();
    const totalBytes = all.reduce((sum, img) => sum + (img.sizeBytes || 0), 0);
    return { count: all.length, totalBytes };
  },
}));
