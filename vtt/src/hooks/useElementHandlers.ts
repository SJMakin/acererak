import { useRef, useCallback } from 'react';
import type { CanvasElement, Point } from '../types';

interface UseElementHandlersParams {
  game: {
    scenes: Array<{
      id: string;
      elements: CanvasElement[];
      gridSettings: {
        snapToGrid: boolean;
        cellSize: number;
      };
    }>;
    activeSceneId: string;
  } | null;
  selectedElementIds: string[];
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  updateElements: (updates: Array<{ id: string; updates: Partial<CanvasElement> }>) => void;
  room: {
    broadcastElementUpdate: (element: CanvasElement) => void;
  };
}

export function useElementHandlers({
  game,
  selectedElementIds,
  updateElement,
  updateElements,
  room,
}: UseElementHandlersParams) {
  // Multi-drag state - track initial positions when drag starts
  const dragStartPositions = useRef<Record<string, Point>>({});
  const isDraggingMultiple = useRef(false);

  // Handle element drag start - record initial positions for multi-select move
  const handleElementDragStart = useCallback((elementId: string) => {
    // Get active scene elements
    const activeScene = game?.scenes.find(s => s.id === game.activeSceneId) || game?.scenes[0];
    if (!activeScene) return;

    // Check if dragging an element that's part of a multi-selection
    if (selectedElementIds.length > 1 && selectedElementIds.includes(elementId)) {
      isDraggingMultiple.current = true;
      // Record initial positions of all selected elements
      const positions: Record<string, Point> = {};
      selectedElementIds.forEach(id => {
        const el = activeScene.elements.find(e => e.id === id);
        if (el) {
          positions[id] = { x: el.x, y: el.y };
        }
      });
      dragStartPositions.current = positions;
    } else {
      isDraggingMultiple.current = false;
      dragStartPositions.current = {};
    }
  }, [selectedElementIds, game]);

  // Handle element drag end
  const handleElementDragEnd = useCallback((elementId: string, x: number, y: number) => {
    // Get active scene
    const activeScene = game?.scenes.find(s => s.id === game.activeSceneId) || game?.scenes[0];
    if (!activeScene) return;

    const element = activeScene.elements.find(e => e.id === elementId);
    if (!element) return;

    // Snap to grid if enabled
    let finalX = x;
    let finalY = y;

    if (activeScene.gridSettings.snapToGrid) {
      const cellSize = activeScene.gridSettings.cellSize;
      finalX = Math.round(x / cellSize) * cellSize;
      finalY = Math.round(y / cellSize) * cellSize;
    }

    // Check if we're moving multiple elements
    if (isDraggingMultiple.current && selectedElementIds.length > 1) {
      // Calculate delta from the dragged element's original position
      const startPos = dragStartPositions.current[elementId];
      if (startPos) {
        const deltaX = finalX - startPos.x;
        const deltaY = finalY - startPos.y;

        // Build updates for all selected elements
        const updates: Array<{ id: string; updates: Partial<CanvasElement> }> = [];
        const updatedElements: CanvasElement[] = [];

        selectedElementIds.forEach(id => {
          const el = activeScene.elements.find(e => e.id === id);
          const originalPos = dragStartPositions.current[id];
          if (el && originalPos) {
            let newX = originalPos.x + deltaX;
            let newY = originalPos.y + deltaY;

            // Snap each element to grid
            if (activeScene.gridSettings.snapToGrid) {
              const cellSize = activeScene.gridSettings.cellSize;
              newX = Math.round(newX / cellSize) * cellSize;
              newY = Math.round(newY / cellSize) * cellSize;
            }

            updates.push({ id, updates: { x: newX, y: newY } });
            updatedElements.push({ ...el, x: newX, y: newY });
          }
        });

        // Batch update all elements
        updateElements(updates);

        // Broadcast all updates
        updatedElements.forEach(el => {
          room.broadcastElementUpdate(el);
        });
      }

      // Reset multi-drag state
      isDraggingMultiple.current = false;
      dragStartPositions.current = {};
    } else {
      // Single element move
      updateElement(elementId, { x: finalX, y: finalY });
      room.broadcastElementUpdate({ ...element, x: finalX, y: finalY });
    }
  }, [game, updateElement, updateElements, room, selectedElementIds]);

  return {
    handleElementDragStart,
    handleElementDragEnd,
  };
}
