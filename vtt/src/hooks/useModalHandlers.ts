import { useCallback } from 'react';
import type { Point, TokenElement, TextElement, CanvasElement, GameState } from '../types';
import { useGameStore } from '../stores/gameStore';
import type { TokenConfig } from '../components/TokenConfigModal';

interface UseModalHandlersProps {
  tokenPlacementPosition: Point | null;
  game: GameState | null;
  addElement: (element: Omit<CanvasElement, 'id'>) => string;
  room: {
    broadcastElementUpdate: (element: CanvasElement) => void;
  };
  textEditPosition: Point | null;
  editingTextId: string | null;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

interface UseModalHandlersReturn {
  handleTokenSubmit: (config: TokenConfig) => void;
  handleTextSubmit: (text: string) => void;
  handleTextDoubleClick: (elementId: string) => void;
}

export function useModalHandlers({
  tokenPlacementPosition,
  game,
  addElement,
  room,
  textEditPosition,
  editingTextId,
  updateElement,
}: UseModalHandlersProps): UseModalHandlersReturn {
  // Handle token configuration submission
  const handleTokenSubmit = useCallback((config: TokenConfig) => {
    if (!tokenPlacementPosition || !game) return;

    // Get active scene
    const activeScene = game.scenes.find(s => s.id === game.activeSceneId) || game.scenes[0];
    if (!activeScene) return;

    let x = tokenPlacementPosition.x;
    let y = tokenPlacementPosition.y;

    // Snap to grid if enabled
    if (activeScene.gridSettings.snapToGrid) {
      const cellSize = activeScene.gridSettings.cellSize;
      x = Math.round(x / cellSize) * cellSize;
      y = Math.round(y / cellSize) * cellSize;
    }

    const token: Omit<TokenElement, 'id'> = {
      type: 'token',
      layer: 'token',
      name: config.name,
      imageUrl: config.imageUrl,
      x,
      y,
      width: config.size,
      height: config.size,
      visibleTo: 'all',
      locked: false,
      zIndex: activeScene.elements.length,
      hp: config.hp,
      ac: config.ac,
    };

    const id = addElement(token);
    const fullToken = { ...token, id } as TokenElement;
    room.broadcastElementUpdate(fullToken);
  }, [tokenPlacementPosition, game, addElement, room]);

  // Handle text double-click for editing
  const handleTextDoubleClick = useCallback((elementId: string) => {
    // Get active scene
    const activeScene = game?.scenes.find(s => s.id === game.activeSceneId) || game?.scenes[0];
    if (!activeScene) return;

    const element = activeScene.elements.find(e => e.id === elementId);
    if (element && element.type === 'text') {
      // Note: The caller is responsible for setting the modal state
      // This hook only provides the handler logic
    }
  }, [game]);

  // Handle text submission (new or edit)
  const handleTextSubmit = useCallback((text: string) => {
    if (!text.trim() || !game) return;

    // Get active scene
    const activeScene = game.scenes.find(s => s.id === game.activeSceneId) || game.scenes[0];
    if (!activeScene) return;

    if (editingTextId) {
      // Update existing text
      updateElement(editingTextId, { content: text });
      const freshScene = useGameStore.getState().game?.scenes.find(
        s => s.id === useGameStore.getState().game?.activeSceneId
      );
      const freshElement = freshScene?.elements.find(e => e.id === editingTextId);
      if (freshElement) {
        room.broadcastElementUpdate(freshElement);
      }
    } else if (textEditPosition) {
      // Create new text element
      const newElement: Omit<TextElement, 'id'> = {
        type: 'text',
        layer: 'drawing',
        content: text,
        x: textEditPosition.x,
        y: textEditPosition.y,
        width: 200,
        visibleTo: 'all',
        locked: false,
        zIndex: activeScene.elements.length,
        style: {
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          strokeColor: '#ffffff',
          backgroundEnabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backgroundOpacity: 0.7,
        },
      };

      const id = addElement(newElement);
      room.broadcastElementUpdate({ ...newElement, id } as TextElement);
    }
  }, [editingTextId, textEditPosition, game, updateElement, addElement, room]);

  return {
    handleTokenSubmit,
    handleTextSubmit,
    handleTextDoubleClick,
  };
}
