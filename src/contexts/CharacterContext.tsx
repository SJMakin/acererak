import React, { createContext, useState, useCallback, useContext } from 'react';
import { generateCharacterSheet } from '../services/characterGenerator';

export interface CharacterState {
  characterSheet: string;
}

export interface CharacterContextProps extends CharacterState {
  updateCharacterSheet: (updates: Array<{ oldText: string; newText: string }>) => void;
  resetCharacter: () => void;
}

const CharacterContext = createContext<CharacterContextProps | undefined>(undefined);

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CharacterState>({
    characterSheet: generateCharacterSheet()
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

  const resetCharacter = useCallback(() => {
    setState({
      characterSheet: generateCharacterSheet()
    });
  }, []);

  const value = {
    ...state,
    updateCharacterSheet,
    resetCharacter
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