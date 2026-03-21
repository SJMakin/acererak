import { create } from 'zustand';
import type { AIModelInfo, AICapabilities } from '../types/ai';
import { fetchModels, validateApiKey } from '../services/openRouterService';

// localStorage keys
const API_KEY_KEY = 'vtt-ai-apiKey';
const TEXT_MODEL_KEY = 'vtt-ai-textModel';
const IMAGE_MODEL_KEY = 'vtt-ai-imageModel';

function loadStoredKey(): string {
  try {
    return localStorage.getItem(API_KEY_KEY) || '';
  } catch {
    return '';
  }
}

function loadStoredModelId(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

interface AIStore {
  // State
  apiKey: string;
  textModel: AIModelInfo | null;
  imageModel: AIModelInfo | null;
  models: AIModelInfo[];
  isLoadingModels: boolean;
  isConnected: boolean;
  capabilities: AICapabilities;

  // Actions
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => void;
  loadModels: () => Promise<void>;
  setTextModel: (model: AIModelInfo | null) => void;
  setImageModel: (model: AIModelInfo | null) => void;
  getCapabilities: () => AICapabilities;
  /** Restore persisted model selections after models have been fetched */
  restoreModelSelections: () => void;
}

export const useAIStore = create<AIStore>((set, get) => ({
  // Initial state
  apiKey: loadStoredKey(),
  textModel: null,
  imageModel: null,
  models: [],
  isLoadingModels: false,
  isConnected: false,
  capabilities: { hasAI: false, features: [] },

  setApiKey: async (key: string) => {
    try {
      localStorage.setItem(API_KEY_KEY, key);
    } catch { /* ignore */ }

    set({ apiKey: key, isConnected: false });

    if (!key) {
      set({ models: [], textModel: null, imageModel: null, capabilities: { hasAI: false, features: [] } });
      return;
    }

    // Validate then fetch models
    const valid = await validateApiKey(key);
    if (!valid) {
      set({ isConnected: false, capabilities: { hasAI: false, features: [] } });
      return;
    }

    set({ isConnected: true });
    await get().loadModels();
  },

  clearApiKey: () => {
    try {
      localStorage.removeItem(API_KEY_KEY);
      localStorage.removeItem(TEXT_MODEL_KEY);
      localStorage.removeItem(IMAGE_MODEL_KEY);
    } catch { /* ignore */ }

    set({
      apiKey: '',
      isConnected: false,
      models: [],
      textModel: null,
      imageModel: null,
      capabilities: { hasAI: false, features: [] },
    });
  },

  loadModels: async () => {
    const { apiKey } = get();
    if (!apiKey) return;

    set({ isLoadingModels: true });
    try {
      const models = await fetchModels(apiKey);
      set({ models, isLoadingModels: false });

      // Restore persisted selections or auto-select defaults
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

    // Restore text model
    const storedTextId = loadStoredModelId(TEXT_MODEL_KEY);
    let textModel = storedTextId ? textModels.find(m => m.id === storedTextId) || null : null;
    if (!textModel && textModels.length > 0) {
      // Auto-select first free model, or first available
      textModel = textModels.find(m => m.isFree) || textModels[0];
    }

    // Restore image model
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
      if (model) {
        localStorage.setItem(TEXT_MODEL_KEY, model.id);
      } else {
        localStorage.removeItem(TEXT_MODEL_KEY);
      }
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
      if (model) {
        localStorage.setItem(IMAGE_MODEL_KEY, model.id);
      } else {
        localStorage.removeItem(IMAGE_MODEL_KEY);
      }
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

  getCapabilities: () => {
    return get().capabilities;
  },
}));

// Auto-initialize if a key was persisted from a previous session
const storedKey = loadStoredKey();
if (storedKey) {
  // Defer to avoid blocking module load
  setTimeout(() => {
    useAIStore.getState().setApiKey(storedKey);
  }, 0);
}
