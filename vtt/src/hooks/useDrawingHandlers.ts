import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import type Konva from 'konva';
import type { Point, CanvasElement, Scene, ShapeElement, TokenElement, TextElement, ImageElement } from '../types';
import {
  createFreehandShape,
  createLineShape,
  createRectangleShape,
  createCircleShape,
  createEllipseShape,
  createArrowShape,
  createAoeCircleShape,
  createAoeConeShape,
  createAoeTriangleShape,
  createAoeLineShape,
  createAoeSquareShape,
} from '../utils/shapeCreators';

interface UseDrawingHandlersProps {
  stageRef: React.RefObject<Konva.Stage>;
  viewportOffset: Point;
  viewportScale: number;
  selectedTool: string;
  isDrawingTool: boolean;
  isFogTool: boolean;
  drawStartPoint: Point | null;
  measureWaypoints: Point[];
  marqueeStart: Point | null;
  isMarqueeSelecting: React.MutableRefObject<boolean>;
  room: {
    broadcastElementUpdate: (element: CanvasElement) => void;
    broadcastElementDelete: (elementId: string) => void;
    broadcastCursor: (position: Point) => void;
    broadcastPing: (position: Point, color: string) => void;
    broadcastFogUpdate?: (fogOfWar: { enabled: boolean; revealed: Point[][] }) => void;
  };
  selectElement: (id: string | null) => void;
  selectElements: (ids: string[]) => void;
  addElement: (element: Omit<CanvasElement, 'id'>) => string;
  revealFog: (points: Point[]) => void;
  hideFog: (points: Point[]) => void;
  drawingStrokeColor: string;
  drawingFillColor: string;
  drawingFillEnabled: boolean;
  drawingStrokeWidth: number;
  game: { scenes: Scene[]; activeSceneId: string } | null;
  currentLine: number[];
  setCurrentLine: Dispatch<SetStateAction<number[]>>;
  setDrawStartPoint: Dispatch<SetStateAction<Point | null>>;
  setPolygonPoints: Dispatch<SetStateAction<Point[]>>;
  setMeasureWaypoints: Dispatch<SetStateAction<Point[]>>;
  setMeasureCurrentPoint: Dispatch<SetStateAction<Point | null>>;
  setMarqueeStart: Dispatch<SetStateAction<Point | null>>;
  setMarqueeEnd: Dispatch<SetStateAction<Point | null>>;
  addPing: (x: number, y: number, color: string) => void;
  setTextEditPosition: Dispatch<SetStateAction<Point | null>>;
  setTextEditContent: Dispatch<SetStateAction<string>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  setTextModalOpened: Dispatch<SetStateAction<boolean>>;
  setTokenPlacementPosition: Dispatch<SetStateAction<Point | null>>;
  setTokenModalOpened: Dispatch<SetStateAction<boolean>>;
  finishPolygon: () => void;
}

export function useDrawingHandlers({
  stageRef,
  viewportOffset,
  viewportScale,
  selectedTool,
  isDrawingTool,
  isFogTool,
  drawStartPoint,
  measureWaypoints,
  marqueeStart,
  isMarqueeSelecting,
  room,
  selectElement,
  selectElements,
  addElement,
  revealFog,
  hideFog,
  drawingStrokeColor,
  drawingFillColor,
  drawingFillEnabled,
  drawingStrokeWidth,
  game,
  currentLine,
  setCurrentLine,
  setDrawStartPoint,
  setPolygonPoints,
  setMeasureWaypoints,
  setMeasureCurrentPoint,
  setMarqueeStart,
  setMarqueeEnd,
  addPing,
  setTextEditPosition,
  setTextEditContent,
  setEditingTextId,
  setTextModalOpened,
  setTokenPlacementPosition,
  setTokenModalOpened,
  finishPolygon,
}: UseDrawingHandlersProps) {
  const isDrawing = useRef(false);
  const lastCursorBroadcast = useRef<{ time: number; position: Point }>({ time: 0, position: { x: 0, y: 0 } });

  // Handle mouse/touch down for drawing
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Handle polygon tool - click to add points
    if (selectedTool === 'draw-polygon' && e.target === e.target.getStage()) {
      const stage = stageRef.current;
      if (stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const x = (pointer.x - viewportOffset.x) / viewportScale;
          const y = (pointer.y - viewportOffset.y) / viewportScale;

          // Right-click to finish polygon
          const isRightClick = (e.evt as MouseEvent).button === 2;

          // Note: polygonPoints is passed via setPolygonPoints callback
          // The actual polygon points state is managed by the caller
          if (isRightClick) {
            // Finish polygon on right-click
            finishPolygon();
          } else if (!isRightClick) {
            // Add point to polygon on left-click
            setPolygonPoints((prev: Point[]) => [...prev, { x, y }]);
          }
        }
      }
      return;
    }

    // Only draw when using a drawing tool and clicking on stage
    if (!isDrawingTool) {
      // Handle marquee selection in select mode
      if (selectedTool === 'select' && e.target === e.target.getStage()) {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            const x = (pointer.x - viewportOffset.x) / viewportScale;
            const y = (pointer.y - viewportOffset.y) / viewportScale;

            // Start marquee selection
            isMarqueeSelecting.current = true;
            setMarqueeStart({ x, y });
            setMarqueeEnd({ x, y });

            // Only clear selection if not shift-clicking
            const evt = e.evt as MouseEvent;
            if (!evt.shiftKey) {
              selectElement(null);
            }
          }
        }
        return;
      }
      // Handle measure tool - waypoint-based click to add points
      if (selectedTool === 'measure' && e.target === e.target.getStage()) {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            // Transform to canvas coordinates
            const x = (pointer.x - viewportOffset.x) / viewportScale;
            const y = (pointer.y - viewportOffset.y) / viewportScale;

            // Right-click clears measurement
            const isRightClick = (e.evt as MouseEvent).button === 2;
            if (isRightClick) {
              setMeasureWaypoints([]);
              setMeasureCurrentPoint(null);
            } else {
              // Left-click adds a waypoint
              setMeasureWaypoints((prev: Point[]) => [...prev, { x, y }]);
            }
          }
        }
        return;
      }
      // Handle ping tool
      if (selectedTool === 'ping') {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            // Transform to canvas coordinates
            const x = (pointer.x - viewportOffset.x) / viewportScale;
            const y = (pointer.y - viewportOffset.y) / viewportScale;
            addPing(x, y, '#f59e0b');
            room.broadcastPing({ x, y }, '#f59e0b');
          }
        }
      }
      // Handle text tool
      if (selectedTool === 'text' && e.target === e.target.getStage()) {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            // Transform to canvas coordinates
            const x = (pointer.x - viewportOffset.x) / viewportScale;
            const y = (pointer.y - viewportOffset.y) / viewportScale;

            // Open text modal for new text
            setTextEditPosition({ x, y });
            setTextEditContent('');
            setEditingTextId(null);
            setTextModalOpened(true);
          }
        }
      }
      // Handle token tool
      if (selectedTool === 'token' && e.target === e.target.getStage()) {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            // Transform to canvas coordinates
            const x = (pointer.x - viewportOffset.x) / viewportScale;
            const y = (pointer.y - viewportOffset.y) / viewportScale;

            // Store position and open modal
            setTokenPlacementPosition({ x, y });
            setTokenModalOpened(true);
          }
        }
      }
      return;
    }

    isDrawing.current = true;
    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Account for viewport offset and scale
    const x = (pos.x - viewportOffset.x) / viewportScale;
    const y = (pos.y - viewportOffset.y) / viewportScale;

    // Store start point for all drawing tools
    setDrawStartPoint({ x, y });

    // For freehand, start collecting points immediately
    if (selectedTool === 'draw-freehand') {
      setCurrentLine([x, y]);
    } else {
      // For line/rect/circle, just set start and end as same initially
      setCurrentLine([x, y, x, y]);
    }
  }, [
    isDrawingTool,
    selectedTool,
    selectElement,
    room,
    viewportOffset,
    viewportScale,
    stageRef,
    setPolygonPoints,
    finishPolygon,
    isMarqueeSelecting,
    setMarqueeStart,
    setMarqueeEnd,
    setMeasureWaypoints,
    setMeasureCurrentPoint,
    addPing,
    setTextEditPosition,
    setTextEditContent,
    setEditingTextId,
    setTextModalOpened,
    setTokenPlacementPosition,
    setTokenModalOpened,
    setDrawStartPoint,
    setCurrentLine,
  ]);

  // Handle mouse/touch move for drawing
  const handleMouseMoveForDrawing = useCallback((_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Broadcast cursor position (throttled: 10Hz max, 5px min delta)
    const stage = stageRef.current;
    if (stage) {
      const pointer = stage.getPointerPosition();
      if (pointer) {
        const now = Date.now();
        const last = lastCursorBroadcast.current;
        const dx = pointer.x - last.position.x;
        const dy = pointer.y - last.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only broadcast if 100ms elapsed AND position changed by >5px
        if (now - last.time >= 100 && distance > 5) {
          room.broadcastCursor(pointer);
          lastCursorBroadcast.current = { time: now, position: pointer };
        }

        // Update marquee selection end point
        if (isMarqueeSelecting.current && marqueeStart) {
          const x = (pointer.x - viewportOffset.x) / viewportScale;
          const y = (pointer.y - viewportOffset.y) / viewportScale;
          setMarqueeEnd({ x, y });
          return;
        }

        // Update measure tool current point for live preview
        if (selectedTool === 'measure' && measureWaypoints.length > 0) {
          const x = (pointer.x - viewportOffset.x) / viewportScale;
          const y = (pointer.y - viewportOffset.y) / viewportScale;
          setMeasureCurrentPoint({ x, y });
        }
      }
    }

    // Drawing logic
    if (!isDrawing.current || !isDrawingTool || !drawStartPoint) return;

    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Account for viewport offset and scale
    const x = (pos.x - viewportOffset.x) / viewportScale;
    const y = (pos.y - viewportOffset.y) / viewportScale;

    // Different behavior based on tool type
    if (selectedTool === 'draw-freehand' || isFogTool) {
      // Freehand and fog tools: append all points
      setCurrentLine((prev: number[]) => [...prev, x, y]);
    } else {
      // Line/Rectangle/Circle: update end point only (preserves start point)
      setCurrentLine([drawStartPoint.x, drawStartPoint.y, x, y]);
    }
  }, [
    isDrawingTool,
    selectedTool,
    drawStartPoint,
    measureWaypoints,
    room,
    viewportOffset,
    viewportScale,
    stageRef,
    isMarqueeSelecting,
    marqueeStart,
    setMarqueeEnd,
    setMeasureCurrentPoint,
    isFogTool,
    setCurrentLine,
  ]);

  // Handle mouse up for drawing
  const handleMouseUp = useCallback(() => {
    // Handle marquee selection finalization
    if (isMarqueeSelecting.current && marqueeStart) {
      isMarqueeSelecting.current = false;

      // Get marquee end from current pointer position
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const x = (pointer.x - viewportOffset.x) / viewportScale;
      const y = (pointer.y - viewportOffset.y) / viewportScale;

      // Calculate selection rectangle
      const minX = Math.min(marqueeStart.x, x);
      const maxX = Math.max(marqueeStart.x, x);
      const minY = Math.min(marqueeStart.y, y);
      const maxY = Math.max(marqueeStart.y, y);

      // Only select if the marquee is big enough (not just a click)
      if (maxX - minX > 5 || maxY - minY > 5) {
        // Get active scene for marquee selection
        const activeScene = game?.scenes.find((s) => s.id === game.activeSceneId) || game?.scenes[0];

        // Find all elements within the marquee rectangle
        const selectedIds = (activeScene?.elements || [])
          .filter((el: CanvasElement) => {
            // Get element bounds
            let elMinX = el.x;
            let elMinY = el.y;
            let elMaxX = el.x;
            let elMaxY = el.y;

            if (el.type === 'token') {
              const token = el as TokenElement;
              const cellSize = activeScene?.gridSettings.cellSize || 50;
              elMaxX = el.x + token.width * cellSize;
              elMaxY = el.y + token.height * cellSize;
            } else if (el.type === 'shape') {
              const shape = el as ShapeElement;
              if (shape.width && shape.height) {
                elMaxX = el.x + shape.width;
                elMaxY = el.y + shape.height;
              } else if (shape.points.length > 0) {
                const xs = shape.points.map((p) => p.x);
                const ys = shape.points.map((p) => p.y);
                elMinX = Math.min(...xs);
                elMinY = Math.min(...ys);
                elMaxX = Math.max(...xs);
                elMaxY = Math.max(...ys);
              }
            } else if (el.type === 'text') {
              const text = el as TextElement;
              elMaxX = el.x + (text.width || 200);
              elMaxY = el.y + (text.height || 30);
            } else if (el.type === 'image') {
              const img = el as ImageElement;
              elMaxX = el.x + img.width;
              elMaxY = el.y + img.height;
            }

            // Check if element bounds intersect with marquee
            return !(elMaxX < minX || elMinX > maxX || elMaxY < minY || elMinY > maxY);
          })
          .map((el: CanvasElement) => el.id);

        if (selectedIds.length > 0) {
          selectElements(selectedIds);
        }
      }

      setMarqueeStart(null);
      setMarqueeEnd(null);
      return;
    }

    // Don't clear measure tool on mouse up - it uses click-based waypoints
    if (selectedTool === 'measure') {
      return;
    }

    if (!isDrawing.current || !isDrawingTool || !drawStartPoint) {
      isDrawing.current = false;
      setDrawStartPoint(null);
      return;
    }

    isDrawing.current = false;

    // Get active scene for element creation
    const activeScene = game?.scenes.find((s) => s.id === game.activeSceneId) || game?.scenes[0];

    // Only save if we have at least 2 points (4 values: x1,y1,x2,y2)
    if (currentLine.length >= 4 && activeScene) {
      const startX = drawStartPoint.x;
      const startY = drawStartPoint.y;
      const endX = currentLine[currentLine.length - 2];
      const endY = currentLine[currentLine.length - 1];

      let newElement: Omit<ShapeElement, 'id'> | null = null;
      const zIndex = activeScene.elements.length;
      const style = {
        strokeColor: drawingStrokeColor,
        fillColor: drawingFillEnabled ? drawingFillColor : 'transparent',
        lineWidth: drawingStrokeWidth,
      };

      // Handle fog tools
      if (selectedTool === 'fog-reveal' || selectedTool === 'fog-hide') {
        // Convert points to polygon
        const points: Point[] = [];
        for (let i = 0; i < currentLine.length; i += 2) {
          points.push({ x: currentLine[i], y: currentLine[i + 1] });
        }

        if (selectedTool === 'fog-reveal') {
          revealFog(points);
        } else {
          hideFog(points);
        }

        // Broadcast fog update
        if (room.broadcastFogUpdate && activeScene?.fogOfWar) {
          room.broadcastFogUpdate(activeScene.fogOfWar);
        }
      } else {
        // Use shape creators for all drawing tools
        switch (selectedTool) {
          case 'draw-freehand': {
            const freehandPoints: Point[] = [];
            for (let i = 0; i < currentLine.length; i += 2) {
              freehandPoints.push({ x: currentLine[i], y: currentLine[i + 1] });
            }
            newElement = createFreehandShape(freehandPoints, style, zIndex);
            break;
          }
          case 'draw-line':
            newElement = createLineShape(startX, startY, endX, endY, style, zIndex);
            break;
          case 'draw-rectangle':
            newElement = createRectangleShape(
              startX,
              startY,
              endX,
              endY,
              style,
              drawingFillEnabled,
              drawingFillColor,
              zIndex,
            );
            break;
          case 'draw-circle':
            newElement = createCircleShape(
              startX,
              startY,
              endX,
              endY,
              style,
              drawingFillEnabled,
              drawingFillColor,
              zIndex,
            );
            break;
          case 'draw-ellipse':
            newElement = createEllipseShape(
              startX,
              startY,
              endX,
              endY,
              style,
              drawingFillEnabled,
              drawingFillColor,
              zIndex,
            );
            break;
          case 'draw-arrow':
            newElement = createArrowShape(startX, startY, endX, endY, style, zIndex);
            break;
          case 'aoe-circle':
            newElement = createAoeCircleShape(startX, startY, endX, endY, zIndex);
            break;
          case 'aoe-cone':
            newElement = createAoeConeShape(startX, startY, endX, endY, zIndex);
            break;
          case 'aoe-triangle':
            newElement = createAoeTriangleShape(startX, startY, endX, endY, zIndex);
            break;
          case 'aoe-line':
            newElement = createAoeLineShape(startX, startY, endX, endY, zIndex);
            break;
          case 'aoe-square':
            newElement = createAoeSquareShape(startX, startY, endX, endY, zIndex);
            break;
          default: {
            // Fallback to freehand
            const fallbackPoints: Point[] = [];
            for (let i = 0; i < currentLine.length; i += 2) {
              fallbackPoints.push({ x: currentLine[i], y: currentLine[i + 1] });
            }
            newElement = createFreehandShape(fallbackPoints, style, zIndex);
          }
        }
      }

      // Only add shape elements (not fog operations)
      if (newElement) {
        const id = addElement(newElement);
        room.broadcastElementUpdate({ ...newElement, id } as CanvasElement);
      }
    }

    setCurrentLine([]);
    setDrawStartPoint(null);
  }, [
    isDrawingTool,
    currentLine,
    selectedTool,
    drawStartPoint,
    game,
    addElement,
    room,
    drawingStrokeColor,
    drawingFillEnabled,
    drawingFillColor,
    drawingStrokeWidth,
    revealFog,
    hideFog,
    marqueeStart,
    selectElements,
    isMarqueeSelecting,
    stageRef,
    viewportOffset,
    viewportScale,
    setMarqueeStart,
    setMarqueeEnd,
    setDrawStartPoint,
    setCurrentLine,
  ]);

  return {
    handleMouseDown,
    handleMouseMoveForDrawing,
    handleMouseUp,
  };
}
