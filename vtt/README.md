# Acererak VTT - Decentralized Virtual Tabletop

A peer-to-peer virtual tabletop for TTRPGs built with React, Konva.js, and Trystero. **No server needed** - all game data flows directly between players via WebRTC.

## 🎯 Project Vision

Create a fully client-side, decentralized VTT where:
- The DM's browser is the source of truth
- Game state syncs in real-time via P2P connections
- No backend stores or routes any game data
- Players can join via QR codes or room IDs
- Everything works offline once peers are connected

This is intended to eventually integrate with the main Acererak app (the choose-your-own-adventure story generator in the parent directory) but is being developed as a standalone module first.

## 🏗️ Architecture

### P2P Networking Stack

```
┌─────────────────────────────────────────────┐
│           DM's Browser (Authority)          │
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
- **Trystero** with BitTorrent strategy for signaling (no dedicated server)
- **WebRTC data channels** for P2P game state sync
- **Zustand** for client-side state management
- **Konva.js/react-konva** for canvas rendering
- **IndexedDB** (future) for local persistence
- **Mantine UI** for components

### Data Flow

1. DM creates game → generates unique room ID → creates Trystero room
2. Players scan QR or enter room ID → join Trystero room
3. Peers exchange SDP/ICE via BitTorrent DHT
4. WebRTC data channels established
5. DM broadcasts game state → peers receive and sync
6. All changes broadcast via P2P (no centralized state)

### Action Name Constraints

Trystero has a **12-byte limit** on action names. We use shortened names:
- `sync` - Full game state sync
- `elUpdate` - Element update (not `element-update`)
- `elDelete` - Element delete
- `plyJoin` - Player join (not `player-join`)
- `plyLeave` - Player leave
- `reqSync` - Request sync
- `cursor` - Cursor position
- `ping` - Ping location

## 📁 Project Structure

```
vtt/
├── src/
│   ├── components/
│   │   ├── Lobby.tsx          # Create/join game UI with QR codes
│   │   ├── GameCanvas.tsx     # Main Konva canvas (grid, tokens, drawing)
│   │   ├── Toolbar.tsx        # Tool selection bar (select, pan, draw, ping)
│   │   ├── Sidebar.tsx        # Token list, player list, DM tools
│   │   ├── App.tsx            # Main app shell
│   │   └── ...
│   ├── hooks/
│   │   └── useRoom.ts         # Trystero P2P room management hook
│   ├── stores/
│   │   └── gameStore.ts       # Zustand game state store
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   ├── main.tsx               # App entry point
│   └── index.css              # Global styles
├── public/                    # Static assets
├── package.json               # Dependencies
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript config
└── README.md                  # This file
```

## 🎨 Core Features Implemented

### ✅ Lobby & Connection
- Create game as DM
- Generate QR code for room ID
- Join game as player (via QR or manual ID)
- Real-time connection status

### ✅ Canvas System
- 30x30 grid (configurable size)
- Pan & zoom controls
- Grid toggle and snap-to-grid
- Viewport transformation (offset + scale)

### ✅ Drawing Tools
- **Freehand Draw** (✏️) - Working
- **Line Tool** (📏) - Needs implementation
- **Rectangle Tool** (⬜) - Needs implementation  
- **Circle Tool** (⭕) - Needs implementation
- Live preview while drawing
- Saves to game state on mouse up

### ✅ Token System
- Add tokens via sidebar
- Drag to move (with snap-to-grid)
- Token properties: name, HP, AC, image URL, size
- HP bar visualization
- DM-only visibility option

### ✅ DM Controls
- Mark elements as DM-only or visible to all
- Lock/unlock elements
- Delete elements
- Fog of war toggle (logic not implemented)

### ✅ Export/Import
- Export game as `.vtt.json` file
- Import game from file
- Full game state serialization

### ✅ P2P Sync
- Broadcast element updates
- Broadcast element deletions
- Broadcast cursor positions
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
- Visibility (`all`, `dm`, or specific peer IDs)
- Z-index for layering
- Locked state

### Drawing Implementation

Freehand drawing works by:
1. `onMouseDown`: Start drawing, record first point
2. `onMouseMove`: Append points while `isDrawing.current === true`
3. `onMouseUp`: Save shape to game state, broadcast to peers

Points are transformed to account for viewport offset and scale:
```typescript
const x = (pos.x - viewportOffset.x) / viewportScale;
const y = (pos.y - viewportOffset.y) / viewportScale;
```

Live preview shown via a separate Konva Layer with the current line.

### Known Issues

1. **Layer Performance Warning**: Canvas has 6 layers (Konva recommends 3-5)
   - Background, Grid, Map, Shapes/Drawing, Tokens, Current Drawing
   - Consider consolidating layers

2. **Drawing Tools**: Only freehand works currently
   - Line, rectangle, circle tools need proper shape creation logic
   - They currently save as freehand with wrong shape type

3. **Token Tool**: Not implemented
   - Should allow clicking canvas to place token
   - Need modal or quick-add UI

4. **Text Tool**: Not implemented
   - Should allow clicking canvas to add text
   - Need inline editing

5. **Measure Tool**: Not implemented
   - Should show distance in grid cells
   - Need line rendering with distance label

6. **Fog of War**: Toggle exists but no reveal/hide tools
   - Need polygon drawing for revealed areas
   - Need subtraction logic for hiding

7. **Ping Tool**: Broadcasts but no visual indicator
   - Need temporary animated circle/pulse effect

8. **Pan Tool**: Drag works but conflicts with element dragging
   - Need better differentiation (maybe hold space bar?)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
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

## 🎮 Usage

### As DM:
1. Click "Create Game"
2. Enter game name and your name
3. Share the QR code or room ID with players
4. Select tools from toolbar to draw, place tokens, etc.
5. Use sidebar to add tokens, manage visibility

### As Player:
1. Click "Join Game" tab
2. Scan QR code or enter room ID
3. Enter your name and pick a color
4. Click "Join Game"

## 📦 Dependencies

### Core
- `react` ^18.3.1
- `react-dom` ^18.3.1
- `typescript` ^5.5.2

### Canvas & Drawing
- `konva` ^9.3.6
- `react-konva` ^18.2.10

### P2P Networking
- `trystero` ^0.20.0

### State Management
- `zustand` ^4.5.2

### UI Components
- `@mantine/core` ^7.11.0
- `@mantine/hooks` ^7.11.0

### Utilities
- `nanoid` ^5.0.7 (unique IDs)
- `qrcode.react` ^3.1.0 (QR generation)
- `html5-qrcode` ^2.3.8 (QR scanning)

### Storage (planned)
- `dexie` ^4.0.4 (IndexedDB)
- `dexie-react-hooks` ^1.1.7

## 🔗 Integration with Main Acererak App

Future plans:
- Import generated story scenes as map backgrounds
- Link story choices to game state
- Share character data between story mode and VTT
- Unified session management

## 📝 License

Part of the Acererak project.

## 🤝 Contributing

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for current status and roadmap.
