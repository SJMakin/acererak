# Lychgate VTT - Project Plan & Status

## Overview

A **decentralized P2P Virtual Tabletop** - the VTT they can't turn off.

**Architecture Principles:**
1. **No server** - All data flows peer-to-peer via WebRTC
2. **GM authority** - GM's browser is source of truth (no CRDTs needed)
3. **URL-based assets** - Images via external URLs (no file hosting)
4. **Client-side storage** - IndexedDB for persistence, JSON for export
5. **Minimal dependencies** - Keep bundle small for fast P2P sync

---

## Completed Features

### Core Infrastructure
- [x] Vite + React + TypeScript project setup
- [x] Zustand state management
- [x] Mantine UI component library
- [x] Konva.js canvas rendering (4 optimized layers)

### P2P Networking (Phase 3 & 3.5 Complete)
- [x] Trystero integration (Torrent strategy with Node.js polyfills)
- [x] WebRTC peer connections with STUN/TURN servers
- [x] Room creation/joining via ID or QR code
- [x] Real-time state sync (elements, fog, combat, dice, chat)
- [x] Player cursors with throttling (10Hz max, 5px min delta)
- [x] Client-side cursor interpolation for smooth movement
- [x] Ping visualization with animated pulse effect
- [x] Join/leave notifications
- [x] Enhanced connection state indicator (connected/syncing/disconnected/error)
- [x] GM disconnect detection with warning modal (`GMDisconnectModal` component)
- [x] Desync detection via djb2 state hash comparison
- [x] "Request Full Sync" recovery for desynced players
- [x] Element versioning (`version` field) for conflict resolution
- [x] GM-only action enforcement (FOW updates, grid settings)
- [x] Grid settings P2P broadcast (`gridUpd` action)
- [x] In-game chat system (`ChatPanel` component)
- [x] Whisper messages (GM-only visibility flag)
- [x] Undo/redo state synchronization
- [x] Copy/cut/paste operations broadcast

### Canvas & Tools
- [x] Grid rendering (square, hex, gridless with configurable size/color/opacity)
- [x] Pan & zoom controls
- [x] Drawing tools: freehand, line, rectangle, circle, ellipse, polygon, arrow
- [x] Token placement with configuration modal
- [x] Text labels with styling
- [x] Measure tool with waypoints and difficult terrain modifier
- [x] Ping tool (animated visual indicator)
- [x] Fog of War (reveal/hide tools)
- [x] Area Effect Templates: circle, cone, triangle, line, square (color-coded)

### Token System
- [x] Drag-to-move with grid snapping
- [x] Properties: name, HP, AC, conditions, size, notes
- [x] HP bar visualization
- [x] AC badge display
- [x] Condition badges
- [x] GM-only visibility option
- [x] Current turn indicator (combat)

### Combat Tracker
- [x] Initiative tracking and sorting
- [x] Round counter
- [x] Turn advancement (next/previous)
- [x] HP sync with tokens
- [x] Add/remove combatants
- [x] P2P sync

### Dice Roller
- [x] Formula parser (e.g., `2d6+3`, `1d20+5`)
- [x] Quick roll buttons (d4-d100)
- [x] Advantage/disadvantage
- [x] Roll history
- [x] P2P broadcast

### Property Inspector
- [x] Position editing (X, Y)
- [x] Z-index controls (bring forward/send backward)
- [x] Visibility toggle (all/GM only)
- [x] Lock toggle
- [x] Token properties (name, HP, AC, size, conditions, notes)
- [x] Shape properties (stroke color, fill color, stroke width)
- [x] Text properties (font, size, color, alignment, background)

### Persistence & Data Management
- [x] Auto-save to IndexedDB (GM only)
- [x] Recent games list in lobby
- [x] Export/Import with selective categories (v2 format)
- [x] Merge vs replace import modes
- [x] Token & Map Library with IndexedDB storage
- [x] 8 default token templates (Goblin, Orc, Skeleton, etc.)
- [x] Markdown notes on tokens, images, and standalone campaign journal

### UI/UX
- [x] Toolbar with professional icons (Tabler)
- [x] Drawing style controls (stroke/fill color, width)
- [x] Undo/redo functionality
- [x] Copy/paste elements
- [x] Keyboard shortcuts
- [x] Settings modal (grid, tokens, preferences)
- [x] Preview as player mode (GM)
- [x] Layer visibility controls (toggle grid, map, tokens, drawings, text, fog)
- [x] Marquee/box selection (multi-select)
- [x] Shift+click to add to selection
- [x] Batch move/delete for multiple elements

---

## Phase 3: Scene System & Core UX

**Status:** In Progress

**Priority:** High (core functionality gaps blocking real gameplay)

### 3.1 Multi-Scene Architecture ⭐ HIGH PRIORITY

Refactor from single-scene to multi-scene game model.

**New Data Model:**
```typescript
interface GameState {
  scenes: Scene[];           // Array of scenes
  activeSceneId: string;     // Currently displayed scene
  players: Record<...>;      // Global - persist across scenes
  combat?: CombatTracker;    // Global - persist across scenes
  chatMessages?: ChatMessage[];  // Global
  campaignNotes?: CampaignNote[];  // Global
}

interface Scene {
  id: string;
  name: string;
  backgroundUrl?: string;    // THE MAP (first-class, not an element)
  gridSettings: GridSettings; // Per-scene grid config
  elements: CanvasElement[]; // Tokens, drawings, images, text
  fogOfWar: FogOfWar;        // Per-scene fog
}
```

**Key Design Decisions:**
- **Background image** is a scene property, not an element (THE map identity)
- **Grid settings** are per-scene (different maps need different grids)
- **Combat tracker** is global (initiative persists when switching scenes)
- **Tokens/elements** are per-scene (stay on their scene)
- **Players** only see active scene (GM controls switching)
- **Scene management** is GM-only (players don't see scene list)

**Files to modify:**
- `src/types/index.ts` - Add Scene interface, update GameState
- `src/stores/gameStore.ts` - Refactor for multi-scene, add scene CRUD actions
- `src/hooks/useRoom.ts` - Add `sceneSwitch` P2P action
- `src/db/database.ts` - Update schema if needed

**Complexity:** High (architectural change)

---

### 3.2 Scene Picker UI ✅ DONE

Add dropdown scene picker in toolbar for quick scene switching.

**UI Components:**
- Dropdown in toolbar showing current scene name
- List of all scenes with click-to-switch
- "+ New Scene" option at bottom
- "Manage Scenes" option (opens modal for rename/delete/reorder)
- "Duplicate Scene" option (copy current as new)

**Scene Creation Modal:**
```
┌─────────────────────────────────────┐
│ Create New Scene                    │
├─────────────────────────────────────┤
│ Scene Name: [___________________]   │
│                                     │
│ Background Image (optional):        │
│ [https://...                     ]  │
│ [Image preview if URL valid]        │
│                                     │
│ Grid Settings:                      │
│ Type: [Square ▼]  Size: [32]px      │
│ [x] Show grid   Color: [#ccc]       │
│                                     │
│ [ ] Copy elements from current scene│
│                                     │
│         [Cancel]  [Create Scene]    │
└─────────────────────────────────────┘
```

**Grid Settings Migration:**
- Remove grid settings from Settings modal (no longer game-wide)
- Grid is configured per-scene in scene creation/edit modal
- Each scene has its own `gridSettings` (type, size, color, opacity, visible)
- Settings modal retains: token defaults, UI preferences, keybinds

**Files to modify:**
- `src/components/Toolbar.tsx` - Add scene dropdown
- `src/components/SceneModal.tsx` - New component for create/edit scene
- `src/components/SceneManager.tsx` - New component for list management

**Complexity:** Medium (new UI components, gameStore integration)

---

### 3.3 Image Tool ⭐ HIGH PRIORITY

Add image placement tool to toolbar (for non-background images: handouts, props, overlays).

**Behavior:**
1. Click image tool icon in toolbar
2. Click on canvas where image should be placed
3. Modal opens asking for URL (and optional size)
4. Image element created at click position
5. Image properties editable in PropertyInspector sidebar

**Files to modify:**
- `src/components/Toolbar.tsx` - Add image tool button
- `src/components/GameCanvas.tsx` - Handle image tool click → open modal
- `src/components/ImageModal.tsx` - New modal for URL input
- `src/components/PropertyInspector.tsx` - Ensure image properties work

**Complexity:** Low-Medium (follows token tool pattern)

---

### 3.4 Dice/Chat Integration

Combine dice rolls into chat timeline as special message type.

**Changes:**
- Dice rolls become `ChatMessage` with `type: 'roll'`
- ChatPanel renders roll messages with formula/result formatting
- DiceRoller panel remains for quick-roll buttons but sends to chat
- Remove separate `diceRolls[]` from game state (use chatMessages)

**Files to modify:**
- `src/types/index.ts` - Add roll type to ChatMessage
- `src/components/DiceRoller.tsx` - Send rolls to chat instead of separate history
- `src/components/ChatPanel.tsx` - Render roll messages with special formatting
- `src/stores/gameStore.ts` - Remove diceRolls, rolls go through chat

**Complexity:** Medium (refactor two systems into one)

---

### 3.5 Game Menu & Room Sharing

Fix missing room sharing after game starts + clean up Game menu.

**Current Issue:** Once in-game, no way to share Room ID/QR with latecomers.

**New Game Menu Structure:**
```
Game
├─ Share Game
│   ├─ Copy Room ID
│   ├─ Show QR Code
│   └─ Copy Join Link
├─ ─────────────
├─ Save/Load...      ← Combines Export/Import into one modal
├─ Settings...
└─ ─────────────
└─ Leave Game
```

**Files to modify:**
- `src/components/App.tsx` or `src/components/GameMenu.tsx` - Restructure menu
- `src/components/ShareGameModal.tsx` - New modal with QR/ID/link options

**Complexity:** Low (UI reorganization)

---

### 3.6 Bug Fixes ✅ DONE

**Ping P2P visibility:**
- Pings work locally but not across P2P sessions
- `useRoom.ts` receives pings but doesn't expose them to GameCanvas
- Need callback or store update so GameCanvas can render received pings

**Solution Implemented:**
- Added `pings` state and `addPing` action to game store
- Updated `useRoom.ts` to call `addPing` when receiving pings from peers
- Updated `GameCanvas.tsx` to use pings from game store instead of local hook

**Files modified:**
- `src/stores/gameStore.ts` - Added pings state and addPing action
- `src/hooks/useRoom.ts` - Wire up onPing handler to call addPing
- `src/components/GameCanvas.tsx` - Use pings from game store

**Complexity:** Low (wire up existing systems)

---

### 3.7 Library Simplification ✅ DONE

Simplify Library to tokens only. Remove "scene" and "map" types.

**Rationale:**
- **Tokens** have valuable template data (HP, AC, conditions, size, notes) - worth saving
- **Maps** are just image URLs - paste directly when creating scene background
- **Scenes** are shared via file export (includes background, grid, elements, fog)
- **Overlay images** are less reusable than tokens, can be in scene exports if needed

**Changes:**
- Library supports: `token` only (remove type filter entirely)
- Remove scene-related code from libraryStore
- Remove map-related code from libraryStore
- Simplify LibraryPanel UI (no filter dropdown needed)
- "Save to Library" option only appears for tokens

**Files modified:**
- `src/types/index.ts` - Simplified LibraryItemType to just 'token'
- `src/stores/libraryStore.ts` - Removed addSceneToLibrary, addMapToLibrary, getSceneTemplates, getMapTemplates; removed unused imports (ImageElement, SceneExport, ImageTemplateData)
- `src/components/LibraryPanel.tsx` - Removed map/scene filter options, simplified getItemIcon to only return token icon
- `src/components/ExportImportModal.tsx` - Updated import logic to only handle token library items

**Complexity:** Low (removal/simplification)

---

### 3.8 Export/Import with Multi-Scene

Update export/import system to handle multi-scene game structure.

**Export File Format (v3):**
```typescript
interface ExportFileV3 {
  version: 3;
  exportedAt: string;
  gameName: string;
  // Selective export - any combination of:
  scenes?: Scene[];           // Selected scenes with all their data
  combat?: CombatTracker;     // Global combat state
  chatMessages?: ChatMessage[]; // Chat history
  campaignNotes?: CampaignNote[]; // Notes
  libraryItems?: LibraryItem[];  // Token/map templates
}
```

**Export UI Changes:**
- Tree view now shows scenes as top-level items with children:
  ```
  ☑ Scenes
    ☑ Tavern (12 elements)
    ☑ Dungeon Level 1 (8 elements)
    ☐ Dungeon Level 2 (3 elements)
  ☑ Combat Tracker
  ☑ Chat History
  ☑ Campaign Notes
  ☑ Library (tokens/maps)
  ```
- "Export All" selects everything
- "Export Current Scene" quick option
- Individual scene selection for sharing specific maps

**Import Behavior:**
- **Scenes**: Add to game's scene list (don't replace)
- **Combat/Chat/Notes**: Merge or replace option (as current)
- **Library**: Merge into existing library
- Importing scenes from another game = easy scene sharing

**Scene Sharing Workflow:**
1. GM A exports "Tavern" scene from their game
2. GM B imports the `.vtt.json` file
3. "Tavern" appears in GM B's scene dropdown
4. No need for separate "scene library" - just file sharing

**Files to modify:**
- `src/types/index.ts` - Update ExportFile interface to v3
- `src/components/ExportImportModal.tsx` - Update tree view for scenes
- `src/stores/gameStore.ts` - Update import logic for scene merging

**Complexity:** Medium (existing UI, new data structure)

---

### 3.9 Mobile Support

- [ ] Ensure create/join game forms fit on mobile screen
- [ ] Touch gesture optimization (pinch zoom, two-finger pan)
- [ ] Mobile-friendly toolbar layout
- [ ] Responsive sidebar
- [ ] Touch-friendly element selection

**Complexity:** Medium (responsive design, touch events)

---

### Future Improvements (Deferred)

**Token sidebar redesign:**
- Current sidebar token section not properly functional
- Need to improve token list UX
- Add player token ownership/assignment
- **Status:** Deferred to Phase 4+ (requires design thinking)


---

## ~~Phase 3: P2P Reliability & State Sync~~ ✅ COMPLETED (v1.6.0)

**Summary:** Implemented robust P2P state synchronization with GM authority model.

**Key Deliverables:**
- Connection state machine (connected/syncing/disconnected/error)
- GM disconnect detection with player notification
- State hash comparison for desync detection + recovery
- Element versioning for conflict resolution
- GM-only action enforcement
- Grid settings broadcast
- In-game chat with whispers

*Moved to "P2P Networking" in Completed Features.*

---

## ~~Phase 3.5: P2P Polish & Bug Fixes~~ ✅ COMPLETED (v1.7.0)

**Summary:** Fixed P2P broadcast gaps and improved cursor performance.

**Key Deliverables:**
- Undo/redo state synchronization
- Copy/cut/paste operations broadcast
- Cursor throttling (10Hz max, 5px min delta)
- Client-side cursor interpolation

*Moved to "P2P Networking" in Completed Features.*

---

## Phase 4: Canvas & Tools Enhancements (ON HOLD)

*Lower priority than P2P reliability*

### Future Enhancements
- [ ] Layer dropdown in Property Inspector (manually move elements between layers)
- [ ] Token rotation control
- [ ] Aura/radius indicator option
- [ ] Status effect icons (expanded set)

---

## Phase 5: Quality of Life (ON HOLD)

### Canvas Improvements
- [ ] Minimap in corner
- [ ] Fit-to-content button
- [ ] Center on selected element
- [ ] Alignment guides when moving elements

### Combat Tracker
- [ ] Drag to reorder initiative
- [ ] Roll initiative button (auto-roll d20)
- [ ] Timer per turn (optional)
- [ ] Delay/ready actions

### Dice Roller
- [ ] Save favorite formulas
- [ ] Roll macros (save full roll sequences)
- [ ] Secret rolls (GM only)
- [ ] Target number highlighting

---

## Phase 6: Technical Improvements (ON HOLD)

### Performance
- [ ] Virtual rendering for large element counts
- [ ] Debounce P2P updates during rapid changes
- [ ] Image caching optimization

### Mobile Support
- [ ] Touch gesture optimization (pinch zoom, two-finger pan)
- [ ] Mobile-friendly toolbar layout
- [ ] Responsive sidebar
- [ ] Touch-friendly element selection

### Testing
- [ ] Unit tests for gameStore actions
- [ ] Unit tests for diceParser
- [ ] E2E tests for create/join flow
- [ ] P2P connection stability tests

---

## Phase 7: Main App Integration (ON HOLD)

- [ ] Import generated scene as VTT background (via URL)
- [ ] Share character data between apps
- [ ] Deploy as integrated module
- [ ] Unified visual theme

---

## Deployment

### GitHub Actions CI/CD

Automated deployment to VPS via SCP on push to main branch.

**Workflow:** `.github/workflows/deploy-vtt.yml`

**Required GitHub Secrets:**
- `VPS_HOST` - Server hostname or IP
- `VPS_USER` - SSH username
- `VPS_SSH_KEY` - Private SSH key (ed25519 or RSA)
- `VPS_PATH` - Deployment path (e.g., `/var/www/vtt`)

**Pipeline Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Build production bundle (`npm run build`)
5. SCP `dist/` folder to VPS
6. Optional: Restart nginx or run post-deploy script

**Trigger:** Push to `main` branch (paths: `vtt/**`)

---

## Out of Scope (Architecture Constraints)

These features don't fit the decentralized design:

- **File upload hosting** - No server (use external URLs)
- **User accounts** - No backend for authentication
- **Real-time cross-device sync** - Sessions are per-device (use export/import)
- **Audio file hosting** - No server (external URLs possible)
- **Server-side automation** - All logic runs client-side
- **Cloud backup** - No central storage (local IndexedDB + file exports)

---

## Success Metrics

- **Concurrent players**: 6-8 per session
- **P2P latency**: <100ms
- **Load time**: <3s
- **Bundle size**: <1MB
- **Browser support**: Chrome, Firefox, Safari, Edge

---

## Version History

| Version | Focus | Key Features |
|---------|-------|--------------|
| v1.0.0 | MVP | Core VTT, P2P networking, combat tracker, dice roller |
| v1.1.0 | Asset Management | Token library, 8 default templates, marquee selection |
| v1.2.0 | Notes System | Markdown notes, campaign journal |
| v1.3.0 | Export/Import | Selective export, merge/replace modes, v2 format |
| v1.4.0 | Canvas | Hex/gridless, AOE templates, multi-select operations |
| v1.5.0 | Measurement | Waypoint paths, difficult terrain modifier |
| v1.6.0 | P2P Reliability | Connection status, GM disconnect, desync detection, element versioning, chat |
| v1.7.0 | P2P Polish | Undo/redo sync, clipboard sync, cursor throttling/interpolation |
| v1.8.0 | Scene System | Multi-scene architecture, scene picker, image tool, dice/chat integration, export v3 format |
| v1.8.1 | Bug Fixes | Ping P2P visibility fix |
| v2.0.0 | Integration | *(Future)* Main app integration |

---

*For detailed implementation notes and session logs, see [IMPLEMENTATION_DIARY.md](./IMPLEMENTATION_DIARY.md)*
