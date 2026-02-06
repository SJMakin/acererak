import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import type { CanvasElement, Point } from '../types';

interface Room {
  broadcastElementUpdate: (element: CanvasElement) => void;
  broadcastElementDelete: (elementId: string) => void;
}

interface Clipboard {
  copySelected: () => number | undefined;
  cutSelected: () => { count: number; deletedIds: string[] } | undefined;
  hasClipboard: () => boolean;
  pasteElements: (mousePosition: Point) => { count: number; pastedElements: CanvasElement[] } | undefined;
}

interface UseCanvasKeyboardShortcutsOptions {
  selectedTool: string;
  polygonPoints: Point[];
  finishPolygon: () => void;
  measureWaypoints: Point[];
  setMeasureWaypoints: (waypoints: Point[] | ((prev: Point[]) => Point[])) => void;
  setMeasureCurrentPoint: (point: Point | null) => void;
  setMeasureDifficultTerrain: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  selectedElementIds: string[];
  clipboard: Clipboard;
  room: Room;
  mousePosition: React.MutableRefObject<Point>;
}

export function useCanvasKeyboardShortcuts({
  selectedTool,
  polygonPoints,
  finishPolygon,
  measureWaypoints,
  setMeasureWaypoints,
  setMeasureCurrentPoint,
  setMeasureDifficultTerrain,
  selectedElementIds,
  clipboard,
  room,
  mousePosition,
}: UseCanvasKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Also skip if inside a contenteditable (e.g. TipTap editor)
      if (target.isContentEditable) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Polygon tool: press Enter to finish
      if (selectedTool === 'draw-polygon' && polygonPoints.length >= 3 && key === 'enter') {
        e.preventDefault();
        e.stopPropagation();
        finishPolygon();
        return;
      }

      // Measure tool keyboard shortcuts
      if (selectedTool === 'measure') {
        // Escape clears measurement
        if (key === 'escape') {
          e.preventDefault();
          setMeasureWaypoints([]);
          setMeasureCurrentPoint(null);
          return;
        }
        // D toggles difficult terrain modifier
        if (key === 'd') {
          e.preventDefault();
          setMeasureDifficultTerrain(prev => !prev);
          return;
        }
        // Backspace removes last waypoint
        if (key === 'backspace' && measureWaypoints.length > 0) {
          e.preventDefault();
          setMeasureWaypoints(prev => prev.slice(0, -1));
          return;
        }
      }

      // Arrow key token/element movement
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) && selectedElementIds.length > 0) {
        e.preventDefault();

        const scene = useGameStore.getState().getActiveScene();
        if (!scene) return;

        const gridSize = scene.gridSettings.cellSize;
        const snap = scene.gridSettings.snapToGrid;
        // Shift = fine 1px movement; otherwise move by grid cell (or 10px if no snap)
        const step = e.shiftKey ? 1 : (snap ? gridSize : 10);

        let dx = 0;
        let dy = 0;
        if (key === 'arrowleft') dx = -step;
        if (key === 'arrowright') dx = step;
        if (key === 'arrowup') dy = -step;
        if (key === 'arrowdown') dy = step;

        const elements = scene.elements;
        const updates: Array<{ id: string; updates: Partial<CanvasElement> }> = [];

        for (const id of selectedElementIds) {
          const el = elements.find(e => e.id === id);
          if (!el || el.locked) continue;
          updates.push({
            id,
            updates: { x: el.x + dx, y: el.y + dy },
          });
        }

        if (updates.length === 0) return;

        // Apply via store (handles undo history for position moves)
        useGameStore.getState().updateElements(updates);

        // Broadcast each moved element to P2P peers
        const updatedElements = useGameStore.getState().getActiveScene()?.elements;
        if (updatedElements) {
          for (const u of updates) {
            const updated = updatedElements.find(e => e.id === u.id);
            if (updated) {
              room.broadcastElementUpdate(updated);
            }
          }
        }
        return;
      }

      // Clipboard shortcuts
      if (ctrl && key === 'c' && selectedElementIds.length > 0) {
        clipboard.copySelected();
      } else if (ctrl && key === 'x' && selectedElementIds.length > 0) {
        const result = clipboard.cutSelected();
        if (result) {
          // Broadcast deletion of cut elements to peers
          result.deletedIds.forEach(id => room.broadcastElementDelete(id));
        }
      } else if (ctrl && key === 'v' && clipboard.hasClipboard()) {
        const result = clipboard.pasteElements(mousePosition.current);
        if (result) {
          // Broadcast pasted elements to peers
          result.pastedElements.forEach(el => room.broadcastElementUpdate(el));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedElementIds,
    clipboard,
    selectedTool,
    polygonPoints,
    finishPolygon,
    measureWaypoints,
    room,
    mousePosition,
    setMeasureWaypoints,
    setMeasureCurrentPoint,
    setMeasureDifficultTerrain,
  ]);
}
