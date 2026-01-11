import { useEffect } from 'react';
import type { Point } from '../types';

interface Room {
  broadcastElementUpdate: (element: any) => void;
  broadcastElementDelete: (elementId: string) => void;
}

interface Clipboard {
  copySelected: () => number | undefined;
  cutSelected: () => { count: number; deletedIds: string[] } | undefined;
  hasClipboard: () => boolean;
  pasteElements: (mousePosition: Point) => { count: number; pastedElements: any[] } | undefined;
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
