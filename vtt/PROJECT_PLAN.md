# Acererak VTT - Project Plan & Status

## 🎯 Project Goals

Build a **fully decentralized virtual tabletop** for TTRPGs where:
1. No backend server stores or routes game data
2. Peer-to-peer connections handle all real-time sync
3. DM's browser acts as source of truth
4. Players join via QR codes (easy mobile access)
5. Minimal, practical feature set for playing D&D online
6. Client-side storage only (IndexedDB, file exports)
7. Future integration with parent Acererak story generator app

## ✅ Completed Features (MVP Phase 1)

### Core Infrastructure
- [x] Project setup (Vite + React + TypeScript)
- [x] TypeScript types for all game entities
- [x] Zustand store for game state management
- [x] Mantine UI component library integration
- [x] Development environment configured

### P2P Networking
- [x] Trystero integration (BitTorrent strategy)
- [x] `useRoom` hook for P2P room management
- [x] Room creation with unique IDs
- [x] Room joining via room ID
- [x] Peer discovery and WebRTC connection
- [x] Action name byte limit fixes (<= 12 bytes)
- [x] Game state broadcast on peer join
- [x] Element update broadcasting
- [x] Element delete broadcasting
- [x] Player join/leave notifications
- [x] Cursor position broadcasting (implemented but not visualized)

### UI/UX
- [x] Lobby screen (create/join game)
- [x] QR code generation for room sharing
- [x] QR code display in lobby
- [x] Toolbar with tool selection
- [x] Sidebar with tabs (Tokens, Players, DM Tools)
- [x] Connection status indicator
- [x] Player count display
- [x] Responsive layout (AppShell)

### Canvas & Rendering
- [x] Konva.js canvas setup
- [x] Grid rendering (configurable size, color)
- [x] Grid toggle
- [x] Snap to grid toggle
- [x] Pan (drag canvas when pan tool selected)
- [x] Zoom (mouse wheel)
- [x] Viewport offset and scale management
- [x] Multi-layer rendering (Background, Grid, Map, Shapes, Tokens)
- [x] Element sorting by layer and z-index

### Drawing Tools
- [x] Freehand draw tool (✏️) **WORKING**
  - [x] Mouse/touch event handlers
  - [x] Live preview while drawing
  - [x] Save to game state on mouse up
  - [x] Broadcast drawings to peers
  - [x] Viewport transformation handling
- [x] Tool selection in toolbar
- [x] Tool-specific cursor styles
- [ ] Line tool - **PARTIALLY IMPLEMENTED** (saves as freehand)
- [ ] Rectangle tool - **PARTIALLY IMPLEMENTED** (saves as freehand)
- [ ] Circle tool - **PARTIALLY IMPLEMENTED** (saves as freehand)

### Token System
- [x] Token data model (name, HP, AC, image, size, conditions)
- [x] Token rendering (circular with image or placeholder)
- [x] Token dragging
- [x] HP bar visualization
- [x] Name label rendering
- [x] DM-only indicator badge
- [x] Add token form in sidebar
- [x] Token list in sidebar
- [x] Delete token button
- [x] Token selection highlighting
- [x] Snap to grid for token movement
- [ ] Token tool for click-to-place - **NOT IMPLEMENTED**

### Element Management
- [x] Shape element rendering (freehand, line, rectangle, circle, polygon)
- [x] Image element rendering
- [x] Text element rendering  
- [x] Element selection
- [x] Element deletion
- [x] Element visibility controls (all/DM/specific players)
- [x] Element locking

### DM Tools
- [x] DM role detection
- [x] Visibility control dropdown
- [x] Lock element checkbox
- [x] Delete element button
- [x] Fog of war toggle
- [ ] Fog reveal tool - **NOT IMPLEMENTED**
- [ ] Fog hide tool - **NOT IMPLEMENTED**

### Data Persistence
- [x] Export game to JSON file
- [x] Import game from JSON file
- [x] File download functionality
- [x] File upload functionality
- [ ] Auto-save to IndexedDB - **NOT IMPLEMENTED**
- [ ] Recent games list - **NOT IMPLEMENTED**

## 🚧 Known Issues & Bugs

### High Priority
1. **Drawing tools (line, rectangle, circle) don't work properly**
   - They save all drawings as freehand type
   - Need shape-specific logic for:
     - Line: first click = start, second click = end
     - Rectangle: first click = corner, drag to opposite corner
     - Circle: first click = center, drag to set radius
   - Currently all just record mouse movements like freehand

2. **Token tool doesn't work**
   - Button exists but no implementation
   - Should open modal or show quick-add UI
   - Should allow click-to-place on canvas

3. **Text tool doesn't work**
   - Button exists but no implementation
   - Should allow click-to-place text
   - Need inline editing UI

4. **Measure tool doesn't work**
   - Button exists but no implementation
   - Should show distance in grid cells
   - Need temporary line rendering

5. **Ping tool broadcasts but shows nothing**
   - Broadcasts position to peers
   - No visual indicator (should show animated circle/pulse)
   - Should auto-remove after ~2 seconds

### Medium Priority
6. **Konva performance warning**
   - Canvas has 6 layers (recommends 3-5)
   - Layers: Background, Grid, Map, Shapes, Tokens, CurrentDrawing
   - Could consolidate Background+Grid, or Shapes+CurrentDrawing

7. **Pan tool conflicts with element dragging**
   - Both use drag events
   - Need better UX (hold spacebar for pan?)
   - Or make pan mode lock element dragging

8. **No cursor visualization for other players**
   - Cursor positions are broadcast
   - Not rendered on canvas
   - Should show colored cursors with player names

9. **No visual feedback for players joining/leaving**
   - Events fire but no toast/notification
   - Should show "Player X joined" message

### Low Priority
10. **No QR scanner for mobile**
    - QR code display works
    - No built-in scanner (html5-qrcode installed but not used)
    - Players must manually type room ID

11. **No image URL validation**
    - Token/image URLs not validated
    - Broken images show as blank
    - Need error handling and placeholder

12. **Grid settings not exposed in UI**
    - Grid size, color hardcoded in defaults
    - Toggle works but can't customize
    - Need settings modal

## 📋 TODO - Next Phase

### Priority 1: Fix Existing Tools

#### 1.1 Line Tool
```typescript
// In GameCanvas.tsx, handleMouseDown/handleMouseUp
if (selectedTool === 'draw-line') {
  // Store start point on mouse down
  // On mouse move, show preview line from start to current cursor
  // On mouse up, save line with just 2 points
}
```

#### 1.2 Rectangle Tool
```typescript
// Similar to line but:
// - Calculate 4 corners from start point and current point
// - Save as ShapeElement with shapeType: 'rectangle'
// - Set width/height properties
```

#### 1.3 Circle Tool
```typescript
// Calculate radius from start point to current point
// Save as ShapeElement with shapeType: 'circle'
// Set radius or width/height properties
```

#### 1.4 Token Placement Tool
```typescript
// On click with token tool:
// - Show modal to configure token (name, HP, image)
// - Or use last-added token from sidebar as template
// - Place at clicked location (snapped to grid)
```

#### 1.5 Text Tool
```typescript
// On click with text tool:
// - Place text element at location
// - Show inline editor or modal
// - Save text content
```

#### 1.6 Measure Tool
```typescript
// On mouse down: record start point
// On mouse move: show line and distance label
// On mouse up: clear (don't save to game state)
// Distance = Math.sqrt(dx² + dy²) / cellSize
```

#### 1.7 Ping Visualization
```typescript
// Add to GameCanvas
const [pings, setPings] = useState<Array<{id, x, y, color, timestamp}>>([]);

// On broadcast receive:
setPings(prev => [...prev, {id: nanoid(), ...pingData}]);

// Render in top layer:
{pings.map(ping => (
  <Circle
    x={ping.x}
    y={ping.y}
    radius={20}
    stroke={ping.color}
    opacity={fadeOut animation}
  />
))}

// Auto-remove after 2s:
useEffect(() => {
  const timer = setTimeout(() => {
    setPings(prev => prev.filter(p => Date.now() - p.timestamp < 2000));
  }, 100);
});
```

### Priority 2: Player Cursors
```typescript
// In useRoom, track cursor positions:
const [cursors, setCursors] = useState<Record<string, {x, y}>>({});

onCursor((position, peerId) => {
  setCursors(prev => ({...prev, [peerId]: position}));
});

// Render in GameCanvas:
{Object.entries(cursors).map(([peerId, pos]) => (
  <Group key={peerId} x={pos.x} y={pos.y}>
    <Path data="M 0 0 L 12 16 L 7 16 L 0 24 Z" fill={playerColor} />
    <Text text={playerName} y={25} fontSize={12} />
  </Group>
))}
```

### Priority 3: Fog of War
```typescript
// Fog reveal tool:
// - Draw polygon on canvas
// - On complete, add to game.fogOfWar.revealed[]
// - Render as semi-transparent overlay except revealed areas

// Implementation:
<Layer>
  {game.fogOfWar.enabled && (
    <>
      {/* Full fog */}
      <Rect fill="rgba(0,0,0,0.7)" />
      {/* Revealed cutouts */}
      {game.fogOfWar.revealed.map(polygon => (
        <Shape
          sceneFunc={(ctx, shape) => {
            // Draw polygon and use globalCompositeOperation: 'destination-out'
          }}
        />
      ))}
    </>
  )}
</Layer>
```

### Priority 4: IndexedDB Persistence
```typescript
// Using Dexie
class GameDatabase extends Dexie {
  games!: Table<GameState>;
  
  constructor() {
    super('AcerekVTT');
    this.version(1).stores({
      games: 'id, name, updatedAt'
    });
  }
}

// Auto-save on game update
useEffect(() => {
  if (game) {
    db.games.put(game);
  }
}, [game]);

// Load recent games in lobby
const recentGames = await db.games.orderBy('updatedAt').reverse().limit(10).toArray();
```

### Priority 5: 5etools Integration
```typescript
// Monster/spell import
async function import5etools(name: string, type: 'monster' | 'spell') {
  const response = await fetch(
    `https://5e.tools/data/${ type === 'monster' ? 'bestiary' : 'spells'}/*.json`
  );
  const data = await response.json();
  const entry = data.find(e => e.name.toLowerCase() === name.toLowerCase());
  
  if (type === 'monster') {
    return {
      type: 'token',
      name: entry.name,
      hp: { current: entry.hp.average, max: entry.hp.average },
      ac: entry.ac[0],
      imageUrl: `https://5e.tools/img/${entry.source}/${entry.name}.png`,
      notes: formatStatBlock(entry)
    };
  }
}
```

### Priority 6: Combat Tracker
```typescript
// New sidebar tab
interface CombatTracker {
  active: boolean;
  round: number;
  currentTurn: number;
  combatants: Array<{
    id: string;  // links to token element
    name: string;
    initiative: number;
    hp: { current: number; max: number };
    conditions: string[];
  }>;
}

// UI:
// - Initiative input for each token
// - Sort by initiative
// - Next/previous turn buttons
// - Current turn highlighting
// - HP tracking synced with tokens
```

### Priority 7: Dice Roller
```typescript
// dice-lib.js is already included (from main app)
// Add dice roller panel:
// - Quick roll buttons (d4, d6, d8, d10, d12, d20, d100)
// - Custom formula input (e.g., "2d6+3")
// - 3D dice animation (using existing dice-lib)
// - Roll history
// - Broadcast rolls to all players
```

## 🎨 UI/UX Improvements Needed

### Toolbar
- [ ] Tool icons instead of emoji (more professional)
- [ ] Tooltips showing keyboard shortcuts
- [ ] Tool grouping (select/pan, draw tools, utility)
- [ ] Color picker for drawing tools
- [ ] Line width selector
- [ ] Undo/redo buttons

### Sidebar
- [ ] Collapsible sections  
- [ ] Search/filter tokens
- [ ] Bulk operations (select multiple, delete)
- [ ] Token thumbnails instead of just text
- [ ] Player avatars
- [ ] Context menu on right-click

### Canvas
- [ ] Minimap in corner
- [ ] Ruler guides when dragging
- [ ] Selection box (drag to select multiple)
- [ ] Copy/paste elements
- [ ] Keyboard shortcuts (Delete, Ctrl+C/V, etc.)
- [ ] Grid alignment indicators

### Settings Modal
- [ ] Grid size (cells)
- [ ] Cell size (pixels)
- [ ] Grid color
- [ ] Background color
- [ ] Default token size
- [ ] Auto-save interval
- [ ] Quality settings (layer limits)

## 🔄 Refactoring Opportunities

### 1. Layer Consolidation
Current structure has too many layers. Consolidate:
```typescript
// Instead of 6 layers:
Background, Grid, Map, Shapes, Tokens, CurrentDrawing

// Use 4 layers:
BackgroundAndGrid (listening: false)
StaticElements (Map + locked elements, listening: false)  
InteractiveElements (Shapes + Tokens, listening: true)
Overlay (CurrentDrawing + Pings + Cursors, listening: false)
```

### 2. Extract Drawing Logic
Create separate hook:
```typescript
// hooks/useDrawing.ts
export function useDrawing(tool: ToolType, onComplete: (element) => void) {
  // Handle all drawing logic
  // Return: isDrawing, preview, handlers
}
```

### 3. Element Components
Create reusable element components:
```typescript
// components/canvas/Token.tsx (already exists)
// components/canvas/Shape.tsx (already exists)
// components/canvas/MapImage.tsx (already exists)
// components/canvas/TextLabel.tsx (already exists)

// Add:
// components/canvas/Cursor.tsx
// components/canvas/Ping.tsx
// components/canvas/FogOfWar.tsx
```

### 4. Separate Concerns  
```typescript
// GameCanvas is too large (700+ lines)
// Split into:
// - useCanvasHandlers hook (mouse events)
// - useViewport hook (pan/zoom)
// - useDrawing hook (drawing logic)
// - RenderLayers component (layer rendering)
```

## 📊 Testing Strategy

### Unit Tests (Not Started)
- [ ] gameStore actions
- [ ] useRoom hook actions
- [ ] Element collision detection (future)
- [ ] Viewport transformation math

### Integration Tests (Not Started)
- [ ] Create game → join game flow
- [ ] Draw on canvas → peers receive update
- [ ] Add token → appears on other clients
- [ ] Export/import game integrity

### E2E Tests (Not Started)
- [ ] Full gameplay session
- [ ] Multi-peer connection stability
- [ ] Offline then reconnect behavior

## 🚀 Deployment Plan

### Phase 1: Local Development
- [x] Vite dev server
- [x] Hot module replacement
- [ ] Local HTTPS (for WebRTC testing on network)

### Phase 2: Static Hosting
- [ ] Build optimized bundle
- [ ] Deploy to GitHub Pages / Vercel / Netlify
- [ ] Configure for SPA routing
- [ ] Add meta tags for social sharing

### Phase 3: PWA (Future)
- [ ] Service worker for offline capability
- [ ] Web app manifest
- [ ] Install prompt
- [ ] Background sync

## 🔗 Integration with Main Acererak App

### Shared Components
- Dice roller (dice-lib.js)
- Character sheet system (future)
- Story generator scenes as VTT maps

### Data Flow
```
Story Mode (main app)
  ↓
Generate scene description + battle map
  ↓
Export as VTT-compatible JSON
  ↓
Import into VTT
  ↓
Play encounter on grid
  ↓
Story continues based on combat outcome
```

### Unified Session
- Single user account (future)
- Shared character data
- Campaign progression tracking
- Linked AI-generated content

## 📝 Documentation Needed

- [ ] API documentation for game state structure
- [ ] Contributing guide
- [ ] Architecture decision records (ADRs)
- [ ] User manual / tutorial
- [ ] Video walkthrough
- [ ] Keyboard shortcuts reference

## 🎯 Success Metrics (Future)

- Concurrent players per session (target: 6-8)
- Session stability (uptime %)
- Latency between peers (target: <100ms)
- Load time (target: <3s)
- Bundle size (target: <1MB)
- Browser compatibility (Chrome, Firefox, Safari, Edge)

## 🤝 Need Help With

If picking this up:
1. **Start with fixing existing tools** - Priority 1 section
2. **Test drawing tools thoroughly** - Only freehand works currently
3. **Add visual feedback** - Pings, cursors, notifications
4. **Consolidate layers** - Performance issue
5. **Write tests** - No test coverage currently

## 📞 Questions for Next Session

1. Should we keep emoji for tool icons or use proper iconography?
2. Target audience: casual players or advanced users? (affects complexity)
3. Mobile support priority - should we add touch gestures?
4. Fog of war: simple rectangles or complex polygons?
5. Combat tracker: basic or full DnD 5e rules integration?
