import { useCallback, useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import type {
  JsonValue,
  MessageAction,
  MessageContext,
  PeerHandshake,
  Room,
} from '@trystero-p2p/torrent';
import { useGameStore } from '../stores/gameStore';
import { useSheetStore, handleIncomingSheetUpdate, handleIncomingSheetDelete } from '../stores/sheetStore';
import { useAIStore, setRequestAIFn } from '../stores/aiStore';
import { useImageStore, setImageMissingCallback } from '../stores/imageStore';
import { generateAndStore } from '../services/aiImageService';
import { hasKey as vaultHasKey, withKey as vaultWithKey } from '../services/keyVault';
import { computeHash } from '../services/imageService';
import type { EmbeddedImage } from '../services/imageService';
import { executeDiceRoll, validateDiceFormula } from '../services/diceParser';
import type {
  GameState,
  CanvasElement,
  Player,
  Point,
  GridSettings,
  ChatMessage,
  Scene,
  Sheet,
  AIRequest,
  AIResponse,
  AICapabilities,
  Visibility,
} from '../types';

const APP_ID = 'lychgate-vtt-v3';
const PROTOCOL_VERSION = 3;
const PRESENCE_ROOM_SUFFIX = ':presence';
const CONNECTION_TIMEOUT_MS = 40_000;
const SYNC_TIMEOUT_MS = 20_000;
const AI_TIMEOUT_MS = 150_000;
const AUTO_RESYNC_COOLDOWN_MS = 30_000;
const PROJECTED_SYNC_COALESCE_MS = 500;
const P2P_IMAGE_MAX_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 16_384;
const MAX_IMAGE_PIXELS = 64 * 1024 * 1024;
const MAX_GAME_BYTES = 8 * 1024 * 1024;
const MAX_SCENE_BYTES = 3 * 1024 * 1024;
const MAX_ELEMENT_BYTES = 1024 * 1024;
const MAX_SHEET_BYTES = 2 * 1024 * 1024;
const MAX_COORDINATE = 10_000_000;
const MAX_SCENES = 100;
const MAX_ELEMENTS_PER_SCENE = 5_000;
const MAX_PLAYERS = 128;
const MAX_POLYGONS = 2_000;
const MAX_POINTS_PER_POLYGON = 10_000;
const MAX_CHAT_LENGTH = 10_000;
const MAX_CONDITIONS = 128;
const MAX_SHEETS = 1_000;
const MAX_COMBATANTS = 1_000;

interface RateLimitConfig {
  capacity: number;
  refillPerSecond: number;
}

interface RateLimitBucket {
  tokens: number;
  updatedAt: number;
}

const DEFAULT_INBOUND_RATE_LIMIT: RateLimitConfig = { capacity: 60, refillPerSecond: 30 };
const GLOBAL_INBOUND_RATE_LIMIT: RateLimitConfig = { capacity: 240, refillPerSecond: 120 };
const TRUSTED_SYNC_INBOUND_RATE_LIMIT: RateLimitConfig = { capacity: 30, refillPerSecond: 5 };
const INBOUND_RATE_LIMITS: Readonly<Record<string, RateLimitConfig>> = Object.freeze({
  sync: { capacity: 4, refillPerSecond: 0.25 },
  elUpdate: { capacity: 120, refillPerSecond: 60 },
  elDelete: { capacity: 30, refillPerSecond: 10 },
  reqSync: { capacity: 3, refillPerSecond: 0.1 },
  fogUpdate: { capacity: 12, refillPerSecond: 4 },
  stateHash: { capacity: 20, refillPerSecond: 2 },
  gridUpd: { capacity: 20, refillPerSecond: 5 },
  chat: { capacity: 12, refillPerSecond: 1 },
  sceneSwi: { capacity: 8, refillPerSecond: 1 },
  sceneUpd: { capacity: 12, refillPerSecond: 2 },
  sheetUpd: { capacity: 20, refillPerSecond: 5 },
  sheetDel: { capacity: 10, refillPerSecond: 2 },
  aiReq: { capacity: 2, refillPerSecond: 1 / 30 },
  aiRes: { capacity: 10, refillPerSecond: 1 },
  aiCaps: { capacity: 6, refillPerSecond: 0.5 },
  imgReq: { capacity: 12, refillPerSecond: 2 },
  imgData: { capacity: 64, refillPerSecond: 4 },
});

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

type TrysteroModule = typeof import('@trystero-p2p/torrent');
let trysteroModulePromise: Promise<TrysteroModule> | null = null;

function loadTrystero(): Promise<TrysteroModule> {
  trysteroModulePromise ??= import('@trystero-p2p/torrent');
  return trysteroModulePromise;
}

interface RoomState {
  roomId: string | null;
  peers: string[];
  isHost: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
  error: string | null;
  lastSyncedAt: number | null;
  gmPeerId: string | null;
  gmDisconnected: boolean;
  localHash: string | null;
  gmHash: string | null;
  isDesynced: boolean;
}

type PeerRole = 'host' | 'player';

interface HandshakeHello {
  protocol: number;
  role: PeerRole;
  playerId?: string;
  resumeToken?: string;
  name?: string;
  color?: string;
}

interface PlayerResumeIdentity {
  id: string;
  resumeToken: string;
}

interface PlayerResumeAuth extends PlayerResumeIdentity {
  type: 'resume';
}

interface ImageTransferMeta {
  transferId: string;
  imageId: string;
  mime: string;
  width: number;
  height: number;
  size: number;
}

type PeerTarget = string | string[] | undefined;
type SafeSender<T> = (data: T, target?: PeerTarget) => Promise<void>;
type BinaryPayload = ArrayBuffer | ArrayBufferView;
type SafeImageSender = (data: ArrayBuffer, metadata: ImageTransferMeta, target?: PeerTarget) => Promise<void>;

interface ActiveActions {
  sendSync?: SafeSender<GameState>;
  sendElementUpdate?: SafeSender<CanvasElement>;
  sendElementDelete?: SafeSender<string>;
  sendRequestSync?: SafeSender<null>;
  sendFogUpdate?: SafeSender<{ enabled: boolean; revealed: Point[][] }>;
  sendStateHash?: SafeSender<string>;
  sendGridUpdate?: SafeSender<Partial<GridSettings>>;
  sendChat?: SafeSender<ChatMessage>;
  sendSceneSwitch?: SafeSender<string>;
  sendSceneUpdate?: SafeSender<Scene>;
  sendSheetUpdate?: SafeSender<Sheet>;
  sendSheetDelete?: SafeSender<string>;
  sendAIReq?: SafeSender<AIRequest>;
  sendAIRes?: SafeSender<AIResponse>;
  sendAICap?: SafeSender<AICapabilities>;
  sendImgReq?: SafeSender<string>;
  sendImgData?: SafeImageSender;
}

interface PendingAIRequest {
  resolve: (response: AIResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  expectedPeerId: string;
}

interface PendingProjectedSync {
  timer: ReturnType<typeof setTimeout>;
  waiters: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }>;
}

interface PresenceActions {
  sendCursor?: (position: Point) => Promise<void>;
  sendPing?: (data: { position: Point; color: string }) => Promise<void>;
}

type DebugInboundHandler = (
  data: unknown,
  peerId: string,
  metadata?: unknown,
) => void | Promise<void>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asByteView(value: unknown): Uint8Array | null {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (!ArrayBuffer.isView(value)) return null;
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function isBoundedString(value: unknown, max: number, min = 1): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

function isIdentifier(value: unknown, max = 160): value is string {
  return isBoundedString(value, max) && /^[A-Za-z0-9._:@-]+$/.test(value);
}

function isRoomId(value: unknown): value is string {
  return isBoundedString(value, 128) && /^[A-Za-z0-9_-]+$/.test(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function isSafeText(value: unknown, max: number, min = 0): value is string {
  return isBoundedString(value, max, min) && [...value].every((character) => {
    const code = character.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
  });
}

function isFiniteNumber(value: unknown, absoluteMax = MAX_COORDINATE): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= absoluteMax;
}

function isPositiveInteger(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= max;
}

function isNonNegativeInteger(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
}

function isValidVersion(value: unknown): value is number {
  return isPositiveInteger(value, Number.MAX_SAFE_INTEGER);
}

function isWithinSerializedSize(value: unknown, maxBytes: number): boolean {
  try {
    return new Blob([JSON.stringify(value)]).size <= maxBytes;
  } catch {
    return false;
  }
}

function isValidPoint(value: unknown): value is Point {
  return isRecord(value)
    && hasOnlyKeys(value, new Set(['x', 'y']))
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y);
}

function isValidColor(value: unknown): value is string {
  return isBoundedString(value, 32) && /^#[0-9a-fA-F]{6}$/.test(value);
}

function sanitizeColor(value: unknown): string {
  return isValidColor(value) ? value.toLowerCase() : '#3b82f6';
}

function sanitizeName(value: unknown): string {
  if (!isBoundedString(value, 80)) return 'Player';
  const normalized = [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join('')
    .trim();
  return normalized.slice(0, 80) || 'Player';
}

function isValidVisibility(value: unknown): value is Visibility {
  if (value === 'all' || value === 'gm') return true;
  return Array.isArray(value)
    && value.length <= MAX_PLAYERS
    && value.every((id) => isIdentifier(id))
    && new Set(value).size === value.length;
}

function isVisibleToPlayer(visibility: Visibility, playerId: string): boolean {
  return visibility === 'all' || (Array.isArray(visibility) && visibility.includes(playerId));
}

function isValidGridSettings(value: unknown, partial = false): value is GridSettings | Partial<GridSettings> {
  if (!isRecord(value)) return false;
  const allowed = new Set(['cellSize', 'width', 'height', 'showGrid', 'snapToGrid', 'gridColor', 'gridType']);
  if (Object.keys(value).some((key) => !allowed.has(key))) return false;
  if (!partial && Object.keys(value).length !== allowed.size) return false;
  if ('cellSize' in value && (!isFiniteNumber(value.cellSize, 2_000) || value.cellSize <= 0)) return false;
  if ('width' in value && !isPositiveInteger(value.width, 10_000)) return false;
  if ('height' in value && !isPositiveInteger(value.height, 10_000)) return false;
  if ('showGrid' in value && typeof value.showGrid !== 'boolean') return false;
  if ('snapToGrid' in value && typeof value.snapToGrid !== 'boolean') return false;
  if ('gridColor' in value && !isSafeText(value.gridColor, 128, 1)) return false;
  if ('gridType' in value && !['square', 'hex', 'none'].includes(String(value.gridType))) return false;
  return true;
}

function isValidStyle(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const allowed = new Set([
    'strokeColor', 'fillColor', 'lineWidth', 'fontSize', 'fontFamily', 'fontWeight',
    'fontStyle', 'opacity', 'textAlign', 'backgroundEnabled', 'backgroundColor',
    'backgroundOpacity',
  ]);
  if (!hasOnlyKeys(value, allowed)) return false;
  if ('strokeColor' in value && value.strokeColor !== undefined && !isSafeText(value.strokeColor, 128, 1)) return false;
  if ('fillColor' in value && value.fillColor !== undefined && !isSafeText(value.fillColor, 128, 1)) return false;
  if ('lineWidth' in value && value.lineWidth !== undefined && (!isFiniteNumber(value.lineWidth, 1_000) || value.lineWidth < 0)) return false;
  if ('fontSize' in value && value.fontSize !== undefined && (!isFiniteNumber(value.fontSize, 1_000) || value.fontSize <= 0)) return false;
  if ('fontFamily' in value && value.fontFamily !== undefined && !isSafeText(value.fontFamily, 128, 1)) return false;
  if ('fontWeight' in value && value.fontWeight !== undefined && !['normal', 'bold'].includes(String(value.fontWeight))) return false;
  if ('fontStyle' in value && value.fontStyle !== undefined && !['normal', 'italic'].includes(String(value.fontStyle))) return false;
  if ('opacity' in value && value.opacity !== undefined && (!isFiniteNumber(value.opacity, 1) || value.opacity < 0)) return false;
  if ('textAlign' in value && value.textAlign !== undefined && !['left', 'center', 'right'].includes(String(value.textAlign))) return false;
  if ('backgroundEnabled' in value && value.backgroundEnabled !== undefined && typeof value.backgroundEnabled !== 'boolean') return false;
  if ('backgroundColor' in value && value.backgroundColor !== undefined && !isSafeText(value.backgroundColor, 128, 1)) return false;
  if ('backgroundOpacity' in value && value.backgroundOpacity !== undefined && (!isFiniteNumber(value.backgroundOpacity, 1) || value.backgroundOpacity < 0)) return false;
  return true;
}

function isValidCanvasElement(value: unknown): value is CanvasElement {
  if (!isRecord(value) || !isWithinSerializedSize(value, MAX_ELEMENT_BYTES)) return false;
  if (!isIdentifier(value.id) || !['token', 'image', 'shape', 'text'].includes(String(value.type))) return false;
  if (!['map', 'gm', 'token', 'drawing'].includes(String(value.layer))) return false;
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isNonNegativeInteger(value.zIndex, 1_000_000)) return false;
  if (typeof value.locked !== 'boolean' || !isValidVisibility(value.visibleTo)) return false;
  if ('rotation' in value && value.rotation !== undefined && !isFiniteNumber(value.rotation, 360_000)) return false;
  if ('version' in value && value.version !== undefined && !isValidVersion(value.version)) return false;

  if (value.type === 'token') {
    const allowed = new Set([
      'id', 'type', 'layer', 'x', 'y', 'visibleTo', 'locked', 'zIndex', 'rotation', 'version',
      'imageUrl', 'imageId', 'width', 'height', 'name', 'hp', 'ac', 'conditions', 'notes',
      'controlledBy', 'sheetId',
    ]);
    if (!hasOnlyKeys(value, allowed)) return false;
    if (!isSafeText(value.imageUrl, 500_000) || !isSafeText(value.name, 256, 1)) return false;
    if (!isFiniteNumber(value.width, 10_000) || value.width <= 0 || !isFiniteNumber(value.height, 10_000) || value.height <= 0) return false;
    if ('imageId' in value && value.imageId !== undefined && !isIdentifier(value.imageId)) return false;
    if ('controlledBy' in value && value.controlledBy !== undefined && !isIdentifier(value.controlledBy)) return false;
    if ('sheetId' in value && value.sheetId !== undefined && !isIdentifier(value.sheetId)) return false;
    if ('hp' in value && value.hp !== undefined) {
      if (!isRecord(value.hp) || !hasOnlyKeys(value.hp, new Set(['current', 'max']))) return false;
      if (!isFiniteNumber(value.hp.current, 1_000_000_000) || !isFiniteNumber(value.hp.max, 1_000_000_000) || value.hp.max < 0) return false;
    }
    if ('ac' in value && value.ac !== undefined && !isFiniteNumber(value.ac, 1_000_000)) return false;
    if ('conditions' in value && value.conditions !== undefined) {
      if (!Array.isArray(value.conditions) || value.conditions.length > MAX_CONDITIONS || !value.conditions.every((condition) => isSafeText(condition, 128, 1))) return false;
    }
    if ('notes' in value && value.notes !== undefined && !isSafeText(value.notes, 100_000)) return false;
  } else if (value.type === 'image') {
    const allowed = new Set([
      'id', 'type', 'layer', 'x', 'y', 'visibleTo', 'locked', 'zIndex', 'rotation', 'version',
      'imageUrl', 'imageId', 'width', 'height', 'notes', 'name',
    ]);
    if (!hasOnlyKeys(value, allowed)) return false;
    if (!isSafeText(value.imageUrl, 500_000)) return false;
    if (!isFiniteNumber(value.width, 100_000) || value.width <= 0 || !isFiniteNumber(value.height, 100_000) || value.height <= 0) return false;
    if ('imageId' in value && value.imageId !== undefined && !isIdentifier(value.imageId)) return false;
    if ('notes' in value && value.notes !== undefined && !isSafeText(value.notes, 100_000)) return false;
    if ('name' in value && value.name !== undefined && !isSafeText(value.name, 256, 1)) return false;
  } else if (value.type === 'shape') {
    const allowed = new Set([
      'id', 'type', 'layer', 'x', 'y', 'visibleTo', 'locked', 'zIndex', 'rotation', 'version',
      'shapeType', 'points', 'width', 'height', 'style',
    ]);
    if (!hasOnlyKeys(value, allowed)) return false;
    if (!['freehand', 'line', 'rectangle', 'circle', 'ellipse', 'polygon', 'arrow'].includes(String(value.shapeType))) return false;
    if (!Array.isArray(value.points) || value.points.length > MAX_POINTS_PER_POLYGON || !value.points.every(isValidPoint)) return false;
    if ('width' in value && value.width !== undefined && (!isFiniteNumber(value.width, 100_000) || value.width < 0)) return false;
    if ('height' in value && value.height !== undefined && (!isFiniteNumber(value.height, 100_000) || value.height < 0)) return false;
    if (!isValidStyle(value.style)) return false;
  } else {
    const allowed = new Set([
      'id', 'type', 'layer', 'x', 'y', 'visibleTo', 'locked', 'zIndex', 'rotation', 'version',
      'content', 'width', 'height', 'style',
    ]);
    if (!hasOnlyKeys(value, allowed)) return false;
    if (!isSafeText(value.content, 100_000) || !isValidStyle(value.style)) return false;
    if ('width' in value && value.width !== undefined && (!isFiniteNumber(value.width, 100_000) || value.width <= 0)) return false;
    if ('height' in value && value.height !== undefined && (!isFiniteNumber(value.height, 100_000) || value.height <= 0)) return false;
  }

  return true;
}

function isValidFog(value: unknown): value is { enabled: boolean; revealed: Point[][] } {
  return isRecord(value)
    && hasOnlyKeys(value, new Set(['enabled', 'revealed']))
    && typeof value.enabled === 'boolean'
    && Array.isArray(value.revealed)
    && value.revealed.length <= MAX_POLYGONS
    && value.revealed.every((polygon) => (
      Array.isArray(polygon)
      && polygon.length <= MAX_POINTS_PER_POLYGON
      && polygon.every(isValidPoint)
    ));
}

function isValidScene(value: unknown): value is Scene {
  return isRecord(value)
    && hasOnlyKeys(value, new Set([
      'id', 'name', 'backgroundUrl', 'backgroundImageId', 'gridSettings', 'elements',
      'fogOfWar', 'createdAt', 'updatedAt',
    ]))
    && isWithinSerializedSize(value, MAX_SCENE_BYTES)
    && isIdentifier(value.id)
    && isBoundedString(value.name, 256)
    && (!('backgroundUrl' in value) || value.backgroundUrl === undefined || isBoundedString(value.backgroundUrl, 500_000, 0))
    && (!('backgroundImageId' in value) || value.backgroundImageId === undefined || isIdentifier(value.backgroundImageId))
    && isValidGridSettings(value.gridSettings)
    && Array.isArray(value.elements)
    && value.elements.length <= MAX_ELEMENTS_PER_SCENE
    && value.elements.every(isValidCanvasElement)
    && new Set(value.elements.map((element) => element.id)).size === value.elements.length
    && isValidFog(value.fogOfWar)
    && isBoundedString(value.createdAt, 128)
    && isBoundedString(value.updatedAt, 128);
}

function isValidPlayer(value: unknown): value is Player {
  return isRecord(value)
    && hasOnlyKeys(value, new Set(['id', 'name', 'color', 'isGM', 'controlledTokens', 'cursor']))
    && isIdentifier(value.id)
    && isBoundedString(value.name, 80)
    && isValidColor(value.color)
    && typeof value.isGM === 'boolean'
    && Array.isArray(value.controlledTokens)
    && value.controlledTokens.length <= MAX_ELEMENTS_PER_SCENE
    && value.controlledTokens.every((id) => isIdentifier(id))
    && (!('cursor' in value) || value.cursor === undefined || isValidPoint(value.cursor));
}

function isValidChat(value: unknown): value is ChatMessage {
  if (!isRecord(value) || !isWithinSerializedSize(value, 64 * 1024)) return false;
  if (!hasOnlyKeys(value, new Set([
    'id', 'playerId', 'playerName', 'playerColor', 'timestamp', 'type', 'content',
    'isGMOnly', 'formula', 'result', 'breakdown',
  ]))) return false;
  if (!isIdentifier(value.id) || !isIdentifier(value.playerId)) return false;
  if (!isBoundedString(value.playerName, 80) || !isValidColor(value.playerColor)) return false;
  if (!isFiniteNumber(value.timestamp, Number.MAX_SAFE_INTEGER)) return false;
  if (value.type !== undefined && !['chat', 'roll'].includes(String(value.type))) return false;
  if (!isBoundedString(value.content, MAX_CHAT_LENGTH, 0) || typeof value.isGMOnly !== 'boolean') return false;
  if (value.type === 'roll') {
    if (!isBoundedString(value.formula, 256) || !isFiniteNumber(value.result, Number.MAX_SAFE_INTEGER)) return false;
    if (!isBoundedString(value.breakdown, 2_000)) return false;
  }
  return true;
}

function isValidSheet(value: unknown): value is Sheet {
  if (!isRecord(value) || !isWithinSerializedSize(value, MAX_SHEET_BYTES)) return false;
  const allowed = new Set([
    'id', 'version', 'name', 'content', 'shadowState', 'projections', 'parentId', 'isFolder',
    'category', 'tags', 'createdAt', 'updatedAt',
  ]);
  if (!hasOnlyKeys(value, allowed)) return false;
  if (!isIdentifier(value.id) || !isSafeText(value.name, 256, 1) || !isSafeText(value.content, MAX_SHEET_BYTES)) return false;
  if (!isRecord(value.shadowState) || Object.keys(value.shadowState).length > 512) return false;
  for (const [key, entry] of Object.entries(value.shadowState)) {
    if (!isSafeText(key, 128, 1)) return false;
    if (typeof entry === 'number') {
      if (!isFiniteNumber(entry, Number.MAX_SAFE_INTEGER)) return false;
    } else if (!isSafeText(entry, 10_000)) return false;
  }
  if (!isRecord(value.projections) || !hasOnlyKeys(value.projections, new Set(['bar', 'barMax', 'badge']))) return false;
  if (!Object.values(value.projections).every((entry) => entry === undefined || isSafeText(entry, 128, 1))) return false;
  if ('parentId' in value && value.parentId !== undefined && value.parentId !== null && !isIdentifier(value.parentId)) return false;
  if (value.parentId === value.id) return false;
  if ('isFolder' in value && value.isFolder !== undefined && typeof value.isFolder !== 'boolean') return false;
  if ('category' in value && value.category !== undefined && !isSafeText(value.category, 128, 1)) return false;
  if ('tags' in value && value.tags !== undefined) {
    if (!Array.isArray(value.tags) || value.tags.length > 128 || !value.tags.every((tag) => isSafeText(tag, 128, 1))) return false;
  }
  if (!isSafeText(value.createdAt, 128, 1) || !isSafeText(value.updatedAt, 128, 1)) return false;
  if ('version' in value && value.version !== undefined && !isValidVersion(value.version)) return false;
  return true;
}

function isValidCombat(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(['active', 'round', 'currentTurn', 'combatants']))) return false;
  if (typeof value.active !== 'boolean' || !isNonNegativeInteger(value.round, 1_000_000)) return false;
  if (!Array.isArray(value.combatants) || value.combatants.length > MAX_COMBATANTS) return false;
  if (!isNonNegativeInteger(value.currentTurn, Math.max(0, value.combatants.length - 1))) {
    if (value.combatants.length !== 0 || value.currentTurn !== 0) return false;
  }
  return value.combatants.every((combatant) => {
    if (!isRecord(combatant) || !hasOnlyKeys(combatant, new Set(['id', 'name', 'initiative', 'dexterity', 'hp', 'conditions']))) return false;
    if (!isIdentifier(combatant.id) || !isSafeText(combatant.name, 256, 1) || !isFiniteNumber(combatant.initiative, 1_000_000)) return false;
    if ('dexterity' in combatant && combatant.dexterity !== undefined && !isFiniteNumber(combatant.dexterity, 1_000_000)) return false;
    if (!isRecord(combatant.hp) || !hasOnlyKeys(combatant.hp, new Set(['current', 'max']))) return false;
    if (!isFiniteNumber(combatant.hp.current, 1_000_000_000) || !isFiniteNumber(combatant.hp.max, 1_000_000_000) || combatant.hp.max < 0) return false;
    return Array.isArray(combatant.conditions)
      && combatant.conditions.length <= MAX_CONDITIONS
      && combatant.conditions.every((condition) => isSafeText(condition, 128, 1));
  });
}

function isValidDiceRoll(value: unknown): boolean {
  return isRecord(value)
    && hasOnlyKeys(value, new Set(['id', 'playerId', 'playerName', 'timestamp', 'formula', 'result', 'breakdown']))
    && isIdentifier(value.id)
    && isIdentifier(value.playerId)
    && isSafeText(value.playerName, 80, 1)
    && isFiniteNumber(value.timestamp, Number.MAX_SAFE_INTEGER)
    && isSafeText(value.formula, 256, 1)
    && isFiniteNumber(value.result, Number.MAX_SAFE_INTEGER)
    && isSafeText(value.breakdown, 2_000, 1);
}

function isValidCampaignNote(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set([
    'id', 'title', 'content', 'category', 'tags', 'createdAt', 'updatedAt', 'visibleTo',
  ]))) return false;
  if (!isIdentifier(value.id) || !isSafeText(value.title, 256, 1) || !isSafeText(value.content, 200_000)) return false;
  if (!isSafeText(value.createdAt, 128, 1) || !isSafeText(value.updatedAt, 128, 1) || !isValidVisibility(value.visibleTo)) return false;
  if ('category' in value && value.category !== undefined && !isSafeText(value.category, 128, 1)) return false;
  return !('tags' in value) || value.tags === undefined || (
    Array.isArray(value.tags)
    && value.tags.length <= 128
    && value.tags.every((tag) => isSafeText(tag, 128, 1))
  );
}

function isValidGameState(value: unknown): value is GameState {
  if (!isRecord(value) || !isWithinSerializedSize(value, MAX_GAME_BYTES)) return false;
  if (!hasOnlyKeys(value, new Set([
    'id', 'name', 'roomId', 'createdAt', 'updatedAt', 'scenes', 'activeSceneId', 'players',
    'gmPeerId', 'combat', 'diceRolls', 'campaignNotes', 'chatMessages', 'sheets',
    'gridSettings', 'elements', 'fogOfWar',
  ]))) return false;
  if (!isIdentifier(value.id) || !isSafeText(value.name, 256, 1) || !isRoomId(value.roomId)) return false;
  if (!isBoundedString(value.createdAt, 128) || !isBoundedString(value.updatedAt, 128)) return false;
  if (!Array.isArray(value.scenes) || value.scenes.length === 0 || value.scenes.length > MAX_SCENES) return false;
  if (!value.scenes.every(isValidScene) || !isIdentifier(value.activeSceneId)) return false;
  if (!value.scenes.some((scene) => scene.id === value.activeSceneId) || new Set(value.scenes.map((scene) => scene.id)).size !== value.scenes.length) return false;
  if (!isRecord(value.players) || Object.keys(value.players).length > MAX_PLAYERS) return false;
  if (!Object.values(value.players).every(isValidPlayer)) return false;
  if (!Object.entries(value.players).every(([id, player]) => isRecord(player) && player.id === id)) return false;
  if ('gmPeerId' in value && value.gmPeerId !== undefined && !isIdentifier(value.gmPeerId)) return false;
  if ('combat' in value && value.combat !== undefined && !isValidCombat(value.combat)) return false;
  if ('diceRolls' in value && value.diceRolls !== undefined) {
    if (!Array.isArray(value.diceRolls) || value.diceRolls.length > 1_000 || !value.diceRolls.every(isValidDiceRoll)) return false;
  }
  if ('campaignNotes' in value && value.campaignNotes !== undefined) {
    if (!Array.isArray(value.campaignNotes) || value.campaignNotes.length > 1_000 || !value.campaignNotes.every(isValidCampaignNote)) return false;
  }
  if ('chatMessages' in value && value.chatMessages !== undefined) {
    if (!Array.isArray(value.chatMessages) || value.chatMessages.length > 1_000 || !value.chatMessages.every(isValidChat)) return false;
  }
  if ('sheets' in value && value.sheets !== undefined) {
    if (!Array.isArray(value.sheets) || value.sheets.length > MAX_SHEETS || !value.sheets.every(isValidSheet)) return false;
    if (new Set(value.sheets.map((sheet) => sheet.id)).size !== value.sheets.length) return false;
  }
  if ('gridSettings' in value && value.gridSettings !== undefined && !isValidGridSettings(value.gridSettings)) return false;
  if ('elements' in value && value.elements !== undefined) {
    if (!Array.isArray(value.elements) || value.elements.length > MAX_ELEMENTS_PER_SCENE || !value.elements.every(isValidCanvasElement)) return false;
  }
  if ('fogOfWar' in value && value.fogOfWar !== undefined && !isValidFog(value.fogOfWar)) return false;
  return true;
}

function isValidImageTransferMeta(value: unknown): value is ImageTransferMeta {
  return isRecord(value)
    && isIdentifier(value.transferId)
    && typeof value.imageId === 'string'
    && /^[a-f0-9]{64}$/i.test(value.imageId)
    && ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(String(value.mime))
    && isPositiveInteger(value.width, MAX_IMAGE_DIMENSION)
    && isPositiveInteger(value.height, MAX_IMAGE_DIMENSION)
    && value.width * value.height <= MAX_IMAGE_PIXELS
    && isPositiveInteger(value.size, P2P_IMAGE_MAX_SIZE);
}

function isValidHandshakeHello(value: unknown): value is HandshakeHello {
  if (!isRecord(value) || value.protocol !== PROTOCOL_VERSION || !['host', 'player'].includes(String(value.role))) return false;
  if (value.role === 'player') {
    if (!hasOnlyKeys(value, new Set(['protocol', 'role', 'playerId', 'name', 'color']))) return false;
    return isIdentifier(value.playerId)
      && isBoundedString(value.name, 80)
      && isValidColor(value.color);
  }
  return hasOnlyKeys(value, new Set(['protocol', 'role']));
}

function isValidPlayerResumeAuth(value: unknown): value is PlayerResumeAuth {
  return isRecord(value)
    && hasOnlyKeys(value, new Set(['type', 'id', 'resumeToken']))
    && value.type === 'resume'
    && isIdentifier(value.id)
    && typeof value.resumeToken === 'string'
    && /^[A-Za-z0-9_-]{32,128}$/.test(value.resumeToken);
}

function isValidAICapabilities(value: unknown): value is AICapabilities {
  return isRecord(value)
    && hasOnlyKeys(value, new Set(['hasAI', 'features', 'textModel', 'imageModel']))
    && typeof value.hasAI === 'boolean'
    && Array.isArray(value.features)
    && value.features.length <= 32
    && value.features.every((feature) => isBoundedString(feature, 80))
    && (!('textModel' in value) || value.textModel === undefined || isBoundedString(value.textModel, 256))
    && (!('imageModel' in value) || value.imageModel === undefined || isBoundedString(value.imageModel, 256));
}

function isValidAIResponse(value: unknown): value is AIResponse {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(['requestId', 'ok', 'data', 'error']))) return false;
  if (!isIdentifier(value.requestId) || typeof value.ok !== 'boolean' || !isWithinSerializedSize(value, 256 * 1024)) return false;
  if (!value.ok) {
    return isBoundedString(value.error, 1_000) && (!('data' in value) || value.data === undefined);
  }
  if ('error' in value && value.error !== undefined) return false;
  return isRecord(value.data)
    && hasOnlyKeys(value.data, new Set(['imageId', 'width', 'height']))
    && typeof value.data.imageId === 'string'
    && /^[a-f0-9]{64}$/i.test(value.data.imageId)
    && isPositiveInteger(value.data.width, MAX_IMAGE_DIMENSION)
    && isPositiveInteger(value.data.height, MAX_IMAGE_DIMENSION)
    && value.data.width * value.data.height <= MAX_IMAGE_PIXELS;
}

function isValidAIRequest(value: unknown): value is AIRequest {
  return isRecord(value)
    && hasOnlyKeys(value, new Set(['requestId', 'type', 'payload', 'fromPeerId']))
    && isIdentifier(value.requestId)
    && value.type === 'generate-image'
    && isRecord(value.payload)
    && hasOnlyKeys(value.payload, new Set(['prompt']))
    && isSafeText(value.payload.prompt, 2_000, 1)
    && isIdentifier(value.fromPeerId);
}

function playerIdentityStorageKey(roomId: string): string {
  return `lychgate:v3:player:${roomId}`;
}

function hostIdentityStorageKey(roomId: string): string {
  return `lychgate:v3:host-identities:${roomId}`;
}

function getOrCreatePlayerIdentity(roomId: string): PlayerResumeIdentity {
  try {
    const stored = JSON.parse(localStorage.getItem(playerIdentityStorageKey(roomId)) ?? 'null') as unknown;
    if (
      isRecord(stored)
      && isIdentifier(stored.id)
      && typeof stored.resumeToken === 'string'
      && /^[A-Za-z0-9_-]{32,128}$/.test(stored.resumeToken)
    ) return { id: stored.id, resumeToken: stored.resumeToken };
  } catch {
    // A fresh identity below is safer than trusting malformed storage.
  }
  const identity = {
    id: `p-${crypto.randomUUID()}`,
    resumeToken: `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`,
  };
  try {
    localStorage.setItem(playerIdentityStorageKey(roomId), JSON.stringify(identity));
  } catch {
    // Private browsing can disable storage; the identity still lasts for this session.
  }
  return identity;
}

function loadHostIdentityTokens(roomId: string): Map<string, string> {
  try {
    const stored = JSON.parse(localStorage.getItem(hostIdentityStorageKey(roomId)) ?? '{}') as unknown;
    if (!isRecord(stored)) return new Map();
    return new Map(Object.entries(stored).filter(([id, token]) => (
      isIdentifier(id) && typeof token === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(token)
    )).slice(0, MAX_PLAYERS) as Array<[string, string]>);
  } catch {
    return new Map();
  }
}

function persistHostIdentityTokens(roomId: string, identities: Map<string, string>): void {
  try {
    localStorage.setItem(hostIdentityStorageKey(roomId), JSON.stringify(Object.fromEntries(identities)));
  } catch {
    // The in-memory mapping remains authoritative for the active session.
  }
}

async function leaveRoomWithTimeout(room: Room, timeoutMs = 5_000): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      room.leave(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Timed out leaving the P2P room')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function imageTransferKey(peerId: string, metadata: ImageTransferMeta): string {
  return `${peerId}:${metadata.transferId}`;
}

function projectElementForPlayer(element: CanvasElement): CanvasElement {
  if (element.type === 'token' || element.type === 'image') {
    const { notes: _notes, ...projected } = element;
    return projected;
  }
  return element;
}

function projectSceneForPlayer(scene: Scene, playerId: string): Scene {
  return {
    ...scene,
    elements: scene.elements.filter((element) => (
      element.layer !== 'gm' && isVisibleToPlayer(element.visibleTo, playerId)
    )).map(projectElementForPlayer),
  };
}

function collectReferencedSheetIds(scene: Scene, sheets: Sheet[]): Set<string> {
  const authorized = new Set<string>();
  for (const element of scene.elements) {
    if (element.type === 'token' && element.sheetId) authorized.add(element.sheetId);
  }

  const byId = new Map(sheets.map((sheet) => [sheet.id, sheet]));
  const pending = [...authorized];
  while (pending.length > 0) {
    const sheet = byId.get(pending.pop()!);
    const parentId = sheet?.parentId;
    if (!parentId || authorized.has(parentId)) continue;
    authorized.add(parentId);
    pending.push(parentId);
  }
  return authorized;
}

function projectGameForPlayer(game: GameState, playerId: string): GameState {
  const activeScene = game.scenes.find((scene) => scene.id === game.activeSceneId);
  const projectedScene = activeScene ? projectSceneForPlayer(activeScene, playerId) : undefined;
  const sheets = game.sheets ?? [];
  const authorizedSheetIds = projectedScene
    ? collectReferencedSheetIds(projectedScene, sheets)
    : new Set<string>();
  const projectedCombatants = game.combat && projectedScene
    ? game.combat.combatants.filter((combatant) => projectedScene.elements.some((element) => (
        element.type === 'token' && element.id === combatant.id
      )))
    : [];
  const activeCombatantId = game.combat?.combatants[game.combat.currentTurn]?.id;
  const projectedTurn = activeCombatantId
    ? projectedCombatants.findIndex((combatant) => combatant.id === activeCombatantId)
    : -1;
  const visibleElementIds = new Set(projectedScene?.elements.map((element) => element.id) ?? []);
  return {
    id: game.id,
    name: game.name,
    roomId: game.roomId,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    scenes: projectedScene ? [projectedScene] : [],
    activeSceneId: game.activeSceneId,
    players: Object.fromEntries(Object.entries(game.players).map(([id, player]) => [id, {
      ...player,
      controlledTokens: player.controlledTokens.filter((tokenId) => visibleElementIds.has(tokenId)),
    }])),
    gmPeerId: game.gmPeerId,
    combat: game.combat ? {
      ...game.combat,
      combatants: projectedCombatants,
      currentTurn: projectedTurn >= 0 ? projectedTurn : 0,
    } : undefined,
    diceRolls: game.diceRolls,
    campaignNotes: game.campaignNotes?.filter((note) => isVisibleToPlayer(note.visibleTo, playerId)),
    chatMessages: game.chatMessages?.filter((message) => !message.isGMOnly || message.playerId === playerId),
    sheets: sheets.filter((sheet) => authorizedSheetIds.has(sheet.id)),
  };
}

function collectAuthorizedImageIds(game: GameState, playerId: string): Set<string> {
  const ids = new Set<string>();
  const projected = projectGameForPlayer(game, playerId);
  for (const scene of projected.scenes) {
    if (scene.backgroundImageId) ids.add(scene.backgroundImageId);
    for (const element of scene.elements) {
      if ('imageId' in element && element.imageId) ids.add(element.imageId);
    }
  }
  return ids;
}

function collectAuthorizedSheetIds(game: GameState, playerId: string): Set<string> {
  return new Set((projectGameForPlayer(game, playerId).sheets ?? []).map((sheet) => sheet.id));
}

function collectEditableSheetIds(game: GameState, playerId: string): Set<string> {
  const activeScene = game.scenes.find((scene) => scene.id === game.activeSceneId);
  if (!activeScene) return new Set();
  return new Set(activeScene.elements.filter((element) => (
    element.type === 'token'
    && element.sheetId
    && element.layer !== 'gm'
    && isVisibleToPlayer(element.visibleTo, playerId)
  )).map((element) => (element as Extract<CanvasElement, { type: 'token' }>).sheetId!));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      result[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

function hashGameState(game: GameState): string {
  const {
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    players,
    scenes,
    ...sharedDomains
  } = game;
  const state = canonicalize({
    ...sharedDomains,
    scenes: scenes.map(({ createdAt: _sceneCreatedAt, updatedAt: _sceneUpdatedAt, ...scene }) => scene),
    players: Object.fromEntries(Object.entries(players).map(([id, { cursor: _cursor, ...player }]) => [id, player])),
  });
  const stateString = JSON.stringify(state);
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < stateString.length; index += 1) {
    hash ^= BigInt(stateString.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

function asJsonValue(value: unknown): JsonValue {
  return value as JsonValue;
}

function sanitizeIncomingChat(raw: ChatMessage, player: Player): ChatMessage | null {
  const canonicalId = raw.id.startsWith(`${player.id}:`) ? raw.id : `${player.id}:${raw.id}`.slice(0, 160);
  const canonical: ChatMessage = {
    ...raw,
    id: canonicalId,
    playerId: player.id,
    playerName: player.name,
    playerColor: player.color,
    timestamp: Date.now(),
  };
  if (raw.type !== 'roll') return canonical;
  if (!raw.formula || !validateDiceFormula(raw.formula)) return null;
  const roll = executeDiceRoll(raw.formula);
  return {
    ...canonical,
    formula: roll.formula,
    result: roll.result,
    breakdown: roll.breakdown,
    content: '',
  };
}

export const networkTestApi = Object.freeze({
  isValidPoint,
  isValidCanvasElement,
  isValidGameState,
  isValidImageTransferMeta,
  imageTransferKey,
  projectGameForPlayer,
});

export function useRoom() {
  const roomRef = useRef<Room | null>(null);
  const presenceRoomRef = useRef<Room | null>(null);
  const sessionEpochRef = useRef(0);
  const teardownQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sessionAbortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const isHostRef = useRef(false);
  const currentRoomIdRef = useRef<string | null>(null);
  const myPlayerIdRef = useRef<string | null>(null);
  const hasInitialSyncRef = useRef(false);
  const actionsRef = useRef<ActiveActions>({});
  const presenceActionsRef = useRef<PresenceActions>({});
  const actionReceiversRef = useRef<Array<MessageAction<JsonValue> | MessageAction<BinaryPayload>>>([]);
  const gmPeerIdRef = useRef<string | null>(null);
  const peerRolesRef = useRef<Map<string, PeerRole>>(new Map());
  const peerPlayersRef = useRef<Map<string, Player>>(new Map());
  const peerPlayerIdsRef = useRef<Map<string, string>>(new Map());
  const activePeersRef = useRef<Set<string>>(new Set());
  const sendQueuesRef = useRef<Map<string, Promise<void>>>(new Map());
  const pendingProjectedSyncsRef = useRef<Map<string, PendingProjectedSync>>(new Map());
  const receivedTransfersRef = useRef<Set<string>>(new Set());
  const pendingAIRequestsRef = useRef<Map<string, PendingAIRequest>>(new Map());
  const inboundDebugHandlersRef = useRef<Map<string, DebugInboundHandler>>(new Map());
  const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoSyncAtRef = useRef(0);
  const lastFullSyncRequestAtRef = useRef(0);
  const lastPresenceAtRef = useRef<Map<string, number>>(new Map());
  const inboundRateBucketsRef = useRef<Map<string, RateLimitBucket>>(new Map());
  const playerCreatedElementsRef = useRef<Map<string, number>>(new Map());
  const syncsInFlightRef = useRef<Set<string>>(new Set());
  const imageRequestsInFlightRef = useRef<Set<string>>(new Set());
  const requestedImagesAtRef = useRef<Map<string, number>>(new Map());
  const elementAccessSignaturesRef = useRef<Map<string, string>>(new Map());
  const hostIdentityTokensRef = useRef<Map<string, string>>(new Map());
  const pendingIdentityTokensRef = useRef<Map<string, string>>(new Map());
  const lastCursorSentAtRef = useRef(0);
  const peerHandlerRegistrationCountRef = useRef(0);

  const [roomState, setRoomState] = useState<RoomState>({
    roomId: null,
    peers: [],
    isHost: false,
    connectionState: 'disconnected',
    error: null,
    lastSyncedAt: null,
    gmPeerId: null,
    gmDisconnected: false,
    localHash: null,
    gmHash: null,
    isDesynced: false,
  });

  const {
    loadGame,
    addOrUpdateElement,
    deleteElement,
    addPlayer,
    updatePlayer,
    setConnected,
    addChatMessage,
    addPing,
    updateGridSettings,
    switchScene,
    updateScene,
  } = useGameStore();

  const clearConnectionTimers = useCallback(() => {
    if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    connectionTimerRef.current = null;
    syncTimerRef.current = null;
  }, []);

  const rejectPendingAI = useCallback((reason: string) => {
    for (const pending of pendingAIRequestsRef.current.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    pendingAIRequestsRef.current.clear();
  }, []);

  const isCurrentSession = useCallback((epoch: number) => (
    mountedRef.current && sessionEpochRef.current === epoch
  ), []);

  const teardownTransport = useCallback(async (reason: string) => {
    const mainRoom = roomRef.current;
    const presenceRoom = presenceRoomRef.current;
    sessionAbortControllerRef.current?.abort(reason);
    sessionAbortControllerRef.current = null;
    roomRef.current = null;
    presenceRoomRef.current = null;

    if (mainRoom) {
      mainRoom.onPeerJoin = null;
      mainRoom.onPeerLeave = null;
    }
    if (presenceRoom) {
      presenceRoom.onPeerJoin = null;
      presenceRoom.onPeerLeave = null;
    }
    for (const action of actionReceiversRef.current) {
      action.onMessage = null;
      action.onReceiveProgress = null;
    }

    actionReceiversRef.current = [];
    actionsRef.current = {};
    presenceActionsRef.current = {};
    inboundDebugHandlersRef.current.clear();
    for (const pending of pendingProjectedSyncsRef.current.values()) {
      clearTimeout(pending.timer);
      pending.waiters.forEach(({ resolve }) => resolve());
    }
    pendingProjectedSyncsRef.current.clear();
    sendQueuesRef.current.clear();
    receivedTransfersRef.current.clear();
    activePeersRef.current.clear();
    peerRolesRef.current.clear();
    peerPlayersRef.current.clear();
    peerPlayerIdsRef.current.clear();
    pendingIdentityTokensRef.current.clear();
    hostIdentityTokensRef.current.clear();
    gmPeerIdRef.current = null;
    myPlayerIdRef.current = null;
    currentRoomIdRef.current = null;
    isHostRef.current = false;
    hasInitialSyncRef.current = false;
    lastAutoSyncAtRef.current = 0;
    lastFullSyncRequestAtRef.current = 0;
    lastPresenceAtRef.current.clear();
    inboundRateBucketsRef.current.clear();
    playerCreatedElementsRef.current.clear();
    syncsInFlightRef.current.clear();
    imageRequestsInFlightRef.current.clear();
    requestedImagesAtRef.current.clear();
    elementAccessSignaturesRef.current.clear();
    peerHandlerRegistrationCountRef.current = 0;
    clearConnectionTimers();
    rejectPendingAI(reason);
    setImageMissingCallback(null);
    useSheetStore.getState().setP2PHandlers(() => {}, () => {});
    setRequestAIFn(null);

    const leaveRooms = async () => {
      const results = await Promise.allSettled(
        [mainRoom, presenceRoom].filter((room): room is Room => Boolean(room)).map((room) => leaveRoomWithTimeout(room)),
      );
      for (const result of results) {
        if (result.status === 'rejected') console.warn('Failed to leave P2P room cleanly:', result.reason);
      }
    };

    const queued = teardownQueueRef.current.then(leaveRooms, leaveRooms);
    teardownQueueRef.current = queued.catch(() => {});
    await queued;
  }, [clearConnectionTimers, rejectPendingAI]);

  const createQueuedJsonSender = useCallback(<T,>(
    room: Room,
    action: MessageAction<JsonValue>,
    label: string,
    epoch: number,
    signal: AbortSignal,
  ): SafeSender<T> => async (data, target) => {
    if (!isCurrentSession(epoch)) return;
    const peers = target === undefined
      ? Object.keys(room.getPeers())
      : Array.isArray(target) ? target : [target];
    const uniquePeers = [...new Set(peers)].filter((peerId) => activePeersRef.current.has(peerId));
    const sends = uniquePeers.map((peerId) => {
      const queueKey = `${epoch}:${peerId}`;
      const previous = sendQueuesRef.current.get(queueKey) ?? Promise.resolve();
      const next = previous.catch(() => {}).then(async () => {
        if (!isCurrentSession(epoch) || !activePeersRef.current.has(peerId)) return;
        await action.send(asJsonValue(data), { target: peerId, signal });
      });
      sendQueuesRef.current.set(queueKey, next);
      void next.finally(() => {
        if (sendQueuesRef.current.get(queueKey) === next) sendQueuesRef.current.delete(queueKey);
      }).catch(() => {});
      return next;
    });
    const results = await Promise.allSettled(sends);
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failure) throw new Error(`${label} failed: ${failure.reason instanceof Error ? failure.reason.message : String(failure.reason)}`);
  }, [isCurrentSession]);

  const createQueuedImageSender = useCallback((
    room: Room,
    action: MessageAction<BinaryPayload>,
    epoch: number,
    signal: AbortSignal,
  ): SafeImageSender => async (data, metadata, target) => {
    if (!isCurrentSession(epoch) || !isValidImageTransferMeta(metadata)) return;
    const peers = target === undefined
      ? Object.keys(room.getPeers())
      : Array.isArray(target) ? target : [target];
    const uniquePeers = [...new Set(peers)].filter((peerId) => activePeersRef.current.has(peerId));
    const sends = uniquePeers.map((peerId) => {
      const queueKey = `${epoch}:${peerId}`;
      const previous = sendQueuesRef.current.get(queueKey) ?? Promise.resolve();
      const next = previous.catch(() => {}).then(async () => {
        if (!isCurrentSession(epoch) || !activePeersRef.current.has(peerId)) return;
        await action.send(data, { target: peerId, metadata: asJsonValue(metadata), signal });
      });
      sendQueuesRef.current.set(queueKey, next);
      void next.finally(() => {
        if (sendQueuesRef.current.get(queueKey) === next) sendQueuesRef.current.delete(queueKey);
      }).catch(() => {});
      return next;
    });
    const results = await Promise.allSettled(sends);
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failure) throw new Error(`image transfer failed: ${failure.reason instanceof Error ? failure.reason.message : String(failure.reason)}`);
  }, [isCurrentSession]);

  const ignoreSendFailure = useCallback((promise: Promise<void>, label: string) => {
    void promise.catch((error) => console.warn(`${label}:`, error));
  }, []);

  const ensureHostPlayers = useCallback(() => {
    const game = useGameStore.getState().game;
    if (!game || !isHostRef.current) return;
    for (const peerId of activePeersRef.current) {
      if (peerRolesRef.current.get(peerId) !== 'player') continue;
      const player = peerPlayersRef.current.get(peerId);
      if (!player) continue;
      const existing = useGameStore.getState().game?.players[player.id];
      if (!existing) addPlayer(player);
      else updatePlayer(player.id, { name: player.name, color: player.color, isGM: false });
    }
  }, [addPlayer, updatePlayer]);

  const sendProjectedSyncToPeer = useCallback((peerId: string): Promise<void> => {
    if (!isHostRef.current || peerRolesRef.current.get(peerId) !== 'player') return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const existing = pendingProjectedSyncsRef.current.get(peerId);
      if (existing) clearTimeout(existing.timer);
      const waiters = existing?.waiters ?? [];
      waiters.push({ resolve, reject });

      const pending: PendingProjectedSync = {
        waiters,
        timer: setTimeout(() => {
          if (pendingProjectedSyncsRef.current.get(peerId) !== pending) return;
          pendingProjectedSyncsRef.current.delete(peerId);
          void (async () => {
            try {
              if (!isHostRef.current || peerRolesRef.current.get(peerId) !== 'player') {
                pending.waiters.forEach((waiter) => waiter.resolve());
                return;
              }

              // Build at flush time: callers in a burst share one current
              // snapshot instead of queueing stale copies on another channel.
              ensureHostPlayers();
              const game = useGameStore.getState().game;
              const playerId = peerPlayerIdsRef.current.get(peerId);
              const sendSync = actionsRef.current.sendSync;
              if (!game || !playerId || !sendSync) {
                pending.waiters.forEach((waiter) => waiter.resolve());
                return;
              }
              const payload = projectGameForPlayer({
                ...game,
                sheets: useSheetStore.getState().sheets,
              }, playerId);
              const activeScene = game.scenes.find((scene) => scene.id === game.activeSceneId);
              for (const element of activeScene?.elements ?? []) {
                elementAccessSignaturesRef.current.set(element.id, JSON.stringify({
                  type: element.type,
                  layer: element.layer,
                  visibleTo: element.visibleTo,
                  sheetId: element.type === 'token' ? element.sheetId ?? null : null,
                }));
              }
              await sendSync(payload, peerId);
              pending.waiters.forEach((waiter) => waiter.resolve());
            } catch (error) {
              const failure = error instanceof Error ? error : new Error(String(error));
              pending.waiters.forEach((waiter) => waiter.reject(failure));
            }
          })();
        }, PROJECTED_SYNC_COALESCE_MS),
      };
      pendingProjectedSyncsRef.current.set(peerId, pending);
    });
  }, [ensureHostPlayers]);

  const sendProjectedSyncToAll = useCallback(async () => {
    const peers = [...activePeersRef.current].filter((peerId) => peerRolesRef.current.get(peerId) === 'player');
    const results = await Promise.allSettled(peers.map(sendProjectedSyncToPeer));
    for (const result of results) {
      if (result.status === 'rejected') console.warn('Failed to sync peer:', result.reason);
    }
  }, [sendProjectedSyncToPeer]);

  const sendStoredImage = useCallback(async (imageId: string, target: PeerTarget): Promise<boolean> => {
    const sendImage = actionsRef.current.sendImgData;
    if (!sendImage || !/^[a-f0-9]{64}$/i.test(imageId)) return false;
    const image = await useImageStore.getState().getImage(imageId);
    if (!image || image.sizeBytes <= 0 || image.sizeBytes > P2P_IMAGE_MAX_SIZE) return false;
    const metadata: ImageTransferMeta = {
      transferId: crypto.randomUUID(),
      imageId: image.id,
      mime: image.mimeType,
      width: image.width,
      height: image.height,
      size: image.sizeBytes,
    };
    if (!isValidImageTransferMeta(metadata)) return false;
    const buffer = await image.blob.arrayBuffer();
    if (buffer.byteLength !== metadata.size) return false;
    await sendImage(buffer, metadata, target);
    return true;
  }, []);

  const armSyncTimeout = useCallback((epoch: number) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (!isCurrentSession(epoch) || hasInitialSyncRef.current) return;
      setRoomState((previous) => ({
        ...previous,
        connectionState: 'error',
        error: 'Connected to the room, but the GM did not provide game state. Ask the GM to start the game, then retry sync.',
      }));
    }, SYNC_TIMEOUT_MS);
  }, [isCurrentSession]);

  const setupPresenceHandlers = useCallback((room: Room, epoch: number) => {
    const sessionSignal = sessionAbortControllerRef.current?.signal;
    if (!sessionSignal) return;
    const cursor = room.makeAction<JsonValue>('cursor');
    const ping = room.makeAction<JsonValue>('ping');
    actionReceiversRef.current.push(cursor, ping);

    presenceActionsRef.current = {
      sendCursor: async (position) => {
        const targets = [...activePeersRef.current].filter((peerId) => peerRolesRef.current.has(peerId));
        if (targets.length > 0) await cursor.send(asJsonValue(position), { target: targets, signal: sessionSignal });
      },
      sendPing: async (data) => {
        const targets = [...activePeersRef.current].filter((peerId) => peerRolesRef.current.has(peerId));
        if (targets.length > 0) await ping.send(asJsonValue(data), { target: targets, signal: sessionSignal });
      },
    };

    cursor.onMessage = (raw, { peerId }) => {
      if (!isCurrentSession(epoch) || !activePeersRef.current.has(peerId) || !isValidPoint(raw)) return;
      const playerId = peerPlayerIdsRef.current.get(peerId);
      if (!playerId) return;
      const now = Date.now();
      const rateKey = `${peerId}:cursor`;
      if (now - (lastPresenceAtRef.current.get(rateKey) ?? 0) < 25) return;
      lastPresenceAtRef.current.set(rateKey, now);
      updatePlayer(playerId, { cursor: raw });
    };

    ping.onMessage = (raw, { peerId }) => {
      if (!isCurrentSession(epoch) || !activePeersRef.current.has(peerId) || !isRecord(raw)) return;
      if (!isValidPoint(raw.position) || !isValidColor(raw.color)) return;
      const playerId = peerPlayerIdsRef.current.get(peerId);
      if (!playerId) return;
      const now = Date.now();
      const rateKey = `${peerId}:ping`;
      if (now - (lastPresenceAtRef.current.get(rateKey) ?? 0) < 500) return;
      lastPresenceAtRef.current.set(rateKey, now);
      addPing(raw.position.x, raw.position.y, raw.color);
    };
  }, [addPing, isCurrentSession, updatePlayer]);

  const setupRoomHandlers = useCallback((room: Room, isHost: boolean, epoch: number) => {
    const sessionSignal = sessionAbortControllerRef.current?.signal;
    if (!sessionSignal) return;
    const sync = room.makeAction<JsonValue>('sync');
    const elementUpdate = room.makeAction<JsonValue>('elUpdate');
    const elementDelete = room.makeAction<JsonValue>('elDelete');
    const requestSync = room.makeAction<JsonValue>('reqSync');
    const fogUpdate = room.makeAction<JsonValue>('fogUpdate');
    const stateHash = room.makeAction<JsonValue>('stateHash');
    const gridUpdate = room.makeAction<JsonValue>('gridUpd');
    const chat = room.makeAction<JsonValue>('chat');
    const sceneSwitch = room.makeAction<JsonValue>('sceneSwi');
    const sceneUpdate = room.makeAction<JsonValue>('sceneUpd');
    const sheetUpdate = room.makeAction<JsonValue>('sheetUpd');
    const sheetDelete = room.makeAction<JsonValue>('sheetDel');
    const aiRequest = room.makeAction<JsonValue>('aiReq');
    const aiResponse = room.makeAction<JsonValue>('aiRes');
    const aiCapabilities = room.makeAction<JsonValue>('aiCaps');
    const imageRequest = room.makeAction<JsonValue>('imgReq');
    const imageData = room.makeAction<BinaryPayload>('imgData');
    const jsonActions = [
      sync, elementUpdate, elementDelete, requestSync, fogUpdate, stateHash,
      gridUpdate, chat, sceneSwitch, sceneUpdate, sheetUpdate, sheetDelete,
      aiRequest, aiResponse, aiCapabilities, imageRequest,
    ];
    actionReceiversRef.current.push(...jsonActions, imageData);

    actionsRef.current = {
      sendSync: createQueuedJsonSender<GameState>(room, sync, 'sync', epoch, sessionSignal),
      sendElementUpdate: createQueuedJsonSender<CanvasElement>(room, elementUpdate, 'element update', epoch, sessionSignal),
      sendElementDelete: createQueuedJsonSender<string>(room, elementDelete, 'element delete', epoch, sessionSignal),
      sendRequestSync: createQueuedJsonSender<null>(room, requestSync, 'sync request', epoch, sessionSignal),
      sendFogUpdate: createQueuedJsonSender<{ enabled: boolean; revealed: Point[][] }>(room, fogUpdate, 'fog update', epoch, sessionSignal),
      sendStateHash: createQueuedJsonSender<string>(room, stateHash, 'state hash', epoch, sessionSignal),
      sendGridUpdate: createQueuedJsonSender<Partial<GridSettings>>(room, gridUpdate, 'grid update', epoch, sessionSignal),
      sendChat: createQueuedJsonSender<ChatMessage>(room, chat, 'chat', epoch, sessionSignal),
      sendSceneSwitch: createQueuedJsonSender<string>(room, sceneSwitch, 'scene switch', epoch, sessionSignal),
      sendSceneUpdate: createQueuedJsonSender<Scene>(room, sceneUpdate, 'scene update', epoch, sessionSignal),
      sendSheetUpdate: createQueuedJsonSender<Sheet>(room, sheetUpdate, 'sheet update', epoch, sessionSignal),
      sendSheetDelete: createQueuedJsonSender<string>(room, sheetDelete, 'sheet delete', epoch, sessionSignal),
      sendAIReq: createQueuedJsonSender<AIRequest>(room, aiRequest, 'AI request', epoch, sessionSignal),
      sendAIRes: createQueuedJsonSender<AIResponse>(room, aiResponse, 'AI response', epoch, sessionSignal),
      sendAICap: createQueuedJsonSender<AICapabilities>(room, aiCapabilities, 'AI capabilities', epoch, sessionSignal),
      sendImgReq: createQueuedJsonSender<string>(room, imageRequest, 'image request', epoch, sessionSignal),
      sendImgData: createQueuedImageSender(room, imageData, epoch, sessionSignal),
    };

    const trustedGM = (peerId: string) => !isHost && gmPeerIdRef.current === peerId;
    const mappedPlayer = (peerId: string) => (
      isHost
      && activePeersRef.current.has(peerId)
      && peerRolesRef.current.get(peerId) === 'player'
      && peerPlayersRef.current.has(peerId)
    );
    const playerPeers = () => [...activePeersRef.current].filter((peerId) => peerRolesRef.current.get(peerId) === 'player');

    const consumeRateLimit = (key: string, config: RateLimitConfig, now: number): boolean => {
      const previous = inboundRateBucketsRef.current.get(key);
      const elapsedSeconds = previous ? Math.max(0, now - previous.updatedAt) / 1_000 : 0;
      const tokens = previous
        ? Math.min(config.capacity, previous.tokens + elapsedSeconds * config.refillPerSecond)
        : config.capacity;
      if (tokens < 1) {
        inboundRateBucketsRef.current.set(key, { tokens, updatedAt: now });
        return false;
      }
      inboundRateBucketsRef.current.set(key, { tokens: tokens - 1, updatedAt: now });
      return true;
    };

    const allowInbound = (peerId: string, actionName: string): boolean => {
      const now = Date.now();
      if (!consumeRateLimit(`${epoch}:${peerId}:*`, GLOBAL_INBOUND_RATE_LIMIT, now)) return false;
      // Full snapshots are authoritative host traffic. They legitimately occur
      // during initial sync, scene switches, and ACL reconciliation; applying
      // the hostile-peer limit here can drop the newest canonical snapshot.
      const trustedHostSync = actionName === 'sync'
        && !isHost
        && gmPeerIdRef.current === peerId
        && peerRolesRef.current.get(peerId) === 'host';
      const config = trustedHostSync
        ? TRUSTED_SYNC_INBOUND_RATE_LIMIT
        : INBOUND_RATE_LIMITS[actionName] ?? DEFAULT_INBOUND_RATE_LIMIT;
      return consumeRateLimit(`${epoch}:${peerId}:${actionName}`, config, now);
    };

    const bindJson = (
      name: string,
      action: MessageAction<JsonValue>,
      handler: (raw: unknown, context: MessageContext) => void | Promise<void>,
    ) => {
      const bound = (raw: JsonValue, context: MessageContext) => {
        if (!isCurrentSession(epoch) || !allowInbound(context.peerId, name)) return;
        try {
          const result = handler(raw, context);
          if (result instanceof Promise) {
            return result.catch((error) => console.warn(`Rejected ${name} message:`, error));
          }
          return result;
        } catch (error) {
          console.warn(`Rejected ${name} message:`, error);
        }
      };
      action.onMessage = bound;
      inboundDebugHandlersRef.current.set(name, (raw, peerId, metadata) => bound(asJsonValue(raw), {
        peerId,
        metadata: metadata === undefined ? undefined : asJsonValue(metadata),
      }));
    };

    const relayElementToAuthorizedPeers = (element: CanvasElement) => {
      const sender = actionsRef.current.sendElementUpdate;
      if (!sender) return;
      for (const targetPeerId of playerPeers()) {
        const playerId = peerPlayerIdsRef.current.get(targetPeerId);
        if (!playerId || element.layer === 'gm' || !isVisibleToPlayer(element.visibleTo, playerId)) continue;
        ignoreSendFailure(sender(projectElementForPlayer(element), targetPeerId), 'Failed to relay element update');
        if (element.type === 'token' && element.sheetId) {
          const game = useGameStore.getState().game;
          const sheetSender = actionsRef.current.sendSheetUpdate;
          if (game && sheetSender) {
            const projectedSheets = projectGameForPlayer({ ...game, sheets: useSheetStore.getState().sheets }, playerId).sheets ?? [];
            for (const sheet of projectedSheets) {
              ignoreSendFailure(sheetSender(sheet, targetPeerId), 'Failed to send linked sheet');
            }
          }
        }
      }
    };

    const findCurrentElement = (elementId: string): CanvasElement | undefined => {
      const game = useGameStore.getState().game;
      const scene = game?.scenes.find((candidate) => candidate.id === game.activeSceneId);
      return scene?.elements.find((element) => element.id === elementId);
    };

    const isPublicUnlockedElement = (element: CanvasElement) => (
      !element.locked
      && element.layer !== 'gm'
      && element.visibleTo === 'all'
    );

    const canonicalizePlayerElementUpdate = (peerId: string, incoming: CanvasElement): CanvasElement | null => {
      if (!mappedPlayer(peerId) || !isPublicUnlockedElement(incoming)) return null;
      const playerId = peerPlayerIdsRef.current.get(peerId);
      const game = useGameStore.getState().game;
      const existing = findCurrentElement(incoming.id);
      if (!playerId || !game) return null;
      if (!existing) {
        if (game.scenes.some((scene) => scene.elements.some((element) => element.id === incoming.id))) return null;
        const activeScene = game.scenes.find((scene) => scene.id === game.activeSceneId);
        if (!activeScene || activeScene.elements.length >= MAX_ELEMENTS_PER_SCENE) return null;
        const creationCount = playerCreatedElementsRef.current.get(playerId) ?? 0;
        if (creationCount >= 250 || incoming.layer !== 'drawing' || (incoming.type !== 'shape' && incoming.type !== 'text')) return null;
        playerCreatedElementsRef.current.set(playerId, creationCount + 1);
        return { ...incoming, version: 1 };
      }
      if (!isPublicUnlockedElement(existing)) return null;
      if (
        existing.type !== incoming.type
        || existing.layer !== incoming.layer
        || existing.locked !== incoming.locked
        || JSON.stringify(existing.visibleTo) !== JSON.stringify(incoming.visibleTo)
      ) return null;
      const nextVersion = (existing.version ?? 0) + 1;
      if (!isValidVersion(nextVersion)) return null;
      if (existing.type === 'token') {
        if (incoming.type !== 'token') return null;
        const explicitControllers = Object.values(game.players)
          .filter((player) => player.controlledTokens.includes(existing.id))
          .map((player) => player.id);
        if (existing.controlledBy && existing.controlledBy !== playerId) return null;
        if (!existing.controlledBy && explicitControllers.length > 0 && !explicitControllers.includes(playerId)) return null;
        return {
          ...existing,
          x: incoming.x,
          y: incoming.y,
          rotation: incoming.rotation,
          version: nextVersion,
        };
      }
      if (existing.type === 'shape' && incoming.type === 'shape' && existing.layer === 'drawing') {
        return {
          ...existing,
          x: incoming.x,
          y: incoming.y,
          rotation: incoming.rotation,
          points: incoming.points,
          width: incoming.width,
          height: incoming.height,
          style: incoming.style,
          version: nextVersion,
        };
      }
      if (existing.type === 'text' && incoming.type === 'text' && existing.layer === 'drawing') {
        return {
          ...existing,
          x: incoming.x,
          y: incoming.y,
          rotation: incoming.rotation,
          content: incoming.content,
          width: incoming.width,
          height: incoming.height,
          style: incoming.style,
          version: nextVersion,
        };
      }
      return null;
    };

    const canPlayerDeleteElement = (peerId: string, elementId: string): boolean => {
      if (!mappedPlayer(peerId)) return false;
      const existing = findCurrentElement(elementId);
      return Boolean(
        existing
        && isPublicUnlockedElement(existing)
        && existing.layer === 'drawing'
        && (existing.type === 'shape' || existing.type === 'text')
      );
    };

    const correctElementForPeer = (peerId: string, elementId: string) => {
      const current = findCurrentElement(elementId);
      const playerId = peerPlayerIdsRef.current.get(peerId);
      if (current && playerId && current.layer !== 'gm' && isVisibleToPlayer(current.visibleTo, playerId)) {
        const sender = actionsRef.current.sendElementUpdate;
        if (sender) ignoreSendFailure(sender(projectElementForPlayer(current), peerId), 'Failed to correct rejected element');
      } else {
        const sender = actionsRef.current.sendElementDelete;
        if (sender) ignoreSendFailure(sender(elementId, peerId), 'Failed to remove rejected element');
      }
    };

    const applyAuthoritativeElement = (element: CanvasElement) => {
      useGameStore.setState((state) => {
        const game = state.game;
        if (!game) return state;
        const now = new Date().toISOString();
        return {
          game: {
            ...game,
            scenes: game.scenes.map((scene) => {
              if (scene.id !== game.activeSceneId) return scene;
              const exists = scene.elements.some((candidate) => candidate.id === element.id);
              return {
                ...scene,
                elements: exists
                  ? scene.elements.map((candidate) => candidate.id === element.id ? element : candidate)
                  : [...scene.elements, element],
                updatedAt: now,
              };
            }),
            updatedAt: now,
          },
        };
      });
    };

    const peerJoinHandler = (peerId: string) => {
      if (!isCurrentSession(epoch) || !peerRolesRef.current.has(peerId) || activePeersRef.current.has(peerId)) return;
      const role = peerRolesRef.current.get(peerId);
      if (isHost && role === 'player') {
        const playerId = peerPlayerIdsRef.current.get(peerId);
        const resumeToken = pendingIdentityTokensRef.current.get(peerId);
        if (!playerId || !resumeToken) return;
        hostIdentityTokensRef.current.set(playerId, resumeToken);
        persistHostIdentityTokens(currentRoomIdRef.current!, hostIdentityTokensRef.current);
        pendingIdentityTokensRef.current.delete(peerId);
      }
      activePeersRef.current.add(peerId);
      setRoomState((previous) => ({
        ...previous,
        peers: previous.peers.includes(peerId) ? previous.peers : [...previous.peers, peerId],
      }));

      if (isHost && role === 'player') {
        const player = peerPlayersRef.current.get(peerId);
        if (player) {
          peerPlayerIdsRef.current.set(peerId, player.id);
          const existing = useGameStore.getState().game?.players[player.id];
          if (existing) updatePlayer(player.id, { name: player.name, color: player.color, isGM: false, cursor: undefined });
          else if (useGameStore.getState().game) addPlayer(player);
          notifications.show({
            title: 'Player Joined',
            message: `${player.name} has joined the game`,
            color: 'green',
            autoClose: 4000,
          });
        }
        ignoreSendFailure(sendProjectedSyncToPeer(peerId), 'Failed to send initial sync');
        const capabilities = useAIStore.getState().getCapabilities();
        if (capabilities.hasAI && actionsRef.current.sendAICap) {
          ignoreSendFailure(actionsRef.current.sendAICap(capabilities, peerId), 'Failed to send AI capabilities');
        }
      } else if (!isHost && role === 'host' && gmPeerIdRef.current === peerId) {
        hasInitialSyncRef.current = false;
        setRoomState((previous) => ({
          ...previous,
          gmPeerId: peerId,
          gmDisconnected: false,
          connectionState: 'syncing',
          error: null,
        }));
        armSyncTimeout(epoch);
        const sender = actionsRef.current.sendRequestSync;
        if (sender) ignoreSendFailure(sender(null, peerId), 'Failed to request initial sync');
      }
    };

    const peerLeaveHandler = (peerId: string) => {
      if (!isCurrentSession(epoch) || !activePeersRef.current.has(peerId)) return;
      activePeersRef.current.delete(peerId);
      const role = peerRolesRef.current.get(peerId);
      const player = peerPlayersRef.current.get(peerId);
      const playerId = peerPlayerIdsRef.current.get(peerId);
      peerRolesRef.current.delete(peerId);
      peerPlayersRef.current.delete(peerId);
      peerPlayerIdsRef.current.delete(peerId);
      pendingIdentityTokensRef.current.delete(peerId);
      syncsInFlightRef.current.delete(peerId);
      for (const key of inboundRateBucketsRef.current.keys()) {
        if (key.startsWith(`${epoch}:${peerId}:`)) inboundRateBucketsRef.current.delete(key);
      }
      setRoomState((previous) => ({
        ...previous,
        peers: previous.peers.filter((id) => id !== peerId),
      }));

      if (isHost && role === 'player' && playerId) {
        const stillConnected = [...peerPlayerIdsRef.current.values()].includes(playerId);
        if (!stillConnected) updatePlayer(playerId, { cursor: undefined });
        notifications.show({
          title: 'Player Left',
          message: `${player?.name ?? 'A player'} has left the game`,
          color: 'orange',
          autoClose: 4000,
        });
        ignoreSendFailure(sendProjectedSyncToAll(), 'Failed to sync after player left');
      } else if (!isHost && gmPeerIdRef.current === peerId) {
        gmPeerIdRef.current = null;
        hasInitialSyncRef.current = false;
        rejectPendingAI('The GM disconnected');
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
        setRoomState((previous) => ({
          ...previous,
          gmPeerId: null,
          gmDisconnected: true,
          connectionState: 'error',
          error: 'The GM disconnected. Wait for them to reconnect or leave the session.',
        }));
        notifications.show({
          title: 'GM Disconnected',
          message: 'The GM has left the game. The session is paused.',
          color: 'red',
          autoClose: false,
        });
      } else if (!isHost && playerId) {
        updatePlayer(playerId, { cursor: undefined });
      }
    };

    room.onPeerJoin = peerJoinHandler;
    room.onPeerLeave = peerLeaveHandler;
    peerHandlerRegistrationCountRef.current += 1;

    if (import.meta.env.DEV) {
      const testWindow = window as unknown as Record<string, unknown>;
      testWindow.__testTriggerPeerJoin = peerJoinHandler;
      testWindow.__testTriggerPlayerPeerJoin = peerJoinHandler;
      testWindow.__testTriggerPeerLeave = peerLeaveHandler;
    }

    bindJson('sync', sync, (raw, { peerId }) => {
      if (
        isHost
        || !trustedGM(peerId)
        || !isValidGameState(raw)
        || raw.roomId !== currentRoomIdRef.current
      ) return;
      hasInitialSyncRef.current = true;
      clearConnectionTimers();
      loadGame(raw);
      useSheetStore.getState().setSheets(raw.sheets ?? []);
      if (raw.gmPeerId) peerPlayerIdsRef.current.set(peerId, raw.gmPeerId);
      const myPlayerId = myPlayerIdRef.current;
      if (myPlayerId) setConnected(true, myPlayerId);
      setRoomState((previous) => ({
        ...previous,
        lastSyncedAt: Date.now(),
        gmPeerId: peerId,
        gmDisconnected: false,
        connectionState: 'connected',
        error: null,
        isDesynced: false,
      }));
    });

    bindJson('elUpdate', elementUpdate, (raw, { peerId }) => {
      if (!isValidCanvasElement(raw)) return;
      if (isHost) {
        const canonical = canonicalizePlayerElementUpdate(peerId, raw);
        if (!canonical) {
          if (mappedPlayer(peerId)) correctElementForPeer(peerId, raw.id);
          return;
        }
        addOrUpdateElement(canonical, true);
        const accepted = findCurrentElement(canonical.id);
        if (!accepted || accepted.version !== canonical.version) {
          correctElementForPeer(peerId, canonical.id);
          return;
        }
        relayElementToAuthorizedPeers(accepted);
      } else {
        if (!trustedGM(peerId)) return;
        applyAuthoritativeElement(raw);
      }
    });

    bindJson('elDelete', elementDelete, (raw, { peerId }) => {
      if (!isIdentifier(raw)) return;
      if (isHost) {
        if (!canPlayerDeleteElement(peerId, raw)) {
          if (mappedPlayer(peerId)) correctElementForPeer(peerId, raw);
          return;
        }
        deleteElement(raw, true);
        if (findCurrentElement(raw)) {
          correctElementForPeer(peerId, raw);
          return;
        }
        if (actionsRef.current.sendElementDelete) {
          ignoreSendFailure(actionsRef.current.sendElementDelete(raw, playerPeers()), 'Failed to relay element deletion');
        }
      } else {
        if (!trustedGM(peerId)) return;
        deleteElement(raw, true);
      }
    });

    bindJson('reqSync', requestSync, (raw, { peerId }) => {
      if (raw !== null || !mappedPlayer(peerId)) return;
      if (syncsInFlightRef.current.has(peerId)) return;
      syncsInFlightRef.current.add(peerId);
      void sendProjectedSyncToPeer(peerId)
        .catch((error) => console.warn('Failed to answer sync request:', error))
        .finally(() => syncsInFlightRef.current.delete(peerId));
    });

    bindJson('fogUpdate', fogUpdate, (raw, { peerId }) => {
      if (isHost || !trustedGM(peerId) || !isValidFog(raw)) return;
      const game = useGameStore.getState().game;
      if (!game) return;
      useGameStore.setState({
        game: {
          ...game,
          scenes: game.scenes.map((scene) => scene.id === game.activeSceneId ? {
            ...scene,
            fogOfWar: raw,
            updatedAt: new Date().toISOString(),
          } : scene),
          updatedAt: new Date().toISOString(),
        },
      });
    });

    bindJson('chat', chat, (raw, { peerId }) => {
      if (!isValidChat(raw)) return;
      let accepted: ChatMessage | null = raw;
      if (isHost) {
        if (!mappedPlayer(peerId)) return;
        const player = peerPlayersRef.current.get(peerId);
        if (!player) return;
        accepted = sanitizeIncomingChat(raw, player);
      } else if (!trustedGM(peerId)) return;
      if (!accepted) return;

      if (isHost) {
        if (!useGameStore.getState().hasChatMessage(accepted.id)) addChatMessage(accepted);
      } else {
        useGameStore.setState((state) => {
          if (!state.game) return state;
          const messages = state.game.chatMessages ?? [];
          const nextMessages = messages.some((message) => message.id === accepted!.id)
            ? messages.map((message) => message.id === accepted!.id ? accepted! : message)
            : [...messages, accepted!];
          return { game: { ...state.game, chatMessages: nextMessages.slice(-1_000) } };
        });
      }
      if (accepted.type === 'roll') {
        notifications.show({
          title: 'Dice Roll',
          message: `${accepted.playerName} rolled ${accepted.formula}: ${accepted.result}`,
          color: 'violet',
          autoClose: 4000,
        });
      }
      if (isHost && actionsRef.current.sendChat) {
        const targets = accepted.isGMOnly ? [peerId] : playerPeers();
        ignoreSendFailure(actionsRef.current.sendChat(accepted, targets), 'Failed to relay canonical chat');
      }
    });

    let consecutiveMismatches = 0;
    bindJson('stateHash', stateHash, (raw, { peerId }) => {
      if (isHost || !trustedGM(peerId) || typeof raw !== 'string' || !/^[a-f0-9]{16}$/i.test(raw)) return;
      const game = useGameStore.getState().game;
      if (!game) return;
      const localHash = hashGameState({ ...game, sheets: useSheetStore.getState().sheets });
      if (localHash === raw) consecutiveMismatches = 0;
      else consecutiveMismatches += 1;
      const isDesynced = consecutiveMismatches >= 2;
      if (isDesynced && Date.now() - lastAutoSyncAtRef.current >= AUTO_RESYNC_COOLDOWN_MS) {
        lastAutoSyncAtRef.current = Date.now();
        const sender = actionsRef.current.sendRequestSync;
        if (sender) ignoreSendFailure(sender(null, peerId), 'Failed to request recovery sync');
      }
      setRoomState((previous) => ({
        ...previous,
        localHash,
        gmHash: raw,
        isDesynced,
        connectionState: isDesynced ? 'syncing' : previous.connectionState,
      }));
    });

    bindJson('gridUpd', gridUpdate, (raw, { peerId }) => {
      if (isHost || !trustedGM(peerId) || !isValidGridSettings(raw, true)) return;
      updateGridSettings(raw);
    });

    bindJson('sceneSwi', sceneSwitch, (raw, { peerId }) => {
      if (isHost || !trustedGM(peerId) || !isIdentifier(raw)) return;
      const game = useGameStore.getState().game;
      if (!game?.scenes.some((scene) => scene.id === raw)) return;
      switchScene(raw);
    });

    bindJson('sceneUpd', sceneUpdate, (raw, { peerId }) => {
      if (isHost || !trustedGM(peerId) || !isValidScene(raw)) return;
      const game = useGameStore.getState().game;
      if (!game) return;
      if (raw.id === game.activeSceneId && game.scenes.some((scene) => scene.id === raw.id)) updateScene(raw.id, raw);
    });

    bindJson('sheetUpd', sheetUpdate, (raw, { peerId }) => {
      if (!isValidSheet(raw)) return;
      if (isHost) {
        if (!mappedPlayer(peerId)) return;
        const game = useGameStore.getState().game;
        const playerId = peerPlayerIdsRef.current.get(peerId);
        const existing = useSheetStore.getState().sheets.find((sheet) => sheet.id === raw.id);
        const sender = actionsRef.current.sendSheetUpdate;
        const authorized = Boolean(game && playerId && collectAuthorizedSheetIds({ ...game, sheets: useSheetStore.getState().sheets }, playerId).has(raw.id));
        if (!game || !playerId || !existing || !collectEditableSheetIds(game, playerId).has(raw.id)) {
          if (authorized && existing && sender) ignoreSendFailure(sender(existing, peerId), 'Failed to correct rejected sheet');
          return;
        }
        const nextVersion = (existing.version ?? 0) + 1;
        if (!isValidVersion(nextVersion)) {
          if (sender) ignoreSendFailure(sender(existing, peerId), 'Failed to correct exhausted sheet version');
          return;
        }
        const canonical: Sheet = {
          ...existing,
          name: raw.name,
          content: raw.content,
          shadowState: raw.shadowState,
          projections: raw.projections,
          category: raw.category,
          tags: raw.tags,
          version: nextVersion,
          updatedAt: new Date().toISOString(),
        };
        handleIncomingSheetUpdate(canonical);
        const accepted = useSheetStore.getState().sheets.find((sheet) => sheet.id === canonical.id);
        if (!accepted || accepted.version !== canonical.version || !sender) return;
        for (const targetPeerId of playerPeers()) {
          const targetPlayerId = peerPlayerIdsRef.current.get(targetPeerId);
          const currentGame = useGameStore.getState().game;
          if (targetPlayerId && currentGame && collectAuthorizedSheetIds({ ...currentGame, sheets: useSheetStore.getState().sheets }, targetPlayerId).has(accepted.id)) {
            ignoreSendFailure(sender(accepted, targetPeerId), 'Failed to relay canonical sheet');
          }
        }
      } else {
        if (!trustedGM(peerId)) return;
        useSheetStore.setState((state) => ({
          sheets: state.sheets.some((sheet) => sheet.id === raw.id)
            ? state.sheets.map((sheet) => sheet.id === raw.id ? raw : sheet)
            : [...state.sheets, raw],
        }));
      }
    });

    bindJson('sheetDel', sheetDelete, (raw, { peerId }) => {
      if (!isIdentifier(raw)) return;
      if (isHost) {
        if (!mappedPlayer(peerId)) return;
        const game = useGameStore.getState().game;
        const playerId = peerPlayerIdsRef.current.get(peerId);
        if (!game || !playerId || !collectEditableSheetIds(game, playerId).has(raw)) return;
        const recipients = playerPeers().filter((targetPeerId) => {
          const targetPlayerId = peerPlayerIdsRef.current.get(targetPeerId);
          return Boolean(targetPlayerId && collectAuthorizedSheetIds({ ...game, sheets: useSheetStore.getState().sheets }, targetPlayerId).has(raw));
        });
        handleIncomingSheetDelete(raw);
        if (actionsRef.current.sendSheetDelete) {
          ignoreSendFailure(actionsRef.current.sendSheetDelete(raw, recipients), 'Failed to relay sheet deletion');
        }
      } else {
        if (!trustedGM(peerId)) return;
        useSheetStore.setState((state) => ({ sheets: state.sheets.filter((sheet) => sheet.id !== raw) }));
      }
    });

    const aiRequestTimes = new Map<string, number>();
    const aiRequestsInFlight = new Set<string>();
    bindJson('aiReq', aiRequest, async (raw, { peerId }) => {
      if (!isHost || !mappedPlayer(peerId) || !isValidAIRequest(raw)) return;
      const playerId = peerPlayerIdsRef.current.get(peerId);
      if (!playerId || raw.fromPeerId !== playerId) return;
      const sendResponse = actionsRef.current.sendAIRes;
      if (!sendResponse) return;
      const sendError = async (error: string) => {
        try {
          await sendResponse({ requestId: raw.requestId, ok: false, error }, peerId);
        } catch (sendFailure) {
          console.warn('Failed to send AI error response:', sendFailure);
        }
      };
      const lastRequest = aiRequestTimes.get(peerId) ?? 0;
      if (Date.now() - lastRequest < 30_000) {
        await sendError('Rate limited — please wait before generating another image');
        return;
      }
      if (aiRequestsInFlight.has(peerId)) {
        await sendError('An AI request is already running for this player');
        return;
      }
      if (raw.type !== 'generate-image') {
        await sendError('Unknown AI request type');
        return;
      }
      const prompt = typeof raw.payload.prompt === 'string' ? raw.payload.prompt.trim() : '';
      if (!prompt || prompt.length > 2_000) {
        await sendError(prompt ? 'Prompt too long' : 'Prompt is required');
        return;
      }
      const aiState = useAIStore.getState();
      if (!vaultHasKey() || !aiState.imageModel) {
        await sendError('No image model configured');
        return;
      }
      aiRequestTimes.set(peerId, Date.now());
      aiRequestsInFlight.add(peerId);
      try {
        const result = await vaultWithKey((apiKey) => generateAndStore(apiKey, aiState.imageModel!.id, prompt));
        if (!isCurrentSession(epoch)) return;
        await sendStoredImage(result.imageId, peerId);
        await sendResponse({ requestId: raw.requestId, ok: true, data: result }, peerId);
      } catch {
        if (isCurrentSession(epoch)) await sendError('Image generation failed');
      } finally {
        aiRequestsInFlight.delete(peerId);
      }
    });

    bindJson('aiRes', aiResponse, (raw, { peerId }) => {
      if (isHost || !trustedGM(peerId) || !isValidAIResponse(raw)) return;
      const pending = pendingAIRequestsRef.current.get(raw.requestId);
      if (!pending || pending.expectedPeerId !== peerId) return;
      clearTimeout(pending.timer);
      pendingAIRequestsRef.current.delete(raw.requestId);
      pending.resolve(raw);
    });

    bindJson('aiCaps', aiCapabilities, (raw, { peerId }) => {
      if (isHost || !trustedGM(peerId) || !isValidAICapabilities(raw)) return;
      useAIStore.setState({ capabilities: raw });
    });

    bindJson('imgReq', imageRequest, async (raw, { peerId }) => {
      if (!isHost || !mappedPlayer(peerId) || typeof raw !== 'string' || !/^[a-f0-9]{64}$/i.test(raw)) return;
      const game = useGameStore.getState().game;
      const playerId = peerPlayerIdsRef.current.get(peerId);
      if (!game || !playerId || !collectAuthorizedImageIds(game, playerId).has(raw)) return;
      const requestKey = `${peerId}:${raw}`;
      if (imageRequestsInFlightRef.current.has(requestKey)) return;
      imageRequestsInFlightRef.current.add(requestKey);
      try {
        await sendStoredImage(raw, peerId);
      } finally {
        imageRequestsInFlightRef.current.delete(requestKey);
      }
    });

    imageData.onMessage = async (buffer, { peerId, metadata }) => {
      if (!isCurrentSession(epoch) || !allowInbound(peerId, 'imgData') || isHost || !trustedGM(peerId) || !isValidImageTransferMeta(metadata)) return;
      const bytes = asByteView(buffer);
      if (!bytes || bytes.byteLength !== metadata.size || bytes.byteLength > P2P_IMAGE_MAX_SIZE) return;
      const transferKey = imageTransferKey(peerId, metadata);
      if (receivedTransfersRef.current.has(transferKey)) return;
      receivedTransfersRef.current.add(transferKey);
      if (receivedTransfersRef.current.size > 256) {
        const oldest = receivedTransfersRef.current.values().next().value as string | undefined;
        if (oldest) receivedTransfersRef.current.delete(oldest);
      }
      try {
        // Trystero reconstructs binary actions as Uint8Array in 0.25.x. Copy
        // only this view's bytes so a future subarray cannot include adjacent
        // data from its backing buffer in the hash or persisted image.
        const exactBuffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(exactBuffer).set(bytes);
        const blob = new Blob([exactBuffer], { type: metadata.mime });
        const hash = await computeHash(blob);
        if (!isCurrentSession(epoch) || hash !== metadata.imageId) return;
        const imageStore = useImageStore.getState();
        if (await imageStore.hasImage(metadata.imageId)) return;
        await imageStore.storeImage({
          id: metadata.imageId,
          blob,
          mimeType: metadata.mime,
          width: metadata.width,
          height: metadata.height,
          sizeBytes: metadata.size,
          createdAt: new Date().toISOString(),
          source: 'p2p',
        } as EmbeddedImage);
        requestedImagesAtRef.current.delete(metadata.imageId);
      } catch (error) {
        console.warn('Rejected image transfer:', error);
      }
    };
    inboundDebugHandlersRef.current.set('imgData', (raw, peerId, metadata) => {
      if (!asByteView(raw)) return;
      return imageData.onMessage?.(raw as BinaryPayload, { peerId, metadata: metadata === undefined ? undefined : asJsonValue(metadata) });
    });

    setImageMissingCallback(isHost ? null : (imageId) => {
      const gmPeerId = gmPeerIdRef.current;
      const sender = actionsRef.current.sendImgReq;
      const now = Date.now();
      const requestedAt = requestedImagesAtRef.current.get(imageId) ?? 0;
      if (gmPeerId && sender && /^[a-f0-9]{64}$/i.test(imageId) && now - requestedAt >= 10_000) {
        requestedImagesAtRef.current.set(imageId, now);
        ignoreSendFailure(sender(imageId, gmPeerId), 'Failed to request image');
      }
    });

    useSheetStore.getState().setP2PHandlers(
      (sheet) => {
        if (!isValidSheet(sheet)) return;
        const sender = actionsRef.current.sendSheetUpdate;
        if (!sender) return;
        if (isHost) {
          const game = useGameStore.getState().game;
          if (!game) return;
          for (const targetPeerId of playerPeers()) {
            const playerId = peerPlayerIdsRef.current.get(targetPeerId);
            if (playerId && collectAuthorizedSheetIds({ ...game, sheets: useSheetStore.getState().sheets }, playerId).has(sheet.id)) {
              ignoreSendFailure(sender(sheet, targetPeerId), 'Failed to broadcast sheet');
            }
          }
        } else {
          const gmPeerId = gmPeerIdRef.current;
          if (gmPeerId) ignoreSendFailure(sender(sheet, gmPeerId), 'Failed to send sheet update');
        }
      },
      (sheetId) => {
        if (!isIdentifier(sheetId)) return;
        const sender = actionsRef.current.sendSheetDelete;
        if (!sender) return;
        const target = isHost ? playerPeers() : gmPeerIdRef.current ?? undefined;
        if (target !== undefined) ignoreSendFailure(sender(sheetId, target), 'Failed to broadcast sheet deletion');
      },
    );
  }, [
    addOrUpdateElement,
    addChatMessage,
    addPlayer,
    armSyncTimeout,
    clearConnectionTimers,
    createQueuedImageSender,
    createQueuedJsonSender,
    deleteElement,
    ignoreSendFailure,
    isCurrentSession,
    loadGame,
    rejectPendingAI,
    sendProjectedSyncToAll,
    sendProjectedSyncToPeer,
    sendStoredImage,
    setConnected,
    switchScene,
    updateGridSettings,
    updatePlayer,
    updateScene,
  ]);

  const startSession = useCallback((
    roomId: string,
    isHost: boolean,
    playerProfile?: { name: string; color: string },
  ) => {
    if (!isRoomId(roomId)) {
      setRoomState((previous) => ({ ...previous, connectionState: 'error', error: 'Room IDs may only contain letters, numbers, dashes, and underscores.' }));
      return;
    }
    const epoch = sessionEpochRef.current + 1;
    sessionEpochRef.current = epoch;
    isHostRef.current = isHost;
    currentRoomIdRef.current = roomId;
    hasInitialSyncRef.current = false;
    setRoomState({
      roomId,
      peers: [],
      isHost,
      connectionState: 'connecting',
      error: null,
      lastSyncedAt: null,
      gmPeerId: null,
      gmDisconnected: false,
      localHash: null,
      gmHash: null,
      isDesynced: false,
    });

    void (async () => {
      let mainRoom: Room | null = null;
      let presenceRoom: Room | null = null;
      try {
        await teardownTransport('The session changed');
        if (!isCurrentSession(epoch)) return;
        isHostRef.current = isHost;
        currentRoomIdRef.current = roomId;
        sessionAbortControllerRef.current = new AbortController();
        hostIdentityTokensRef.current = isHost ? loadHostIdentityTokens(roomId) : new Map();
        const trystero = await loadTrystero();
        if (!isCurrentSession(epoch)) return;

        const playerIdentity = isHost ? null : getOrCreatePlayerIdentity(roomId);
        const myPlayerId = playerIdentity?.id ?? null;
        myPlayerIdRef.current = myPlayerId;
        const localHello: HandshakeHello = isHost
          ? { protocol: PROTOCOL_VERSION, role: 'host' }
          : {
              protocol: PROTOCOL_VERSION,
              role: 'player',
              playerId: playerIdentity!.id,
              name: sanitizeName(playerProfile?.name),
              color: sanitizeColor(playerProfile?.color),
            };

        const onPeerHandshake: PeerHandshake = async (peerId, send, receive) => {
          const [, remotePayload] = await Promise.all([
            send(asJsonValue(localHello)),
            receive(),
          ]);
          if (!isCurrentSession(epoch) || !isValidHandshakeHello(remotePayload.data)) {
            throw new Error('Incompatible or malformed Lychgate handshake');
          }
          const remote = remotePayload.data;
          if (isHost && remote.role !== 'player') throw new Error('Only players may join a hosted session');
          if (!isHost && remote.role === 'host') {
            const trusted = gmPeerIdRef.current;
            if (trusted && trusted !== peerId) throw new Error('A GM is already authenticated for this session');
            gmPeerIdRef.current = peerId;
            await send(asJsonValue({
              type: 'resume',
              id: playerIdentity!.id,
              resumeToken: playerIdentity!.resumeToken,
            } satisfies PlayerResumeAuth));
          }
          peerRolesRef.current.set(peerId, remote.role);
          if (remote.role === 'player') {
            if (isHost) {
              const authPayload = await receive();
              const auth = authPayload.data;
              if (!isValidPlayerResumeAuth(auth) || auth.id !== remote.playerId) {
                throw new Error('Invalid player resume proof');
              }
              const existingToken = hostIdentityTokensRef.current.get(auth.id);
              if (existingToken && existingToken !== auth.resumeToken) {
                throw new Error('This player identity is already claimed');
              }
              if (!existingToken && hostIdentityTokensRef.current.size >= MAX_PLAYERS) {
                throw new Error('The player identity limit has been reached');
              }
              pendingIdentityTokensRef.current.set(peerId, auth.resumeToken);
            }
            const player: Player = {
              id: remote.playerId!,
              name: sanitizeName(remote.name),
              color: sanitizeColor(remote.color),
              isGM: false,
              controlledTokens: [],
            };
            peerPlayersRef.current.set(peerId, player);
            peerPlayerIdsRef.current.set(peerId, player.id);
          }
        };

        const onJoinError = ({ error, peerId }: { error: string; peerId: string }) => {
          if (!isCurrentSession(epoch)) return;
          console.warn('P2P join error:', peerId, error);
          if (!activePeersRef.current.has(peerId)) {
            peerRolesRef.current.delete(peerId);
            peerPlayersRef.current.delete(peerId);
            peerPlayerIdsRef.current.delete(peerId);
            pendingIdentityTokensRef.current.delete(peerId);
            if (gmPeerIdRef.current === peerId) gmPeerIdRef.current = null;
          }
          if (!isHost && !hasInitialSyncRef.current && activePeersRef.current.size === 0) {
            setRoomState((previous) => ({
              ...previous,
              connectionState: 'error',
              error: `Could not establish a peer connection (${error.slice(0, 160)}). Check the room code and network, then retry.`,
            }));
          }
        };

        const onPresenceJoinError = ({ error, peerId }: { error: string; peerId: string }) => {
          if (isCurrentSession(epoch)) console.warn('P2P presence join error:', peerId, error);
        };

        mainRoom = trystero.joinRoom(
          { appId: APP_ID, rtcConfig },
          roomId,
          { onJoinError, onPeerHandshake, handshakeTimeoutMs: 12_000 },
        );
        presenceRoom = trystero.joinRoom(
          { appId: APP_ID, rtcConfig },
          `${roomId}${PRESENCE_ROOM_SUFFIX}`,
          { onJoinError: onPresenceJoinError },
        );

        if (!isCurrentSession(epoch)) {
          await Promise.allSettled([leaveRoomWithTimeout(mainRoom), leaveRoomWithTimeout(presenceRoom)]);
          return;
        }
        roomRef.current = mainRoom;
        presenceRoomRef.current = presenceRoom;
        setupRoomHandlers(mainRoom, isHost, epoch);
        setupPresenceHandlers(presenceRoom, epoch);

        if (isHost) {
          setConnected(true, useGameStore.getState().myPeerId ?? undefined);
          setRoomState((previous) => ({ ...previous, connectionState: 'connected' }));
        } else {
          connectionTimerRef.current = setTimeout(() => {
            if (!isCurrentSession(epoch) || hasInitialSyncRef.current) return;
            setRoomState((previous) => ({
              ...previous,
              connectionState: 'error',
              error: 'Could not find the GM. Check the room code, firewall, and internet connection, then retry.',
            }));
          }, CONNECTION_TIMEOUT_MS);
        }
      } catch (error) {
        if (isCurrentSession(epoch)) sessionAbortControllerRef.current?.abort('Networking initialization failed');
        if (mainRoom || presenceRoom) {
          await Promise.allSettled(
            [mainRoom, presenceRoom].filter((value): value is Room => Boolean(value)).map((value) => leaveRoomWithTimeout(value)),
          );
        }
        if (!isCurrentSession(epoch)) return;
        setRoomState((previous) => ({
          ...previous,
          connectionState: 'error',
          error: error instanceof Error ? error.message : 'Failed to initialize networking',
        }));
      }
    })();
  }, [isCurrentSession, setConnected, setupPresenceHandlers, setupRoomHandlers, teardownTransport]);

  const createRoom = useCallback((roomId: string): string => {
    startSession(roomId, true);
    return roomId;
  }, [startSession]);

  const joinExistingRoom = useCallback((roomId: string, playerName: string, playerColor: string): void => {
    startSession(roomId, false, { name: playerName, color: playerColor });
  }, [startSession]);

  const broadcastElementUpdate = useCallback((element: CanvasElement) => {
    if (!isValidCanvasElement(element)) return;
    const sender = actionsRef.current.sendElementUpdate;
    if (!sender) return;
    if (!isHostRef.current) {
      const gmPeerId = gmPeerIdRef.current;
      if (gmPeerId) ignoreSendFailure(sender(element, gmPeerId), 'Failed to send element update');
      return;
    }
    const accessSignature = JSON.stringify({
      type: element.type,
      layer: element.layer,
      visibleTo: element.visibleTo,
      sheetId: element.type === 'token' ? element.sheetId ?? null : null,
    });
    const previousAccessSignature = elementAccessSignaturesRef.current.get(element.id);
    elementAccessSignaturesRef.current.set(element.id, accessSignature);
    // A missing signature means this element is new, so there is no previous
    // audience to revoke. Reserve the heavier full snapshot for real ACL
    // changes (or for a new linked sheet that must be projected as a unit).
    const accessChanged = previousAccessSignature !== undefined && previousAccessSignature !== accessSignature;
    const needsLinkedSheetProjection = previousAccessSignature === undefined
      && element.type === 'token'
      && Boolean(element.sheetId);
    for (const peerId of activePeersRef.current) {
      if (peerRolesRef.current.get(peerId) !== 'player') continue;
      const playerId = peerPlayerIdsRef.current.get(peerId);
      if (!playerId) continue;
      if (accessChanged || needsLinkedSheetProjection) {
        ignoreSendFailure(sendProjectedSyncToPeer(peerId), 'Failed to reconcile element visibility');
        continue;
      }
      if (element.layer === 'gm' || !isVisibleToPlayer(element.visibleTo, playerId)) {
        const sendDelete = actionsRef.current.sendElementDelete;
        if (sendDelete) ignoreSendFailure(sendDelete(element.id, peerId), 'Failed to hide restricted element');
      } else {
        ignoreSendFailure(sender(projectElementForPlayer(element), peerId), 'Failed to broadcast element update');
      }
    }
  }, [ignoreSendFailure, sendProjectedSyncToPeer]);

  const broadcastElementDelete = useCallback((elementId: string) => {
    if (!isIdentifier(elementId)) return;
    const sender = actionsRef.current.sendElementDelete;
    if (!sender) return;
    if (isHostRef.current) {
      elementAccessSignaturesRef.current.delete(elementId);
      const peers = [...activePeersRef.current].filter((peerId) => peerRolesRef.current.get(peerId) === 'player');
      if (peers.length > 0) {
        // Apply the deletion immediately. The following projected snapshot also
        // revokes any sheet/image access that depended on the removed element.
        ignoreSendFailure(sender(elementId, peers), 'Failed to broadcast element deletion');
      }
      ignoreSendFailure(sendProjectedSyncToAll(), 'Failed to reconcile element deletion');
    } else {
      const gmPeerId = gmPeerIdRef.current;
      if (gmPeerId) ignoreSendFailure(sender(elementId, gmPeerId), 'Failed to broadcast element deletion');
    }
  }, [ignoreSendFailure, sendProjectedSyncToAll]);

  const broadcastCursor = useCallback((position: Point) => {
    if (!isValidPoint(position) || Date.now() - lastCursorSentAtRef.current < 33) return;
    lastCursorSentAtRef.current = Date.now();
    const sender = presenceActionsRef.current.sendCursor;
    if (sender) ignoreSendFailure(sender(position), 'Failed to send cursor');
  }, [ignoreSendFailure]);

  const broadcastPing = useCallback((position: Point, color: string) => {
    if (!isValidPoint(position) || !isValidColor(color)) return;
    const sender = presenceActionsRef.current.sendPing;
    if (sender) ignoreSendFailure(sender({ position, color }), 'Failed to send ping');
  }, [ignoreSendFailure]);

  const broadcastSync = useCallback(() => {
    if (isHostRef.current) ignoreSendFailure(sendProjectedSyncToAll(), 'Failed to broadcast sync');
  }, [ignoreSendFailure, sendProjectedSyncToAll]);

  const broadcastFogUpdate = useCallback((fog: { enabled: boolean; revealed: Point[][] }) => {
    if (!isHostRef.current || !isValidFog(fog)) return;
    const sender = actionsRef.current.sendFogUpdate;
    if (!sender) return;
    const target = [...activePeersRef.current].filter((peerId) => peerRolesRef.current.get(peerId) === 'player');
    ignoreSendFailure(sender(fog, target), 'Failed to broadcast fog');
  }, [ignoreSendFailure]);

  const broadcastChat = useCallback((message: ChatMessage) => {
    if (!isValidChat(message)) return;
    const sender = actionsRef.current.sendChat;
    if (!sender) return;
    if (isHostRef.current) {
      if (message.isGMOnly) return;
      const peers = [...activePeersRef.current].filter((peerId) => peerRolesRef.current.get(peerId) === 'player');
      ignoreSendFailure(sender(message, peers), 'Failed to broadcast chat');
    } else {
      const gmPeerId = gmPeerIdRef.current;
      if (gmPeerId) ignoreSendFailure(sender(message, gmPeerId), 'Failed to send chat');
    }
  }, [ignoreSendFailure]);

  const broadcastDiceRoll = broadcastChat;

  const requestFullSync = useCallback(() => {
    const gmPeerId = gmPeerIdRef.current;
    const sender = actionsRef.current.sendRequestSync;
    if (!gmPeerId || !sender || isHostRef.current) {
      setRoomState((previous) => ({ ...previous, connectionState: 'error', error: 'The GM is not currently connected.' }));
      return;
    }
    const now = Date.now();
    if (now - lastFullSyncRequestAtRef.current < 2_000) return;
    lastFullSyncRequestAtRef.current = now;
    hasInitialSyncRef.current = false;
    setRoomState((previous) => ({ ...previous, connectionState: 'syncing', error: null, isDesynced: false }));
    armSyncTimeout(sessionEpochRef.current);
    ignoreSendFailure(sender(null, gmPeerId), 'Failed to request sync');
  }, [armSyncTimeout, ignoreSendFailure]);

  const broadcastStateHash = useCallback(() => {
    if (!isHostRef.current) return;
    const sender = actionsRef.current.sendStateHash;
    const game = useGameStore.getState().game;
    if (!sender || !game) return;
    const withSheets = { ...game, sheets: useSheetStore.getState().sheets };
    for (const peerId of activePeersRef.current) {
      if (peerRolesRef.current.get(peerId) !== 'player') continue;
      const playerId = peerPlayerIdsRef.current.get(peerId);
      if (!playerId) continue;
      const hash = hashGameState(projectGameForPlayer(withSheets, playerId));
      ignoreSendFailure(sender(hash, peerId), 'Failed to broadcast state hash');
    }
  }, [ignoreSendFailure]);

  const broadcastGridSettings = useCallback((settings: Partial<GridSettings>) => {
    if (!isHostRef.current || !isValidGridSettings(settings, true)) return;
    const sender = actionsRef.current.sendGridUpdate;
    const peers = [...activePeersRef.current].filter((peerId) => peerRolesRef.current.get(peerId) === 'player');
    if (sender) ignoreSendFailure(sender(settings, peers), 'Failed to broadcast grid settings');
  }, [ignoreSendFailure]);

  const broadcastSceneSwitch = useCallback((sceneId: string) => {
    if (!isHostRef.current || !isIdentifier(sceneId)) return;
    const game = useGameStore.getState().game;
    if (!game || game.activeSceneId !== sceneId) return;
    elementAccessSignaturesRef.current.clear();
    ignoreSendFailure(sendProjectedSyncToAll(), 'Failed to broadcast projected scene');
  }, [ignoreSendFailure, sendProjectedSyncToAll]);

  const broadcastSceneUpdate = useCallback((scene: Scene) => {
    if (!isHostRef.current || !isValidScene(scene)) return;
    const game = useGameStore.getState().game;
    if (!game || scene.id !== game.activeSceneId) return;
    const sender = actionsRef.current.sendSceneUpdate;
    if (!sender) return;
    for (const peerId of activePeersRef.current) {
      if (peerRolesRef.current.get(peerId) !== 'player') continue;
      const playerId = peerPlayerIdsRef.current.get(peerId);
      if (!playerId) continue;
      ignoreSendFailure(sender(projectSceneForPlayer(scene, playerId), peerId), 'Failed to broadcast scene update');
    }
  }, [ignoreSendFailure]);

  const broadcastSheetUpdate = useCallback((sheet: Sheet) => {
    if (!isValidSheet(sheet)) return;
    const sender = actionsRef.current.sendSheetUpdate;
    if (!sender) return;
    if (isHostRef.current) {
      const game = useGameStore.getState().game;
      if (!game) return;
      for (const peerId of activePeersRef.current) {
        const playerId = peerPlayerIdsRef.current.get(peerId);
        if (peerRolesRef.current.get(peerId) === 'player' && playerId && collectAuthorizedSheetIds({ ...game, sheets: useSheetStore.getState().sheets }, playerId).has(sheet.id)) {
          ignoreSendFailure(sender(sheet, peerId), 'Failed to broadcast sheet');
        }
      }
    } else {
      const gmPeerId = gmPeerIdRef.current;
      if (gmPeerId) ignoreSendFailure(sender(sheet, gmPeerId), 'Failed to broadcast sheet');
    }
  }, [ignoreSendFailure]);

  const broadcastSheetDelete = useCallback((sheetId: string) => {
    if (!isIdentifier(sheetId)) return;
    const sender = actionsRef.current.sendSheetDelete;
    if (!sender) return;
    const target = isHostRef.current
      ? [...activePeersRef.current].filter((peerId) => peerRolesRef.current.get(peerId) === 'player')
      : gmPeerIdRef.current ?? undefined;
    if (target !== undefined) ignoreSendFailure(sender(sheetId, target), 'Failed to broadcast sheet deletion');
  }, [ignoreSendFailure]);

  const broadcastAICapabilities = useCallback((capabilities: AICapabilities) => {
    if (!isHostRef.current || !isValidAICapabilities(capabilities)) return;
    const sender = actionsRef.current.sendAICap;
    const peers = [...activePeersRef.current].filter((peerId) => peerRolesRef.current.get(peerId) === 'player');
    if (sender) ignoreSendFailure(sender(capabilities, peers), 'Failed to broadcast AI capabilities');
  }, [ignoreSendFailure]);

  const broadcastImage = useCallback(async (imageId: string) => {
    if (!isHostRef.current) return;
    const peers = [...activePeersRef.current].filter((peerId) => {
      if (peerRolesRef.current.get(peerId) !== 'player') return false;
      const game = useGameStore.getState().game;
      const playerId = peerPlayerIdsRef.current.get(peerId);
      return Boolean(game && playerId && collectAuthorizedImageIds(game, playerId).has(imageId));
    });
    await sendStoredImage(imageId, peers);
  }, [sendStoredImage]);

  const requestImage = useCallback((imageId: string) => {
    if (!/^[a-f0-9]{64}$/i.test(imageId) || isHostRef.current) return;
    const gmPeerId = gmPeerIdRef.current;
    const sender = actionsRef.current.sendImgReq;
    const now = Date.now();
    if (now - (requestedImagesAtRef.current.get(imageId) ?? 0) < 10_000) return;
    if (gmPeerId && sender) {
      requestedImagesAtRef.current.set(imageId, now);
      ignoreSendFailure(sender(imageId, gmPeerId), 'Failed to request image');
    }
  }, [ignoreSendFailure]);

  const requestAI = useCallback((type: string, payload: Record<string, unknown>): Promise<AIResponse> => {
    const playerId = myPlayerIdRef.current;
    const gmPeerId = gmPeerIdRef.current;
    const sender = actionsRef.current.sendAIReq;
    if (!playerId || !gmPeerId || !sender || isHostRef.current) return Promise.reject(new Error('The GM is not connected'));
    if (type !== 'generate-image' || !isRecord(payload) || !hasOnlyKeys(payload, new Set(['prompt'])) || !isSafeText(payload.prompt, 2_000, 1)) {
      return Promise.reject(new Error('Invalid AI request'));
    }
    const requestId = `ai-${crypto.randomUUID()}`;
    const request: AIRequest = { requestId, type, payload, fromPeerId: playerId };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const pending = pendingAIRequestsRef.current.get(requestId);
        if (!pending) return;
        pendingAIRequestsRef.current.delete(requestId);
        pending.reject(new Error('AI request timed out'));
      }, AI_TIMEOUT_MS);
      pendingAIRequestsRef.current.set(requestId, { resolve, reject, timer, expectedPeerId: gmPeerId });
      void sender(request, gmPeerId).catch((error) => {
        const pending = pendingAIRequestsRef.current.get(requestId);
        if (!pending) return;
        clearTimeout(pending.timer);
        pendingAIRequestsRef.current.delete(requestId);
        pending.reject(error instanceof Error ? error : new Error('Failed to send AI request'));
      });
    });
  }, []);

  useEffect(() => {
    if (roomState.roomId && !roomState.isHost) setRequestAIFn(requestAI);
    return () => setRequestAIFn(null);
  }, [requestAI, roomState.isHost, roomState.roomId]);

  const leaveRoom = useCallback(() => {
    sessionEpochRef.current += 1;
    setRoomState({
      roomId: null,
      peers: [],
      isHost: false,
      connectionState: 'disconnected',
      error: null,
      lastSyncedAt: null,
      gmPeerId: null,
      gmDisconnected: false,
      localHash: null,
      gmHash: null,
      isDesynced: false,
    });
    useGameStore.getState().resetSession();
    void teardownTransport('The session ended');
  }, [teardownTransport]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionEpochRef.current += 1;
      void teardownTransport('The networking view closed');
    };
  }, [teardownTransport]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const testWindow = window as unknown as Record<string, unknown>;
    testWindow.__testNetworkValidators = networkTestApi;
    testWindow.__testInjectNetworkMessage = (
      action: string,
      data: unknown,
      peerId = 'unmapped-test-peer',
      metadata?: unknown,
    ) => inboundDebugHandlersRef.current.get(action)?.(data, peerId, metadata);
    testWindow.__testGetNetworkDebug = () => ({
      handlerRegistrations: peerHandlerRegistrationCountRef.current,
      activePeers: [...activePeersRef.current],
      gmTransportPeerId: gmPeerIdRef.current,
      peerPlayerIds: Object.fromEntries(peerPlayerIdsRef.current),
      receivedTransfers: [...receivedTransfersRef.current],
      epoch: sessionEpochRef.current,
    });
    return () => {
      delete testWindow.__testNetworkValidators;
      delete testWindow.__testInjectNetworkMessage;
      delete testWindow.__testGetNetworkDebug;
      delete testWindow.__testTriggerPeerJoin;
      delete testWindow.__testTriggerPlayerPeerJoin;
      delete testWindow.__testTriggerPeerLeave;
    };
  }, []);

  return {
    ...roomState,
    createRoom,
    joinRoom: joinExistingRoom,
    leaveRoom,
    broadcastElementUpdate,
    broadcastElementDelete,
    broadcastCursor,
    broadcastPing,
    broadcastSync,
    broadcastFogUpdate,
    broadcastDiceRoll,
    requestFullSync,
    broadcastStateHash,
    broadcastGridSettings,
    broadcastChat,
    broadcastSceneSwitch,
    broadcastSceneUpdate,
    broadcastSheetUpdate,
    broadcastSheetDelete,
    broadcastAICapabilities,
    requestAI,
    broadcastImage,
    requestImage,
  };
}
