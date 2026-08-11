# Lychgate VTT - Decentralized Virtual Tabletop

A peer-to-peer virtual tabletop for TTRPGs built with React, Konva.js, and Trystero. No application backend stores game data: peers exchange it directly over WebRTC. Internet play still depends on tracker, STUN, and TURN infrastructure for discovery and NAT traversal.

## 🎯 Project Vision

Create a fully client-side, decentralized VTT where:
- The GM's browser is the source of truth
- Game state syncs in real-time via P2P connections
- No backend stores or routes any game data
- Players can join via QR codes or room IDs
- Everything works offline once peers are connected

This is intended to eventually integrate with the main Acererak app (the choose-your-own-adventure story generator in the parent directory) but is being developed as a standalone module first. Note: While the parent project retains the "Acererak" name, the VTT has been rebranded to "Lychgate" to avoid trademark concerns.

## 🏗️ Architecture

### P2P Networking Stack

```
┌─────────────────────────────────────────────┐
│           GM's Browser (Authority)          │
│  ┌─────────────┐         ┌───────────────┐  │
│  │ Game State  │◄────────┤ Trystero Room │  │
│  │ (IndexedDB) │         │  (BitTorrent) │  │
│  └─────────────┘         └───────┬───────┘  │
└────────────────────────────────────┼─────────┘
                                    │ WebRTC
                ┌───────────────────┼────────────────────┐
                │                   │                    │
┌───────────────┴────────┐  ┌───────┴──────────┐  ┌─────┴──────────┐
│   Player 1 Browser     │  │  Player 2 Browser│  │  Player 3...   │
│  ┌─────────────┐      │  │  ┌─────────────┐ │  │                │
│  │ Game State  │      │  │  │ Game State  │ │  │                │
│  │  (cached)   │      │  │  │  (cached)   │ │  │                │
│  └─────────────┘      │  │  └─────────────┘ │  │                │
└────────────────────────┘  └──────────────────┘  └────────────────┘
```

**Key Technical Decisions:**
- **`@trystero-p2p/torrent`** for encrypted room discovery and WebRTC signaling
- **WebRTC data channels** for P2P game state sync
- **Zustand** for client-side state management
- **Konva.js/react-konva** for canvas rendering
- **IndexedDB** via Dexie for local persistence
- **Mantine UI** for components

### Data Flow

1. The GM creates a game and a high-entropy bearer room code.
2. Players scan a fragment-based invite link or enter the room code manually.
3. Peers complete the v3 role handshake; players prove a room-scoped resume identity before becoming active.
4. The GM sends a validated projection containing only the active visible scene, visible combat data, and sheets linked from visible tokens.
5. Player mutations are allowlisted, versioned by the GM, and relayed back as canonical state. Public unlocked tokens are collaborative unless the GM assigns explicit control.
6. Ordered per-peer queues, state hashes, timeouts, and recovery snapshots keep peers converged.

### Action Name Constraints

Trystero has a **12-byte limit** on action names. We use shortened names:
- `sync` - Full game state sync
- `elUpdate` - Element update (not `element-update`)
- `elDelete` - Element delete
- `reqSync` - Request sync
- `cursor` - Cursor position
- `ping` - Ping location
- `sheetUpd` / `sheetDel` - Character-sheet convergence
- `imgReq` / `imgData` - Authorized, metadata-bound image transfer

## 📁 Project Structure

```
vtt/
├── src/
│   ├── components/
│   │   ├── Lobby.tsx              # Create/join game UI with QR codes
│   │   ├── GameCanvas.tsx         # Main Konva canvas (grid, tokens, drawing)
│   │   ├── Toolbar.tsx            # Tool selection bar (all drawing/interaction tools)
│   │   ├── Sidebar.tsx            # Token list, player list, GM tools
│   │   ├── TokenConfigModal.tsx   # Token placement configuration UI
│   │   ├── CombatTracker.tsx      # Initiative and turn tracking
│   │   ├── DiceRoller.tsx         # Dice rolling interface
│   │   ├── MarkdownEditor.tsx     # Edit/preview markdown content
│   │   ├── NotesPanel.tsx         # Campaign journal tab
│   │   ├── PropertyInspector.tsx  # Element properties editor
│   │   ├── LibraryPanel.tsx       # Token/map library management
│   │   ├── App.tsx                # Main app shell
│   │   └── ...
│   ├── hooks/
│   │   └── useRoom.ts             # Trystero P2P room management hook
│   ├── stores/
│   │   └── gameStore.ts           # Zustand game state store
│   ├── db/
│   │   └── database.ts            # IndexedDB schema and queries
│   ├── services/
│   │   └── diceParser.ts          # Dice notation parser
│   ├── types/
│   │   └── index.ts               # TypeScript type definitions
│   ├── main.tsx                   # App entry point
│   └── index.css                  # Global styles
├── public/                        # Static assets
├── package.json                   # Dependencies
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript config
└── README.md                      # This file
```

## 🎨 Core Features Implemented

### ✅ Lobby & Connection
- Create game as GM
- Generate QR code for room ID
- Join game as player (via QR or manual ID)
- Real-time connection status

### ✅ Canvas System
- 30x30 grid (configurable size)
- Pan & zoom controls
- Grid toggle and snap-to-grid
- Viewport transformation (offset + scale)

### ✅ Drawing Tools
- **Freehand Draw** (✏️) - ✅ Fully working
- **Line Tool** (📏) - ✅ Fully working
- **Rectangle Tool** (⬜) - ✅ Fully working
- **Circle Tool** (⭕) - ✅ Fully working
- Live preview while drawing
- Saves to game state on mouse up
- All shapes support stroke color and width

### ✅ Token System
- Add tokens via sidebar or canvas click
- **TokenConfigModal** (🎭) - ✅ Click-to-place token tool with full configuration
- Drag to move (with snap-to-grid)
- Token properties: name, HP, AC, image URL, size
- HP bar visualization
- GM-only visibility option
- Custom emoji/text display

### ✅ Fog of War
- **Fog of War System** (🌫️) - ✅ Fully working
- Reveal Tool - Click and drag to reveal areas
- Hide Tool - Click and drag to hide areas
- Polygon-based reveal/hide logic
- Real-time sync across all players
- Toggle fog visibility (GM can see through)

### ✅ Interaction Tools
- **Ping Tool** (📍) - ✅ Fully working with animated visual indicators
- **Text Tool** (📝) - ✅ Click to place text labels
- **Measure Tool** (📏) - ✅ Shows distance in grid cells
- Cursor position sync
- Real-time collaboration indicators

### ✅ Combat Tracker
- **Combat Tracker** (⚔️) - ✅ Fully working
- Initiative tracking and ordering
- Add combatants with initiative rolls
- HP tracking integrated with tokens
- Turn advancement
- Remove combatants
- Sidebar integration

### ✅ Dice Roller
- **Dice Roller** (🎲) - ✅ Fully working
- Standard notation parser (e.g., `2d6+3`, `1d20`)
- Modifier support
- Visual roll results with individual die faces
- Roll history
- Sidebar integration

### ✅ GM Controls
- Mark elements as GM-only or visible to all
- Lock/unlock elements
- Delete elements
- Fog of War reveal/hide tools
- Layer management

### ✅ Data Persistence
- **IndexedDB Integration** (💾) - ✅ Fully working
- Auto-save game state locally
- Load games from local storage
- Export game as `.vtt.json` file
- Import game from file
- Full game state serialization

### ✅ Campaign Notes
- **Notes System** (📝) - ✅ Fully working
- Markdown notes on tokens (with edit/preview mode)
- Markdown notes on map images
- Campaign Journal for standalone notes
- Note categories (Session, NPC, Location, Lore, Plot, etc.)
- GM-only or public visibility
- Search and filter notes
- Simple markdown editor with syntax hints

### ✅ P2P Sync
- Broadcast element updates
- Broadcast element deletions
- Broadcast cursor positions
- Broadcast fog of war changes
- Broadcast ping locations
- Player join/leave notifications
- Full state sync on connection

## 🔧 Technical Implementation Details

### Game State Structure

```typescript
interface GameState {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  gridSettings: GridSettings;
  elements: CanvasElement[];  // All tokens, shapes, images, text
  fogOfWar: { enabled: boolean; revealed: Point[][] };
  players: Record<string, Player>;
  dmPeerId?: string;
}
```

### Element Types

All canvas objects inherit from `BaseElement`:
- **TokenElement**: Characters/monsters with HP, AC, conditions
- **ImageElement**: Map backgrounds, handouts
- **ShapeElement**: Lines, rectangles, circles, freehand drawings
- **TextElement**: Labels and notes

Each has:
- Position (x, y)
- Layer (`map`, `gm`, `token`, `drawing`)
- Visibility (`all`, `gm`, or specific peer IDs)
- Z-index for layering
- Locked state

### Drawing Implementation

All drawing tools follow a consistent pattern:
1. `onMouseDown`: Start drawing, record initial point
2. `onMouseMove`: Update preview while drawing
3. `onMouseUp`: Save shape to game state, broadcast to peers

Points are transformed to account for viewport offset and scale:
```typescript
const x = (pos.x - viewportOffset.x) / viewportScale;
const y = (pos.y - viewportOffset.y) / viewportScale;
```

Each tool creates specific shape types:
- **Freehand**: Array of points for curved lines
- **Line**: Start and end points
- **Rectangle**: Start point + width/height
- **Circle**: Center point + radius

Live preview shown via a separate Konva Layer with the current drawing state.

### Fog of War System

Fog of War uses polygon-based reveal/hide:
- **Reveal Tool**: Creates polygon areas to reveal (brush-like)
- **Hide Tool**: Creates polygon areas to hide again
- Stored as array of polygon points in game state
- Players see black overlay except in revealed areas
- GM can toggle fog visibility to see full map

### Combat Tracker

Initiative-based combat system:
- Add combatants with name and initiative value
- Automatically sorts by initiative (descending)
- Track HP linked to token elements
- Advance turn to next combatant
- Remove defeated/fled combatants

### Dice Roller

Standard RPG dice notation parser:
- Supports `XdY` format (e.g., `2d6`, `1d20`)
- Supports modifiers (e.g., `1d20+5`, `3d6-2`)
- Shows individual die results
- Maintains roll history
- Validates input and handles errors

### IndexedDB Persistence

Uses Dexie.js for structured storage:
- Auto-save on game state changes (debounced)
- Store multiple games locally
- Full game state serialization
- Import/export as JSON files
- Survives browser refresh and closure

```typescript
// Database schema
db.games.add({
  id: gameId,
  name: gameName,
  state: gameState,
  lastModified: Date.now()
});
```

### Layer Optimization

Canvas layers consolidated to 4 (optimized from 6):
- **Background Layer**: Grid and background color
- **Map Layer**: Map images and GM-only elements
- **Drawing Layer**: All shapes, tokens, text combined
- **UI Layer**: Current drawing preview, fog of war overlay

### Operational considerations

- Room codes are bearer secrets. Share the generated fragment link privately and create a new room when a code should be rotated.
- The resume credential protects a player's identity inside a room; it does not turn the bearer room into an account or replace private invite handling.
- Public tracker and STUN/TURN services have no application-owned SLA. A production deployment should provision monitored signaling and short-lived TURN credentials.
- The GM browser is the authority and persistence owner; closing it pauses the live session until the GM reconnects.

## 🚀 Getting Started

### Prerequisites
- Node.js 22.12+
- npm or yarn

### Installation

```bash
cd vtt
npm install
```

### Development

```bash
npm run dev
```

Opens on `http://localhost:5174`

### Building

```bash
npm run build
```

Outputs to `dist/`

### Verification

```bash
npm run check          # typecheck, lint, and pure safety tests
npm run test:e2e       # Chromium and Firefox browser suites
npm run test:e2e:ai    # explicitly gated paid-provider tests
```

Paid AI tests require both `RUN_PAID_AI_TESTS=1` (set by the script) and an explicit `OPENROUTER_API_KEY`. Normal test discovery never reads local environment files for a key.

### Production deployment

The production host expects Nginx and Certbot on the existing Ubuntu VPS, a
deployment account with non-interactive `sudo`, DNS for `lychgate.sammak.in` to
point at that host, and inbound TCP ports 80 and 443 to be open. Pin the VPS host
key in the trusted machine's SSH `known_hosts` file before running either script;
both scripts refuse unknown or changed host keys. Run the server bootstrap with:

```bash
LETSENCRYPT_EMAIL=admin@example.com bash init-server.sh
```

The setup is safe to rerun. It obtains or renews the certificate through the
ACME webroot, redirects HTTP to HTTPS, installs the renewal reload hook, and
validates Nginx before reloading it. The generated configuration includes the
app-compatible CSP, Permissions Policy, HSTS, and standard browser security
headers. Existing files in the legacy document root are retained as the first
versioned release.

Production releases run through the GitHub deployment workflow on pushes to
`main` or by manual dispatch. In addition to the existing `VPS_HOST`, `VPS_USER`,
`VPS_SSH_KEY`, and `VPS_PATH` secrets, configure `VPS_SSH_KNOWN_HOSTS` with the
VPS host key obtained through a trusted channel. The workflow deliberately fails
closed when that pinned host key is absent or does not match `VPS_HOST`.
Set `VPS_PATH` to `/var/www/lychgate.sammak.in/html`, which is the document root
configured by `init-server.sh`.

Deployments are uploaded as versioned releases beneath the configured
`VPS_PATH/releases`. Activation atomically replaces the `current` symlink, then
checks an uncached release marker over public HTTPS. A failed check restores the
previous release automatically. Old releases are retained for manual rollback
and should only be pruned after confirming they are not the target of `current`.

For a manual release, use the workflow's `workflow_dispatch` trigger so the same
checks, atomic activation, health check, and rollback path are retained.

## 🎮 Usage

### As GM:
1. Click "Create Game"
2. Enter game name and your name
3. Share the QR code or room ID with players
4. **Toolbar**: Select tools to draw shapes, place tokens, add text, measure distances, reveal fog
5. **Sidebar**:
   - Add/configure tokens with TokenConfigModal
   - Manage combat tracker (initiative, HP, turns)
   - Roll dice with standard notation
   - Toggle fog of war
   - Export/import game state
6. **Canvas**: Pan (right-click drag), zoom (scroll), ping locations, move tokens
7. **Auto-save**: Game automatically saves to IndexedDB

### As Player:
1. Click "Join Game" tab
2. Scan QR code or enter room ID
3. Enter your name and pick a color
4. Click "Join Game"
5. View shared canvas, see fog of war, participate in combat tracker
6. Limited editing based on GM permissions

## 📦 Dependencies

### Core
- `react` ^18.3.1
- `react-dom` ^18.3.1
- `typescript` ^5.5.2

### Canvas & Drawing
- `konva` ^9.3.6
- `react-konva` ^18.2.10

### P2P Networking
- `@trystero-p2p/torrent` 0.25.3

### State Management
- `zustand` ^4.5.2

### UI Components
- `@mantine/core` ^7.11.0
- `@mantine/hooks` ^7.11.0

### Utilities
- `nanoid` ^6.0.1 (cryptographically random IDs)
- `qrcode.react` ^3.1.0 (QR generation)

### Storage
- `dexie` ^4.0.4 (IndexedDB wrapper)

## 🔗 Integration with Main App

Future plans:
- Import generated story scenes as map backgrounds
- Link story choices to game state
- Share character data between story mode and VTT
- Unified session management

## 📝 License

Part of the Lychgate project.

## 🤝 Contributing

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for current status and roadmap.
