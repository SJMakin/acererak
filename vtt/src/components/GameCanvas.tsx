import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Line, Circle, Ellipse, Image, Text, Group, Path, Shape as KonvaShape, Arrow } from 'react-konva';
import type Konva from 'konva';
import { nanoid } from 'nanoid';
import { useGameStore } from '../stores/gameStore';
import { useClipboard } from '../hooks/useClipboard';
import type { CanvasElement, Point, TokenElement, ImageElement, ShapeElement, TextElement, Player } from '../types';
import TokenConfigModal, { type TokenConfig } from './TokenConfigModal';
import TextInputModal from './TextInputModal';

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
  isCurrentTurn,
  onSelect,
  onShiftSelect,
  onDragEnd,
  isDM,
  showMetadata = true,
}: {
  element: TokenElement;
  cellSize: number;
  isSelected: boolean;
  isCurrentTurn?: boolean;
  onSelect: () => void;
  onShiftSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  isDM: boolean;
  showMetadata?: boolean;
}) {
  const [image] = useImage(element.imageUrl);
  const width = element.width * cellSize;
  const height = element.height * cellSize;

  // Check visibility
  const visible = element.visibleTo === 'all' ||
    (isDM && (element.visibleTo === 'dm' || Array.isArray(element.visibleTo)));

  if (!visible) return null;

  // Calculate HP percentage and color
  const hpPercent = element.hp ? (element.hp.current / element.hp.max) : 1;
  const hpColor = hpPercent > 0.66 ? '#22c55e' : hpPercent > 0.33 ? '#f59e0b' : '#ef4444';
  
  // Scale factors for metadata
  const scale = Math.max(0.5, Math.min(1, width / 50)); // Scale based on token size
  const fontSize = 12 * scale;
  const badgeSize = 20 * scale;
  const conditionBadgeSize = 16 * scale;

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;
    if (evt.shiftKey) {
      onShiftSelect();
    } else {
      onSelect();
    }
  };

  return (
    <Group
      x={element.x}
      y={element.y}
      draggable={!element.locked}
      onClick={handleClick}
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

      {/* Current turn indicator */}
      {isCurrentTurn && (
        <Circle
          x={width / 2}
          y={height / 2}
          radius={width / 2 + 4}
          stroke="#fbbf24"
          strokeWidth={3}
          dash={[8, 4]}
          listening={false}
        />
      )}

      {showMetadata && (
        <>
          {/* Name label with background */}
          {element.name && (
            <Group y={height + 2}>
              <Rect
                x={-2}
                y={0}
                width={width + 4}
                height={fontSize + 6}
                fill="rgba(0, 0, 0, 0.7)"
                cornerRadius={3}
              />
              <Text
                x={0}
                y={3}
                width={width}
                text={element.name}
                fontSize={fontSize}
                fill="white"
                align="center"
                fontStyle="bold"
              />
            </Group>
          )}

          {/* HP bar with text */}
          {element.hp && (
            <Group y={height + (element.name ? fontSize + 10 : 4)}>
              {/* HP bar background */}
              <Rect
                width={width}
                height={6 * scale}
                fill="#1f2937"
                cornerRadius={3}
              />
              {/* HP bar foreground */}
              <Rect
                width={hpPercent * width}
                height={6 * scale}
                fill={hpColor}
                cornerRadius={3}
              />
              {/* HP text */}
              <Text
                x={0}
                y={8 * scale}
                width={width}
                text={`${element.hp.current}/${element.hp.max}`}
                fontSize={fontSize * 0.85}
                fill="white"
                align="center"
                fontStyle="bold"
                shadowColor="black"
                shadowBlur={3}
                shadowOffsetX={1}
                shadowOffsetY={1}
              />
            </Group>
          )}

          {/* AC badge (top-right corner) */}
          {element.ac !== undefined && (
            <Group x={width - badgeSize / 2} y={badgeSize / 2}>
              {/* Shield background */}
              <Circle
                radius={badgeSize / 2}
                fill="#3b82f6"
                stroke="#1e40af"
                strokeWidth={1.5}
              />
              {/* AC text */}
              <Text
                x={-badgeSize / 2}
                y={-badgeSize / 2}
                width={badgeSize}
                height={badgeSize}
                text={String(element.ac)}
                fontSize={fontSize * 0.9}
                fill="white"
                align="center"
                verticalAlign="middle"
                fontStyle="bold"
              />
            </Group>
          )}

          {/* Condition badges (around token) */}
          {element.conditions && element.conditions.length > 0 && (
            <>
              {element.conditions.slice(0, 6).map((condition, index) => {
                // Position conditions around the token in a circle
                const angle = (index / Math.min(element.conditions!.length, 6)) * Math.PI * 2 - Math.PI / 2;
                const radius = width / 2 + conditionBadgeSize;
                const x = width / 2 + Math.cos(angle) * radius;
                const y = height / 2 + Math.sin(angle) * radius;
                
                // Get condition color
                const conditionColors: Record<string, string> = {
                  'poisoned': '#10b981',
                  'stunned': '#f59e0b',
                  'paralyzed': '#6366f1',
                  'charmed': '#ec4899',
                  'frightened': '#8b5cf6',
                  'restrained': '#ef4444',
                  'blinded': '#64748b',
                  'deafened': '#64748b',
                  'invisible': '#a855f7',
                  'prone': '#78716c',
                };
                const conditionColor = conditionColors[condition.toLowerCase()] || '#94a3b8';
                
                return (
                  <Group key={condition + index} x={x} y={y}>
                    {/* Condition badge background */}
                    <Circle
                      radius={conditionBadgeSize / 2}
                      fill={conditionColor}
                      stroke="#000"
                      strokeWidth={1}
                    />
                    {/* Condition initial */}
                    <Text
                      x={-conditionBadgeSize / 2}
                      y={-conditionBadgeSize / 2}
                      width={conditionBadgeSize}
                      height={conditionBadgeSize}
                      text={condition.charAt(0).toUpperCase()}
                      fontSize={fontSize * 0.75}
                      fill="white"
                      align="center"
                      verticalAlign="middle"
                      fontStyle="bold"
                    />
                  </Group>
                );
              })}
            </>
          )}

          {/* Token size indicator for large tokens */}
          {(element.width > 1 || element.height > 1) && (
            <Group x={badgeSize / 2} y={badgeSize / 2}>
              <Circle
                radius={badgeSize / 2}
                fill="rgba(0, 0, 0, 0.7)"
                stroke="#6b7280"
                strokeWidth={1}
              />
              <Text
                x={-badgeSize / 2}
                y={-badgeSize / 2}
                width={badgeSize}
                height={badgeSize}
                text={`${element.width}×${element.height}`}
                fontSize={fontSize * 0.65}
                fill="white"
                align="center"
                verticalAlign="middle"
                fontStyle="bold"
              />
            </Group>
          )}
        </>
      )}

      {/* DM-only indicator */}
      {element.visibleTo === 'dm' && isDM && (
        <Circle
          x={width - 6}
          y={height - 6}
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
  onShiftSelect,
  onDragEnd,
  isDM,
}: {
  element: ImageElement;
  isSelected: boolean;
  onSelect: () => void;
  onShiftSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  isDM: boolean;
}) {
  const [image] = useImage(element.imageUrl);

  const visible = element.visibleTo === 'all' ||
    (isDM && (element.visibleTo === 'dm' || Array.isArray(element.visibleTo)));

  if (!visible || !image) return null;

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;
    if (evt.shiftKey) {
      onShiftSelect();
    } else {
      onSelect();
    }
  };

  return (
    <Group
      x={element.x}
      y={element.y}
      draggable={!element.locked}
      onClick={handleClick}
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
  onShiftSelect,
  onDragEnd,
  isDM,
}: {
  element: ShapeElement;
  isSelected: boolean;
  onSelect: () => void;
  onShiftSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  isDM: boolean;
}) {
  const visible = element.visibleTo === 'all' ||
    (isDM && (element.visibleTo === 'dm' || Array.isArray(element.visibleTo)));

  if (!visible) return null;

  const { style } = element;
  const stroke = style?.strokeColor || '#ffffff';
  const fill = style?.fillColor || 'transparent';
  const strokeWidth = style?.lineWidth || 2;

  // Calculate bounds for selection highlight
  let boundsX = element.x;
  let boundsY = element.y;
  let boundsWidth = element.width || 100;
  let boundsHeight = element.height || 100;

  if (element.shapeType === 'freehand' || element.shapeType === 'line' || element.shapeType === 'polygon') {
    // Calculate bounding box from points
    if (element.points.length > 0) {
      const xs = element.points.map(p => p.x);
      const ys = element.points.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      boundsX = minX;
      boundsY = minY;
      boundsWidth = maxX - minX;
      boundsHeight = maxY - minY;
    }
  } else if (element.shapeType === 'circle') {
    const radius = Math.min(element.width || 50, element.height || 50) / 2;
    boundsX = element.x - radius;
    boundsY = element.y - radius;
    boundsWidth = radius * 2;
    boundsHeight = radius * 2;
  }

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;
    if (evt.shiftKey) {
      onShiftSelect();
    } else {
      onSelect();
    }
  };

  return (
    <Group
      x={element.x}
      y={element.y}
      draggable={!element.locked}
      onClick={handleClick}
      onTap={onSelect}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd(node.x(), node.y());
      }}
    >
      {/* Shape rendering */}
      {(element.shapeType === 'freehand' || element.shapeType === 'line' || element.shapeType === 'polygon') && (
        <Line
          points={element.points.flatMap(p => [p.x, p.y])}
          stroke={stroke}
          strokeWidth={strokeWidth}
          closed={element.shapeType === 'polygon'}
          fill={element.shapeType === 'polygon' ? fill : undefined}
          tension={element.shapeType === 'freehand' ? 0.5 : 0}
        />
      )}

      {element.shapeType === 'rectangle' && (
        <Rect
          x={0}
          y={0}
          width={element.width || 100}
          height={element.height || 100}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
        />
      )}

      {element.shapeType === 'circle' && (
        <Circle
          x={0}
          y={0}
          radius={Math.min(element.width || 50, element.height || 50) / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
        />
      )}

      {element.shapeType === 'ellipse' && (
        <Ellipse
          x={(element.width || 100) / 2}
          y={(element.height || 100) / 2}
          radiusX={(element.width || 100) / 2}
          radiusY={(element.height || 100) / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
        />
      )}

      {element.shapeType === 'arrow' && element.points.length >= 2 && (
        <Arrow
          points={[element.points[0].x, element.points[0].y, element.points[1].x, element.points[1].y]}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={style?.fillColor || stroke}
          pointerLength={Math.max(10, strokeWidth * 3)}
          pointerWidth={Math.max(8, strokeWidth * 2.5)}
        />
      )}

      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={boundsX - element.x - 2}
          y={boundsY - element.y - 2}
          width={boundsWidth + 4}
          height={boundsHeight + 4}
          stroke="#22c55e"
          strokeWidth={2}
          listening={false}
        />
      )}
    </Group>
  );
}

// Text component
function TextLabel({
  element,
  isSelected,
  onSelect,
  onShiftSelect,
  onDragEnd,
  onDoubleClick,
  isDM,
}: {
  element: TextElement;
  isSelected: boolean;
  onSelect: () => void;
  onShiftSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onDoubleClick: () => void;
  isDM: boolean;
}) {
  const visible = element.visibleTo === 'all' ||
    (isDM && (element.visibleTo === 'dm' || Array.isArray(element.visibleTo)));

  if (!visible) return null;

  const { style } = element;
  const fontSize = style?.fontSize || 16;
  const fontFamily = style?.fontFamily || 'sans-serif';
  const fontWeight = style?.fontWeight || 'normal';
  const fontStyle = style?.fontStyle || 'normal';
  const textAlign = style?.textAlign || 'left';
  const textColor = style?.strokeColor || '#ffffff';
  const width = element.width || 200;
  
  // Background properties
  const backgroundEnabled = style?.backgroundEnabled ?? true;
  const backgroundColor = style?.backgroundColor || 'rgba(0, 0, 0, 0.7)';
  const backgroundOpacity = style?.backgroundOpacity ?? 0.7;

  // Build fontStyle string for Konva (accepts 'normal', 'italic', 'bold', 'italic bold')
  let konvaFontStyle = 'normal';
  if (fontStyle === 'italic' && fontWeight === 'bold') {
    konvaFontStyle = 'italic bold';
  } else if (fontStyle === 'italic') {
    konvaFontStyle = 'italic';
  } else if (fontWeight === 'bold') {
    konvaFontStyle = 'bold';
  }

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;
    if (evt.shiftKey) {
      onShiftSelect();
    } else {
      onSelect();
    }
  };

  return (
    <Group
      x={element.x}
      y={element.y}
      draggable={!element.locked}
      onClick={handleClick}
      onTap={onSelect}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd(node.x(), node.y());
      }}
    >
      {/* Background rectangle */}
      {backgroundEnabled && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={(element.height || fontSize * 1.5) + 8}
          fill={backgroundColor}
          opacity={backgroundOpacity}
          cornerRadius={4}
        />
      )}
      
      {/* Text content with wrapping */}
      <Text
        text={element.content}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontStyle={konvaFontStyle}
        fill={textColor}
        width={width}
        padding={4}
        align={textAlign}
        wrap="word"
      />
      
      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-2}
          y={-2}
          width={width + 4}
          height={(element.height || fontSize * 1.5) + 12}
          stroke="#22c55e"
          strokeWidth={2}
          listening={false}
        />
      )}
    </Group>
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
  
  // Polygon drawing state
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  
  // Ping state for visualization
  const [pings, setPings] = useState<Array<{ id: string; x: number; y: number; color: string; timestamp: number }>>([]);
  
  // Measure tool state
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [measureEnd, setMeasureEnd] = useState<Point | null>(null);
  
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
  
  // Multi-drag state (for future use)
  const [_dragStartPositions, _setDragStartPositions] = useState<Record<string, Point>>({});

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
    addElement,
    panViewport,
    zoomViewport,
    revealFog,
    hideFog,
  } = useGameStore();

  // When previewing as player, treat DM as non-DM for visibility purposes
  const effectiveIsDM = isDM && !previewAsPlayer;

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

  // Clear polygon points when switching away from polygon tool
  useEffect(() => {
    if (selectedTool !== 'draw-polygon') {
      setPolygonPoints([]);
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

  // Handle text double-click for editing
  const handleTextDoubleClick = useCallback((elementId: string) => {
    const element = game?.elements.find(e => e.id === elementId);
    if (element && element.type === 'text') {
      setEditingTextId(elementId);
      setTextEditContent(element.content);
      setTextEditPosition({ x: element.x, y: element.y });
      setTextModalOpened(true);
    }
  }, [game]);

  // Handle text submission (new or edit)
  const handleTextSubmit = useCallback((text: string) => {
    if (!text.trim()) return;

    if (editingTextId) {
      // Update existing text
      const element = game?.elements.find(e => e.id === editingTextId);
      if (element && element.type === 'text') {
        updateElement(editingTextId, { content: text });
        const updatedElement: TextElement = { ...element, content: text };
        room.broadcastElementUpdate(updatedElement);
      }
    } else if (textEditPosition && game) {
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
        zIndex: game.elements.length,
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
      const newElement: Omit<ShapeElement, 'id'> = {
        type: 'shape' as const,
        layer: 'drawing' as const,
        shapeType: 'polygon',
        x: 0,
        y: 0,
        points: polygonPoints,
        visibleTo: 'all' as const,
        locked: false,
        zIndex: game.elements.length || 0,
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
    // Broadcast cursor position
    const stage = stageRef.current;
    if (stage) {
      const pointer = stage.getPointerPosition();
      if (pointer) {
        room.broadcastCursor(pointer);
        
        // Update marquee selection end point
        if (isMarqueeSelecting.current && marqueeStart) {
          const x = (pointer.x - viewportOffset.x) / viewportScale;
          const y = (pointer.y - viewportOffset.y) / viewportScale;
          setMarqueeEnd({ x, y });
          return;
        }
        
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
        // Find all elements within the marquee rectangle
        const selectedIds = (game?.elements || [])
          .filter(el => {
            // Get element bounds
            let elMinX = el.x;
            let elMinY = el.y;
            let elMaxX = el.x;
            let elMaxY = el.y;
            
            if (el.type === 'token') {
              const token = el as TokenElement;
              const cellSize = game?.gridSettings.cellSize || 50;
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
          zIndex: game?.elements.length || 0,
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
          zIndex: game?.elements.length || 0,
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
          zIndex: game?.elements.length || 0,
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
          zIndex: game?.elements.length || 0,
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
          zIndex: game?.elements.length || 0,
          style: {
            strokeColor: drawingStrokeColor,
            fillColor: drawingStrokeColor, // Arrow head uses stroke color
            lineWidth: drawingStrokeWidth,
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

      // Polygon tool: press Enter to finish
      if (selectedTool === 'draw-polygon' && polygonPoints.length >= 3 && key === 'enter') {
        e.preventDefault();
        e.stopPropagation();
        finishPolygon();
        return;
      }

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
  }, [selectedElementIds, clipboard, selectedTool, polygonPoints, finishPolygon]);

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
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isDM={effectiveIsDM}
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
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isDM={effectiveIsDM}
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
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                onDoubleClick={() => handleTextDoubleClick(el.id)}
                isDM={effectiveIsDM}
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
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isDM={effectiveIsDM}
                showMetadata={settings.showTokenMetadata}
              />
            ))}
        </Layer>

        {/* Layer 3: Fog of War (listening: false) - Only visible to non-DMs when enabled */}
        {game.fogOfWar.enabled && layerVisibility.fog && !effectiveIsDM && (
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
          {layerVisibility.drawings && sortedElements
            .filter(el => el.type === 'shape' && !el.locked)
            .map(el => (
              <Shape
                key={el.id}
                element={el as ShapeElement}
                isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
                onSelect={() => selectElement(el.id)}
                onShiftSelect={() => toggleElementSelection(el.id)}
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isDM={effectiveIsDM}
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
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                onDoubleClick={() => handleTextDoubleClick(el.id)}
                isDM={effectiveIsDM}
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
                onDragEnd={(x, y) => handleElementDragEnd(el.id, x, y)}
                isDM={effectiveIsDM}
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
