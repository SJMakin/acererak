// AI types for Lychgate VTT

/** Extended model metadata (OpenRouter provides richer data than xsai's Model type) */
export interface AIModelInfo {
  id: string;
  name: string;
  provider: string;
  supportsJson: boolean;
  isFree: boolean;
  modelType: 'text' | 'image';
  pricing?: { prompt: number; completion: number };
}

/** AI settings shape (persisted to localStorage by GM) */
export interface AISettings {
  textModelId: string;
  imageModelId: string;
}

/** P2P AI request (player → GM relay) */
export interface AIRequest {
  requestId: string;
  type: string;
  payload: Record<string, unknown>;
  fromPeerId: string;
}

/** P2P AI response (GM → player relay) */
export interface AIResponse {
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

/** AI capabilities broadcast (GM → players, no key exposed) */
export interface AICapabilities {
  hasAI: boolean;
  textModel?: string;
  imageModel?: string;
  features: string[];
}

/** AI-generated image record for IndexedDB (references content-addressed images table) */
export interface AIImage {
  id: string;
  prompt: string;
  imageId: string;     // reference to images table (content-addressed)
  modelId: string;
  createdAt: string;
}
