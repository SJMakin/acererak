import { useEffect, useRef, useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { nanoid } from 'nanoid';
import { useGameStore } from '../stores/gameStore';
import { useSheetStore, handleIncomingSheetUpdate, handleIncomingSheetDelete } from '../stores/sheetStore';
import { useAIStore, setRequestAIFn } from '../stores/aiStore';
import { useImageStore, setImageMissingCallback } from '../stores/imageStore';
import { generateAndStore } from '../services/aiImageService';
import { hasKey as vaultHasKey, withKey as vaultWithKey } from '../services/keyVault';
import { computeHash } from '../services/imageService';
import type { EmbeddedImage } from '../services/imageService';
import type {
  GameState,
  CanvasElement,
  Player,
  Point,
  CombatTracker,
  GridSettings,
  ChatMessage,
  Scene,
  Sheet,
  AIRequest,
  AIResponse,
  AICapabilities,
} from '../types';

const APP_ID = 'lychgate-vtt-v1';

// Helper to get active scene from game state
function getActiveScene(game: GameState) {
  return game.scenes.find(s => s.id === game.activeSceneId) || game.scenes[0] || null;
}

// Collect all imageId references from a game state
function collectImageIds(game: GameState): Set<string> {
  const ids = new Set<string>();
  for (const scene of game.scenes) {
    if (scene.backgroundImageId) ids.add(scene.backgroundImageId);
    for (const el of scene.elements) {
      if ('imageId' in el && (el as { imageId?: string }).imageId) {
        ids.add((el as { imageId: string }).imageId);
      }
    }
  }
  return ids;
}

// Stable hash for visible shared state comparison. Omit timestamps and local-only
// cursor data so equivalent states do not report false desyncs.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record).sort()) {
      result[key] = canonicalize(record[key]);
    }
    return result;
  }

  return value;
}

function hashGameState(game: GameState): string {
  const players = Object.values(game.players)
    .map(({ id, name, color, isGM, controlledTokens }) => ({
      id,
      name,
      color,
      isGM,
      controlledTokens: [...controlledTokens].sort(),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const scenes = game.scenes.map((scene) => ({
    id: scene.id,
    name: scene.name,
    backgroundUrl: scene.backgroundUrl,
    backgroundImageId: scene.backgroundImageId,
    gridSettings: scene.gridSettings,
    elements: scene.elements,
    fogOfWar: scene.fogOfWar,
  }));

  const stateStr = JSON.stringify(canonicalize({
    activeSceneId: game.activeSceneId,
    scenes,
    players,
    combat: game.combat ?? null,
  }));

  // Simple djb2 hash
  let hash = 5381;
  for (let i = 0; i < stateStr.length; i++) {
    hash = ((hash << 5) + hash) + stateStr.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

// ICE server configuration for WebRTC
// Includes STUN servers for NAT traversal and free TURN servers for relay fallback
const rtcBaseConfig: RTCConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Open Relay TURN server (free, community-provided)
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

// Trystero forwards rtcConfig into simple-peer; channelConfig controls data channel reliability.
type TrysteroRtcConfig = {
  config?: RTCConfiguration;
  channelConfig?: RTCDataChannelInit;
};

const reliableRtcConfig: TrysteroRtcConfig = {
  config: rtcBaseConfig,
  channelConfig: { ordered: true },
};

const unreliableRtcConfig: TrysteroRtcConfig = {
  config: rtcBaseConfig,
  channelConfig: { ordered: false, maxRetransmits: 0 },
};

const PRESENCE_ROOM_SUFFIX = ':presence';
const AUTO_RESYNC_COOLDOWN_MS = 30_000;

// Trystero room configuration
interface RoomConfig {
  appId: string;
  rtcConfig?: TrysteroRtcConfig;
}

// Define Room type manually to match trystero
interface Room {
  leave: () => void;
  onPeerJoin: (callback: (peerId: string) => void) => void;
  onPeerLeave: (callback: (peerId: string) => void) => void;
  makeAction: <T>(name: string) => [(data: T, targetPeers?: string[]) => void, (callback: (data: T, peerId: string) => void) => void, unknown];
}

// Cached trystero module
let trysteroModule: { joinRoom: (config: RoomConfig, roomId: string) => Room } | null = null;

// Load trystero dynamically
// Using torrent strategy with proper polyfills
async function loadTrystero(): Promise<{ joinRoom: (config: RoomConfig, roomId: string) => Room }> {
  if (!trysteroModule) {
    const mod = await import('trystero/torrent');
    trysteroModule = mod as unknown as { joinRoom: (config: RoomConfig, roomId: string) => Room };
  }
  return trysteroModule;
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

type ActionSender<T> = (data: T, targetPeers?: string[]) => void;

export function useRoom() {
  const roomRef = useRef<Room | null>(null);
  const presenceRoomRef = useRef<Room | null>(null);
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

  // Store refs for actions
  const actionsRef = useRef<{
    sendSync?: ActionSender<GameState>;
    sendElementUpdate?: ActionSender<CanvasElement>;
    sendElementDelete?: ActionSender<string>;
    sendPlayerJoin?: ActionSender<Player>;
    sendPlayerLeave?: ActionSender<string>;
    sendRequestSync?: ActionSender<null>;
    sendFogUpdate?: ActionSender<{ enabled: boolean; revealed: Point[][] }>;
    sendCombatUpdate?: ActionSender<CombatTracker>;
    sendStateHash?: ActionSender<string>;
    sendGridUpdate?: ActionSender<Partial<GridSettings>>;
    sendChat?: ActionSender<ChatMessage>;
    sendSceneSwitch?: ActionSender<string>;
    sendSceneUpdate?: ActionSender<Scene>;
    sendSheetUpdate?: ActionSender<Sheet>;
    sendSheetDelete?: ActionSender<string>;
    sendAIReq?: ActionSender<AIRequest>;
    sendAIRes?: ActionSender<AIResponse>;
    sendAICap?: ActionSender<AICapabilities>;
    sendImgReq?: ActionSender<string>;
    sendImgMeta?: ActionSender<{id: string; mime: string; width: number; height: number; size: number}>;
    sendImgData?: ActionSender<ArrayBuffer>;
  }>({});

  // Pending AI request promises (player side)
  const pendingAIRequestsRef = useRef<Map<string, { resolve: (res: AIResponse) => void; reject: (err: Error) => void }>>(new Map());
  const gmPeerIdRef = useRef<string | null>(null);
  const peerPlayerIdsRef = useRef<Map<string, string>>(new Map());
  const lastAutoSyncAtRef = useRef(0);

  const presenceActionsRef = useRef<{
    sendCursor?: ActionSender<Point>;
    sendPing?: ActionSender<{ position: Point; color: string }>;
  }>({});

  const {
    loadGame,
    addOrUpdateElement,
    deleteElement,
    addPlayer,
    removePlayer,
    updatePlayer,
    setConnected,
    myPeerId,
    addChatMessage,
    addPing,
  } = useGameStore();

  const { toggleFog, updateGridSettings, switchScene, updateScene } = useGameStore((state) => ({
    toggleFog: state.toggleFog,
    updateGridSettings: state.updateGridSettings,
    switchScene: state.switchScene,
    updateScene: state.updateScene,
  }));

  // Create a new room (as GM/host)
  const createRoom = useCallback((roomId: string): string => {
    setRoomState(prev => ({
      ...prev,
      roomId,
      isHost: true,
      connectionState: 'connecting',
      error: null,
      gmPeerId: null,
      gmDisconnected: false,
    }));
    gmPeerIdRef.current = null;
    peerPlayerIdsRef.current.clear();
    lastAutoSyncAtRef.current = 0;

    // Start async loading
    (async () => {
      try {
        if (roomRef.current) {
          roomRef.current.leave();
        }
        if (presenceRoomRef.current) {
          presenceRoomRef.current.leave();
        }
        presenceActionsRef.current = {};

        const trystero = await loadTrystero();
        const room = trystero.joinRoom({ appId: APP_ID, rtcConfig: reliableRtcConfig }, roomId);
        const presenceRoomId = `${roomId}${PRESENCE_ROOM_SUFFIX}`;
        const presenceRoom = trystero.joinRoom({ appId: APP_ID, rtcConfig: unreliableRtcConfig }, presenceRoomId);
        roomRef.current = room;
        presenceRoomRef.current = presenceRoom;

        setupRoomHandlers(room, true);
        setupPresenceHandlers(presenceRoom);

        setRoomState(prev => ({
          ...prev,
          connectionState: 'connected',
        }));

        setConnected(true, myPeerId || undefined);
      } catch (error) {
        console.error('Failed to create room:', error);
        setRoomState(prev => ({
          ...prev,
          connectionState: 'error',
          error: error instanceof Error ? error.message : 'Failed to create room',
        }));
      }
    })();

    return roomId;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setupRoomHandlers/setupPresenceHandlers are defined after this callback; called inside async closure so ref is stable
  }, [myPeerId, setConnected]);

  // Join an existing room (as player)
  const joinExistingRoom = useCallback((roomId: string, playerName: string, playerColor: string): void => {
    // Generate a unique peer ID for this player
    const newPeerId = nanoid();

    setRoomState(prev => ({
      ...prev,
      roomId,
      isHost: false,
      connectionState: 'connecting',
      error: null,
      gmPeerId: null,
      gmDisconnected: false,
    }));
    gmPeerIdRef.current = null;
    peerPlayerIdsRef.current.clear();
    lastAutoSyncAtRef.current = 0;

    // Start async loading
    (async () => {
      try {
        if (roomRef.current) {
          roomRef.current.leave();
        }
        if (presenceRoomRef.current) {
          presenceRoomRef.current.leave();
        }
        presenceActionsRef.current = {};

        const trystero = await loadTrystero();
        const room = trystero.joinRoom({ appId: APP_ID, rtcConfig: reliableRtcConfig }, roomId);
        const presenceRoomId = `${roomId}${PRESENCE_ROOM_SUFFIX}`;
        const presenceRoom = trystero.joinRoom({ appId: APP_ID, rtcConfig: unreliableRtcConfig }, presenceRoomId);
        roomRef.current = room;
        presenceRoomRef.current = presenceRoom;

        setupRoomHandlers(room, false);
        setupPresenceHandlers(presenceRoom);

        // Wait for connection then send join message
        // Guard against duplicate onPeerJoin from trystero renegotiation
        const joinedPeers = new Set<string>();
        const playerPeerJoinHandler = (peerId: string) => {
          if (joinedPeers.has(peerId)) {
            console.log('Ignoring duplicate onPeerJoin (player side) for:', peerId);
            return;
          }
          joinedPeers.add(peerId);
          console.log('Connected to peer:', peerId);

          setRoomState(prev => ({
            ...prev,
            connectionState: 'connected',
          }));

          // Request sync from host
          if (actionsRef.current.sendRequestSync) {
            actionsRef.current.sendRequestSync(null);
          }

          // Announce ourselves with the generated peer ID
          if (actionsRef.current.sendPlayerJoin) {
            console.log('Sending player join:', playerName);
            actionsRef.current.sendPlayerJoin({
              id: newPeerId,
              name: playerName,
              color: playerColor,
              isGM: false,
              controlledTokens: [],
            });
          }
        };
        room.onPeerJoin(playerPeerJoinHandler);

        // Expose test hook in dev mode so e2e tests can simulate player-side duplicate onPeerJoin
        if (import.meta.env.DEV) {
          (window as unknown as Record<string, unknown>).__testTriggerPlayerPeerJoin = playerPeerJoinHandler;
        }

        setConnected(true, newPeerId);
      } catch (error) {
        console.error('Failed to join room:', error);
        setRoomState(prev => ({
          ...prev,
          connectionState: 'error',
          error: error instanceof Error ? error.message : 'Failed to join room',
        }));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setupRoomHandlers/setupPresenceHandlers are defined after this callback; called inside async closure so ref is stable
  }, [setConnected]);

  // Setup room event handlers
  const setupRoomHandlers = useCallback((room: Room, isHost: boolean) => {
    // Define actions (names must be <=12 bytes for Trystero)
    const [sendSync, onSync] = room.makeAction<GameState>('sync');
    const [sendElementUpdate, onElementUpdate] = room.makeAction<CanvasElement>('elUpdate');
    const [sendElementDelete, onElementDelete] = room.makeAction<string>('elDelete');
    const [sendPlayerJoin, onPlayerJoin] = room.makeAction<Player>('plyJoin');
    const [sendPlayerLeave, onPlayerLeave] = room.makeAction<string>('plyLeave');
    const [sendRequestSync, onRequestSync] = room.makeAction<null>('reqSync');
    const [sendFogUpdate, onFogUpdate] = room.makeAction<{ enabled: boolean; revealed: Point[][] }>('fogUpdate');
    const [sendStateHash, onStateHash] = room.makeAction<string>('stateHash');
    const [sendGridUpdate, onGridUpdate] = room.makeAction<Partial<GridSettings>>('gridUpd');
    const [sendChat, onChat] = room.makeAction<ChatMessage>('chat');
    const [sendSceneSwitch, onSceneSwitch] = room.makeAction<string>('sceneSwi');
    const [sendSceneUpdate, onSceneUpdate] = room.makeAction<Scene>('sceneUpd');
    const [sendSheetUpdate, onSheetUpdate] = room.makeAction<Sheet>('sheetUpd');
    const [sendSheetDelete, onSheetDelete] = room.makeAction<string>('sheetDel');
    const [sendAIReq, onAIReq] = room.makeAction<AIRequest>('aiReq');
    const [sendAIRes, onAIRes] = room.makeAction<AIResponse>('aiRes');
    const [sendAICap, onAICap] = room.makeAction<AICapabilities>('aiCaps');
    const [sendImgReq, onImgReq] = room.makeAction<string>('imgReq');
    const [sendImgMeta, onImgMeta] = room.makeAction<{id: string; mime: string; width: number; height: number; size: number}>('imgMeta');
    const [sendImgData, onImgData] = room.makeAction<ArrayBuffer>('imgData');

    // Store senders
    actionsRef.current = {
      sendSync,
      sendElementUpdate,
      sendElementDelete,
      sendPlayerJoin,
      sendPlayerLeave,
      sendRequestSync,
      sendFogUpdate,
      sendStateHash,
      sendGridUpdate,
      sendChat,
      sendSceneSwitch,
      sendSceneUpdate,
      sendSheetUpdate,
      sendSheetDelete,
      sendAIReq,
      sendAIRes,
      sendAICap,
      sendImgReq,
      sendImgMeta,
      sendImgData,
    };

    // Register P2P image request callback so useImage can auto-request missing images
    setImageMissingCallback((imageId: string) => {
      if (actionsRef.current.sendImgReq) {
        console.log('Auto-requesting missing image:', imageId);
        actionsRef.current.sendImgReq(imageId);
      }
    });

    // Setup sheet store P2P handlers
    useSheetStore.getState().setP2PHandlers(
      (sheet) => {
        if (actionsRef.current.sendSheetUpdate) {
          actionsRef.current.sendSheetUpdate(sheet);
        }
      },
      (sheetId) => {
        if (actionsRef.current.sendSheetDelete) {
          actionsRef.current.sendSheetDelete(sheetId);
        }
      }
    );

    // Track peers we've already synced to avoid duplicate onPeerJoin from trystero renegotiation
    const syncedPeers = new Set<string>();

    // Handle peer events
    const peerJoinHandler = (peerId: string) => {
      if (syncedPeers.has(peerId)) {
        console.log('Ignoring duplicate onPeerJoin for:', peerId);
        return;
      }
      syncedPeers.add(peerId);
      console.log('Peer joined:', peerId);
      setRoomState((prev) => ({
        ...prev,
        peers: prev.peers.includes(peerId) ? prev.peers : [...prev.peers, peerId],
      }));

      // If we're host, send current game state to new peer
      // Use getState() to get current game, not the closure-captured value
      const currentGame = useGameStore.getState().game;
      if (isHost && currentGame) {
        console.log('Sending game sync to new peer:', peerId);
        const syncPayload = {
          ...currentGame,
          sheets: useSheetStore.getState().sheets,
        };
        sendSync(syncPayload, [peerId]);

        // Broadcast AI capabilities to new peer
        const aiCaps = useAIStore.getState().getCapabilities();
        if (aiCaps.hasAI) {
          sendAICap(aiCaps, [peerId]);
        }

        // Proactively push all embedded images to new peer
        (async () => {
          const imageIds = collectImageIds(currentGame);
          const imgStore = useImageStore.getState();
          for (const imageId of imageIds) {
            const image = await imgStore.getImage(imageId);
            if (image) {
              sendImgMeta({
                id: image.id,
                mime: image.mimeType,
                width: image.width,
                height: image.height,
                size: image.sizeBytes,
              }, [peerId]);
              const buffer = await image.blob.arrayBuffer();
              sendImgData(buffer, [peerId]);
            }
          }
        })();

      }
    };
    room.onPeerJoin(peerJoinHandler);

    // Expose test hook in dev mode so e2e tests can simulate duplicate onPeerJoin
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__testTriggerPeerJoin = peerJoinHandler;
    }

    room.onPeerLeave((peerId: string) => {
      console.log('Peer left:', peerId);
      syncedPeers.delete(peerId);

      const isGMLeaving = !isHost && gmPeerIdRef.current === peerId;
      if (isGMLeaving) {
        gmPeerIdRef.current = null;
      }
      const playerId = peerPlayerIdsRef.current.get(peerId) || peerId;
      peerPlayerIdsRef.current.delete(peerId);

      setRoomState((prev) => ({
        ...prev,
        peers: prev.peers.filter((p) => p !== peerId),
        gmDisconnected: isGMLeaving ? true : prev.gmDisconnected,
      }));

      if (isGMLeaving) {
        notifications.show({
          title: 'GM Disconnected',
          message: 'The GM has left the game. The session is paused.',
          color: 'red',
          autoClose: false,
        });
      }

      removePlayer(playerId);
      if (isHost) {
        const currentGame = useGameStore.getState().game;
        if (currentGame) {
          sendSync({
            ...currentGame,
            sheets: useSheetStore.getState().sheets,
          });
        }
      }
    });

    // Handle incoming data
    onSync((gameState: GameState, peerId: string) => {
      if (isHost) {
        console.warn('Ignoring full sync from non-authoritative peer:', peerId);
        return;
      }

      const trustedGmPeerId = gmPeerIdRef.current;
      if (trustedGmPeerId && peerId !== trustedGmPeerId) {
        console.warn('Ignoring full sync from untrusted peer:', peerId);
        return;
      }

      gmPeerIdRef.current = peerId;
      console.log('Received sync from:', peerId, 'Game:', gameState?.name);
      loadGame(gameState);
      if (gameState.sheets) {
        useSheetStore.getState().setSheets(gameState.sheets);
      }
      // Track sync time and GM peer ID
      setRoomState(prev => ({
        ...prev,
        lastSyncedAt: Date.now(),
        gmPeerId: peerId,
        gmDisconnected: false,
        connectionState: 'connected',
        isDesynced: false,
      }));
      console.log('Game loaded, should now show canvas');
    });

    onElementUpdate((element: CanvasElement, _peerId: string) => {
      // Use addOrUpdateElement to preserve incoming IDs (fixes duplication bug)
      addOrUpdateElement(element, true); // skipHistory = true for P2P updates
    });

    onElementDelete((elementId: string, _peerId: string) => {
      deleteElement(elementId, true);
    });

    onPlayerJoin((player: Player, peerId: string) => {
      peerPlayerIdsRef.current.set(peerId, player.id);
      addPlayer(player);
      if (isHost) {
        const currentGame = useGameStore.getState().game;
        if (currentGame) {
          sendSync({
            ...currentGame,
            sheets: useSheetStore.getState().sheets,
          });
        }
      }
      notifications.show({
        title: 'Player Joined',
        message: `${player.name} has joined the game`,
        color: 'green',
        autoClose: 4000,
      });
    });

    onPlayerLeave((playerId: string, _peerId: string) => {
      // Get player name before removing
      const player = useGameStore.getState().game?.players[playerId];
      const playerName = player?.name || 'Unknown player';
      removePlayer(playerId);
      for (const [transportPeerId, mappedPlayerId] of peerPlayerIdsRef.current.entries()) {
        if (mappedPlayerId === playerId) {
          peerPlayerIdsRef.current.delete(transportPeerId);
          break;
        }
      }
      if (isHost) {
        const currentGame = useGameStore.getState().game;
        if (currentGame) {
          sendSync({
            ...currentGame,
            sheets: useSheetStore.getState().sheets,
          });
        }
      }
      notifications.show({
        title: 'Player Left',
        message: `${playerName} has left the game`,
        color: 'orange',
        autoClose: 4000,
      });
    });

    onRequestSync((_data: null, peerId: string) => {
      // Send current state to requesting peer
      // Use getState() to get current game, not the closure-captured value
      const currentGame = useGameStore.getState().game;
      if (isHost && currentGame) {
        console.log('Sending game sync on request to peer:', peerId);
        const syncPayload = {
          ...currentGame,
          sheets: useSheetStore.getState().sheets,
        };
        sendSync(syncPayload, [peerId]);
      }
    });

    onFogUpdate((fogOfWar: { enabled?: boolean; revealed?: Point[][] }, peerId: string) => {
      console.log('Received fog update from:', peerId);

      const currentGame = useGameStore.getState().game;
      if (!currentGame) return;

      // Get active scene
      const activeScene = getActiveScene(currentGame);
      if (!activeScene) return;

      // Update fog of war state on active scene
      if (fogOfWar.enabled !== undefined) {
        toggleFog(fogOfWar.enabled);
      }
      // Update revealed areas by replacing them entirely on active scene
      useGameStore.setState({
        game: {
          ...currentGame,
          scenes: currentGame.scenes.map(s =>
            s.id === currentGame.activeSceneId
              ? {
                  ...s,
                  fogOfWar: {
                    enabled: fogOfWar.enabled ?? s.fogOfWar.enabled,
                    revealed: fogOfWar.revealed ?? s.fogOfWar.revealed,
                  },
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
          updatedAt: new Date().toISOString(),
        },
      });
    });

    // Handle incoming chat messages (including roll-type messages)
    onChat((chatMessage: ChatMessage, peerId: string) => {
      console.log('Received chat message from:', peerId, 'type:', chatMessage.type);

      // Check if GM-only message should be visible
      const currentGame = useGameStore.getState().game;
      if (!currentGame) return;

      // If message is GM-only, only GM should see it (or sender)
      if (chatMessage.isGMOnly) {
        const isGM = currentGame.gmPeerId === useGameStore.getState().myPeerId;
        const isSender = chatMessage.playerId === useGameStore.getState().myPeerId;
        if (!isGM && !isSender) {
          // Non-GM players shouldn't see GM-only messages (unless they sent it)
          return;
        }
      }

      // Show notification for roll messages
      if (chatMessage.type === 'roll') {
        notifications.show({
          title: 'Dice Roll',
          message: `${chatMessage.playerName} rolled ${chatMessage.formula}: ${chatMessage.result}`,
          color: 'violet',
          autoClose: 4000,
        });
      }

      const hasMessage = useGameStore.getState().hasChatMessage(chatMessage.id);
      if (hasMessage) {
        return;
      }

      addChatMessage(chatMessage);
    });

    // Handle state hash for desync detection (GM broadcasts, players compare)
    // Require consecutive mismatches to avoid false positives from network lag
    let consecutiveMismatches = 0;
    onStateHash((gmHash: string, _peerId: string) => {
      const currentGame = useGameStore.getState().game;
      if (!currentGame || isHost) return; // GM doesn't need to check against itself

      const localHash = hashGameState(currentGame);
      const hashesMatch = localHash === gmHash;

      if (hashesMatch) {
        consecutiveMismatches = 0;
      } else {
        consecutiveMismatches++;
        console.warn('State hash mismatch', consecutiveMismatches, '- Local:', localHash, 'GM:', gmHash);
      }

      // Only flag desync after 2 consecutive mismatches (20s of sustained mismatch)
      const isDesynced = consecutiveMismatches >= 2;

      if (isDesynced && actionsRef.current.sendRequestSync) {
        const now = Date.now();
        if (now - lastAutoSyncAtRef.current >= AUTO_RESYNC_COOLDOWN_MS) {
          lastAutoSyncAtRef.current = now;
          actionsRef.current.sendRequestSync(null);
        }
      }

      setRoomState(prev => ({
        ...prev,
        localHash,
        gmHash,
        isDesynced,
        connectionState: isDesynced ? 'syncing' : prev.connectionState,
      }));
    });

    // Handle grid settings update (GM only can broadcast)
    onGridUpdate((gridSettings: Partial<GridSettings>, peerId: string) => {
      console.log('Received grid update from:', peerId);

      const currentGame = useGameStore.getState().game;
      if (!currentGame) return;

      // Apply grid settings update
      updateGridSettings(gridSettings);
    });

    // Handle scene switch (GM-only action, players receive)
    onSceneSwitch((sceneId: string, peerId: string) => {
      console.log('Received scene switch from:', peerId, 'to scene:', sceneId);

      const currentGame = useGameStore.getState().game;
      if (!currentGame) return;

      // Switch to the specified scene
      switchScene(sceneId);

      notifications.show({
        title: 'Scene Changed',
        message: `The GM has switched to a new scene`,
        color: 'blue',
        autoClose: 3000,
      });
    });

    // Handle scene updates (new or updated scene data)
    onSceneUpdate((scene: Scene, peerId: string) => {
      console.log('Received scene update from:', peerId, 'scene:', scene.name);

      const currentGame = useGameStore.getState().game;
      if (!currentGame) return;

      // Check if scene exists (update) or is new (add)
      const existingScene = currentGame.scenes.find(s => s.id === scene.id);
      if (existingScene) {
        updateScene(scene.id, scene);
      } else {
        // Add new scene to game state
        useGameStore.setState({
          game: {
            ...currentGame,
            scenes: [...currentGame.scenes, scene],
            updatedAt: new Date().toISOString(),
          },
        });
      }
    });

    // Handle sheet updates (from any peer)
    onSheetUpdate((sheet: Sheet, _peerId: string) => {
      console.log('Received sheet update:', sheet.name);
      handleIncomingSheetUpdate(sheet);
    });

    // Handle sheet deletions (from any peer)
    onSheetDelete((sheetId: string, _peerId: string) => {
      console.log('Received sheet delete:', sheetId);
      handleIncomingSheetDelete(sheetId);
    });

    // Handle AI request (player → GM)
    // Rate limiting: track per-peer request timestamps
    const AI_MAX_PROMPT_LENGTH = 2000;
    const AI_COOLDOWN_MS = 30_000; // 30s cooldown per peer
    const aiRequestTimestamps = new Map<string, number>();

    onAIReq(async (request: AIRequest, peerId: string) => {
      if (!isHost) return; // Only GM handles AI requests
      // Use transport-level peerId for routing (not self-reported fromPeerId)
      console.log('Received AI request:', request.type, 'from peer:', peerId);

      const sendErr = (msg: string) => sendAIRes({
        requestId: request.requestId, ok: false, error: msg,
      }, [peerId]);

      // Rate limiting: one request per peer per cooldown period
      const lastReq = aiRequestTimestamps.get(peerId) || 0;
      if (Date.now() - lastReq < AI_COOLDOWN_MS) {
        sendErr('Rate limited — please wait before generating another image');
        return;
      }

      if (request.type === 'generate-image') {
        // Validate payload
        const prompt = typeof request.payload?.prompt === 'string'
          ? request.payload.prompt.trim()
          : '';
        if (!prompt) {
          sendErr('Prompt is required');
          return;
        }
        if (prompt.length > AI_MAX_PROMPT_LENGTH) {
          sendErr(`Prompt too long (max ${AI_MAX_PROMPT_LENGTH} characters)`);
          return;
        }

        const aiState = useAIStore.getState();
        if (!vaultHasKey() || !aiState.imageModel) {
          sendErr('No image model configured');
          return;
        }

        // Record timestamp for rate limiting
        aiRequestTimestamps.set(peerId, Date.now());

        try {
          const result = await vaultWithKey((apiKey) => generateAndStore(apiKey, aiState.imageModel!.id, prompt));
          sendAIRes({
            requestId: request.requestId,
            ok: true,
            data: result,
          }, [peerId]);
          // Push the image blob to requesting peer so they can render it
          const imgStore = useImageStore.getState();
          const image = await imgStore.getImage(result.imageId);
          if (image && actionsRef.current.sendImgMeta && actionsRef.current.sendImgData) {
            actionsRef.current.sendImgMeta({
              id: image.id,
              mime: image.mimeType,
              width: image.width,
              height: image.height,
              size: image.sizeBytes,
            }, [peerId]);
            const buffer = await image.blob.arrayBuffer();
            actionsRef.current.sendImgData(buffer, [peerId]);
          }
        } catch {
          // Sanitize error — never forward raw API errors (may leak key info)
          sendErr('Image generation failed');
        }
      } else {
        sendErr('Unknown AI request type');
      }
    });

    // Handle AI response (GM → player)
    onAIRes((response: AIResponse, _peerId: string) => {
      const pending = pendingAIRequestsRef.current.get(response.requestId);
      if (pending) {
        pending.resolve(response);
        pendingAIRequestsRef.current.delete(response.requestId);
      }
    });

    // Handle AI capabilities broadcast (GM → all, players only accept from known GM)
    onAICap((capabilities: AICapabilities, peerId: string) => {
      // Only accept capabilities from the trusted GM transport peer.
      const trustedGmPeerId = gmPeerIdRef.current;
      if (trustedGmPeerId && peerId !== trustedGmPeerId) {
        console.warn('Ignoring AI capabilities from non-GM peer:', peerId);
        return;
      }
      console.log('Received AI capabilities:', capabilities);
      useAIStore.setState({ capabilities });
    });

    // Handle image request (player → GM): player asks for an image by ID
    onImgReq(async (imageId: string, peerId: string) => {
      if (!isHost) return;
      console.log('Received image request for:', imageId, 'from:', peerId);
      const imgStore = useImageStore.getState();
      const image = await imgStore.getImage(imageId);
      if (image) {
        sendImgMeta({
          id: image.id,
          mime: image.mimeType,
          width: image.width,
          height: image.height,
          size: image.sizeBytes,
        }, [peerId]);
        const buffer = await image.blob.arrayBuffer();
        sendImgData(buffer, [peerId]);
      } else {
        // Send empty metadata to signal "image not found" so player doesn't wait forever
        sendImgMeta({ id: imageId, mime: '', width: 0, height: 0, size: -1 }, [peerId]);
      }
    });

    // FIFO queue for image metadata — ordered channel guarantees meta arrives before its data
    const imgMetaQueue: Array<{id: string; mime: string; width: number; height: number; size: number; receivedAt: number}> = [];

    const IMG_META_TIMEOUT = 60_000;
    const IMG_META_MAX_QUEUE = 100;

    // Handle image metadata (GM → player)
    onImgMeta((meta: {id: string; mime: string; width: number; height: number; size: number}, _peerId: string) => {
      // Clean stale entries
      const now = Date.now();
      while (imgMetaQueue.length > 0 && now - imgMetaQueue[0].receivedAt > IMG_META_TIMEOUT) {
        const stale = imgMetaQueue.shift()!;
        console.warn('Dropping stale image metadata:', stale.id);
      }
      // Cap queue length to prevent memory exhaustion
      while (imgMetaQueue.length >= IMG_META_MAX_QUEUE) {
        const dropped = imgMetaQueue.shift()!;
        console.warn('Dropping oldest image metadata (queue full):', dropped.id);
      }
      // size === -1 means "image not found on GM" — skip it
      if (meta.size < 0) {
        console.warn('GM does not have image:', meta.id);
        return;
      }
      imgMetaQueue.push({ ...meta, receivedAt: now });
    });

    // Handle image binary data (GM → player) — matches FIFO with metadata queue
    const P2P_IMAGE_MAX_SIZE = 20 * 1024 * 1024; // 20MB

    onImgData(async (buffer: ArrayBuffer, _peerId: string) => {
      const meta = imgMetaQueue.shift();
      if (!meta) {
        console.warn('Received image data with no pending metadata');
        return;
      }

      // Reject oversized payloads
      if (buffer.byteLength > P2P_IMAGE_MAX_SIZE) {
        console.warn('Rejecting P2P image: too large', buffer.byteLength, 'bytes for', meta.id);
        return;
      }

      // Verify size matches metadata
      if (buffer.byteLength !== meta.size) {
        console.warn('P2P image size mismatch for', meta.id, '— expected', meta.size, 'got', buffer.byteLength);
        return;
      }

      const imgStore = useImageStore.getState();
      const hasIt = await imgStore.hasImage(meta.id);
      if (!hasIt) {
        const typedBlob = new Blob([buffer], { type: meta.mime });

        // Verify content hash matches the claimed ID
        const hash = await computeHash(typedBlob);
        if (hash !== meta.id) {
          console.warn('P2P image hash mismatch for', meta.id, '— computed', hash);
          return;
        }

        await imgStore.storeImage({
          id: meta.id,
          blob: typedBlob,
          mimeType: meta.mime,
          width: meta.width,
          height: meta.height,
          sizeBytes: meta.size,
          createdAt: new Date().toISOString(),
          source: 'p2p',
        } as EmbeddedImage);
        console.log('Stored P2P image:', meta.id);
      }
    });
  }, [loadGame, addOrUpdateElement, deleteElement, addPlayer, removePlayer, toggleFog, updateGridSettings, addChatMessage, switchScene, updateScene]);

  const setupPresenceHandlers = useCallback((room: Room) => {
    const [sendCursor, onCursor] = room.makeAction<Point>('cursor');
    const [sendPing, onPing] = room.makeAction<{ position: Point; color: string }>('ping');

    presenceActionsRef.current = {
      sendCursor,
      sendPing,
    };

    onCursor((position: Point, peerId: string) => {
      updatePlayer(peerId, { cursor: position });
    });

    onPing((data: { position: Point; color: string }, peerId: string) => {
      // Add received ping to game store for visualization
      console.log('Ping from', peerId, 'at', data.position);
      addPing(data.position.x, data.position.y, data.color);
    });
  }, [updatePlayer, addPing]);

  // Broadcast element updates
  const broadcastElementUpdate = useCallback((element: CanvasElement) => {
    if (actionsRef.current.sendElementUpdate) {
      actionsRef.current.sendElementUpdate(element);
    }
  }, []);

  const broadcastElementDelete = useCallback((elementId: string) => {
    if (actionsRef.current.sendElementDelete) {
      actionsRef.current.sendElementDelete(elementId);
    }
  }, []);

  const broadcastCursor = useCallback((position: Point) => {
    if (presenceActionsRef.current.sendCursor) {
      presenceActionsRef.current.sendCursor(position);
    }
  }, []);

  const broadcastPing = useCallback((position: Point, color: string) => {
    if (presenceActionsRef.current.sendPing) {
      presenceActionsRef.current.sendPing({ position, color });
    }
  }, []);

  const broadcastSync = useCallback(() => {
    const currentGame = useGameStore.getState().game;
    if (actionsRef.current.sendSync && currentGame && roomState.isHost) {
      actionsRef.current.sendSync({
        ...currentGame,
        sheets: useSheetStore.getState().sheets,
      });
    }
  }, [roomState.isHost]);

  const broadcastFogUpdate = useCallback((fogOfWar: { enabled: boolean; revealed: Point[][] }) => {
    if (actionsRef.current.sendFogUpdate) {
      actionsRef.current.sendFogUpdate(fogOfWar);
    }
  }, []);

  // Dice rolls are now sent as chat messages
  const broadcastDiceRoll = useCallback((message: ChatMessage) => {
    if (actionsRef.current.sendChat) {
      actionsRef.current.sendChat(message);
    }
  }, []);

  // Request a full sync from the GM
  const requestFullSync = useCallback(() => {
    if (actionsRef.current.sendRequestSync) {
      setRoomState(prev => ({
        ...prev,
        connectionState: 'syncing',
        isDesynced: false,
      }));
      actionsRef.current.sendRequestSync(null);
    }
  }, []);

  // Broadcast state hash (GM only) for desync detection
  const broadcastStateHash = useCallback(() => {
    const currentGame = useGameStore.getState().game;
    if (actionsRef.current.sendStateHash && currentGame && roomState.isHost) {
      const hash = hashGameState(currentGame);
      actionsRef.current.sendStateHash(hash);
    }
  }, [roomState.isHost]);

  // Broadcast grid settings (GM only)
  const broadcastGridSettings = useCallback((gridSettings: Partial<GridSettings>) => {
    if (actionsRef.current.sendGridUpdate && roomState.isHost) {
      actionsRef.current.sendGridUpdate(gridSettings);
    }
  }, [roomState.isHost]);

  // Broadcast chat message
  const broadcastChat = useCallback((message: ChatMessage) => {
    if (actionsRef.current.sendChat) {
      actionsRef.current.sendChat(message);
    }
  }, []);

  // Broadcast scene switch (GM only)
  const broadcastSceneSwitch = useCallback((sceneId: string) => {
    if (actionsRef.current.sendSceneSwitch && roomState.isHost) {
      actionsRef.current.sendSceneSwitch(sceneId);
    }
  }, [roomState.isHost]);

  // Broadcast scene update (GM only)
  const broadcastSceneUpdate = useCallback((scene: Scene) => {
    if (actionsRef.current.sendSceneUpdate && roomState.isHost) {
      actionsRef.current.sendSceneUpdate(scene);
    }
  }, [roomState.isHost]);

  // Broadcast sheet update (any peer)
  const broadcastSheetUpdate = useCallback((sheet: Sheet) => {
    if (actionsRef.current.sendSheetUpdate) {
      actionsRef.current.sendSheetUpdate(sheet);
    }
  }, []);

  // Broadcast sheet delete (any peer)
  const broadcastSheetDelete = useCallback((sheetId: string) => {
    if (actionsRef.current.sendSheetDelete) {
      actionsRef.current.sendSheetDelete(sheetId);
    }
  }, []);

  // Broadcast AI capabilities (GM only)
  const broadcastAICapabilities = useCallback((capabilities: AICapabilities) => {
    if (actionsRef.current.sendAICap && roomState.isHost) {
      actionsRef.current.sendAICap(capabilities);
    }
  }, [roomState.isHost]);

  // Broadcast an embedded image to all peers (GM pushes image after upload)
  const broadcastImage = useCallback(async (imageId: string) => {
    const imgStore = useImageStore.getState();
    const image = await imgStore.getImage(imageId);
    if (image && actionsRef.current.sendImgMeta && actionsRef.current.sendImgData) {
      actionsRef.current.sendImgMeta({
        id: image.id,
        mime: image.mimeType,
        width: image.width,
        height: image.height,
        size: image.sizeBytes,
      });
      const buffer = await image.blob.arrayBuffer();
      actionsRef.current.sendImgData(buffer);
    }
  }, []);

  // Request an image from the GM (player only)
  const requestImage = useCallback((imageId: string) => {
    if (actionsRef.current.sendImgReq) {
      actionsRef.current.sendImgReq(imageId);
    }
  }, []);

  // Request AI from GM (player only) — returns a promise
  const requestAI = useCallback((type: string, payload: Record<string, unknown>): Promise<AIResponse> => {
    const myPeer = useGameStore.getState().myPeerId;
    if (!myPeer) return Promise.reject(new Error('Not connected'));

    const requestId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const request: AIRequest = { requestId, type, payload, fromPeerId: myPeer };

    return new Promise((resolve, reject) => {
      pendingAIRequestsRef.current.set(requestId, { resolve, reject });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (pendingAIRequestsRef.current.has(requestId)) {
          pendingAIRequestsRef.current.delete(requestId);
          reject(new Error('AI request timed out'));
        }
      }, 60000);

      if (actionsRef.current.sendAIReq) {
        actionsRef.current.sendAIReq(request);
      } else {
        pendingAIRequestsRef.current.delete(requestId);
        reject(new Error('AI request channel not available'));
      }
    });
  }, []);

  // Wire requestAI into aiStore so generateImage can relay via P2P for players
  useEffect(() => {
    if (roomState.roomId && !roomState.isHost) {
      setRequestAIFn(requestAI);
    }
    return () => setRequestAIFn(null);
  }, [roomState.roomId, roomState.isHost, requestAI]);

  // Leave room
  const leaveRoom = useCallback(() => {
    if (roomRef.current) {
      if (actionsRef.current.sendPlayerLeave && myPeerId) {
        actionsRef.current.sendPlayerLeave(myPeerId);
      }
      roomRef.current.leave();
      roomRef.current = null;
    }
    if (presenceRoomRef.current) {
      presenceRoomRef.current.leave();
      presenceRoomRef.current = null;
    }
    gmPeerIdRef.current = null;
    peerPlayerIdsRef.current.clear();
    lastAutoSyncAtRef.current = 0;
    presenceActionsRef.current = {};
    setImageMissingCallback(null);
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
    setConnected(false);
  }, [myPeerId, setConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.leave();
      }
      if (presenceRoomRef.current) {
        presenceRoomRef.current.leave();
      }
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
