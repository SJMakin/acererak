import { useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import { useGameStore } from '../stores/gameStore';
import type { CanvasElement, Point } from '../types';

interface UseClipboardOptions {
  onCopy?: (count: number) => void;
  onPaste?: (count: number) => void;
  onCut?: (count: number) => void;
}

export function useClipboard(options: UseClipboardOptions = {}) {
  const clipboard = useRef<CanvasElement[]>([]);
  const {
    game,
    selectedElementIds,
    addElements,
    deleteElements,
    selectElements,
    viewportOffset,
    viewportScale,
  } = useGameStore();

  const copyElements = useCallback((elementIds: string[]) => {
    if (!game || elementIds.length === 0) return;

    const elementsToCopy = game.elements.filter(el => elementIds.includes(el.id));
    if (elementsToCopy.length === 0) return;

    // Store copies in clipboard
    clipboard.current = elementsToCopy.map(el => ({ ...el }));
    
    if (options.onCopy) {
      options.onCopy(elementsToCopy.length);
    }

    return elementsToCopy.length;
  }, [game, options]);

  const cutElements = useCallback((elementIds: string[]) => {
    if (!game || elementIds.length === 0) return;

    const elementsToCut = game.elements.filter(el => elementIds.includes(el.id));
    if (elementsToCut.length === 0) return;

    // Copy to clipboard
    clipboard.current = elementsToCut.map(el => ({ ...el }));
    
    // Delete from canvas
    deleteElements(elementIds);
    
    if (options.onCut) {
      options.onCut(elementsToCut.length);
    }

    return elementsToCut.length;
  }, [game, deleteElements, options]);

  const pasteElements = useCallback((mousePosition?: Point) => {
    if (!game || clipboard.current.length === 0) return;

    // Calculate paste position
    let pasteX = 0;
    let pasteY = 0;

    if (mousePosition) {
      // Use mouse position (transformed to canvas coordinates)
      pasteX = (mousePosition.x - viewportOffset.x) / viewportScale;
      pasteY = (mousePosition.y - viewportOffset.y) / viewportScale;
    } else {
      // Use center of viewport as fallback
      const canvasWidth = game.gridSettings.width * game.gridSettings.cellSize;
      const canvasHeight = game.gridSettings.height * game.gridSettings.cellSize;
      pasteX = canvasWidth / 2;
      pasteY = canvasHeight / 2;
    }

    // Calculate the center of the copied elements
    const bounds = clipboard.current.reduce(
      (acc, el) => {
        const elX = el.x;
        const elY = el.y;
        return {
          minX: Math.min(acc.minX, elX),
          minY: Math.min(acc.minY, elY),
          maxX: Math.max(acc.maxX, elX),
          maxY: Math.max(acc.maxY, elY),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Calculate offset to center pasted elements at paste position
    const offsetX = pasteX - centerX;
    const offsetY = pasteY - centerY;

    // Add slight random offset to avoid exact overlap when pasting multiple times
    const randomOffset = 10;
    const finalOffsetX = offsetX + (Math.random() - 0.5) * randomOffset;
    const finalOffsetY = offsetY + (Math.random() - 0.5) * randomOffset;

    // Create new elements with updated positions and new IDs
    const newElements = clipboard.current.map((el) => {
      const { id, ...elementData } = el;
      
      let newElement: Omit<CanvasElement, 'id'> = {
        ...elementData,
        x: el.x + finalOffsetX,
        y: el.y + finalOffsetY,
        zIndex: game.elements.length + 1,
      };

      // For tokens, update name to indicate it's a copy
      if (newElement.type === 'token' && 'name' in newElement) {
        const tokenName = (newElement as any).name || 'Token';
        // Only add "(Copy)" if it doesn't already have it
        if (!tokenName.includes('(Copy)')) {
          (newElement as any).name = `${tokenName} (Copy)`;
        }
      }

      return newElement;
    });

    // Add elements to canvas
    const newIds = addElements(newElements);
    
    // Select the newly pasted elements
    selectElements(newIds);

    if (options.onPaste) {
      options.onPaste(newIds.length);
    }

    return newIds.length;
  }, [game, addElements, selectElements, viewportOffset, viewportScale, options]);

  const hasClipboard = useCallback(() => {
    return clipboard.current.length > 0;
  }, []);

  const clearClipboard = useCallback(() => {
    clipboard.current = [];
  }, []);

  const copySelected = useCallback(() => {
    return copyElements(selectedElementIds);
  }, [copyElements, selectedElementIds]);

  const cutSelected = useCallback(() => {
    return cutElements(selectedElementIds);
  }, [cutElements, selectedElementIds]);

  return {
    copyElements,
    cutElements,
    pasteElements,
    copySelected,
    cutSelected,
    hasClipboard,
    clearClipboard,
    clipboardCount: clipboard.current.length,
  };
}
