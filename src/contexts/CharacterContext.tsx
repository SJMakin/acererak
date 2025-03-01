import React, { createContext, useState, useCallback, useContext } from 'react';
import { generateCharacterSheet } from '../services/characterGenerator';
import { generateAICharacterSheet, CharacterGenerationOptions } from '../services/aiCharacterGenerator';

export interface CharacterState {
  characterSheet: string;
  isGenerating: boolean;
  system: string | null;
  preferences: string | null;
}

export interface CharacterContextProps extends CharacterState {
  updateCharacterSheet: (updates: Array<{ oldText: string; newText: string }>) => void;
  resetCharacter: () => void;
  generateCharacter: (options: CharacterGenerationOptions) => Promise<void>;
}

const CharacterContext = createContext<CharacterContextProps | undefined>(undefined);

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CharacterState>({
    characterSheet: generateCharacterSheet(), // Use the random generator for initial load
    isGenerating: false,
    system: null,
    preferences: null
  });

  const updateCharacterSheet = useCallback(
    (updates: Array<{ oldText: string; newText: string }>) => {
      setState(prev => {
        let newSheet = prev.characterSheet;
        updates.forEach(update => {
          newSheet = newSheet.replace(update.oldText, update.newText);
        });
        return { ...prev, characterSheet: newSheet };
      });
    },
    []
  );

  const generateCharacter = useCallback(async (options: CharacterGenerationOptions) => {
    try {
      setState(prev => ({ ...prev, isGenerating: true }));
      
      // Generate character sheet using AI
      const characterSheet = await generateAICharacterSheet(options);
      
      setState(prev => ({
        ...prev,
        characterSheet,
        isGenerating: false,
        system: options.system,
        preferences: options.preferences || null
      }));
    } catch (error) {
      console.error('Failed to generate character:', error);
      
      // Fallback to random character generator if AI fails
      setState(prev => ({
        ...prev,
        characterSheet: generateCharacterSheet(),
        isGenerating: false,
        system: 'D&D 5e (Fallback)',
        preferences: null
      }));
    }
  }, []);

  const resetCharacter = useCallback(() => {
    setState(prev => ({
      ...prev,
      characterSheet: generateCharacterSheet(),
      system: null,
      preferences: null
    }));
  }, []);

  const value = {
    ...state,
    updateCharacterSheet,
    resetCharacter,
    generateCharacter
  };

  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>;
};

export const useCharacter = () => {
  const context = useContext(CharacterContext);
  if (context === undefined) {
    throw new Error('useCharacter must be used within a CharacterProvider');
  }
  return context;
};
