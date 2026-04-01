import { create } from 'zustand';
import type { AIModelInfo, AICapabilities } from '../types/ai';
import { fetchModels, validateApiKey } from '../services/openRouterService';
import { generateAndStore, type GenerateResult } from '../services/aiImageService';
import {
  setKey as vaultSetKey,
  clearKey as vaultClearKey,
  hasKey as vaultHasKey,
  withKey,
  restoreKey,
  getKeyForDisplay,
} from '../services/keyVault';

// localStorage keys for model selections (not sensitive)
const TEXT_MODEL_KEY = 'vtt-ai-textModel';
const IMAGE_MODEL_KEY = 'vtt-ai-imageModel';

function loadStoredModelId(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

/** Function to request AI generation via P2P (player → GM). Set by useRoom. */
let requestAIFn: ((type: string, payload: Record<string, unknown>) => Promise<{ ok: boolean; data?: unknown; error?: string }>) | null = null;

export function setRequestAIFn(fn: typeof requestAIFn) {
  requestAIFn = fn;
}

interface AIStore {
  // State — note: raw apiKey is NOT stored here, only a boolean flag
  hasApiKey: boolean;
  textModel: AIModelInfo | null;
  imageModel: AIModelInfo | null;
  models: AIModelInfo[];
  isLoadingModels: boolean;
  isConnected: boolean;
  capabilities: AICapabilities;
  isGenerating: boolean;
  generationError: string | null;

  // Actions
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => void;
  loadModels: () => Promise<void>;
  setTextModel: (model: AIModelInfo | null) => void;
  setImageModel: (model: AIModelInfo | null) => void;
  getCapabilities: () => AICapabilities;
  restoreModelSelections: () => void;
  generateImage: (prompt: string) => Promise<GenerateResult | null>;
  /** Get the raw key for display in Settings password field */
  getKeyForDisplay: () => string;
  /** Initialize vault from localStorage (call once at startup) */
  initVault: () => Promise<void>;
}

export const useAIStore = create<AIStore>((set, get) => ({
  // Initial state
  hasApiKey: false,
  textModel: null,
  imageModel: null,
  models: [],
  isLoadingModels: false,
  isConnected: false,
  capabilities: { hasAI: false, features: [] },
  isGenerating: false,
  generationError: null,

  setApiKey: async (key: string) => {
    await vaultSetKey(key);
    set({ hasApiKey: vaultHasKey(), isConnected: false });

    if (!key) {
      set({ models: [], textModel: null, imageModel: null, capabilities: { hasAI: false, features: [] } });
      return;
    }

    // Validate then fetch models
    const valid = await withKey(validateApiKey);
    if (!valid) {
      set({ isConnected: false, capabilities: { hasAI: false, features: [] } });
      return;
    }

    set({ isConnected: true });
    await get().loadModels();
  },

  clearApiKey: () => {
    vaultClearKey();
    try {
      localStorage.removeItem(TEXT_MODEL_KEY);
      localStorage.removeItem(IMAGE_MODEL_KEY);
    } catch { /* ignore */ }

    set({
      hasApiKey: false,
      isConnected: false,
      models: [],
      textModel: null,
      imageModel: null,
      capabilities: { hasAI: false, features: [] },
    });
  },

  loadModels: async () => {
    if (!vaultHasKey()) return;

    set({ isLoadingModels: true });
    try {
      const models = await withKey(fetchModels);
      set({ models, isLoadingModels: false });
      get().restoreModelSelections();
    } catch (err) {
      console.error('Failed to load AI models:', err);
      set({ isLoadingModels: false });
    }
  },

  restoreModelSelections: () => {
    const { models } = get();
    const textModels = models.filter(m => m.modelType === 'text');
    const imageModels = models.filter(m => m.modelType === 'image');

    const storedTextId = loadStoredModelId(TEXT_MODEL_KEY);
    let textModel = storedTextId ? textModels.find(m => m.id === storedTextId) || null : null;
    if (!textModel && textModels.length > 0) {
      textModel = textModels.find(m => m.isFree) || textModels[0];
    }

    const storedImageId = loadStoredModelId(IMAGE_MODEL_KEY);
    let imageModel = storedImageId ? imageModels.find(m => m.id === storedImageId) || null : null;
    if (!imageModel && imageModels.length > 0) {
      imageModel = imageModels.find(m => m.isFree) || imageModels[0];
    }

    const capabilities: AICapabilities = {
      hasAI: true,
      textModel: textModel?.id,
      imageModel: imageModel?.id,
      features: [
        ...(textModel ? ['text-generation'] : []),
        ...(imageModel ? ['image-generation'] : []),
      ],
    };

    set({ textModel, imageModel, capabilities });
  },

  setTextModel: (model: AIModelInfo | null) => {
    try {
      if (model) localStorage.setItem(TEXT_MODEL_KEY, model.id);
      else localStorage.removeItem(TEXT_MODEL_KEY);
    } catch { /* ignore */ }

    const { imageModel } = get();
    const capabilities: AICapabilities = {
      hasAI: get().isConnected,
      textModel: model?.id,
      imageModel: imageModel?.id,
      features: [
        ...(model ? ['text-generation'] : []),
        ...(imageModel ? ['image-generation'] : []),
      ],
    };

    set({ textModel: model, capabilities });
  },

  setImageModel: (model: AIModelInfo | null) => {
    try {
      if (model) localStorage.setItem(IMAGE_MODEL_KEY, model.id);
      else localStorage.removeItem(IMAGE_MODEL_KEY);
    } catch { /* ignore */ }

    const { textModel } = get();
    const capabilities: AICapabilities = {
      hasAI: get().isConnected,
      textModel: textModel?.id,
      imageModel: model?.id,
      features: [
        ...(textModel ? ['text-generation'] : []),
        ...(model ? ['image-generation'] : []),
      ],
    };

    set({ imageModel: model, capabilities });
  },

  getCapabilities: () => get().capabilities,

  generateImage: async (prompt: string) => {
    const { imageModel, capabilities } = get();
    set({ isGenerating: true, generationError: null });

    try {
      // GM path: has API key and image model configured locally
      if (vaultHasKey() && imageModel) {
        const result = await withKey((apiKey) => generateAndStore(apiKey, imageModel.id, prompt));
        set({ isGenerating: false });
        return result;
      }

      // Player path: relay via P2P to GM
      if (capabilities.imageModel && requestAIFn) {
        const response = await requestAIFn('generate-image', { prompt });
        if (!response.ok) {
          throw new Error(response.error || 'AI generation failed');
        }
        const data = response.data as GenerateResult;
        set({ isGenerating: false });
        return data;
      }

      throw new Error('No image model available');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ isGenerating: false, generationError: message });
      return null;
    }
  },

  getKeyForDisplay,

  initVault: async () => {
    const restored = await restoreKey();
    if (restored) {
      set({ hasApiKey: true });
      // Validate and load models
      try {
        const valid = await withKey(validateApiKey);
        if (valid) {
          set({ isConnected: true });
          await get().loadModels();
        }
      } catch {
        // key was restored but validation failed — still keep the key
      }
    }
  },
}));

// Auto-initialize vault from localStorage
setTimeout(() => {
  useAIStore.getState().initVault();
}, 0);
