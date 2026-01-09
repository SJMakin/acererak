// Core types for Lychgate VTT

export type ElementType = 'token' | 'image' | 'shape' | 'text';
export type LayerType = 'map' | 'gm' | 'token' | 'drawing';
export type Visibility = 'all' | 'dm' | string[]; // string[] = specific peer IDs

export interface Point {
  x: number;
  y: number;
}

export type GridType = 'square' | 'hex' | 'none';

export interface GridSettings {
  cellSize: number;      // pixels per cell
  width: number;         // cells
  height: number;        // cells
  showGrid: boolean;
  snapToGrid: boolean;
  gridColor: string;
  gridType: GridType;    // square, hex, or none (gridless)
}

export interface StyleProps {
  strokeColor?: string;
  fillColor?: string;
  lineWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  opacity?: number;
  textAlign?: 'left' | 'center' | 'right';
  // Text box specific
  backgroundEnabled?: boolean;
  backgroundColor?: string;
  backgroundOpacity?: number;
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
  notes?: string;        // Markdown content
  name?: string;         // Optional name for the map/image
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'freehand' | 'line' | 'rectangle' | 'circle' | 'ellipse' | 'polygon' | 'arrow';
  points: Point[];       // for freehand/polygon/arrow
  width?: number;        // for rectangle/circle/ellipse
  height?: number;       // for rectangle/circle/ellipse
  style: StyleProps;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  width?: number;  // Text box width for wrapping
  height?: number; // Text box height (auto-calculated based on content)
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

// Campaign Journal Note (standalone notes not attached to elements)
export interface CampaignNote {
  id: string;
  title: string;
  content: string;       // Markdown content
  category?: string;     // e.g., "Session", "NPC", "Location", "Lore", "Plot"
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  visibleTo: Visibility; // 'all' | 'dm' | specific peer IDs
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
  combat?: CombatTracker; // combat encounter state
  diceRolls?: DiceRoll[]; // dice roll history
  campaignNotes?: CampaignNote[]; // Campaign journal notes
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

export interface FogUpdateMessage {
  type: 'fog-update';
  fogOfWar: FogOfWar;
}

// Dice Roll types
export interface DiceRoll {
  id: string;
  playerId: string;
  playerName: string;
  timestamp: number;
  formula: string;
  result: number;
  breakdown: string; // e.g., "[4, 6] + 3 = 13"
}

export interface DiceRollMessage {
  type: 'dice-roll';
  roll: DiceRoll;
}

export type P2PMessage =
  | SyncMessage
  | ElementUpdateMessage
  | ElementDeleteMessage
  | CursorMessage
  | PingMessage
  | PlayerJoinMessage
  | PlayerLeaveMessage
  | FogUpdateMessage
  | DiceRollMessage;

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

// Library types for reusable tokens/maps/scenes
export type LibraryItemType = 'token' | 'map' | 'scene';

// Template data types (without id, position, zIndex - assigned when placed)
export type TokenTemplateData = Omit<TokenElement, 'id'>;
export type ImageTemplateData = Omit<ImageElement, 'id'>;

export interface LibraryItem {
  id: string;
  type: LibraryItemType;
  name: string;
  description?: string;
  notes?: string;  // Markdown content
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Data stored depends on type - templates don't have id yet
  data: TokenTemplateData | ImageTemplateData | SceneExport;
}

export interface LibraryExport {
  version: 1;
  exportedAt: string;
  items: LibraryItem[];
}

// Tool types for the canvas
export type ToolType =
  | 'select'
  | 'pan'
  | 'draw-freehand'
  | 'draw-line'
  | 'draw-rectangle'
  | 'draw-circle'
  | 'draw-ellipse'
  | 'draw-polygon'
  | 'draw-arrow'
  | 'token'
  | 'text'
  | 'measure'
  | 'ping'
  | 'fog-reveal'
  | 'fog-hide'
  | 'aoe-circle'     // Area of Effect: Circle (e.g., Fireball)
  | 'aoe-cone'       // Area of Effect: Cone with curved arc edge (fan shape)
  | 'aoe-triangle'   // Area of Effect: Triangle/Cone (D&D RAW - simple triangle)
  | 'aoe-line'       // Area of Effect: Line (e.g., Lightning Bolt)
  | 'aoe-square';    // Area of Effect: Square (e.g., Cloud of Daggers)

// Default values
export const DEFAULT_GRID_SETTINGS: GridSettings = {
  cellSize: 50,
  width: 20,
  height: 20,
  showGrid: true,
  snapToGrid: true,
  gridColor: 'rgba(255, 255, 255, 0.2)',
  gridType: 'square',
};

export const DEFAULT_STYLE: StyleProps = {
  strokeColor: '#ffffff',
  fillColor: 'transparent',
  lineWidth: 2,
  fontSize: 16,
  fontFamily: 'sans-serif',
  opacity: 1,
};

// Settings types
export interface Settings {
  // Grid Settings
  gridSize: {
    width: number;  // number of cells
    height: number; // number of cells
  };
  cellSize: number;  // pixels per cell
  gridColor: string;
  backgroundColor: string;
  
  // Token Defaults
  defaultTokenSize: number;  // 1-10 grid cells
  defaultHP: {
    current: number;
    max: number;
  };
  
  // UI Preferences
  autoSave: boolean;
  showPlayerCursors: boolean;
  showGridByDefault: boolean;
  snapToGridByDefault: boolean;
  showTokenMetadata: boolean; // Show HP bars, AC, conditions on tokens
}

export const DEFAULT_SETTINGS: Settings = {
  gridSize: { width: 30, height: 30 },
  cellSize: 50,
  gridColor: 'rgba(255, 255, 255, 0.2)',
  backgroundColor: '#1a1a2e',
  defaultTokenSize: 1,
  defaultHP: { current: 10, max: 10 },
  autoSave: true,
  showPlayerCursors: true,
  showGridByDefault: true,
  snapToGridByDefault: true,
  showTokenMetadata: true,
};

// Combat Tracker types
export interface Combatant {
  id: string;  // links to token element ID
  name: string;
  initiative: number;
  dexterity?: number;  // for tie-breaking
  hp: { current: number; max: number };
  conditions: string[];
}

export interface CombatTracker {
  active: boolean;
  round: number;
  currentTurn: number; // index into sorted combatants array
  combatants: Combatant[];
}
