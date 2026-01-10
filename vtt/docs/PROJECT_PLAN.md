# Lychgate VTT - Project Plan & Status

## Overview

A **decentralized P2P Virtual Tabletop** - the VTT they can't turn off.

**Architecture Principles:**
1. **No server** - All data flows peer-to-peer via WebRTC
2. **DM authority** - DM's browser is source of truth (no CRDTs needed)
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

### P2P Networking (Phase 3 Complete)
- [x] Trystero integration (Torrent strategy with Node.js polyfills)
- [x] WebRTC peer connections with STUN/TURN servers
- [x] Room creation/joining via ID or QR code
- [x] Real-time state sync (elements, fog, combat, dice, chat)
- [x] Player cursors and ping visualization
- [x] Join/leave notifications
- [x] Enhanced connection state indicator (connected/syncing/disconnected/error)
- [x] DM disconnect detection with warning modal (`DMDisconnectModal` component)
- [x] Desync detection via djb2 state hash comparison
- [x] "Request Full Sync" recovery for desynced players
- [x] Element versioning (`version` field) for conflict resolution
- [x] DM-only action enforcement (FOW updates, grid settings)
- [x] Grid settings P2P broadcast (`gridUpd` action)
- [x] In-game chat system (`ChatPanel` component)
- [x] Whisper messages (DM-only visibility flag)

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
- [x] DM-only visibility option
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
- [x] Visibility toggle (all/DM only)
- [x] Lock toggle
- [x] Token properties (name, HP, AC, size, conditions, notes)
- [x] Shape properties (stroke color, fill color, stroke width)
- [x] Text properties (font, size, color, alignment, background)

### Persistence & Data Management
- [x] Auto-save to IndexedDB (DM only)
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
- [x] Preview as player mode (DM)
- [x] Layer visibility controls (toggle grid, map, tokens, drawings, text, fog)
- [x] Marquee/box selection (multi-select)
- [x] Shift+click to add to selection
- [x] Batch move/delete for multiple elements

---

## Phase 3: P2P Reliability & State Sync ✅ COMPLETED

**Summary:** Implemented robust P2P state synchronization with DM authority model.

**Key Deliverables:**
- Connection state machine (connected/syncing/disconnected/error)
- DM disconnect detection with player notification
- State hash comparison for desync detection + recovery
- Element versioning for conflict resolution
- DM-only action enforcement
- Grid settings broadcast
- In-game chat with whispers

*See "P2P Networking" in Completed Features for full details.*

---

## Phase 3.5: P2P Polish & Optimization (NEXT)

**Context:** Phase 3 established the foundation for reliable P2P sync. These enhancements improve resilience, performance, and user experience for edge cases.

### Priority 1: Player State Persistence
**Problem:** Players lose everything on disconnect/refresh - must wait for DM to resync.

**Approach:**
- Cache game snapshot to IndexedDB on each sync received
- Store with `roomId` as key, include `lastSyncedAt` timestamp
- On rejoin same room, preload cached state immediately (faster perceived load)
- Then request fresh sync from DM to get latest changes
- Show "Cached from [timestamp]" indicator until fresh sync arrives
- Auto-expire cached games after 7 days

**Files to modify:**
- `src/db/database.ts` - Add `saveCachedGame()`, `getCachedGame()`, `cleanupExpiredCaches()`
- `src/hooks/useRoom.ts` - Cache on `onSync`, preload on `joinExistingRoom`
- `src/components/Lobby.tsx` - Show cached games with "rejoin" option

**Complexity:** Medium (new IndexedDB operations, UI for cached games)

### Priority 2: Cursor Throttling
**Problem:** Cursor broadcasts on every mouse move, flooding the network.

**Approach:**
- Throttle cursor broadcasts to max 10Hz (100ms interval)
- Use `requestAnimationFrame` or `setTimeout` throttle pattern
- Only broadcast if position changed significantly (>5px delta)
- Consider reducing broadcast rate when many peers connected (>4 peers → 5Hz)

**Files to modify:**
- `src/hooks/useRoom.ts` - Add throttle wrapper around `broadcastCursor`
- `src/components/Canvas.tsx` - Cursor position delta check before broadcast

**Complexity:** Low (simple throttle pattern)

### Priority 3: Retry Logic for Failed Broadcasts
**Problem:** Network hiccups can cause lost updates with no recovery.

**Approach:**
- Wrap critical broadcasts (element updates, fog, combat) in retry logic
- Use exponential backoff: 100ms, 200ms, 400ms, then give up
- Track pending broadcasts in a queue
- On peer reconnect, flush pending queue
- Non-critical broadcasts (cursor, ping) don't need retry

**Files to modify:**
- `src/hooks/useRoom.ts` - Add `broadcastWithRetry()` wrapper, pending queue

**Complexity:** Medium (queue management, backoff timing)

### Priority 4: Delta Optimization for Element Updates
**Problem:** Full element objects broadcast on every move (wasteful for large tokens with notes).

**Approach:**
- For position-only updates, broadcast `{ id, x, y, version }` instead of full element
- Create `sendElementDelta` action for partial updates
- Full element sync only on property changes (name, HP, notes, etc.)
- Receiver merges delta into local element

**Files to modify:**
- `src/hooks/useRoom.ts` - Add `sendElDelta` action, `onElDelta` handler
- `src/stores/gameStore.ts` - Add `applyElementDelta()` function

**Complexity:** Medium (new action type, merge logic)

### Priority 5: Undo/Redo P2P Sync
**Problem:** Undo/redo is local-only - other players see inconsistent state.

**Approach:**
- When DM performs undo/redo, broadcast the resulting state change
- Option A: Broadcast affected elements after undo (simpler)
- Option B: Broadcast undo action itself (complex, requires history sync)
- Start with Option A - after `performUndo`/`performRedo`, broadcast changed elements
- Players don't have undo authority - only DM undos are synced

**Files to modify:**
- `src/stores/gameStore.ts` - Track changed elements in undo/redo
- `src/hooks/useRoom.ts` - Broadcast changes after DM undo

**Complexity:** Medium (tracking what changed in undo)

### Priority 6: Dice History Persistence
**Problem:** Dice roll history lost on refresh.

**Approach:**
- Persist `diceRolls` array to IndexedDB as part of game save
- Already saved as part of GameState, but need to ensure it's included
- Add "Clear History" button to dice panel
- Consider separate "session log" that persists rolls + chat together

**Files to modify:**
- `src/db/database.ts` - Verify diceRolls included in save
- `src/components/DiceRoller.tsx` - Add clear history button

**Complexity:** Low (mostly verification, minor UI)

### Priority 7: Import/Export Peer Sync
**Problem:** When DM imports a game/scene, players don't see changes until manual sync.

**Approach:**
- After successful import, automatically call `broadcastSync()`
- Show toast: "Game imported and synced to X players"
- For scene imports (partial), broadcast only affected elements

**Files to modify:**
- `src/components/ExportImportDialog.tsx` - Add `room.broadcastSync()` after import
- Pass room prop to dialog or use callback pattern

**Complexity:** Low (single broadcast call after import)

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
- [ ] Secret rolls (DM only)
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
| v1.6.0 | P2P Reliability | Connection status, DM disconnect, desync detection, element versioning, chat |
| v2.0.0 | Integration | *(Future)* Main app integration |

---

*For detailed implementation notes and session logs, see [IMPLEMENTATION_DIARY.md](./IMPLEMENTATION_DIARY.md)*
