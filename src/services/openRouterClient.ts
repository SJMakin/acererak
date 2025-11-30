import OpenAI from 'openai';

import type { ModelOption } from '../contexts/ModelContext';

// Get API key from localStorage
export const getApiKey = (): string => {
  return localStorage.getItem('openRouterApiKey') || '';
};

// Create a function to get OpenAI client with current API key
export const getOpenRouterClient = (): OpenAI => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(
      'OpenRouter API key is required. Please add your API key in settings.'
    );
  }

  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true,
  });
};

// Strip markdown code blocks from AI response
export const stripMarkdownCodeBlock = (content: string): string => {
  let processed = content;

  if (processed.startsWith('```') && processed.includes('```')) {
    const startIndex = processed.indexOf('\n') + 1;
    const endIndex = processed.lastIndexOf('```');
    if (startIndex > 0 && endIndex > startIndex) {
      processed = processed.substring(startIndex, endIndex).trim();
    }
  }

  return processed;
};

// Centralized model state management
let currentModel: ModelOption | null = null;

export const setCurrentModel = (model: ModelOption): void => {
  currentModel = model;
};

export const getCurrentModel = (): ModelOption => {
  if (!currentModel) {
    throw new Error('Model not set - please set a model first');
  }
  return currentModel;
};
