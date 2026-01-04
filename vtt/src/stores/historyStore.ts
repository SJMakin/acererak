import { create } from 'zustand';
import type { GameState } from '../types';

export interface HistoryAction {
  type: 'add' | 'delete' | 'update' | 'move' | 'fog-reveal' | 'fog-hide';
  timestamp: number;
  // Store the previous and current state for the action
  before: Partial<GameState>;
  after: Partial<GameState>;
  elementId?: string;
  description: string;
}

interface HistoryStore {
  undoStack: HistoryAction[];
  redoStack: HistoryAction[];
  
  // Add an action to history
  pushAction: (action: HistoryAction) => void;
  
  // Undo the last action
  undo: () => HistoryAction | null;
  
  // Redo the last undone action
  redo: () => HistoryAction | null;
  
  // Clear the redo stack (called when a new action is performed)
  clearRedoStack: () => void;
  
  // Clear all history
  clearHistory: () => void;
  
  // Check if undo/redo is available
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  undoStack: [],
  redoStack: [],
  
  pushAction: (action) => {
    set((state) => {
      const newUndoStack = [...state.undoStack, action];
      // Keep only last MAX_HISTORY actions
      const trimmedStack = newUndoStack.slice(-MAX_HISTORY);
      
      return {
        undoStack: trimmedStack,
        // Clear redo stack when new action is performed
        redoStack: [],
      };
    });
  },
  
  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;
    
    const action = state.undoStack[state.undoStack.length - 1];
    
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, action],
    });
    
    return action;
  },
  
  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;
    
    const action = state.redoStack[state.redoStack.length - 1];
    
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, action],
    });
    
    return action;
  },
  
  clearRedoStack: () => {
    set({ redoStack: [] });
  },
  
  clearHistory: () => {
    set({ undoStack: [], redoStack: [] });
  },
  
  canUndo: () => {
    return get().undoStack.length > 0;
  },
  
  canRedo: () => {
    return get().redoStack.length > 0;
  },
}));
