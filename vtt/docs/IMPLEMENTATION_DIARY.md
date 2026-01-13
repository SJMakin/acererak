# Lychgate VTT - Implementation Diary

Development log and session notes for the Lychgate VTT project.

---

## 2026-01-07: Rebranding & First Deployment

### Rebranding from "Acererak" to "Lychgate"

**Why:** "Acererak" is a WotC trademark (the demilich from Tomb of Horrors). "Lychgate" is a public domain architectural term meaning "corpse gate" - the covered gateway at church entrances where coffins rested. Perfect gothic VTT vibes.

**Files Updated:**
- `index.html` - Title and meta description
- `src/components/Lobby.tsx` - Main heading
- `src/components/Toolbar.tsx` - Fallback game name
- `src/hooks/useRoom.ts` - APP_ID changed to `lychgate-vtt-v1`
- `src/types/index.ts` - Header comment
- `package.json` - Package name
- `README.md` - Documentation
- `PROJECT_PLAN.md` - This file
- `TEST_COVERAGE.md` - Test documentation
- `tests/e2e/game-creation.spec.ts` - E2E test assertions

**TypeScript Build Fixes:**
- Removed unused `LibraryExport` import in `ExportImportModal.tsx`
- Added missing `gridType: 'square'` to default gridSettings in `gameStore.ts`

**Deployment to https://lychgate.sammak.in/:**
- VPS: ubuntu@51.79.156.185
- Directory: `/var/www/lychgate.sammak.in/html/`
- Nginx configured with security headers and SPA fallback
- SSL certificate via Let's Encrypt (supports Cloudflare Full Strict mode)
- Old acererak deployment archived to `/var/www/acererak.sammak.in.archive/`

**New Files:**
- `deploy.sh` - Deployment script for future updates

---

## 2026-01-07: P2P Connectivity Fixes & Production Deployment

### Problem
E2E tests failing on deployed site - P2P signaling timeouts and race condition preventing game creation flow.

### Root Cause Analysis
1. **BitTorrent DHT Unreliability**: Original `trystero/torrent` signaling strategy was timing out after 30+ seconds due to UDP restrictions, firewalls, and ISP throttling in production environments
2. **Race Condition in Lobby**: `handleCreateGame` was calling `createGame()` synchronously, causing App.tsx to unmount Lobby component before "Game Created!" UI could display
3. **No Error Handling**: P2P connection failures weren't surfaced to users, leaving them with no feedback

### Solutions Implemented

**1. Switched to Nostr Signaling Strategy**
- Changed `useRoom.ts` line 30: `import('trystero/torrent')` → `import('trystero/nostr')`
- Nostr uses relay servers for signaling, more reliable than DHT in production
- Build output includes new nostr chunk: `nostr-Bryuhu65.js` (81.50 kB)

**2. Fixed Lobby Race Condition**
- Added `pendingGameData` state to store game info without creating game
- Split game creation into two phases:
  - Phase 1: Create P2P room and show "Game Created!" UI
  - Phase 2: Create game state when GM clicks "Start Game →"
- Prevents premature component unmounting

**3. Added Comprehensive Error Handling**
- Extended `RoomState` interface with `connectionState` and `error` fields
- Wrapped async operations in try-catch blocks in `createRoom` and `joinExistingRoom`
- Connection states: 'disconnected' | 'connecting' | 'connected' | 'error'

**4. Enhanced UI Feedback**
- Added loading spinners during P2P connection establishment
- Error alerts for connection failures (red Alert component)
- Connection status badge (green "Connected" badge)
- Disabled inputs during connection attempts
- Informative messages: "Establishing P2P connection... This may take up to 30 seconds."

**Files Modified:**
- `src/hooks/useRoom.ts` - Nostr signaling, connection states, error handling
- `src/components/Lobby.tsx` - Race condition fix, loading/error UI
- Build output updated with nostr signaling chunk

### Post-Deployment Issue & Fix

**Error:** "class heritage qD.Duplex is not an object or null" in browser console

**Initial misdiagnosis:** Thought Nostr was the problem, switched to IPFS - same error persisted

**Root cause:** ALL Trystero strategies (torrent, nostr, ipfs) use Node.js `stream.Duplex` internally, but Vite doesn't polyfill Node.js built-ins for browsers by default

**Actual solution:** Added `vite-plugin-node-polyfills` to bundle Node.js stream polyfills
- Installed: `npm install --save-dev vite-plugin-node-polyfills`
- Updated `vite.config.ts` with nodePolyfills plugin
- Polyfills: Buffer, global, process, and all Node.js built-in modules (including streams)
- Build output: `ipfs-B0df-ElT.js` (1,469.09 kB, gzip: 419.09 kB) - larger due to polyfills
- IPFS strategy retained for browser compatibility and reliability

---

## 2026-01-09: P2P Architecture Review & Priority Reordering

### Context
Comprehensive code review of P2P state synchronization revealed critical gaps.

### Key Findings

1. **Network vs Logic Mismatch**: Trystero creates a full mesh network (all peers connected to each other), but the state sync logic is hub-and-spoke (only GM sends full state). Players CAN see each other's incremental updates, but new players can only get initial state from GM.

2. **No Conflict Resolution**: Simultaneous edits cause last-write-wins race conditions. No versioning, no ordering guarantees. Element state becomes indeterminate if GM and player edit the same thing.

3. **Basic Connection Status Exists**: Toolbar shows green "Connected" badge and player count, but lacks syncing/error states and GM disconnect detection.

4. **GM Disconnect = Orphaned Players**: If GM closes browser, players stay "connected" to each other but can't get state. New players joining receive nothing. No warning shown.

5. **FOW Not GM-Only**: Any peer can broadcast fog updates. Should be restricted to GM.

6. **Grid Settings Not Synced**: GM changes grid, players see old grid. No P2P action for grid sync.

7. **Players Lose State on Refresh**: Only GM saves to IndexedDB. Players must rejoin and wait for full sync.

### Additional Concerns Identified

- Undo/Redo is local-only - not synced to peers
- No cursor throttling - broadcasts every mouse move (network spam potential)
- No retry logic - failed broadcasts silently dropped
- Dice history not persisted - lost on refresh
- No bandwidth optimization - full element objects broadcast on every move

### UX Gaps

- No visible peer list during gameplay
- No "syncing..." indicator during rapid updates
- Mobile touch gestures incomplete (no pinch-to-zoom)
- Import/export doesn't immediately update peers
- No in-game chat functionality

### Design Decisions Made

- **No CRDTs/Yjs needed**: GM authority model is correct for a VTT. Keep it simple.
- **Game should pause if GM disconnects**: Not crash, just pause with warning. Still "unkillable" - just waiting at the gate.
- **FOW is GM-only**: No conflict resolution needed, just enforce the restriction.
- **Simple versioning**: Add `version` field to elements. GM's version always wins.
- **State divergence not a major concern**: With GM authority, players always get corrected on next sync.

### Priority Reordering

- Phase 3 is now P2P Reliability (was Canvas/Tools)
- Phase 4 is Canvas/Tools (was Phase 3)
- Phase 5 is Quality of Life (was second half of Phase 3)
- Phase 6 is Main App Integration
- Phase 7 is Technical Improvements

---

## 2026-01-13: Phase 1 - Reactive Character Sheet System Foundation

### Overview
Implemented the foundation for the Reactive Character Sheet System using TipTap editor integration.

### What Was Implemented

**1. Dependencies Installed:**
- `@tiptap/react` - Core React bindings
- `@tiptap/starter-kit` - Basic editor extensions (bold, italic, headings, lists, etc.)
- `@tiptap/extension-mention` - Autocomplete foundation
- `@tiptap/pm` - Markdown serialization
- `expr-eval` - Expression evaluation (for future phases)

**2. New Files Created:**

| File | Purpose |
|------|---------|
| `src/types/character.ts` | Character interface definition |
| `src/stores/characterStore.ts` | Zustand store with CRUD operations |
| `src/components/character/CharacterSheetEditor.tsx` | TipTap editor component |
| `src/components/character/CharacterSheetModal.tsx` | Modal wrapper for editor |
| `src/components/character/CharacterLibraryPanel.tsx` | Character library UI |
| `src/components/character/CharacterSheetEditor.css` | Editor styling |
| `src/components/character/CharacterSheetModal.css` | Modal styling |
| `src/components/character/CharacterLibraryPanel.css` | Library panel styling |

**3. Type Modifications:**

- **`src/types/index.ts`:**
  - Added `characters?: Character[]` to `GameState` interface
  - Added `characterId?: string` to `TokenElement` interface
  - Re-exported `Character` and `CharacterP2PMessage` types
  - Made `fontWeight` optional in `StyleProps` (backward compat)

- **`src/types/character.ts`:**
  - Defined `Character` interface with content (TipTap JSON), shadowState, projections
  - Added `CharacterUpdateMessage` and `CharacterDeleteMessage` P2P types

**4. Database Updates:**

- **`src/db/database.ts`:**
  - Added `characters` table to IndexedDB (version 3)
  - Added `saveCharacters()`, `loadCharacters()`, `saveCharacter()`, `getCharacter()`, `deleteCharacter()` functions

**5. Store Implementation:**

- **`src/stores/characterStore.ts`:**
  - Zustand store with `characters`, `isLoading`, `isGM` state
  - CRUD actions: `addCharacter()`, `updateCharacter()`, `deleteCharacter()`, `getCharacterById()`
  - IndexedDB persistence for GM mode
  - Helper function `setCharacterStoreGM()` for GM initialization

**6. Component Integration:**

- **`src/components/LibraryPanel.tsx`:**
  - Added "Create Character" button
  - Character list section showing all characters
  - Edit/Delete actions for each character
  - `CharacterSheetModal` integration

**7. Editor Features:**

- Formatting: Bold, Italic, Strike, Code, Headings (H1-H3)
- Lists: Bullet lists, Ordered lists
- Block elements: Blockquote, Code block, Horizontal rule
- Markdown import/export panel
- Read-only toggle support

### Key Design Decisions

1. **Character Storage**: Characters stored separately from game state in IndexedDB (GM only) for better scalability
2. **Backward Compatibility**: `characterId` on tokens is optional; existing tokens work unchanged
3. **Phase 1 Scope**: Only rich text editing - no custom nodes yet (stat declarations, expressions, widgets in later phases)
4. **Minimal Dependencies**: Using only StarterKit for now, Mention extension included but not configured

### Files Modified

- `vtt/package.json` - Dependencies added
- `vtt/src/types/index.ts` - Character types added
- `vtt/src/db/database.ts` - Character storage functions
- `vtt/src/components/LibraryPanel.tsx` - Character integration

---

## 2026-01-13: Phase 2 - Custom Nodes - Stat Declarations

### Overview
Implemented the custom node system for stat declarations using the `Key:: Value` syntax. This enables reactive stat pills that sync with shadow state.

### What Was Implemented

**1. New Extension Files:**

| File | Purpose |
|------|---------|
| `src/components/character/extensions/StatDeclaration.ts` | TipTap Node extension for `Key:: Value` pattern |
| `src/components/character/extensions/StatDeclarationComponent.tsx` | React component for rendering stat pills |
| `src/components/character/extensions/StatDeclaration.css` | Styling for stat pills |
| `src/services/shadowStateService.ts` | Parser for extracting stats from document |
| `src/components/character/extensions/SuggestionMenu.tsx` | Autocomplete dropdown for stat names |
| `src/components/character/extensions/SuggestionMenu.css` | Suggestion menu styling |
| `src/components/character/extensions/StatSuggestion.ts` | Extension for triggering suggestions |

**2. StatDeclaration Extension:**

- Matches pattern: `Key:: Value` or `Key:: Value #bar` or `Key:: Value #badge`
- Stores as inline, atomic node with attributes: `key`, `value`, `projections`
- Commands: `insertStatDeclaration`, `setStatDeclarationValue`, `addStatDeclarationProjection`, `removeStatDeclarationProjection`
- Renders using ReactNodeViewRenderer for rich interactivity

**3. StatDeclarationComponent:**

- Displays as `[Key: Value ▾]` pill with dark theme
- Click to edit: shows inline inputs for key and value
- Toggle projection tags: 📊 for #bar, 🏷️ for #badge
- Keyboard support: Enter to save, Escape to cancel
- Smooth transitions and visual feedback

**4. ShadowStateService:**

- `parseShadowState(document: JSONContent)` - Extracts all StatDeclaration nodes
- Returns: `{ stats: { key: value }, projections: { bar, barMax, badge } }`
- Auto-parses numeric values (integers and floats)
- `parseStatDeclarationText()` - For initial import from text format
- `debouncedParse()` - Utility for debounced parsing (300ms)
- `shadowStateToJSON()` - Convert back to TipTap format

**5. SuggestionMenu:**

- Triggers when typing `::` or colon
- 50+ common D&D stat suggestions (HP, AC, STR, DEX, etc.)
- Categories: stat (📊), attribute (⚔️), derived (✨), resource (💎)
- Keyboard navigation: ↑↓ arrows, Enter to select, Escape to close
- Filter as you type

**6. Editor Integration:**

- Modified `CharacterSheetEditor.tsx`:
  - Register StatDeclaration extension
  - Parse shadow state on content change (300ms debounce)
  - Pass shadowState to parent via callback
  - Development debug panel shows current shadow state
  - Markdown export includes stat declarations
- Modified `CharacterSheetModal.tsx`:
  - Receive shadowState updates from editor
  - Auto-update projections when stats change

### Key Design Decisions

1. **Forgiving Parser**: `parseNumber()` handles edge cases gracefully, returning string if not parseable
2. **Projection Auto-Detection**: First `#bar` becomes `bar`, second with "max" becomes `barMax`
3. **Debounced Updates**: 300ms debounce prevents excessive re-parsing during rapid edits
4. **Development Debug Panel**: Shows shadow state in development mode only
5. **Backward Compatibility**: Existing content without stat nodes works unchanged

### Files Created

- `vtt/src/components/character/extensions/StatDeclaration.ts`
- `vtt/src/components/character/extensions/StatDeclarationComponent.tsx`
- `vtt/src/components/character/extensions/StatDeclaration.css`
- `vtt/src/services/shadowStateService.ts`
- `vtt/src/components/character/extensions/SuggestionMenu.tsx`
- `vtt/src/components/character/extensions/SuggestionMenu.css`
- `vtt/src/components/character/extensions/StatSuggestion.ts`

### Files Modified

- `vtt/src/components/character/CharacterSheetEditor.tsx` - Register extension, parse shadow state
- `vtt/src/components/character/CharacterSheetModal.tsx` - Receive shadowState updates
- `vtt/src/components/character/CharacterSheetEditor.css` - Add debug panel, toolbar separator, loading styles
- `vtt/docs/PROJECT_PLAN.md` - Mark Phase 2 as completed

### Next Steps

- Phase 3: Expressions (`{{ expression }}`) and Action Buttons (`[Attack](action: 1d20+5)`)
- Phase 4: Widgets (`[bar: HP/MaxHP]`, `[dots: 3/5]`)
- Phase 5: Token integration (link characters to tokens)
- Phase 6: Transclusion and polish

### Future Sessions

*Add new session notes above this line*
