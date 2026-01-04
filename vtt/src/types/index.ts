// Core types for Acererak VTT

export type ElementType = 'token' | 'image' | 'shape' | 'text';
export type LayerType = 'map' | 'gm' | 'token' | 'drawing';
export type Visibility = 'all' | 'dm' | string[]; // string[] = specific peer IDs

export interface Point {
  x: number;
  y: number;
}

export interface GridSettings {
  cellSize: number;      // pixels per cell
  width: number;         // cells
  height: number;        // cells
  showGrid: boolean;
  snapToGrid: boolean;
  gridColor: string;
}

export interface StyleProps {
  strokeColor?: string;
  fillColor?: string;
  lineWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  opacity?: number;
}

// Base element all canvas objects inherit from
export interface BaseElement {
  id: string;
  type: ElementType;
  layer: LayerType;
  x: number;
  y: number;
  visibleTo: Visibility;
  locked: boolean;
  zIndex: number;
  rotation?: number;
}

export interface TokenElement extends BaseElement {
  type: 'token';
  imageUrl: string;
  width: number;         // in grid cells
  height: number;        // in grid cells
  name: string;
  hp?: { current: number; max: number };
  ac?: number;
  conditions?: string[];
  notes?: string;
  controlledBy?: string; // peer ID who can move this token
}

export interface ImageElement extends BaseElement {
  type: 'image';
  imageUrl: string;
  width: number;         // in pixels
  height: number;        // in pixels
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'freehand' | 'line' | 'rectangle' | 'circle' | 'polygon';
  points: Point[];       // for freehand/polygon
  width?: number;        // for rectangle/circle
  height?: number;       // for rectangle/circle
  style: StyleProps;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  style: StyleProps;
}

export type CanvasElement = TokenElement | ImageElement | ShapeElement | TextElement;

export interface FogOfWar {
  enabled: boolean;
  revealed: Point[][];   // array of revealed polygons
}

export interface Player {
  id: string;            // peer ID
  name: string;
  color: string;
  isDM: boolean;
  controlledTokens: string[]; // element IDs
  cursor?: Point;        // live cursor position
}

export interface GameState {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  gridSettings: GridSettings;
  elements: CanvasElement[];
  fogOfWar: FogOfWar;
  players: Record<string, Player>;
  dmPeerId?: string;     // who is the DM
}

// P2P message types
export interface SyncMessage {
  type: 'full-sync';
  state: GameState;
}

export interface ElementUpdateMessage {
  type: 'element-update';
  element: CanvasElement;
}

export interface ElementDeleteMessage {
  type: 'element-delete';
  elementId: string;
}

export interface CursorMessage {
  type: 'cursor';
  position: Point;
}

export interface PingMessage {
  type: 'ping';
  position: Point;
  color: string;
}

export interface PlayerJoinMessage {
  type: 'player-join';
  player: Player;
}

export interface PlayerLeaveMessage {
  type: 'player-leave';
  playerId: string;
}

export type P2PMessage =
  | SyncMessage
  | ElementUpdateMessage
  | ElementDeleteMessage
  | CursorMessage
  | PingMessage
  | PlayerJoinMessage
  | PlayerLeaveMessage;

// Room/Session types
export interface RoomConfig {
  roomId: string;
  appId: string;
  strategy: 'torrent' | 'ipfs' | 'firebase';
}

export interface SessionInfo {
  roomId: string;
  gameName: string;
  dmName: string;
  playerCount: number;
}

// Export/Import types
export interface GameExport {
  version: 1;
  exportedAt: string;
  game: GameState;
}

export interface SceneExport {
  version: 1;
  exportedAt: string;
  gridSettings: GridSettings;
  elements: CanvasElement[];
  fogOfWar: FogOfWar;
}

// Tool types for the canvas
export type ToolType = 
  | 'select'
  | 'pan'
  | 'draw-freehand'
  | 'draw-line'
  | 'draw-rectangle'
  | 'draw-circle'
  | 'token'
  | 'text'
  | 'measure'
  | 'ping'
  | 'fog-reveal'
  | 'fog-hide';

// Default values
export const DEFAULT_GRID_SETTINGS: GridSettings = {
  cellSize: 50,
  width: 20,
  height: 20,
  showGrid: true,
  snapToGrid: true,
  gridColor: 'rgba(255, 255, 255, 0.2)',
};

export const DEFAULT_STYLE: StyleProps = {
  strokeColor: '#ffffff',
  fillColor: 'transparent',
  lineWidth: 2,
  fontSize: 16,
  fontFamily: 'sans-serif',
  opacity: 1,
};
