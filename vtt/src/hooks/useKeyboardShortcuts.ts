import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useHistoryStore } from '../stores/historyStore';
import type { ToolType } from '../types';
import { saveGame } from '../db/database';

interface UseKeyboardShortcutsOptions {
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onEscape?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const {
    setTool,
    selectedTool,
    deleteElement,
    selectedElementId,
    selectedElementIds,
    game,
    isDM,
  } = useGameStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  const spacePressed = useRef(false);
  const previousTool = useRef<ToolType>('select');

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey; // Support both Ctrl and Cmd

    // Handle Ctrl+C for copy
    if (ctrl && key === 'c' && selectedElementIds.length > 0) {
      e.preventDefault();
      if (options.onCopy) {
        options.onCopy();
      }
      return;
    }

    // Handle Ctrl+X for cut
    if (ctrl && key === 'x' && selectedElementIds.length > 0) {
      e.preventDefault();
      if (options.onCut) {
        options.onCut();
      }
      return;
    }

    // Handle Ctrl+V for paste
    if (ctrl && key === 'v') {
      e.preventDefault();
      if (options.onPaste) {
        options.onPaste();
      }
      return;
    }

    // Handle Ctrl+Z for undo
    if (ctrl && key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (canUndo()) {
        const action = undo();
        if (action && options.onUndo) {
          options.onUndo();
        }
      }
      return;
    }

    // Handle Ctrl+Y or Ctrl+Shift+Z for redo
    if ((ctrl && key === 'y') || (ctrl && e.shiftKey && key === 'z')) {
      e.preventDefault();
      if (canRedo()) {
        const action = redo();
        if (action && options.onRedo) {
          options.onRedo();
        }
      }
      return;
    }

    // Handle Ctrl+S for save
    if (ctrl && key === 's') {
      e.preventDefault();
      if (game && isDM) {
        saveGame(game, isDM).catch(err => {
          console.error('Failed to save game:', err);
        });
        if (options.onSave) {
          options.onSave();
        }
      }
      return;
    }

    // Handle Delete key
    if (key === 'delete' && selectedElementId) {
      e.preventDefault();
      deleteElement(selectedElementId);
      if (options.onDelete) {
        options.onDelete();
      }
      return;
    }

    // Handle Escape key
    if (key === 'escape') {
      e.preventDefault();
      setTool('select');
      if (options.onEscape) {
        options.onEscape();
      }
      return;
    }

    // Don't allow tool switching while holding Ctrl
    if (ctrl) return;

    // Handle Spacebar for temporary pan
    if (key === ' ' && !spacePressed.current) {
      e.preventDefault();
      spacePressed.current = true;
      previousTool.current = selectedTool;
      setTool('pan');
      return;
    }

    // Tool shortcuts (only single key, no modifiers)
    if (!ctrl && !e.shiftKey && !e.altKey) {
      switch (key) {
        case 's':
          e.preventDefault();
          setTool('select');
          break;
        case 'd':
          e.preventDefault();
          setTool('draw-freehand');
          break;
        case 'l':
          e.preventDefault();
          setTool('draw-line');
          break;
        case 'r':
          e.preventDefault();
          setTool('draw-rectangle');
          break;
        case 'c':
          e.preventDefault();
          setTool('draw-circle');
          break;
        case 't':
          e.preventDefault();
          setTool('text');
          break;
        case 'm':
          e.preventDefault();
          setTool('measure');
          break;
        case 'p':
          e.preventDefault();
          setTool('ping');
          break;
        case 'n':
          e.preventDefault();
          setTool('token');
          break;
      }
    }
  }, [
    setTool,
    selectedTool,
    deleteElement,
    selectedElementId,
    game,
    isDM,
    undo,
    redo,
    canUndo,
    canRedo,
    options,
  ]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    // Handle spacebar release to restore previous tool
    if (key === ' ' && spacePressed.current) {
      e.preventDefault();
      spacePressed.current = false;
      setTool(previousTool.current);
    }
  }, [setTool]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return {
    canUndo: canUndo(),
    canRedo: canRedo(),
  };
}
