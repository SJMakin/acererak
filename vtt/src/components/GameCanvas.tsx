import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Line, Circle, Ellipse, Text, Group, Path, Shape as KonvaShape, Arrow } from 'react-konva';
import type Konva from 'konva';
import { nanoid } from 'nanoid';
import { useGameStore } from '../stores/gameStore';
import { useClipboard } from '../hooks/useClipboard';
import type { CanvasElement, Point, TokenElement, ImageElement, ShapeElement, TextElement, Player } from '../types';
import TokenConfigModal, { type TokenConfig } from './TokenConfigModal';
import TextInputModal from './TextInputModal';
import { Shape } from './Shape';
import { TextLabel } from './TextLabel';
import { MapImage } from './MapImage';
import { Grid } from './Grid';
import { Token } from './Token';

interface GameCanvasProps {
  room: {
    broadcastElementUpdate: (element: CanvasElement) => void;
    broadcastElementDelete: (elementId: string) => void;
    broadcastCursor: (position: Point) => void;
    broadcastPing: (position: Point, color: string) => void;
    broadcastFogUpdate?: (fogOfWar: { enabled: boolean; revealed: Point[][] }) => void;
  };
}

// Custom hook for loading images
export function useImage(url: string): [HTMLImageElement | null, boolean] {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!url) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load image:', url);
      setLoaded(true);
    };
    img.src = url;
  }, [url]);

  return [image, loaded];
}

export default function GameCanvas({ room }: GameCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  
  // Drawing state
  const isDrawing = useRef(false);
  const [currentLine, setCurrentLine] = useState<number[]>([]);
  const [drawStartPoint, setDrawStartPoint] = useState<Point | null>(null);
  
  // Polygon drawing state
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  
  // Ping state for visualization
  const [pings, setPings] = useState<Array<{ id: string; x: number; y: number; color: string; timestamp: number }>>([]);
  
  // Measure tool state - Enhanced with waypoints
  const [measureWaypoints, setMeasureWaypoints] = useState<Point[]>([]);
  const [measureCurrentPoint, setMeasureCurrentPoint] = useState<Point | null>(null);
  const [measureDifficultTerrain, setMeasureDifficultTerrain] = useState(false);
  
  // Token placement state
  const [tokenModalOpened, setTokenModalOpened] = useState(false);
  const [tokenPlacementPosition, setTokenPlacementPosition] = useState<Point | null>(null);
  
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
  
  // Multi-drag state - track initial positions when drag starts
  const dragStartPositions = useRef<Record<string, Point>>({});
  const isDraggingMultiple = useRef(false);

  // Cursor broadcast throttling (10Hz max, 5px min delta)
  const lastCursorBroadcast = useRef<{ time: number; position: Point }>({ time: 0, position: { x: 0, y: 0 } });

  // Interpolated cursor positions for smooth rendering
  const [interpolatedCursors, setInterpolatedCursors] = useState<Record<string, Point>>({});

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

  // Interpolate cursor positions for smooth rendering (lerp toward target at 60fps)
  useEffect(() => {
    if (otherPlayerCursors.length === 0) return;

    let animationFrameId: number;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      setInterpolatedCursors(prev => {
        const next: Record<string, Point> = { ...prev };
        let changed = false;

        for (const player of otherPlayerCursors) {
          const target = player.cursor;
          const current = prev[player.id] || target;

          // Lerp factor of 0.2 gives smooth but responsive movement
          const newX = lerp(current.x, target.x, 0.2);
          const newY = lerp(current.y, target.y, 0.2);

          // Only update if there's meaningful change (>0.5px)
          const dx = Math.abs(newX - current.x);
          const dy = Math.abs(newY - current.y);
          if (dx > 0.5 || dy > 0.5) {
            next[player.id] = { x: newX, y: newY };
            changed = true;
          }
        }

        return changed ? next : prev;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [otherPlayerCursors]);

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

    // Reset state
    setTokenPlacementPosition(null);
  }, [tokenPlacementPosition, game, addElement, room]);

  // Handle text double-click for editing
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

  // Handle text submission (new or edit)
  const handleTextSubmit = useCallback((text: string) => {
    if (!text.trim() || !game) return;

    // Get active scene
    const activeScene = game.scenes.find(s => s.id === game.activeSceneId) || game.scenes[0];
    if (!activeScene) return;

    if (editingTextId) {
      // Update existing text
      const element = activeScene.elements.find(e => e.id === editingTextId);
      if (element && element.type === 'text') {
        updateElement(editingTextId, { content: text });
        const updatedElement: TextElement = { ...element, content: text };
        room.broadcastElementUpdate(updatedElement);
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

    // Reset state
    setTextEditPosition(null);
    setTextEditContent('');
    setEditingTextId(null);
  }, [editingTextId, textEditPosition, game, updateElement, addElement, room]);

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
            const pingData = { id: nanoid(), x, y, color: '#f59e0b', timestamp: Date.now() };
            setPings(prev => [...prev, pingData]);
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
  }, [isDrawingTool, selectedTool, selectElement, room, viewportOffset, viewportScale]);

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
      setCurrentLine(prev => [...prev, x, y]);
    } else {
      // Line/Rectangle/Circle: update end point only (preserves start point)
      setCurrentLine([drawStartPoint.x, drawStartPoint.y, x, y]);
    }
  }, [isDrawingTool, selectedTool, drawStartPoint, measureWaypoints, room, viewportOffset, viewportScale]);

  // Handle mouse up for drawing
  const handleMouseUp = useCallback(() => {
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
      } else if (selectedTool === 'draw-freehand') {
        // Freehand: convert all points
        const points: Point[] = [];
        for (let i = 0; i < currentLine.length; i += 2) {
          points.push({ x: currentLine[i], y: currentLine[i + 1] });
        }
        
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'freehand',
          x: 0,
          y: 0,
          points,
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: drawingStrokeColor,
            fillColor: drawingFillEnabled ? drawingFillColor : 'transparent',
            lineWidth: drawingStrokeWidth,
          },
        };
      } else if (selectedTool === 'draw-line') {
        // Line: just 2 points
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'line',
          x: 0,
          y: 0,
          points: [{ x: startX, y: startY }, { x: endX, y: endY }],
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: drawingStrokeColor,
            fillColor: 'transparent',
            lineWidth: drawingStrokeWidth,
          },
        };
      } else if (selectedTool === 'draw-rectangle') {
        // Rectangle: position + dimensions
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'rectangle',
          x,
          y,
          width,
          height,
          points: [],
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: drawingStrokeColor,
            fillColor: drawingFillEnabled ? drawingFillColor : 'transparent',
            lineWidth: drawingStrokeWidth,
          },
        };
      } else if (selectedTool === 'draw-circle') {
        // Circle: center + radius
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'circle',
          x: startX,
          y: startY,
          width: radius * 2,
          height: radius * 2,
          points: [],
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: drawingStrokeColor,
            fillColor: drawingFillEnabled ? drawingFillColor : 'transparent',
            lineWidth: drawingStrokeWidth,
          },
        };
      } else if (selectedTool === 'draw-ellipse') {
        // Ellipse: bounding box
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'ellipse',
          x,
          y,
          width,
          height,
          points: [],
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: drawingStrokeColor,
            fillColor: drawingFillEnabled ? drawingFillColor : 'transparent',
            lineWidth: drawingStrokeWidth,
          },
        };
      } else if (selectedTool === 'draw-arrow') {
        // Arrow: from start to end point
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'arrow',
          x: 0,
          y: 0,
          points: [{ x: startX, y: startY }, { x: endX, y: endY }],
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: drawingStrokeColor,
            fillColor: drawingStrokeColor, // Arrow head uses stroke color
            lineWidth: drawingStrokeWidth,
          },
        };
      } else if (selectedTool === 'aoe-circle') {
        // AOE Circle: center + radius (like Fireball)
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'circle',
          x: startX,
          y: startY,
          width: radius * 2,
          height: radius * 2,
          points: [],
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: '#f97316', // Orange for AOE
            fillColor: 'rgba(249, 115, 22, 0.3)', // Semi-transparent orange
            lineWidth: 3,
          },
        };
      } else if (selectedTool === 'aoe-cone') {
        // AOE Cone: origin point with direction and curved arc edge (fan shape)
        const angle = Math.atan2(endY - startY, endX - startX);
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const coneAngle = Math.PI / 3; // 60 degree cone
        
        // Generate points along the arc for a smooth curve
        const arcSegments = 12; // Number of segments for the arc
        const points: Point[] = [{ x: startX, y: startY }]; // Start with origin
        
        // Generate arc points from left edge to right edge
        for (let i = 0; i <= arcSegments; i++) {
          const segmentAngle = angle - coneAngle / 2 + (coneAngle * i) / arcSegments;
          points.push({
            x: startX + Math.cos(segmentAngle) * length,
            y: startY + Math.sin(segmentAngle) * length,
          });
        }
        
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'polygon',
          x: 0,
          y: 0,
          points,
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: '#ef4444', // Red for cone
            fillColor: 'rgba(239, 68, 68, 0.3)', // Semi-transparent red
            lineWidth: 3,
          },
        };
      } else if (selectedTool === 'aoe-triangle') {
        // AOE Triangle: simple triangle cone (D&D RAW interpretation)
        const angle = Math.atan2(endY - startY, endX - startX);
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const coneAngle = Math.PI / 3; // 60 degree cone
        
        // Simple 3-point triangle
        const point1X = startX;
        const point1Y = startY;
        const point2X = startX + Math.cos(angle - coneAngle / 2) * length;
        const point2Y = startY + Math.sin(angle - coneAngle / 2) * length;
        const point3X = startX + Math.cos(angle + coneAngle / 2) * length;
        const point3Y = startY + Math.sin(angle + coneAngle / 2) * length;
        
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'polygon',
          x: 0,
          y: 0,
          points: [
            { x: point1X, y: point1Y },
            { x: point2X, y: point2Y },
            { x: point3X, y: point3Y },
          ],
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: '#f97316', // Orange for triangle
            fillColor: 'rgba(249, 115, 22, 0.3)', // Semi-transparent orange
            lineWidth: 3,
          },
        };
      } else if (selectedTool === 'aoe-line') {
        // AOE Line: 5ft wide line from start to end (like Lightning Bolt)
        const angle = Math.atan2(endY - startY, endX - startX);
        const perpAngle = angle + Math.PI / 2;
        const halfWidth = 12; // 5ft wide represented as ~12px
        
        // Calculate rectangle points for the line
        const points: Point[] = [
          { x: startX + Math.cos(perpAngle) * halfWidth, y: startY + Math.sin(perpAngle) * halfWidth },
          { x: startX - Math.cos(perpAngle) * halfWidth, y: startY - Math.sin(perpAngle) * halfWidth },
          { x: endX - Math.cos(perpAngle) * halfWidth, y: endY - Math.sin(perpAngle) * halfWidth },
          { x: endX + Math.cos(perpAngle) * halfWidth, y: endY + Math.sin(perpAngle) * halfWidth },
        ];
        
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'polygon',
          x: 0,
          y: 0,
          points,
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: '#3b82f6', // Blue for line
            fillColor: 'rgba(59, 130, 246, 0.3)', // Semi-transparent blue
            lineWidth: 3,
          },
        };
      } else if (selectedTool === 'aoe-square') {
        // AOE Square: corner to corner (like Cloud of Daggers)
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'rectangle',
          x,
          y,
          width,
          height,
          points: [],
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: '#8b5cf6', // Purple for square AOE
            fillColor: 'rgba(139, 92, 246, 0.3)', // Semi-transparent purple
            lineWidth: 3,
          },
        };
      } else {
        // Fallback to freehand
        const points: Point[] = [];
        for (let i = 0; i < currentLine.length; i += 2) {
          points.push({ x: currentLine[i], y: currentLine[i + 1] });
        }
        
        newElement = {
          type: 'shape' as const,
          layer: 'drawing' as const,
          shapeType: 'freehand',
          x: 0,
          y: 0,
          points,
          visibleTo: 'all' as const,
          locked: false,
          zIndex: activeScene.elements.length,
          style: {
            strokeColor: drawingStrokeColor,
            fillColor: drawingFillEnabled ? drawingFillColor : 'transparent',
            lineWidth: drawingStrokeWidth,
          },
        };
      }
      
      // Only add shape elements (not fog operations)
      if (newElement) {
        const id = addElement(newElement);
        room.broadcastElementUpdate({ ...newElement, id } as any);
      }
    }
    
    setCurrentLine([]);
    setDrawStartPoint(null);
  }, [isDrawingTool, currentLine, selectedTool, drawStartPoint, game, addElement, room]);

  // Keyboard shortcuts integration
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
  }, [selectedElementIds, clipboard, selectedTool, polygonPoints, finishPolygon, measureWaypoints, room]);

  // Cleanup old pings and force re-render for animation
  const [, setPingTick] = useState(0);
  const hasPings = pings.length > 0;
  useEffect(() => {
    if (!hasPings) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      setPings(prev => prev.filter(p => now - p.timestamp < 2000));
      // Force re-render for smooth animation
      setPingTick(n => n + 1);
    }, 50);
    return () => clearInterval(interval);
  }, [hasPings]);

  if (!game) return null;

  // Get active scene data
  const activeScene = game.scenes.find(s => s.id === game.activeSceneId) || game.scenes[0];
  if (!activeScene) return null;

  const { gridSettings, elements, fogOfWar } = activeScene;
  const gridWidth = gridSettings.width * gridSettings.cellSize;
  const gridHeight = gridSettings.height * gridSettings.cellSize;

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
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      className={`tool-${selectedTool}`}
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
        {/* Layer 1: BackgroundAndGrid (listening: false) - Background + Grid merged */}
        <Layer listening={false}>
          <Rect
            x={0}
            y={0}
            width={gridWidth}
            height={gridHeight}
            fill={settings.backgroundColor}
          />
          {layerVisibility.grid && gridSettings.showGrid && (
            <Grid
              gridType={gridSettings.gridType || 'square'}
              width={gridSettings.width}
              height={gridSettings.height}
              cellSize={gridSettings.cellSize}
              color={settings.gridColor}
            />
          )}
        </Layer>

        {/* Layer 2: StaticElements (listening: false) - Map layer + locked elements */}
        <Layer listening={false}>
          {/* Map images */}
          {layerVisibility.map && sortedElements
            .filter(el => el.layer === 'map' && el.type === 'image')
            .map(el => (
              <MapImage
                key={el.id}
                element={el as ImageElement}
                isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
                onSelect={() => selectElement(el.id)}
                onShiftSelect={() => toggleElementSelection(el.id)}
                onDragStart={() => handleElementDragStart(el.id)}
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isGM={effectiveIsDM}
              />
            ))}
          {/* Locked shapes */}
          {layerVisibility.drawings && sortedElements
            .filter(el => el.type === 'shape' && el.locked)
            .map(el => (
              <Shape
                key={el.id}
                element={el as ShapeElement}
                isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
                onSelect={() => selectElement(el.id)}
                onShiftSelect={() => toggleElementSelection(el.id)}
                onDragStart={() => handleElementDragStart(el.id)}
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isGM={effectiveIsDM}
              />
            ))}
          {/* Locked text */}
          {layerVisibility.text && sortedElements
            .filter(el => el.type === 'text' && el.locked)
            .map(el => (
              <TextLabel
                key={el.id}
                element={el as TextElement}
                isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
                onSelect={() => selectElement(el.id)}
                onShiftSelect={() => toggleElementSelection(el.id)}
                onDragStart={() => handleElementDragStart(el.id)}
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                onDoubleClick={() => handleTextDoubleClick(el.id)}
                isGM={effectiveIsDM}
              />
            ))}
          {/* Locked tokens */}
          {layerVisibility.tokens && sortedElements
            .filter(el => el.type === 'token' && el.locked)
            .map(el => (
              <Token
                key={el.id}
                element={el as TokenElement}
                cellSize={gridSettings.cellSize}
                isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
                onSelect={() => selectElement(el.id)}
                onShiftSelect={() => toggleElementSelection(el.id)}
                onDragStart={() => handleElementDragStart(el.id)}
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isGM={effectiveIsDM}
                showMetadata={settings.showTokenMetadata}
              />
            ))}
        </Layer>

        {/* Layer 3: Fog of War (listening: false) - Only visible to non-GMs when enabled */}
        {fogOfWar.enabled && layerVisibility.fog && !effectiveIsDM && (
          <Layer listening={false}>
            <KonvaShape
              sceneFunc={(context, shape) => {
                const width = gridWidth;
                const height = gridHeight;
                
                // Draw the full fog overlay
                context.fillStyle = 'rgba(0, 0, 0, 0.85)';
                context.fillRect(0, 0, width, height);
                
                // Cut out revealed areas using destination-out composite operation
                context.globalCompositeOperation = 'destination-out';
                
                fogOfWar.revealed.forEach((polygon) => {
                  if (polygon.length > 0) {
                    context.beginPath();
                    context.moveTo(polygon[0].x, polygon[0].y);
                    for (let i = 1; i < polygon.length; i++) {
                      context.lineTo(polygon[i].x, polygon[i].y);
                    }
                    context.closePath();
                    context.fill();
                  }
                });
                
                // Reset composite operation
                context.globalCompositeOperation = 'source-over';
                
                // Konva requires this
                context.fillStrokeShape(shape);
              }}
            />
          </Layer>
        )}

        {/* Layer 4: InteractiveElements (listening: true) - Shapes + Tokens (draggable/interactive) */}
        <Layer listening={true}>
          {/* Unlocked shapes */}
          {layerVisibility.drawings && sortedElements
            .filter(el => el.type === 'shape' && !el.locked)
            .map(el => (
              <Shape
                key={el.id}
                element={el as ShapeElement}
                isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
                onSelect={() => selectElement(el.id)}
                onShiftSelect={() => toggleElementSelection(el.id)}
                onDragStart={() => handleElementDragStart(el.id)}
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isGM={effectiveIsDM}
              />
            ))}
          {/* Unlocked text */}
          {layerVisibility.text && sortedElements
            .filter(el => el.type === 'text' && !el.locked)
            .map(el => (
              <TextLabel
                key={el.id}
                element={el as TextElement}
                isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
                onSelect={() => selectElement(el.id)}
                onShiftSelect={() => toggleElementSelection(el.id)}
                onDragStart={() => handleElementDragStart(el.id)}
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                onDoubleClick={() => handleTextDoubleClick(el.id)}
                isGM={effectiveIsDM}
              />
            ))}
          {/* Unlocked tokens */}
          {layerVisibility.tokens && sortedElements
            .filter(el => el.type === 'token' && !el.locked)
            .map(el => (
              <Token
                key={el.id}
                element={el as TokenElement}
                cellSize={gridSettings.cellSize}
                isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
                onSelect={() => selectElement(el.id)}
                onShiftSelect={() => toggleElementSelection(el.id)}
                onDragStart={() => handleElementDragStart(el.id)}
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isGM={effectiveIsDM}
                showMetadata={settings.showTokenMetadata}
              />
            ))}
        </Layer>

        {/* Layer 5: Overlay (listening: false) - CurrentDrawing + Pings + Cursors (temporary visual feedback) */}
        <Layer listening={false}>
          {/* Current Drawing */}
          {currentLine.length > 0 && (
            <>
              {(selectedTool === 'draw-freehand' || isFogTool) && (
                <Line
                  points={currentLine}
                  stroke={selectedTool === 'fog-reveal' ? '#22c55e' : selectedTool === 'fog-hide' ? '#ef4444' : drawingStrokeColor}
                  strokeWidth={isFogTool ? 3 : drawingStrokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  fill={selectedTool === 'fog-reveal' ? 'rgba(34, 197, 94, 0.2)' : selectedTool === 'fog-hide' ? 'rgba(239, 68, 68, 0.2)' : (drawingFillEnabled ? drawingFillColor : 'transparent')}
                  closed={isFogTool}
                />
              )}
              {selectedTool === 'draw-line' && currentLine.length >= 4 && (
                <Line
                  points={currentLine}
                  stroke={drawingStrokeColor}
                  strokeWidth={drawingStrokeWidth}
                  lineCap="round"
                />
              )}
              {selectedTool === 'draw-rectangle' && currentLine.length >= 4 && drawStartPoint && (
                <Rect
                  x={Math.min(drawStartPoint.x, currentLine[2])}
                  y={Math.min(drawStartPoint.y, currentLine[3])}
                  width={Math.abs(currentLine[2] - drawStartPoint.x)}
                  height={Math.abs(currentLine[3] - drawStartPoint.y)}
                  stroke={drawingStrokeColor}
                  strokeWidth={drawingStrokeWidth}
                  fill={drawingFillEnabled ? drawingFillColor : undefined}
                />
              )}
              {selectedTool === 'draw-circle' && currentLine.length >= 4 && drawStartPoint && (
                <Circle
                  x={drawStartPoint.x}
                  y={drawStartPoint.y}
                  radius={Math.sqrt(
                    Math.pow(currentLine[2] - drawStartPoint.x, 2) +
                    Math.pow(currentLine[3] - drawStartPoint.y, 2)
                  )}
                  stroke={drawingStrokeColor}
                  strokeWidth={drawingStrokeWidth}
                  fill={drawingFillEnabled ? drawingFillColor : undefined}
                />
              )}
              {selectedTool === 'draw-ellipse' && currentLine.length >= 4 && drawStartPoint && (
                <Ellipse
                  x={Math.min(drawStartPoint.x, currentLine[2]) + Math.abs(currentLine[2] - drawStartPoint.x) / 2}
                  y={Math.min(drawStartPoint.y, currentLine[3]) + Math.abs(currentLine[3] - drawStartPoint.y) / 2}
                  radiusX={Math.abs(currentLine[2] - drawStartPoint.x) / 2}
                  radiusY={Math.abs(currentLine[3] - drawStartPoint.y) / 2}
                  stroke={drawingStrokeColor}
                  strokeWidth={drawingStrokeWidth}
                  fill={drawingFillEnabled ? drawingFillColor : undefined}
                />
              )}
              {selectedTool === 'draw-arrow' && currentLine.length >= 4 && drawStartPoint && (
                <Arrow
                  points={[drawStartPoint.x, drawStartPoint.y, currentLine[2], currentLine[3]]}
                  stroke={drawingStrokeColor}
                  strokeWidth={drawingStrokeWidth}
                  fill={drawingStrokeColor}
                  pointerLength={Math.max(10, drawingStrokeWidth * 3)}
                  pointerWidth={Math.max(8, drawingStrokeWidth * 2.5)}
                />
              )}
              {/* AOE Circle preview */}
              {selectedTool === 'aoe-circle' && currentLine.length >= 4 && drawStartPoint && (
                <Circle
                  x={drawStartPoint.x}
                  y={drawStartPoint.y}
                  radius={Math.sqrt(
                    Math.pow(currentLine[2] - drawStartPoint.x, 2) +
                    Math.pow(currentLine[3] - drawStartPoint.y, 2)
                  )}
                  stroke="#f97316"
                  strokeWidth={3}
                  fill="rgba(249, 115, 22, 0.3)"
                />
              )}
              {/* AOE Cone preview (curved arc) */}
              {selectedTool === 'aoe-cone' && currentLine.length >= 4 && drawStartPoint && (() => {
                const endX = currentLine[2];
                const endY = currentLine[3];
                const angle = Math.atan2(endY - drawStartPoint.y, endX - drawStartPoint.x);
                const length = Math.sqrt(Math.pow(endX - drawStartPoint.x, 2) + Math.pow(endY - drawStartPoint.y, 2));
                const coneAngle = Math.PI / 3; // 60 degree cone
                const arcSegments = 12;
                
                // Generate arc points
                const points: number[] = [drawStartPoint.x, drawStartPoint.y];
                for (let i = 0; i <= arcSegments; i++) {
                  const segmentAngle = angle - coneAngle / 2 + (coneAngle * i) / arcSegments;
                  points.push(
                    drawStartPoint.x + Math.cos(segmentAngle) * length,
                    drawStartPoint.y + Math.sin(segmentAngle) * length
                  );
                }
                
                return (
                  <Line
                    points={points}
                    stroke="#ef4444"
                    strokeWidth={3}
                    fill="rgba(239, 68, 68, 0.3)"
                    closed={true}
                  />
                );
              })()}
              {/* AOE Triangle preview (simple triangle) */}
              {selectedTool === 'aoe-triangle' && currentLine.length >= 4 && drawStartPoint && (() => {
                const endX = currentLine[2];
                const endY = currentLine[3];
                const angle = Math.atan2(endY - drawStartPoint.y, endX - drawStartPoint.x);
                const length = Math.sqrt(Math.pow(endX - drawStartPoint.x, 2) + Math.pow(endY - drawStartPoint.y, 2));
                const coneAngle = Math.PI / 3; // 60 degree cone
                
                const point2X = drawStartPoint.x + Math.cos(angle - coneAngle / 2) * length;
                const point2Y = drawStartPoint.y + Math.sin(angle - coneAngle / 2) * length;
                const point3X = drawStartPoint.x + Math.cos(angle + coneAngle / 2) * length;
                const point3Y = drawStartPoint.y + Math.sin(angle + coneAngle / 2) * length;
                
                return (
                  <Line
                    points={[drawStartPoint.x, drawStartPoint.y, point2X, point2Y, point3X, point3Y]}
                    stroke="#f97316"
                    strokeWidth={3}
                    fill="rgba(249, 115, 22, 0.3)"
                    closed={true}
                  />
                );
              })()}
              {/* AOE Line preview */}
              {selectedTool === 'aoe-line' && currentLine.length >= 4 && drawStartPoint && (() => {
                const endX = currentLine[2];
                const endY = currentLine[3];
                const angle = Math.atan2(endY - drawStartPoint.y, endX - drawStartPoint.x);
                const perpAngle = angle + Math.PI / 2;
                const halfWidth = 12;
                
                const points = [
                  drawStartPoint.x + Math.cos(perpAngle) * halfWidth, drawStartPoint.y + Math.sin(perpAngle) * halfWidth,
                  drawStartPoint.x - Math.cos(perpAngle) * halfWidth, drawStartPoint.y - Math.sin(perpAngle) * halfWidth,
                  endX - Math.cos(perpAngle) * halfWidth, endY - Math.sin(perpAngle) * halfWidth,
                  endX + Math.cos(perpAngle) * halfWidth, endY + Math.sin(perpAngle) * halfWidth,
                ];
                
                return (
                  <Line
                    points={points}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="rgba(59, 130, 246, 0.3)"
                    closed={true}
                  />
                );
              })()}
              {/* AOE Square preview */}
              {selectedTool === 'aoe-square' && currentLine.length >= 4 && drawStartPoint && (
                <Rect
                  x={Math.min(drawStartPoint.x, currentLine[2])}
                  y={Math.min(drawStartPoint.y, currentLine[3])}
                  width={Math.abs(currentLine[2] - drawStartPoint.x)}
                  height={Math.abs(currentLine[3] - drawStartPoint.y)}
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="rgba(139, 92, 246, 0.3)"
                />
              )}
            </>
          )}

          {/* Polygon preview */}
          {selectedTool === 'draw-polygon' && polygonPoints.length > 0 && (
            <>
              {/* Draw lines between points */}
              <Line
                points={polygonPoints.flatMap(p => [p.x, p.y])}
                stroke={drawingStrokeColor}
                strokeWidth={drawingStrokeWidth}
                lineCap="round"
                lineJoin="round"
              />
              {/* Draw points as circles */}
              {polygonPoints.map((point, index) => (
                <Circle
                  key={index}
                  x={point.x}
                  y={point.y}
                  radius={4}
                  fill={drawingStrokeColor}
                />
              ))}
              {/* Preview filled shape if enough points */}
              {polygonPoints.length >= 3 && (
                <Line
                  points={polygonPoints.flatMap(p => [p.x, p.y])}
                  stroke={drawingStrokeColor}
                  strokeWidth={drawingStrokeWidth}
                  fill={drawingFillEnabled ? drawingFillColor : undefined}
                  closed={true}
                  opacity={0.5}
                />
              )}
            </>
          )}

          {/* Marquee Selection Rectangle */}
          {marqueeStart && marqueeEnd && isMarqueeSelecting.current && (
            <Rect
              x={Math.min(marqueeStart.x, marqueeEnd.x)}
              y={Math.min(marqueeStart.y, marqueeEnd.y)}
              width={Math.abs(marqueeEnd.x - marqueeStart.x)}
              height={Math.abs(marqueeEnd.y - marqueeStart.y)}
              fill="rgba(34, 197, 94, 0.1)"
              stroke="#22c55e"
              strokeWidth={1}
              dash={[5, 5]}
            />
          )}

          {/* Pings */}
          {pings.map(ping => {
            const age = Date.now() - ping.timestamp;
            const opacity = Math.max(0, 1 - age / 2000);
            const scale = 1 + (age / 2000) * 0.5;
            
            return (
              <Group key={ping.id} x={ping.x} y={ping.y}>
                <Circle
                  radius={20 * scale}
                  stroke={ping.color}
                  strokeWidth={3}
                  opacity={opacity}
                />
                <Circle
                  radius={10 * scale}
                  stroke={ping.color}
                  strokeWidth={2}
                  opacity={opacity * 0.6}
                />
              </Group>
            );
          })}

          {/* Enhanced Measure Tool with Waypoints */}
          {measureWaypoints.length > 0 && (() => {
            // Build all points including current mouse position for preview
            const allPoints = measureCurrentPoint
              ? [...measureWaypoints, measureCurrentPoint]
              : measureWaypoints;
            
            // Calculate segment distances
            const segments: { start: Point; end: Point; distance: number }[] = [];
            let totalDistance = 0;
            
            for (let i = 1; i < allPoints.length; i++) {
              const start = allPoints[i - 1];
              const end = allPoints[i];
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const pixelDistance = Math.sqrt(dx * dx + dy * dy);
              const gridDistance = pixelDistance / gridSettings.cellSize;
              // Apply difficult terrain modifier (2x distance)
              const effectiveDistance = measureDifficultTerrain ? gridDistance * 2 : gridDistance;
              segments.push({ start, end, distance: effectiveDistance });
              totalDistance += effectiveDistance;
            }
            
            const measureColor = measureDifficultTerrain ? '#f59e0b' : '#22c55e';
            
            return (
              <>
                {/* Draw all segment lines */}
                {segments.map((segment, index) => (
                  <Line
                    key={`segment-${index}`}
                    points={[segment.start.x, segment.start.y, segment.end.x, segment.end.y]}
                    stroke={measureColor}
                    strokeWidth={2}
                    dash={[10, 5]}
                    lineCap="round"
                  />
                ))}
                
                {/* Draw waypoint markers */}
                {measureWaypoints.map((point, index) => (
                  <Group key={`waypoint-${index}`} x={point.x} y={point.y}>
                    <Circle
                      radius={8}
                      fill={index === 0 ? measureColor : '#3b82f6'}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                    <Text
                      x={-4}
                      y={-5}
                      text={String(index + 1)}
                      fontSize={10}
                      fill="#ffffff"
                      fontStyle="bold"
                    />
                  </Group>
                ))}
                
                {/* Draw per-segment distance labels on committed segments */}
                {segments.slice(0, measureWaypoints.length - 1).map((segment, index) => {
                  const midX = (segment.start.x + segment.end.x) / 2;
                  const midY = (segment.start.y + segment.end.y) / 2;
                  
                  return (
                    <Group key={`label-${index}`} x={midX} y={midY - 20}>
                      <Rect
                        x={-25}
                        y={-10}
                        width={50}
                        height={20}
                        fill="rgba(31, 41, 55, 0.9)"
                        stroke={measureColor}
                        strokeWidth={1}
                        cornerRadius={3}
                      />
                      <Text
                        text={`${segment.distance.toFixed(0)}ft`}
                        fontSize={11}
                        fill={measureColor}
                        fontStyle="bold"
                        align="center"
                        width={50}
                        x={-25}
                        y={-6}
                      />
                    </Group>
                  );
                })}
                
                {/* Total distance label at final point */}
                {allPoints.length >= 2 && (
                  <Group
                    x={allPoints[allPoints.length - 1].x + 15}
                    y={allPoints[allPoints.length - 1].y - 10}
                  >
                    <Rect
                      x={0}
                      y={-12}
                      width={85}
                      height={24}
                      fill="#1f2937"
                      stroke={measureColor}
                      strokeWidth={2}
                      cornerRadius={4}
                    />
                    <Text
                      text={`Total: ${totalDistance.toFixed(0)}ft`}
                      fontSize={12}
                      fill={measureColor}
                      fontStyle="bold"
                      align="center"
                      width={85}
                      x={0}
                      y={-7}
                    />
                  </Group>
                )}
              </>
            );
          })()}

          {/* Player Cursors (with interpolation for smooth movement) */}
          {otherPlayerCursors.map(player => {
            const pos = interpolatedCursors[player.id] || player.cursor;
            return (
            <Group key={player.id} x={pos.x} y={pos.y}>
              {/* Cursor arrow */}
              <Path
                data="M 0 0 L 4 14 L 0 11 L -4 14 Z"
                fill={player.color}
                stroke="#000"
                strokeWidth={0.5}
              />
              {/* Name label background */}
              <Rect
                x={8}
                y={8}
                width={player.name.length * 7 + 8}
                height={18}
                fill={player.color}
                cornerRadius={3}
                opacity={0.9}
              />
              {/* Name label text */}
              <Text
                x={12}
                y={11}
                text={player.name}
                fontSize={12}
                fill="#fff"
                fontStyle="bold"
              />
            </Group>
          );})}

        </Layer>
      </Stage>
      
      {/* Polygon tool hint overlay */}
      {selectedTool === 'draw-polygon' && polygonPoints.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          {polygonPoints.length} point{polygonPoints.length !== 1 ? 's' : ''} •
          {polygonPoints.length >= 3
            ? ' Press Enter or double-click to finish'
            : ` Add ${3 - polygonPoints.length} more point${3 - polygonPoints.length !== 1 ? 's' : ''}`}
        </div>
      )}
      
      {/* Measure tool hint overlay */}
      {selectedTool === 'measure' && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          {measureWaypoints.length === 0
            ? 'Click to start measuring'
            : `${measureWaypoints.length} waypoint${measureWaypoints.length !== 1 ? 's' : ''}`}
          {measureWaypoints.length > 0 && ' • Click to add waypoint • '}
          {measureWaypoints.length > 0 && (
            <span style={{ color: measureDifficultTerrain ? '#f59e0b' : '#86efac' }}>
              [D] Terrain: {measureDifficultTerrain ? '2×' : '1×'}
            </span>
          )}
          {measureWaypoints.length > 0 && ' • [Backspace] Undo • [Esc] Clear'}
        </div>
      )}
      
      {/* Token Configuration Modal */}
      <TokenConfigModal
        opened={tokenModalOpened}
        onClose={() => {
          setTokenModalOpened(false);
          setTokenPlacementPosition(null);
        }}
        onSubmit={handleTokenSubmit}
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
        onSubmit={handleTextSubmit}
        initialText={textEditContent}
      />
    </div>
  );
}
