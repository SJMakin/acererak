import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage } from 'react-konva';
import type Konva from 'konva';
import { useGesture } from '@use-gesture/react';
import { useGameStore } from '../stores/gameStore';
import { useAIStore } from '../stores/aiStore';
import { useClipboard } from '../hooks/useClipboard';
import { useCursorInterpolation } from '../hooks/useCursorInterpolation';
import { useElementHandlers } from '../hooks/useElementHandlers';
import { useModalHandlers } from '../hooks/useModalHandlers';
import { useCanvasKeyboardShortcuts } from '../hooks/useCanvasKeyboardShortcuts';
import type { CanvasElement, Point, TokenElement, ImageElement, ShapeElement, TextElement, Player } from '../types';
import TokenConfigModal from './TokenConfigModal';
import TextInputModal from './TextInputModal';
import ImageModal, { type ImageConfig } from './ImageModal';
import ToolHints from './canvas/ToolHints';
import { BackgroundLayer } from './canvas/BackgroundLayer';
import { StaticElementsLayer } from './canvas/StaticElementsLayer';
import { FogOfWarLayer } from './canvas/FogOfWarLayer';
import { InteractiveElementsLayer } from './canvas/InteractiveElementsLayer';
import { OverlayLayer } from './canvas/OverlayLayer';
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

interface GameCanvasProps {
  room: {
    broadcastElementUpdate: (element: CanvasElement) => void;
    broadcastElementDelete: (elementId: string) => void;
    broadcastCursor: (position: Point) => void;
    broadcastPing: (position: Point, color: string) => void;
    broadcastFogUpdate?: (fogOfWar: { enabled: boolean; revealed: Point[][] }) => void;
  };
}

export default function GameCanvas({ room }: GameCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // AI availability: GM has local image model; player checks peer capabilities
  const aiCapabilities = useAIStore((s) => s.capabilities);
  const aiAvailable = !!aiCapabilities.imageModel;
  
  // Touch gesture state
  const initialPinchDistance = useRef<number | null>(null);
  const initialPinchCenter = useRef<Point | null>(null);
  const initialViewportScale = useRef(1);
  const initialViewportOffset = useRef<Point>({ x: 0, y: 0 });
  const isTwoFingerGesture = useRef(false);
  
  // Drawing state
  const isDrawing = useRef(false);
  const [currentLine, setCurrentLine] = useState<number[]>([]);
  const [drawStartPoint, setDrawStartPoint] = useState<Point | null>(null);
  
  // Polygon drawing state
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  
  // Ping state for visualization - now from game store
  const { pings, addPing } = useGameStore();
  
  // Measure tool state - Enhanced with waypoints
  const [measureWaypoints, setMeasureWaypoints] = useState<Point[]>([]);
  const [measureCurrentPoint, setMeasureCurrentPoint] = useState<Point | null>(null);
  const [measureDifficultTerrain, setMeasureDifficultTerrain] = useState(false);
  
  // Token placement state
  const [tokenModalOpened, setTokenModalOpened] = useState(false);
  const [tokenPlacementPosition, setTokenPlacementPosition] = useState<Point | null>(null);
  
  // Image placement state
  const [imageModalOpened, setImageModalOpened] = useState(false);
  const [imagePlacementPosition, setImagePlacementPosition] = useState<Point | null>(null);
  
  // Text editing state
  const [textModalOpened, setTextModalOpened] = useState(false);
  const [textEditContent, setTextEditContent] = useState('');
  const [textEditPosition, setTextEditPosition] = useState<Point | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  
  // Mouse position for paste
  const mousePosition = useRef<Point>({ x: 0, y: 0 });
  
  // Marquee selection state
  const [marqueeStart, setMarqueeStart] = useState<Point | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<Point | null>(null);
  const isMarqueeSelecting = useRef(false);

  // Cursor broadcast throttling (10Hz max, 5px min delta)
  const lastCursorBroadcast = useRef<{ time: number; position: Point }>({ time: 0, position: { x: 0, y: 0 } });

  const {
    game,
    selectedTool,
    selectedElementId,
    selectedElementIds,
    viewportOffset,
    viewportScale,
    isGM,
    myPeerId,
    settings,
    drawingStrokeColor,
    drawingFillColor,
    drawingFillEnabled,
    drawingStrokeWidth,
    layerVisibility,
    previewAsPlayer,
    selectElement,
    selectElements,
    toggleElementSelection,
    updateElement,
    updateElements,
    addElement,
    setViewport,
    panViewport,
    zoomViewport,
    revealFog,
    hideFog,
  } = useGameStore();

  // When previewing as player, treat GM as non-GM for visibility purposes
  const effectiveIsDM = isGM && !previewAsPlayer;

  // Clipboard functionality
  const clipboard = useClipboard();

  // Get other players' cursors (if enabled in settings)
  const otherPlayerCursors = settings.showPlayerCursors && game?.players
    ? Object.values(game.players)
        .filter((p): p is Player & { cursor: Point } =>
          p.id !== myPeerId && !!p.cursor
        )
    : [];

  // Interpolated cursor positions for smooth rendering
  const interpolatedCursors = useCursorInterpolation({ otherPlayerCursors });

  // Element drag handlers
  const { handleElementDragStart, handleElementDragEnd } = useElementHandlers({
    game,
    selectedElementIds,
    updateElement,
    updateElements,
    room,
  });

  // Modal handlers
  const { handleTokenSubmit, handleTextSubmit } = useModalHandlers({
    tokenPlacementPosition,
    game,
    addElement,
    room,
    textEditPosition,
    editingTextId,
    updateElement,
  });

  // Handle image modal submission
  const handleImageSubmit = useCallback((config: ImageConfig) => {
    if (!imagePlacementPosition || !game) return;

    const activeScene = game.scenes.find(s => s.id === game.activeSceneId) || game.scenes[0];
    if (!activeScene) return;

    const newElement: Omit<ImageElement, 'id'> = {
      type: 'image',
      layer: 'map',
      x: imagePlacementPosition.x,
      y: imagePlacementPosition.y,
      imageUrl: config.imageUrl,
      imageId: config.imageId,
      width: config.width,
      height: config.height,
      name: config.name,
      visibleTo: 'all',
      locked: false,
      zIndex: activeScene.elements.length,
    };

    const id = addElement(newElement);
    room.broadcastElementUpdate({ ...newElement, id } as ImageElement);
    setImagePlacementPosition(null);
  }, [imagePlacementPosition, game, addElement, room]);

  // Handle text double-click for editing (sets state for modal)
  const handleTextDoubleClick = useCallback((elementId: string) => {
    // Get active scene
    const activeScene = game?.scenes.find(s => s.id === game.activeSceneId) || game?.scenes[0];
    if (!activeScene) return;

    const element = activeScene.elements.find(e => e.id === elementId);
    if (element && element.type === 'text') {
      setEditingTextId(elementId);
      setTextEditContent(element.content);
      setTextEditPosition({ x: element.x, y: element.y });
      setTextModalOpened(true);
    }
  }, [game]);

  // Check if current tool is a drawing tool or fog tool
  const isDrawingTool = selectedTool.startsWith('draw-') || selectedTool === 'fog-reveal' || selectedTool === 'fog-hide' || selectedTool.startsWith('aoe-');
  const isFogTool = selectedTool === 'fog-reveal' || selectedTool === 'fog-hide';

  // Clear polygon points when switching away from polygon tool
  useEffect(() => {
    if (selectedTool !== 'draw-polygon') {
      setPolygonPoints([]);
    }
  }, [selectedTool]);

  // Clear measure waypoints when switching away from measure tool
  useEffect(() => {
    if (selectedTool !== 'measure') {
      setMeasureWaypoints([]);
      setMeasureCurrentPoint(null);
    }
  }, [selectedTool]);

  // Handle window resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const delta = e.evt.deltaY > 0 ? -0.1 : 0.1;
    zoomViewport(delta, pointer);
  }, [zoomViewport]);

  // Handle drag for panning
  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (selectedTool !== 'pan') return;
    
    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.position();
    panViewport({ x: pos.x - viewportOffset.x, y: pos.y - viewportOffset.y });
  }, [selectedTool, panViewport, viewportOffset]);

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touches: Touch[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two touch points
  const getTouchCenter = useCallback((touches: Touch[]) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }, []);

  // Handle pinch-zoom gesture
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @use-gesture/react pinch state has complex internal types
  const handlePinch = useCallback((state: any) => {
    const { touches, first, memo } = state;
    
    if (first) {
      // Initialize pinch gesture
      initialPinchDistance.current = getTouchDistance(touches);
      initialPinchCenter.current = getTouchCenter(touches);
      initialViewportScale.current = viewportScale;
      initialViewportOffset.current = { ...viewportOffset };
      isTwoFingerGesture.current = true;
      return memo;
    }
    
    if (touches.length < 2) {
      isTwoFingerGesture.current = false;
      return memo;
    }
    
    const currentDistance = getTouchDistance(touches);
    const currentCenter = getTouchCenter(touches);
    
    if (initialPinchDistance.current && initialPinchCenter.current) {
      // Calculate scale factor
      const scaleDelta = currentDistance / initialPinchDistance.current;
      const newScale = Math.max(0.25, Math.min(3, initialViewportScale.current * scaleDelta));
      
      // Calculate pan offset (two-finger pan)
      const dx = currentCenter.x - initialPinchCenter.current.x;
      const dy = currentCenter.y - initialPinchCenter.current.y;
      
      // Apply zoom centered on pinch center
      const zoomCenter = {
        x: initialPinchCenter.current.x - initialViewportOffset.current.x,
        y: initialPinchCenter.current.y - initialViewportOffset.current.y,
      };
      
      const newOffset = {
        x: initialPinchCenter.current.x - zoomCenter.x * (newScale / initialViewportScale.current) + dx,
        y: initialPinchCenter.current.y - zoomCenter.y * (newScale / initialViewportScale.current) + dy,
      };
      
      // Both values are relative to the gesture start, so apply them atomically.
      // Applying a start-relative delta to already-updated state compounds the zoom.
      setViewport(newOffset, newScale);
    }
    
    return memo;
  }, [getTouchDistance, getTouchCenter, viewportScale, viewportOffset, setViewport]);

  // Set up touch gesture handlers
  const bind = useGesture({
    onPinch: handlePinch,
    onPinchEnd: () => {
      isTwoFingerGesture.current = false;
      initialPinchDistance.current = null;
      initialPinchCenter.current = null;
    },
  }, {
    pinch: { from: () => [0, 0], scaleBounds: { min: 0.25, max: 3 } },
  });

  // Finish polygon helper function - defined early so it can be used by handlers below
  const finishPolygon = useCallback(() => {
    if (polygonPoints.length >= 3 && game) {
      // Get active scene
      const activeScene = game.scenes.find(s => s.id === game.activeSceneId) || game.scenes[0];
      if (!activeScene) return;

      const newElement: Omit<ShapeElement, 'id'> = {
        type: 'shape' as const,
        layer: 'drawing' as const,
        shapeType: 'polygon',
        x: 0,
        y: 0,
        points: polygonPoints,
        visibleTo: 'all' as const,
        locked: false,
        zIndex: activeScene.elements.length,
        style: {
          strokeColor: drawingStrokeColor,
          fillColor: drawingFillEnabled ? drawingFillColor : 'transparent',
          lineWidth: drawingStrokeWidth,
        },
      };
      const id = addElement(newElement);
      room.broadcastElementUpdate({ ...newElement, id } as ShapeElement);
      setPolygonPoints([]);
    }
  }, [polygonPoints, game, drawingStrokeColor, drawingFillColor, drawingFillEnabled, drawingStrokeWidth, addElement, room]);

  // Handle double-click for polygon completion
  const handleStageDoubleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (selectedTool === 'draw-polygon' && polygonPoints.length >= 3) {
      e.evt.preventDefault();
      finishPolygon();
    }
  }, [selectedTool, polygonPoints, finishPolygon]);

  // Handle mouse/touch down for drawing
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Ignore touch events during two-finger gestures (handled by useGesture)
    if (isTwoFingerGesture.current && 'touches' in e.evt) {
      return;
    }
    
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
          
          if (isRightClick && polygonPoints.length >= 3) {
            // Finish polygon on right-click
            finishPolygon();
          } else if (!isRightClick) {
            // Add point to polygon on left-click
            setPolygonPoints(prev => [...prev, { x, y }]);
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
              setMeasureWaypoints(prev => [...prev, { x, y }]);
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
      // Handle image tool
      if (selectedTool === 'image' && e.target === e.target.getStage()) {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            // Transform to canvas coordinates
            const x = (pointer.x - viewportOffset.x) / viewportScale;
            const y = (pointer.y - viewportOffset.y) / viewportScale;
            
            // Store position and open modal
            setImagePlacementPosition({ x, y });
            setImageModalOpened(true);
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
  }, [isDrawingTool, selectedTool, selectElement, room, viewportOffset, viewportScale, addPing, finishPolygon, polygonPoints.length]);

  // Handle mouse/touch move for drawing
  const handleMouseMoveForDrawing = useCallback((_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Ignore touch events during two-finger gestures (handled by useGesture)
    if (isTwoFingerGesture.current && 'touches' in _e.evt) {
      return;
    }
    
    // Broadcast cursor position (throttled: 10Hz max, 5px min delta)
    const stage = stageRef.current;
    if (stage) {
      const pointer = stage.getPointerPosition();
      if (pointer) {
        const canvasPosition = {
          x: (pointer.x - viewportOffset.x) / viewportScale,
          y: (pointer.y - viewportOffset.y) / viewportScale,
        };
        mousePosition.current = canvasPosition;

        const now = Date.now();
        const last = lastCursorBroadcast.current;
        const dx = canvasPosition.x - last.position.x;
        const dy = canvasPosition.y - last.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only broadcast if 100ms elapsed AND position changed by >5px
        if (now - last.time >= 100 && distance > 5) {
          room.broadcastCursor(canvasPosition);
          lastCursorBroadcast.current = { time: now, position: canvasPosition };
        }
        
        // Update marquee selection end point
        if (isMarqueeSelecting.current && marqueeStart) {
          setMarqueeEnd(canvasPosition);
          return;
        }
        
        // Update measure tool current point for live preview
        if (selectedTool === 'measure' && measureWaypoints.length > 0) {
          setMeasureCurrentPoint(canvasPosition);
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
      setCurrentLine(prev => [...prev, x, y]);
    } else {
      // Line/Rectangle/Circle: update end point only (preserves start point)
      setCurrentLine([drawStartPoint.x, drawStartPoint.y, x, y]);
    }
  }, [isDrawingTool, selectedTool, drawStartPoint, measureWaypoints, room, viewportOffset, viewportScale, isFogTool, marqueeStart]);

  // Handle mouse up for drawing
  const handleMouseUp = useCallback((e?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Reset two-finger gesture flag on touch end
    if (e && 'touches' in e.evt && e.evt.touches.length === 0) {
      isTwoFingerGesture.current = false;
    }
    
    // Handle marquee selection finalization
    if (isMarqueeSelecting.current && marqueeStart && marqueeEnd) {
      isMarqueeSelecting.current = false;
      
      // Calculate selection rectangle
      const minX = Math.min(marqueeStart.x, marqueeEnd.x);
      const maxX = Math.max(marqueeStart.x, marqueeEnd.x);
      const minY = Math.min(marqueeStart.y, marqueeEnd.y);
      const maxY = Math.max(marqueeStart.y, marqueeEnd.y);
      
      // Only select if the marquee is big enough (not just a click)
      if (maxX - minX > 5 || maxY - minY > 5) {
        // Get active scene for marquee selection
        const activeScene = game?.scenes.find(s => s.id === game.activeSceneId) || game?.scenes[0];

        // Find all elements within the marquee rectangle
        const selectedIds = (activeScene?.elements || [])
          .filter(el => {
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
                const xs = shape.points.map(p => p.x);
                const ys = shape.points.map(p => p.y);
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
          .map(el => el.id);
        
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
    const activeScene = game?.scenes.find(s => s.id === game.activeSceneId) || game?.scenes[0];

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
        
        // Broadcast fresh fog state after the local store update.
        if (room.broadcastFogUpdate) {
          const freshGame = useGameStore.getState().game;
          const freshScene = freshGame?.scenes.find(s => s.id === freshGame.activeSceneId) || freshGame?.scenes[0];
          if (freshScene?.fogOfWar) {
            room.broadcastFogUpdate(freshScene.fogOfWar);
          }
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
            newElement = createRectangleShape(startX, startY, endX, endY, style, drawingFillEnabled, drawingFillColor, zIndex);
            break;
          case 'draw-circle':
            newElement = createCircleShape(startX, startY, endX, endY, style, drawingFillEnabled, drawingFillColor, zIndex);
            break;
          case 'draw-ellipse':
            newElement = createEllipseShape(startX, startY, endX, endY, style, drawingFillEnabled, drawingFillColor, zIndex);
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
  }, [isDrawingTool, currentLine, selectedTool, drawStartPoint, game, addElement, room, drawingStrokeColor, drawingFillEnabled, drawingFillColor, drawingStrokeWidth, revealFog, hideFog, marqueeStart, marqueeEnd, selectElements]);

  // Canvas keyboard shortcuts
  useCanvasKeyboardShortcuts({
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
  });

  if (!game) return null;

  // Get active scene data
  const activeScene = game.scenes.find(s => s.id === game.activeSceneId) || game.scenes[0];
  if (!activeScene) return null;

  const { gridSettings, elements, fogOfWar } = activeScene;

  // Sort elements by layer and zIndex
  const layerOrder: Record<string, number> = { map: 0, gm: 1, token: 2, drawing: 3 };
  const sortedElements = [...elements].sort((a, b) => {
    const layerDiff = layerOrder[a.layer] - layerOrder[b.layer];
    if (layerDiff !== 0) return layerDiff;
    return a.zIndex - b.zIndex;
  });

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', touchAction: 'none' }}
      className={`tool-${selectedTool}`}
      {...bind()}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={viewportOffset.x}
        y={viewportOffset.y}
        scaleX={viewportScale}
        scaleY={viewportScale}
        draggable={selectedTool === 'pan'}
        onWheel={handleWheel}
        onDragMove={handleDragMove}
        onMouseDown={handleMouseDown}
        onDblClick={handleStageDoubleClick}
        onMousemove={handleMouseMoveForDrawing}
        onMouseup={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMoveForDrawing}
        onTouchEnd={handleMouseUp}
      >
        {/* Layer 1: Background + Grid */}
        <BackgroundLayer
          gridSettings={gridSettings}
          settings={settings}
          backgroundUrl={activeScene.backgroundUrl}
          backgroundImageId={activeScene.backgroundImageId}
          layerVisibility={layerVisibility}
        />

        {/* Layer 2: Static Elements (map + locked elements) */}
        <StaticElementsLayer
          elements={sortedElements}
          selectedElementId={selectedElementId}
          selectedElementIds={selectedElementIds}
          layerVisibility={layerVisibility}
          gridSettings={gridSettings}
          isGM={effectiveIsDM}
          showTokenMetadata={settings.showTokenMetadata}
          onSelect={selectElement}
          onShiftSelect={toggleElementSelection}
          onDragStart={handleElementDragStart}
          onDragEnd={handleElementDragEnd}
          onTextDoubleClick={handleTextDoubleClick}
        />

        {/* Layer 3: Fog of War */}
        <FogOfWarLayer
          fogOfWar={fogOfWar}
          gridSettings={gridSettings}
          layerVisibility={layerVisibility}
          isGM={effectiveIsDM}
        />

        {/* Layer 4: Interactive Elements (unlocked elements) */}
        <InteractiveElementsLayer
          elements={sortedElements}
          selectedElementId={selectedElementId}
          selectedElementIds={selectedElementIds}
          layerVisibility={layerVisibility}
          gridSettings={gridSettings}
          isGM={effectiveIsDM}
          playerId={myPeerId}
          controlledTokenIds={myPeerId ? game.players[myPeerId]?.controlledTokens ?? [] : []}
          isDrawingTool={isDrawingTool}
          showTokenMetadata={settings.showTokenMetadata}
          onSelect={selectElement}
          onShiftSelect={toggleElementSelection}
          onDragStart={handleElementDragStart}
          onDragEnd={handleElementDragEnd}
          onTextDoubleClick={handleTextDoubleClick}
        />

        {/* Layer 5: Overlay (drawing previews, pings, cursors, etc.) */}
        <OverlayLayer
          currentLine={currentLine}
          selectedTool={selectedTool}
          drawStartPoint={drawStartPoint}
          drawingStrokeColor={drawingStrokeColor}
          drawingStrokeWidth={drawingStrokeWidth}
          drawingFillEnabled={drawingFillEnabled}
          drawingFillColor={drawingFillColor}
          isFogTool={isFogTool}
          polygonPoints={polygonPoints}
          marqueeStart={marqueeStart}
          marqueeEnd={marqueeEnd}
          isMarqueeSelecting={isMarqueeSelecting.current}
          pings={pings}
          measureWaypoints={measureWaypoints}
          measureCurrentPoint={measureCurrentPoint}
          measureDifficultTerrain={measureDifficultTerrain}
          gridSettings={gridSettings}
          otherPlayerCursors={otherPlayerCursors}
          interpolatedCursors={interpolatedCursors}
        />
      </Stage>
      
      <ToolHints
        selectedTool={selectedTool}
        polygonPoints={polygonPoints}
        measureWaypoints={measureWaypoints}
        measureDifficultTerrain={measureDifficultTerrain}
      />
      
      {/* Token Configuration Modal */}
      <TokenConfigModal
        opened={tokenModalOpened}
        onClose={() => {
          setTokenModalOpened(false);
          setTokenPlacementPosition(null);
        }}
        onSubmit={handleTokenSubmit}
        aiAvailable={aiAvailable}
      />
      
      {/* Text Input Modal */}
      <TextInputModal
        opened={textModalOpened}
        onClose={() => {
          setTextModalOpened(false);
          setTextEditPosition(null);
          setTextEditContent('');
          setEditingTextId(null);
        }}
        onSubmit={(text) => {
          handleTextSubmit(text);
          // Reset state after submission
          setTextEditPosition(null);
          setTextEditContent('');
          setEditingTextId(null);
        }}
        initialText={textEditContent}
      />
      
      {/* Image Placement Modal */}
      <ImageModal
        opened={imageModalOpened}
        onClose={() => {
          setImageModalOpened(false);
          setImagePlacementPosition(null);
        }}
        onSubmit={handleImageSubmit}
        aiAvailable={aiAvailable}
      />
    </div>
  );
}
