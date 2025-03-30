import React, { createContext, useState, useCallback, useContext } from 'react';
import { generateCharacterSheet } from '../services/characterGenerator';
import { generateAICharacterSheet, CharacterGenerationOptions } from '../services/aiCharacterGenerator';
import { findAndReplaceMarkdownText, dumpSheetAndSearchText } from '../services/markdownUtils';
import { debugLog } from '../services/debugUtils';

export interface CharacterState {
  characterSheet: string;
  isGenerating: boolean;
  system: string | null;
  preferences: string | null;
}

export interface CharacterContextProps extends CharacterState {
  updateCharacterSheet: (updates: Array<{ oldText: string; newText: string; description?: string }>) => void;
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
    (updates: Array<{ oldText: string; newText: string; description?: string }>) => {
      setState(prev => {
        let newSheet = prev.characterSheet;
        updates.forEach(update => {
          debugLog('CHARACTER_CONTEXT', 'Attempting to update character sheet', {
            oldText: update.oldText,
            newText: update.newText,
            description: update.description
          });
          
          // Use markdown-aware text replacement
          const result = findAndReplaceMarkdownText(newSheet, update.oldText, update.newText, "character-sheet");
          if (result.found) {
            newSheet = result.text;
            console.log(`Character sheet updated: ${update.description || 'No description'}`);
            debugLog('CHARACTER_CONTEXT', 'Character sheet updated successfully', {
              description: update.description
            });
          } else {
            console.warn(`Failed to update character sheet: oldText "${update.oldText}" not found`);
            debugLog('CHARACTER_CONTEXT', 'Failed to update character sheet', {
              oldText: update.oldText,
              reason: 'Text not found in character sheet'
            });
          }
        });
        // Dump the final character sheet for debugging
        dumpSheetAndSearchText(newSheet, "final-character-sheet", "character-sheet-after-updates");
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
