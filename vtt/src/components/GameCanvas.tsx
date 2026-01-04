import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Line, Circle, Image, Text, Group, Path, Shape as KonvaShape } from 'react-konva';
import type Konva from 'konva';
import { nanoid } from 'nanoid';
import { useGameStore } from '../stores/gameStore';
import { useClipboard } from '../hooks/useClipboard';
import type { CanvasElement, Point, TokenElement, ImageElement, ShapeElement, TextElement, Player } from '../types';
import TokenConfigModal, { type TokenConfig } from './TokenConfigModal';

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
function useImage(url: string): [HTMLImageElement | null, boolean] {
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

// Token component
function Token({
  element,
  cellSize,
  isSelected,
  isMultiSelected,
  isCurrentTurn,
  onSelect,
  onDragEnd,
  isDM,
}: {
  element: TokenElement;
  cellSize: number;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isCurrentTurn?: boolean;
  onSelect: (e?: any) => void;
  onDragEnd: (x: number, y: number) => void;
  isDM: boolean;
}) {
  const [image] = useImage(element.imageUrl);
  const width = element.width * cellSize;
  const height = element.height * cellSize;

  // Check visibility
  const visible = element.visibleTo === 'all' || 
    (isDM && (element.visibleTo === 'dm' || Array.isArray(element.visibleTo)));

  if (!visible) return null;

  return (
    <Group
      x={element.x}
      y={element.y}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd(node.x(), node.y());
      }}
    >
      {/* Token image or placeholder */}
      {image ? (
        <Image
          image={image}
          width={width}
          height={height}
          cornerRadius={width / 2}
        />
      ) : (
        <Circle
          x={width / 2}
          y={height / 2}
          radius={width / 2}
          fill="#6366f1"
        />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <Rect
          x={-2}
          y={-2}
          width={width + 4}
          height={height + 4}
          stroke="#22c55e"
          strokeWidth={2}
          cornerRadius={width / 2}
          listening={false}
        />
      )}

      {/* Name label */}
      {element.name && (
        <Text
          x={0}
          y={height + 4}
          width={width}
          text={element.name}
          fontSize={12}
          fill="white"
          align="center"
        />
      )}

      {/* HP bar */}
      {element.hp && (
        <Group y={height + 18}>
          <Rect
            width={width}
            height={4}
            fill="#1f2937"
            cornerRadius={2}
          />
          <Rect
            width={(element.hp.current / element.hp.max) * width}
            height={4}
            fill={element.hp.current > element.hp.max * 0.5 ? '#22c55e' : 
                  element.hp.current > element.hp.max * 0.25 ? '#f59e0b' : '#ef4444'}
            cornerRadius={2}
          />
        </Group>
      )}

      {/* DM-only indicator */}
      {element.visibleTo === 'dm' && isDM && (
        <Circle
          x={width - 6}
          y={6}
          radius={6}
          fill="#7c3aed"
          opacity={0.8}
        />
      )}
    </Group>
  );
}

// Map image component  
function MapImage({ 
  element, 
  isSelected,
  onSelect,
  onDragEnd,
  isDM,
}: { 
  element: ImageElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  isDM: boolean;
}) {
  const [image] = useImage(element.imageUrl);

  const visible = element.visibleTo === 'all' || 
    (isDM && (element.visibleTo === 'dm' || Array.isArray(element.visibleTo)));

  if (!visible || !image) return null;

  return (
    <Group
      x={element.x}
      y={element.y}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd(node.x(), node.y());
      }}
    >
      <Image
        image={image}
        width={element.width}
        height={element.height}
        rotation={element.rotation || 0}
      />
      {isSelected && (
        <Rect
          x={-2}
          y={-2}
          width={element.width + 4}
          height={element.height + 4}
          stroke="#22c55e"
          strokeWidth={2}
          listening={false}
        />
      )}
    </Group>
  );
}

// Shape component
function Shape({ 
  element, 
  isSelected,
  onSelect,
  isDM,
}: { 
  element: ShapeElement;
  isSelected: boolean;
  onSelect: () => void;
  isDM: boolean;
}) {
  const visible = element.visibleTo === 'all' || 
    (isDM && (element.visibleTo === 'dm' || Array.isArray(element.visibleTo)));

  if (!visible) return null;

  const { style } = element;
  const stroke = style?.strokeColor || '#ffffff';
  const fill = style?.fillColor || 'transparent';
  const strokeWidth = style?.lineWidth || 2;

  if (element.shapeType === 'freehand' || element.shapeType === 'line' || element.shapeType === 'polygon') {
    const points = element.points.flatMap(p => [p.x, p.y]);
    return (
      <Line
        x={element.x}
        y={element.y}
        points={points}
        stroke={stroke}
        strokeWidth={strokeWidth}
        closed={element.shapeType === 'polygon'}
        fill={element.shapeType === 'polygon' ? fill : undefined}
        tension={element.shapeType === 'freehand' ? 0.5 : 0}
        onClick={onSelect}
        onTap={onSelect}
      />
    );
  }

  if (element.shapeType === 'rectangle') {
    return (
      <Rect
        x={element.x}
        y={element.y}
        width={element.width || 100}
        height={element.height || 100}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={fill}
        onClick={onSelect}
        onTap={onSelect}
      />
    );
  }

  if (element.shapeType === 'circle') {
    const radius = Math.min(element.width || 50, element.height || 50) / 2;
    return (
      <Circle
        x={element.x}
        y={element.y}
        radius={radius}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={fill}
        onClick={onSelect}
        onTap={onSelect}
      />
    );
  }

  return null;
}

// Text component
function TextLabel({ 
  element, 
  isSelected,
  onSelect,
  isDM,
}: { 
  element: TextElement;
  isSelected: boolean;
  onSelect: () => void;
  isDM: boolean;
}) {
  const visible = element.visibleTo === 'all' || 
    (isDM && (element.visibleTo === 'dm' || Array.isArray(element.visibleTo)));

  if (!visible) return null;

  const { style } = element;

  return (
    <Text
      x={element.x}
      y={element.y}
      text={element.content}
      fontSize={style?.fontSize || 16}
      fontFamily={style?.fontFamily || 'sans-serif'}
      fill={style?.strokeColor || '#ffffff'}
      onClick={onSelect}
      onTap={onSelect}
    />
  );
}

// Grid component
function Grid({ 
  width, 
  height, 
  cellSize, 
  color 
}: { 
  width: number; 
  height: number; 
  cellSize: number; 
  color: string;
}) {
  const lines = [];
  
  // Vertical lines
  for (let i = 0; i <= width; i++) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i * cellSize, 0, i * cellSize, height * cellSize]}
        stroke={color}
        strokeWidth={1}
        listening={false}
      />
    );
  }
  
  // Horizontal lines
  for (let i = 0; i <= height; i++) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[0, i * cellSize, width * cellSize, i * cellSize]}
        stroke={color}
        strokeWidth={1}
        listening={false}
      />
    );
  }
  
  return <>{lines}</>;
}

export default function GameCanvas({ room }: GameCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  
  // Drawing state
  const isDrawing = useRef(false);
  const [currentLine, setCurrentLine] = useState<number[]>([]);
  const [drawStartPoint, setDrawStartPoint] = useState<Point | null>(null);
  
  // Selection box state
  const [selectionBox, setSelectionBox] = useState<{ start: Point; end: Point } | null>(null);
  const isSelecting = useRef(false);
  
  // Ping state for visualization
  const [pings, setPings] = useState<Array<{ id: string; x: number; y: number; color: string; timestamp: number }>>([]);
  
  // Measure tool state
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [measureEnd, setMeasureEnd] = useState<Point | null>(null);
  
  // Token placement state
  const [tokenModalOpened, setTokenModalOpened] = useState(false);
  const [tokenPlacementPosition, setTokenPlacementPosition] = useState<Point | null>(null);
  
  // Mouse position for paste
  const mousePosition = useRef<Point>({ x: 0, y: 0 });

  const {
    game,
    selectedTool,
    selectedElementId,
    selectedElementIds,
    viewportOffset,
    viewportScale,
    isDM,
    myPeerId,
    settings,
    selectElement,
    selectElements,
    toggleElementSelection,
    addToSelection,
    clearSelection,
    updateElement,
    addElement,
    panViewport,
    zoomViewport,
    revealFog,
    hideFog,
  } = useGameStore();

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
  const isDrawingTool = selectedTool.startsWith('draw-') || selectedTool === 'fog-reveal' || selectedTool === 'fog-hide';
  const isFogTool = selectedTool === 'fog-reveal' || selectedTool === 'fog-hide';

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

  // Handle element click for selection
  const handleElementClick = useCallback((elementId: string, e?: any) => {
    const isCtrlPressed = e?.evt?.ctrlKey || e?.evt?.metaKey;
    const isShiftPressed = e?.evt?.shiftKey;

    if (isCtrlPressed) {
      // Ctrl+Click: toggle selection
      toggleElementSelection(elementId);
    } else if (isShiftPressed) {
      // Shift+Click: add to selection
      addToSelection(elementId);
    } else {
      // Regular click: select only this element
      selectElement(elementId);
    }
  }, [selectElement, toggleElementSelection, addToSelection]);

  // Handle element drag end
  const handleElementDragEnd = useCallback((elementId: string, x: number, y: number) => {
    const element = game?.elements.find(e => e.id === elementId);
    if (!element) return;

    // Snap to grid if enabled
    let finalX = x;
    let finalY = y;
    
    if (game?.gridSettings.snapToGrid) {
      const cellSize = game.gridSettings.cellSize;
      finalX = Math.round(x / cellSize) * cellSize;
      finalY = Math.round(y / cellSize) * cellSize;
    }

    updateElement(elementId, { x: finalX, y: finalY });
    room.broadcastElementUpdate({ ...element, x: finalX, y: finalY });
  }, [game, updateElement, room]);

  // Handle token configuration submission
  const handleTokenSubmit = useCallback((config: TokenConfig) => {
    if (!tokenPlacementPosition || !game) return;

    let x = tokenPlacementPosition.x;
    let y = tokenPlacementPosition.y;

    // Snap to grid if enabled
    if (game.gridSettings.snapToGrid) {
      const cellSize = game.gridSettings.cellSize;
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
      zIndex: game.elements.length,
      hp: config.hp,
      ac: config.ac,
    };

    const id = addElement(token);
    const fullToken = { ...token, id } as TokenElement;
    room.broadcastElementUpdate(fullToken);

    // Reset state
    setTokenPlacementPosition(null);
  }, [tokenPlacementPosition, game, addElement, room]);

  // Handle mouse move for cursor broadcasting
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (pointer) {
      // Throttle cursor updates
      room.broadcastCursor(pointer);
    }
  }, [room]);

  // Handle mouse/touch down for drawing
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Only draw when using a drawing tool and clicking on stage
    if (!isDrawingTool) {
      // Handle selection deselect
      if (e.target === e.target.getStage()) {
        selectElement(null);
      }
      // Handle measure tool
      if (selectedTool === 'measure' && e.target === e.target.getStage()) {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            // Transform to canvas coordinates
            const x = (pointer.x - viewportOffset.x) / viewportScale;
            const y = (pointer.y - viewportOffset.y) / viewportScale;
            setMeasureStart({ x, y });
            setMeasureEnd({ x, y });
          }
        }
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
            
            // Prompt for text content
            const textContent = window.prompt('Enter text:');
            if (textContent && textContent.trim()) {
              const newElement: Omit<TextElement, 'id'> = {
                type: 'text' as const,
                layer: 'drawing' as const,
                x,
                y,
                content: textContent.trim(),
                visibleTo: 'all' as const,
                locked: false,
                zIndex: game?.elements.length || 0,
                style: {
                  fontSize: 24,
                  fontFamily: 'sans-serif',
                  strokeColor: '#ffffff',
                },
              };
              
              const id = addElement(newElement);
              room.broadcastElementUpdate({ ...newElement, id } as TextElement);
            }
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
  const handleMouseMoveForDrawing = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Broadcast cursor position
    const stage = stageRef.current;
    if (stage) {
      const pointer = stage.getPointerPosition();
      if (pointer) {
        room.broadcastCursor(pointer);
        
        // Update measure tool end point
        if (selectedTool === 'measure' && measureStart) {
          const x = (pointer.x - viewportOffset.x) / viewportScale;
          const y = (pointer.y - viewportOffset.y) / viewportScale;
          setMeasureEnd({ x, y });
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
  }, [isDrawingTool, selectedTool, drawStartPoint, measureStart, room, viewportOffset, viewportScale]);

  // Handle mouse up for drawing
  const handleMouseUp = useCallback(() => {
    // Clear measure tool on mouse up
    if (selectedTool === 'measure') {
      setMeasureStart(null);
      setMeasureEnd(null);
      return;
    }
    
    if (!isDrawing.current || !isDrawingTool || !drawStartPoint) {
      isDrawing.current = false;
      setDrawStartPoint(null);
      return;
    }
    
    isDrawing.current = false;
    
    // Only save if we have at least 2 points (4 values: x1,y1,x2,y2)
    if (currentLine.length >= 4) {
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
        if (room.broadcastFogUpdate && game?.fogOfWar) {
          room.broadcastFogUpdate(game.fogOfWar);
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
          zIndex: game?.elements.length || 0,
          style: {
            strokeColor: '#ffffff',
            fillColor: 'transparent',
            lineWidth: 3,
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
          zIndex: game?.elements.length || 0,
          style: {
            strokeColor: '#ffffff',
            fillColor: 'transparent',
            lineWidth: 3,
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
          zIndex: game?.elements.length || 0,
          style: {
            strokeColor: '#ffffff',
            fillColor: 'transparent',
            lineWidth: 3,
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
          zIndex: game?.elements.length || 0,
          style: {
            strokeColor: '#ffffff',
            fillColor: 'transparent',
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
          zIndex: game?.elements.length || 0,
          style: {
            strokeColor: '#ffffff',
            fillColor: 'transparent',
            lineWidth: 3,
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
  }, [isDrawingTool, currentLine, selectedTool, drawStartPoint, game, addElement, room, setMeasureStart, setMeasureEnd]);

  // Keyboard shortcuts integration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (ctrl && key === 'c' && selectedElementIds.length > 0) {
        clipboard.copySelected();
      } else if (ctrl && key === 'x' && selectedElementIds.length > 0) {
        clipboard.cutSelected();
      } else if (ctrl && key === 'v' && clipboard.hasClipboard()) {
        clipboard.pasteElements(mousePosition.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, clipboard]);

  // Cleanup old pings and force re-render for animation
  const [pingTick, setPingTick] = useState(0);
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

  const { gridSettings, elements } = game;
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
          {gridSettings.showGrid && (
            <Grid
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
          {sortedElements
            .filter(el => el.layer === 'map' && el.type === 'image')
            .map(el => (
              <MapImage
                key={el.id}
                element={el as ImageElement}
                isSelected={selectedElementId === el.id}
                onSelect={() => selectElement(el.id)}
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isDM={isDM}
              />
            ))}
          {/* Locked shapes */}
          {sortedElements
            .filter(el => el.type === 'shape' && el.locked)
            .map(el => (
              <Shape
                key={el.id}
                element={el as ShapeElement}
                isSelected={selectedElementId === el.id}
                onSelect={() => selectElement(el.id)}
                isDM={isDM}
              />
            ))}
          {/* Locked text */}
          {sortedElements
            .filter(el => el.type === 'text' && el.locked)
            .map(el => (
              <TextLabel
                key={el.id}
                element={el as TextElement}
                isSelected={selectedElementId === el.id}
                onSelect={() => selectElement(el.id)}
                isDM={isDM}
              />
            ))}
          {/* Locked tokens */}
          {sortedElements
            .filter(el => el.type === 'token' && el.locked)
            .map(el => (
              <Token
                key={el.id}
                element={el as TokenElement}
                cellSize={gridSettings.cellSize}
                isSelected={selectedElementId === el.id}
                onSelect={() => selectElement(el.id)}
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isDM={isDM}
              />
            ))}
        </Layer>

        {/* Layer 3: Fog of War (listening: false) - Only visible to non-DMs when enabled */}
        {game.fogOfWar.enabled && !isDM && (
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
                
                game.fogOfWar.revealed.forEach((polygon) => {
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
          {sortedElements
            .filter(el => el.type === 'shape' && !el.locked)
            .map(el => (
              <Shape
                key={el.id}
                element={el as ShapeElement}
                isSelected={selectedElementId === el.id}
                onSelect={() => selectElement(el.id)}
                isDM={isDM}
              />
            ))}
          {/* Unlocked text */}
          {sortedElements
            .filter(el => el.type === 'text' && !el.locked)
            .map(el => (
              <TextLabel
                key={el.id}
                element={el as TextElement}
                isSelected={selectedElementId === el.id}
                onSelect={() => selectElement(el.id)}
                isDM={isDM}
              />
            ))}
          {/* Unlocked tokens */}
          {sortedElements
            .filter(el => el.type === 'token' && !el.locked)
            .map(el => (
              <Token
                key={el.id}
                element={el as TokenElement}
                cellSize={gridSettings.cellSize}
                isSelected={selectedElementId === el.id}
                onSelect={() => selectElement(el.id)}
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isDM={isDM}
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
                  stroke={selectedTool === 'fog-reveal' ? '#22c55e' : selectedTool === 'fog-hide' ? '#ef4444' : '#ffffff'}
                  strokeWidth={3}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  fill={selectedTool === 'fog-reveal' ? 'rgba(34, 197, 94, 0.2)' : selectedTool === 'fog-hide' ? 'rgba(239, 68, 68, 0.2)' : 'transparent'}
                  closed={isFogTool}
                />
              )}
              {selectedTool === 'draw-line' && currentLine.length >= 4 && (
                <Line
                  points={currentLine}
                  stroke="#ffffff"
                  strokeWidth={3}
                  lineCap="round"
                />
              )}
              {selectedTool === 'draw-rectangle' && currentLine.length >= 4 && drawStartPoint && (
                <Rect
                  x={Math.min(drawStartPoint.x, currentLine[2])}
                  y={Math.min(drawStartPoint.y, currentLine[3])}
                  width={Math.abs(currentLine[2] - drawStartPoint.x)}
                  height={Math.abs(currentLine[3] - drawStartPoint.y)}
                  stroke="#ffffff"
                  strokeWidth={3}
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
                  stroke="#ffffff"
                  strokeWidth={3}
                />
              )}
            </>
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

          {/* Measure Tool */}
          {measureStart && measureEnd && (
            <>
              {/* Measure line */}
              <Line
                points={[measureStart.x, measureStart.y, measureEnd.x, measureEnd.y]}
                stroke="#22c55e"
                strokeWidth={2}
                dash={[10, 5]}
                lineCap="round"
              />
              
              {/* Distance label */}
              {(() => {
                const dx = measureEnd.x - measureStart.x;
                const dy = measureEnd.y - measureStart.y;
                const pixelDistance = Math.sqrt(dx * dx + dy * dy);
                const gridDistance = pixelDistance / gridSettings.cellSize;
                const distanceText = `${gridDistance.toFixed(1)} ft`;
                
                // Position label at midpoint
                const midX = (measureStart.x + measureEnd.x) / 2;
                const midY = (measureStart.y + measureEnd.y) / 2;
                
                return (
                  <Group x={midX} y={midY}>
                    <Rect
                      x={-30}
                      y={-15}
                      width={60}
                      height={30}
                      fill="#1f2937"
                      stroke="#22c55e"
                      strokeWidth={2}
                      cornerRadius={4}
                    />
                    <Text
                      text={distanceText}
                      fontSize={14}
                      fill="#22c55e"
                      fontStyle="bold"
                      align="center"
                      verticalAlign="middle"
                      width={60}
                      x={-30}
                      y={-7}
                    />
                  </Group>
                );
              })()}
            </>
          )}

          {/* Player Cursors */}
          {otherPlayerCursors.map(player => (
            <Group key={player.id} x={player.cursor.x} y={player.cursor.y}>
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
          ))}
        </Layer>
    </Stage>
    
    {/* Token Configuration Modal */}
    <TokenConfigModal
      opened={tokenModalOpened}
      onClose={() => {
        setTokenModalOpened(false);
        setTokenPlacementPosition(null);
      }}
      onSubmit={handleTokenSubmit}
    />
  </div>
);
}
