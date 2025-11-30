import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
} from 'react';

import type { CharacterGenerationOptions } from '../services/aiCharacterGenerator';
import { generateAICharacterSheet } from '../services/aiCharacterGenerator';
import { findAndReplaceMarkdownText } from '../services/markdownUtils';
import { setCurrentModel } from '../services/openRouterClient';

import { useModel } from './ModelContext';

export interface CharacterState {
  characterSheet: string;
  isGenerating: boolean;
  system: string | null;
  preferences: string | null;
}

export interface CharacterContextProps extends CharacterState {
  updateCharacterSheet: (
    updates: Array<{ oldText: string; newText: string; description?: string }>
  ) => void;
  resetCharacter: () => void;
  generateCharacter: (options: CharacterGenerationOptions) => Promise<string>;
}

const CharacterContext = createContext<CharacterContextProps | undefined>(
  undefined
);

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<CharacterState>({
    characterSheet: '', // Start empty - character will be generated during setup
    isGenerating: false,
    system: null,
    preferences: null,
  });

  // Get the selected model from ModelContext
  const { selectedModel } = useModel();

  // Set the current model for character generation
  useEffect(() => {
    setCurrentModel(selectedModel);
  }, [selectedModel]);

  const updateCharacterSheet = useCallback(
    (
      updates: Array<{ oldText: string; newText: string; description?: string }>
    ) => {
      setState(prev => {
        let newSheet = prev.characterSheet;
        updates.forEach(update => {
          // Use markdown-aware text replacement
          const result = findAndReplaceMarkdownText(
            newSheet,
            update.oldText,
            update.newText
          );
          if (result.found) {
            newSheet = result.text;
            console.log(
              `Character sheet updated: ${update.description || 'No description'}`
            );
          } else {
            console.warn(
              `Failed to update character sheet: oldText "${update.oldText}" not found`
            );
          }
        });
        return { ...prev, characterSheet: newSheet };
      });
    },
    []
  );

  const generateCharacter = useCallback(
    async (options: CharacterGenerationOptions) => {
      try {
        setState(prev => ({ ...prev, isGenerating: true }));

        // Generate character sheet using AI
        const characterSheet = await generateAICharacterSheet(options);

        setState(prev => ({
          ...prev,
          characterSheet,
          isGenerating: false,
          system: options.system,
          preferences: options.preferences || null,
        }));
        return characterSheet; // Return the generated character sheet
      } catch (error) {
        console.error('Failed to generate character:', error);
        throw error; // Let the error bubble up instead of silent fallback
      }
    },
    []
  );

  const resetCharacter = useCallback(() => {
    setState(prev => ({
      ...prev,
      characterSheet: '',
      system: null,
      preferences: null,
    }));
  }, []);

  const value = {
    ...state,
    updateCharacterSheet,
    resetCharacter,
    generateCharacter,
  };

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
};

export const useCharacter = () => {
  const context = useContext(CharacterContext);
  if (context === undefined) {
    throw new Error('useCharacter must be used within a CharacterProvider');
  }
  return context;
};
