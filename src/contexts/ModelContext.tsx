import React, { createContext, useContext, useState, useEffect } from 'react';

// Define model options with provider, support and release info
export interface ModelOption {
  id: string;
  name: string;
  description?: string;
  provider: string;
  supportsJson: boolean;
  isFree: boolean;
  releaseRank: number; // Higher number = more recent release
}

// Determine if a model supports JSON based on the model's metadata
function modelSupportsStructuredOutput(model: any): boolean {
  // If we have proper architecture information
  if (model.architecture) {
    // Check for "json" capability explicitly if available in future API versions
    if (model.architecture.supports_json === true) {
      return true;
    }
    
    // Check if it supports text output
    if (Array.isArray(model.architecture.output_modalities) && 
        model.architecture.output_modalities.includes('text')) {
      return true;  // Most text models can output structured text including JSON
    }
  }
  
  // Fallback: Check description for JSON capability mentions
  if (model.description) {
    const desc = model.description.toLowerCase();
    return desc.includes('json') || 
           desc.includes('structured') || 
           desc.includes('format');
  }
  
  // Default to false
  return false;
}

// Determine if a model is free or has minimal cost based on pricing data
function modelIsFree(model: any): boolean {
  // If explicitly marked as free in the top_provider section
  if (model.top_provider && model.top_provider.is_free === true) {
    return true;
  }
  
  // If we have explicit pricing information
  if (model.pricing) {
    try {
      // Get all the cost components
      const promptCost = parseFloat(model.pricing.prompt) || 0;
      const completionCost = parseFloat(model.pricing.completion) || 0;
      const requestCost = parseFloat(model.pricing.request) || 0;
      
      // Sum them up
      const totalCost = promptCost + completionCost + requestCost;
      
      // If total cost is zero
      if (totalCost === 0) {
        return true;
      }
      
      // Very low cost threshold
      const COST_THRESHOLD = 0.00001; // Low per-token cost threshold
      if (totalCost <= COST_THRESHOLD) {
        return true;
      }
    } catch (e) {
      console.warn(`Error parsing pricing data:`, e);
    }
  }
  
  // If context indicates free
  if (model.context && (model.context.free === true || 
      (typeof model.context === 'string' && model.context.includes('free')))) {
    return true;
  }
  
  // Check name or description for "free" mentions
  const nameAndDesc = `${model.name || ''} ${model.description || ''}`.toLowerCase();
  if (nameAndDesc.includes('free')) {
    return true;
  }
  
  // If pricing structure indicates this is a smaller model
  // (smaller models are often free or very low cost)
  if (model.context && model.context.size === 'small') {
    return true;
  }
  
  // Cannot determine
  return false;
}

// Get model release recency rank based on creation date
function getModelReleaseRank(model: any): number {
  // If we have a creation date, use it as the primary ranking factor
  if (model.created) {
    // Models with a recent creation timestamp get a high base score
    const creationDate = new Date(model.created * 1000);
    const now = new Date();
    const ageInDays = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Newer models get higher scores (max 100 for a brand new model)
    // Score decreases by 1 point for every 10 days of age
    return Math.max(0, 100 - (ageInDays / 10));
  }
  
  // If we don't have a creation date, use a default value
  return 20;
}

// Fetch available models from OpenRouter API
async function fetchAvailableModels(): Promise<ModelOption[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process all models from API response
    return data.data.map((model: any) => {
      // Extract provider from model ID
      const id = model.id;
      const providerName = id.includes('/') ? id.split('/')[0] : 'Other';
      
      // Format provider name for better display
      const formattedProvider = providerName
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Determine if model supports structured output
      const supportsJson = modelSupportsStructuredOutput(model);
      
      // Return enhanced model object
      return {
        id: model.id,
        name: model.name || model.id.split('/').pop(),
        description: model.description || '',
        provider: formattedProvider,
        supportsJson,
        isFree: modelIsFree(model),
        releaseRank: getModelReleaseRank(model)
      };
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    
    // Fallback models if API call fails - a single minimal model
    return [
      { 
        id: 'fallback-model',
        name: 'Default Model',
        description: 'Fallback model when API is unavailable',
        provider: 'System',
        supportsJson: true,
        isFree: true,
        releaseRank: 50
      }
    ];
  }
}

// Context interface
interface ModelContextType {
  selectedModel: ModelOption;
  modelOptions: ModelOption[];
  setSelectedModel: (model: ModelOption) => void;
  isLoading: boolean;
}

// Create context with default value
const ModelContext = createContext<ModelContextType | undefined>(undefined);

// Provider component
export const ModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Default model to use before models are loaded
  const defaultModel: ModelOption = {
    id: 'loading-placeholder',
    name: 'Loading Models...',
    description: 'Please wait while available models are loaded',
    provider: 'System',
    supportsJson: true,
    isFree: false,
    releaseRank: 0
  };
  
  // Try to get selected model from localStorage, or select the best default
  const [selectedModel, setSelectedModel] = useState<ModelOption>(() => {
    const saved = localStorage.getItem('selectedModel');
    return saved ? JSON.parse(saved) : defaultModel;
  });

  // Helper function to find the best default model based on metadata
  const findBestDefaultModel = (models: ModelOption[]): ModelOption | null => {
    if (models.length === 0) return null;
    
    // Filter for models that support JSON and are free
    const freeJsonModels = models.filter(model => model.supportsJson && model.isFree);
    
    if (freeJsonModels.length > 0) {
      // If we have free JSON-capable models, sort by recency and return the newest
      freeJsonModels.sort((a, b) => b.releaseRank - a.releaseRank);
      return freeJsonModels[0];
    }
    
    // If no free JSON models, try any JSON-capable model
    const jsonModels = models.filter(model => model.supportsJson);
    if (jsonModels.length > 0) {
      // Sort by recency
      jsonModels.sort((a, b) => b.releaseRank - a.releaseRank);
      return jsonModels[0];
    }
    
    // Last resort: return the first model
    return models[0];
  };
  
  // Fetch available models when component mounts
  useEffect(() => {
    async function loadModels() {
      try {
        setIsLoading(true);
        const models = await fetchAvailableModels();
        
        // Sort models by recency primarily, then by name within same recency
        models.sort((a, b) => {
          // Primary sort by release rank (descending)
          const recencyDiff = b.releaseRank - a.releaseRank;
          
          if (recencyDiff !== 0) {
            return recencyDiff;
          }
          
          // Secondary sort by name (ascending)
          return a.name.localeCompare(b.name);
        });
        
        setModelOptions(models);
        
        // Determine the best default model or use saved preference
        const savedModelJson = localStorage.getItem('selectedModel');
        
        if (savedModelJson) {
          try {
            // Try to use saved model if it exists
            const savedModel = JSON.parse(savedModelJson);
            const matchedModel = models.find(m => m.id === savedModel.id);
            
            if (matchedModel) {
              // Found the saved model, use it
              setSelectedModel(matchedModel);
            } else {
              // Saved model not found, find the best default
              const bestModel = findBestDefaultModel(models);
              if (bestModel) setSelectedModel(bestModel);
            }
          } catch (e) {
            // Error parsing saved model, find the best default
            const bestModel = findBestDefaultModel(models);
            if (bestModel) setSelectedModel(bestModel);
          }
        } else {
          // No saved preference, find the best default
          const bestModel = findBestDefaultModel(models);
          if (bestModel) setSelectedModel(bestModel);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadModels();
  }, []);

  // Save to localStorage when model changes
  useEffect(() => {
    if (!isLoading && selectedModel) {
      localStorage.setItem('selectedModel', JSON.stringify(selectedModel));
    }
  }, [selectedModel, isLoading]);

  const value = {
    selectedModel,
    modelOptions,
    setSelectedModel,
    isLoading
  };

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
};

// Custom hook to use the context
export const useModel = (): ModelContextType => {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
};
