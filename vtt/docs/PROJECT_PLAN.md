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

## Phase 3.5: P2P Polish & Bug Fixes ✅ COMPLETED

**Summary:** Fixed P2P broadcast gaps and improved cursor performance.

**Key Deliverables:**
- Undo/Redo now broadcasts full state sync to peers
- Copy/Cut/Paste operations broadcast element updates/deletions
- Cursor broadcasts throttled (10Hz max, 5px min delta)
- Client-side cursor interpolation for smooth movement

### Bug Fix 1: Undo/Redo P2P Sync
**Problem:** Undo/redo changes game state but doesn't broadcast to peers - players see inconsistent state.

**Root Cause:** `performUndo` and `performRedo` in `gameStore.ts` modify game state directly without calling any broadcast function. Currently called from `App.tsx` and `Toolbar.tsx` without follow-up sync.

**Fix:**
- After `performUndo`/`performRedo`, call `broadcastSync()` to push full state
- Simple approach since undo can affect multiple elements at once
- Only DM has undo authority, so DM-side broadcast is sufficient

**Files to modify:**
- `src/App.tsx` - Add `room.broadcastSync()` after `performUndo`/`performRedo`
- `src/components/Toolbar.tsx` - Same fix if undo/redo triggered from toolbar

**Complexity:** Low (single broadcast call after each operation)

### Bug Fix 2: Copy/Cut/Paste P2P Sync
**Problem:** Cut deletes elements and paste adds elements without broadcasting to peers.

**Root Cause:** `useClipboard.ts` calls `deleteElements` (line 49) and `addElements` (line 128) directly without any broadcast mechanism. The hook doesn't have access to the room.

**Fix:**
- Option A: Pass broadcast callbacks to `useClipboard` hook
- Option B: Add return values and handle broadcast at call site
- Option B is cleaner - return the affected element IDs/objects from cut/paste, then broadcast in the component that uses the hook

**Files to modify:**
- `src/hooks/useClipboard.ts` - Return cut element IDs and pasted elements
- `src/App.tsx` or `src/components/GameCanvas.tsx` - Handle broadcast after clipboard operations

**Complexity:** Medium (callback wiring through hook)

### Enhancement 1: Cursor Throttling & Smoothing
**Problem:** Cursor broadcasts on every mouse move (network flooding) and movements appear jerky on clients.

**Approach:**
- Throttle cursor broadcasts to max 10Hz (100ms interval)
- Only broadcast if position changed significantly (>5px delta)
- Add client-side interpolation for received cursor positions
- Use lerp (linear interpolation) to smooth cursor movement between updates

**Implementation:**
```typescript
// Throttle side (sender)
const throttledBroadcastCursor = throttle((position) => {
  if (distance(lastSent, position) > 5) {
    broadcastCursor(position);
    lastSent = position;
  }
}, 100);

// Smoothing side (receiver)
// Store target position and lerp current toward it each frame
useAnimationFrame(() => {
  currentPos = lerp(currentPos, targetPos, 0.2);
});
```

**Files to modify:**
- `src/hooks/useRoom.ts` - Add throttle wrapper around `broadcastCursor`
- `src/components/GameCanvas.tsx` - Add cursor interpolation for peer cursors, delta check before broadcast

**Complexity:** Medium (throttle + interpolation logic)

### Deferred/Dropped Items

The following items from original Phase 3.5 planning were dropped or deferred:

- **Player State Persistence** - DROPPED: Already auto-saves for both DM and players via IndexedDB
- **Retry Logic for Failed Broadcasts** - DEFERRED: Hash comparison + "Request Full Sync" already provides recovery mechanism
- **Delta Optimization** - DROPPED: Over-complicated for minimal gain; full element broadcasts are acceptable
- **Import/Export Peer Sync** - ALREADY FIXED: `ExportImportModal.tsx` already calls `room.broadcastSync()` after import (line 607-608)

### Future Consideration: Dice/Chat Integration
**Question:** Should dice rolls be displayed in chat instead of a separate panel?

**Benefits:**
- Single timeline of game events (rolls + conversation)
- Natural context for rolls ("I attack the goblin" → roll → result)
- Easier to review session history

**Implementation thoughts:**
- Dice rolls could be a special `ChatMessage` type with `type: 'roll'`
- Chat panel renders roll messages with formula/result formatting
- DiceRoller panel could remain for quick-roll buttons but output to chat

**Status:** Pending user decision - implement if desired after bug fixes

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
| v1.7.0 | P2P Polish | Undo/redo sync, clipboard sync, cursor throttling/interpolation |
| v2.0.0 | Integration | *(Future)* Main app integration |

---

*For detailed implementation notes and session logs, see [IMPLEMENTATION_DIARY.md](./IMPLEMENTATION_DIARY.md)*
