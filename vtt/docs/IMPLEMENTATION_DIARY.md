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

---

## 2026-01-13: Phase 3 - Custom Nodes - Expressions and Actions

### Overview
Implemented expression evaluation and action button nodes for the Reactive Character Sheet System. Expressions allow computed values like `{{ (Strength - 10) / 2 }}` to display dynamically. Action buttons enable dice rolls with optional resource costs.

### What Was Implemented

**1. Expression Extension:**

| File | Purpose |
|------|---------|
| `src/components/character/extensions/Expression.ts` | TipTap Node extension for `{{ expression }}` pattern |
| `src/components/character/extensions/ExpressionComponent.tsx` | React component displaying computed value with tooltip |
| `src/components/character/extensions/Expression.css` | Styling with tooltip animation |

- **Pattern Matching**: `{{ expression }}` with sandboxed expr-eval evaluation
- **Reactivity**: Re-evaluates when shadowState changes via useEffect
- **Error Handling**: Shows "Error" for invalid formulas gracefully
- **Tooltip**: Hover shows original formula for debugging

**2. ActionButton Extension:**

| File | Purpose |
|------|---------|
| `src/components/character/extensions/ActionButton.ts` | TipTap Node extension for `[Label](action: dice)` pattern |
| `src/components/character/extensions/ActionButtonComponent.tsx` | Interactive button component with dice rolling |
| `src/components/character/extensions/ActionButton.css` | Gradient button styling |

- **Pattern**: `[Label](action: diceFormula)` or `[Label](action: diceFormula; cost: Variable)`
- **Dice Rolling**: Resolves variables, executes roll via diceParser service
- **Resource Costs**: Optional `cost:` parameter decrements stat on use
- **P2P Broadcast**: Calls onBroadcastRoll callback for chat integration

**3. Dice Parser Enhancement:**

- Added `resolveVariables(formula, shadowState)` function
- Replaces variable names with numeric values: `1d20+Strength` → `1d20+18`
- Supports `{{ expression }}` nested in dice formulas
- Handles missing variables gracefully (leaves as-is)

**4. Store Updates:**

- Added `updateCharacterStat()` to `characterStore.ts`
- Updates stat values directly in character content JSON
- Enables action buttons to modify stats (e.g., decrementing Slots)

**5. Editor Integration:**

- Registered Expression and ActionButton extensions in CharacterSheetEditor
- Pass shadowState to ExpressionComponent for reactivity
- Pass onBroadcastRoll and onUpdateStat callbacks for action button functionality
- Markdown export/import supports new node types

### Key Design Decisions

1. **Sandboxed Evaluation**: Using expr-eval library for safe expression evaluation (not raw eval())
2. **Variable Resolution Order**: Expressions evaluated first, then variable names replaced with values
3. **Error Gracefulness**: Invalid expressions show "Error" instead of breaking the UI
4. **Callback Pattern**: Action buttons use callbacks for stat updates to avoid direct store dependency
5. **Cost Deduction**: Only decrements if current value is numeric and > 0

### Files Created

- `vtt/src/components/character/extensions/Expression.ts`
- `vtt/src/components/character/extensions/ExpressionComponent.tsx`
- `vtt/src/components/character/extensions/Expression.css`
- `vtt/src/components/character/extensions/ActionButton.ts`
- `vtt/src/components/character/extensions/ActionButtonComponent.tsx`
- `vtt/src/components/character/extensions/ActionButton.css`

### Files Modified

- `vtt/src/services/diceParser.ts` - Added resolveVariables function
- `vtt/src/stores/characterStore.ts` - Added updateCharacterStat function
- `vtt/src/components/character/CharacterSheetEditor.tsx` - Registered extensions, added callbacks
- `vtt/docs/PROJECT_PLAN.md` - Marked Phase 3 as completed

### Usage Examples

**Expression:**
```
Strength:: 18
{{ (Strength - 10) / 2 }}   → displays "4"
```

**Action Button (simple):**
```
[Attack](action: 1d20+5)    → button that rolls d20+5
```

**Action Button (with cost):**
```
Slots:: 3
[Smite](action: 2d8; cost: Slots)   → button rolls 2d8, decrements Slots to 2
```

**Dice formula with variables:**
```
Strength:: 18
[Melee](action: 1d20+Strength)      → rolls 1d20+18
```

### Next Steps

- Phase 4: Widgets (`[bar: HP/MaxHP]`, `[dots: 3/5]`)
- Phase 5: Token integration (link characters to tokens)
- Phase 6: Transclusion and polish

---

## 2026-01-13: Phase 4 - Custom Nodes - Visual Widgets (Bars and Dots)

### Overview
Implemented visual widget extensions for the Reactive Character Sheet System. Bar widgets provide progress bar visualization for resources like HP, while dot widgets provide the classic filled/empty dot tracker style common in World of Darkness and other narrative RPGs.

### What Was Implemented

**1. BarWidget Extension:**

| File | Purpose |
|------|---------|
| `src/components/character/extensions/BarWidget.ts` | TipTap Node extension for `[bar: current/max]` pattern |
| `src/components/character/extensions/BarWidgetComponent.tsx` | Interactive progress bar component |
| `src/components/character/extensions/BarWidget.css` | Styling with color transitions |

- **Pattern Matching**: `[bar: HP/MaxHP]` or `[bar: 45/100]`
- **Progress Bar**: Horizontal bar with percentage fill
- **Color Coding**:
  - > 50%: Green (#22c55e)
  - 25-50%: Yellow (#eab308)
  - < 25%: Red (#ef4444)
- **Interactive Controls**: Click bar to reveal +/- buttons
- **Reactivity**: Parses variable names (HP, MaxHP) from shadowState for live updates
- **Markdown Export**: `[bar: HP/MaxHP]`

**2. DotsWidget Extension:**

| File | Purpose |
|------|---------|
| `src/components/character/extensions/DotsWidget.ts` | TipTap Node extension for `[dots: current/max]` pattern |
| `src/components/character/extensions/DotsWidgetComponent.tsx` | Interactive dot tracker component |
| `src/components/character/extensions/DotsWidget.css` | Styling with pop animations |

- **Pattern Matching**: `[dots: 3/5]` or `[dots: Slots/MaxSlots]`
- **Dot Visualization**: Filled (●) and empty (○) circles
- **Interactive**: Click dots to toggle fill state
  - Clicking filled dot empties it and all after
  - Clicking empty dot fills it and all before
- **Limit**: Maximum 10 dots
- **Color Themes**: Default amber, plus success (green), damage (red), magic (purple), health (pink)
- **Markdown Export**: `[dots: 3/5]`

**3. Editor Integration:**

- Registered BarWidget and DotsWidget extensions in CharacterSheetEditor
- Added `shadowState` prop to allow external shadowState (for reactive updates)
- Added `insertBarWidget` and `insertDotsWidget` commands
- Added widget toolbar with buttons for quick insertion
- Markdown export/import supports widget syntax
- Widget toolbar appears below formatting toolbar when not read-only

**4. Styling:**

- Dark theme compatible (follows existing editor color scheme)
- Smooth CSS transitions for bar fill and color changes
- Pop animation for dot toggles
- Hover effects for interactivity feedback

### Key Design Decisions

1. **Variable Resolution**: Widgets can use either hardcoded numbers (`[bar: 45/100]`) or variable names (`[bar: HP/MaxHP]`) that resolve from shadowState
2. **Two-Way Binding**: Widgets update shadowState when modified, and re-render when shadowState changes externally
3. **Max Dots Limit**: Capped at 10 dots to prevent UI overflow
4. **Color Theming**: DotsWidget CSS includes color variant classes for different resource types
5. **Widget Toolbar**: Added below main toolbar for easy widget insertion without typing syntax

### Files Created

- `vtt/src/components/character/extensions/BarWidget.ts`
- `vtt/src/components/character/extensions/BarWidgetComponent.tsx`
- `vtt/src/components/character/extensions/BarWidget.css`
- `vtt/src/components/character/extensions/DotsWidget.ts`
- `vtt/src/components/character/extensions/DotsWidgetComponent.tsx`
- `vtt/src/components/character/extensions/DotsWidget.css`

### Files Modified

- `vtt/src/components/character/CharacterSheetEditor.tsx`
  - Added BarWidget and DotsWidget imports and registration
  - Added shadowState prop for reactive widget updates
  - Added insertBarWidget and insertDotsWidget commands
  - Added widget toolbar with insertion buttons
  - Updated markdown export to include widgets
- `vtt/src/components/character/CharacterSheetEditor.css`
  - Added widget toolbar styles
- `vtt/docs/PROJECT_PLAN.md` - Marked Phase 4 as completed

### Usage Examples

**Bar Widget:**
```
HP:: 45 #bar
MaxHP:: 52 #bar
[bar: HP/MaxHP]   → displays 87% filled bar (green)
```

**Dots Widget:**
```
Slots:: 3
MaxSlots:: 5
[dots: Slots/MaxSlots]   → displays ●●●○○
[dots: 3/5]              → displays ●●●○○ (hardcoded)
```

### Next Steps

- Phase 5: Token integration (link characters to tokens, sync HP bars)
- Phase 6: Transclusion and polish (spell/ability snippets, templates)

---

## 2026-01-13: Phase 5 - Token Integration with Bidirectional Character Sync

### Overview
Implemented the integration between Character Sheets and Map Tokens, enabling bidirectional data sync. When a token is linked to a character, it displays HP and AC from the character's shadowState. Changes in either the token or character sheet sync to both.

### What Was Implemented

**1. Token Component Enhancement (`src/components/Token.tsx`):**

- Added character sheet integration using `useCharacterStore`
- Token reads HP/AC from linked Character.shadowState when `characterId` is set
- Uses `projections.bar`, `projections.barMax`, and `projections.badge` keys from Character
- Falls back to token's own hp/ac when no character is linked
- Displays character name instead of token name when linked
- Added `onDamage` callback prop for damage clicks (GM only)
- Subscribes to character store updates for reactive updates

**2. Token Config Modal Enhancement (`src/components/TokenConfigModal.tsx`):**

- Added "Link Character" dropdown/selector
- Shows available Characters from characterStore with searchable dropdown
- Option to create new Character directly from the modal
- Option to unlink character from existing selection
- Displays linked character info (HP/AC preview) when selected
- Auto-fills HP/AC from character projections when linking
- Saves `characterId` to token configuration

**3. Combat Tracker Enhancement (`src/components/CombatTracker.tsx`):**

- Reads HP from linked Character if available (using `getHpFromToken` helper)
- Displays character name instead of token name when linked
- Added "Linked" badge indicator for character-connected combatants
- HP changes sync to Character shadowState via `updateCharacterStat()`
- Falls back to token HP when no character linked
- Added `Linked` badge to show which tokens have characters

**4. Property Inspector Enhancement (`src/components/PropertyInspector.tsx`):**

- Removed token-specific HP/AC/conditions UI when character is linked
- Added "Edit Character Sheet" button when character linked (opens CharacterSheetModal)
- Shows character link status with linked character info
- Added character selector dropdown for linking/unlinking characters
- Unlink button to remove character reference
- Smooth transition between linked/unlinked states

**5. Character Store P2P Sync (`src/stores/characterStore.ts`):**

- Added `onP2PUpdate` and `onP2PDelete` callback hooks
- Added `setP2PHandlers()` method for registering P2P handlers
- Added `handleIncomingCharacterUpdate()` helper for applying remote updates
- Added `handleIncomingCharacterDelete()` helper for processing deletions
- All CRUD operations (add/update/delete) now broadcast to P2P peers
- Integrated with useRoom.ts for message handling

**6. P2P Message Handlers (`src/hooks/useRoom.ts`):**

- Added `sendCharacterUpdate` and `sendCharacterDelete` actions (shortened action names for Trystero)
- Added `broadcastCharacterUpdate()` and `broadcastCharacterDelete()` functions
- Added `onCharacterUpdate` and `onCharacterDelete` handlers
- Integrated character store P2P handlers via `setP2PHandlers()`
- All character changes sync across all connected peers

**7. Type Exports (`src/types/index.ts`):**

- Re-exported `CharacterUpdateMessage` and `CharacterDeleteMessage` from character.ts
- Ensured all P2P message types are properly typed and accessible

### Key Design Decisions

1. **Backward Compatibility**: Token's own `hp`/`ac` fields remain functional for unlinked tokens
2. **Bidirectional Sync**: Changes in CombatTracker sync to Character, changes in Character Sheet sync to tokens
3. **P2P Strategy**: All character updates broadcast to all peers (no GM-only restriction for characters)
4. **Error Handling**: Graceful fallback when character is deleted or stats are missing
5. **Reactive Updates**: Token component subscribes to character store state changes

### Token Integration Flow

```
Token (characterId: "char-123")
  ↓
CharacterStore.getCharacter("char-123")
  ↓
Character.shadowState { HP: 45, MaxHP: 52, AC: 18 }
  ↓
Token displays HP bar (45/52) and AC badge (18)
```

### Bidirectional Sync

- **Token damage click** → `characterStore.updateCharacterStat("char-123", "HP", 40)`
- **Character sheet edit** → shadowState updates → token re-renders
- **Combat HP change** → updates both combatant and character shadowState
- **P2P update** → all peers receive and apply character changes

### Files Modified

- `vtt/src/components/Token.tsx` - Character integration, HP/AC from shadowState
- `vtt/src/components/TokenConfigModal.tsx` - Character linking UI
- `vtt/src/components/CombatTracker.tsx` - Character-aware HP reading and sync
- `vtt/src/components/PropertyInspector.tsx` - Character link status and actions
- `vtt/src/stores/characterStore.ts` - P2P broadcast hooks and handlers
- `vtt/src/hooks/useRoom.ts` - P2P message handlers for character updates
- `vtt/src/types/index.ts` - Re-exported character message types

### Files Created

- None (all implementation via modification of existing files)

### Usage Examples

**Linking a Token to a Character:**
1. Select a token on the map
2. Open Property Inspector
3. Select a character from the "Link Character" dropdown
4. Token now displays character HP/AC and name

**Creating a New Character from Token Config:**
1. Click "Create New Character" in TokenConfigModal
2. Enter character name
3. Set HP/AC for initial values
4. Click "Create & Link" to create and link in one step

**Sync from Combat Tracker:**
1. Add linked token to combat
2. HP changes via +/- buttons update both combatant and character
3. Character sheet shows updated HP in shadowState

### Next Steps

- Phase 6: Transclusion (`[[SpellName]]`) and character templates
- Optional: Character migration for existing tokens with `notes` field

---

## 2026-01-13: Phase 6 - Transclusion, Templates, and Polish

### Overview
Implemented the final phase of the Reactive Character Sheet System, including transclusion for reusable content, character templates, keyboard shortcuts, migration tools, and the snippet library. This completes the character sheet system with all 6 phases implemented.

### What Was Implemented

**1. Transclusion System:**

| File | Purpose |
|------|---------|
| `src/components/character/extensions/Transclusion.ts` | TipTap Node extension matching `[[Name]]` pattern |
| `src/components/character/extensions/TransclusionComponent.tsx` | React component rendering embedded snippet content |
| `src/components/character/extensions/Transclusion.css` | Styling for transclusion blocks with category indicators |

- Matches `[[SnippetName]]` pattern with input rule
- Looks up content from snippet store by name
- Renders embedded content inline (read-only display)
- Shows snippet header with category badge (spell/ability/rule/custom)
- Handles missing snippets gracefully with fallback UI
- Click to view original snippet info

**2. Snippet Store and Types:**

| File | Purpose |
|------|---------|
| `src/types/snippet.ts` | Snippet interface definition (id, name, content, category, tags) |
| `src/stores/snippetStore.ts` | Zustand store with CRUD operations, IndexedDB persistence |
| `src/db/database.ts` | Added snippets table (version 4) and storage functions |

- CRUD operations: `addSnippet()`, `updateSnippet()`, `deleteSnippet()`
- Queries: `getSnippetByName()`, `getSnippetsByCategory()`, `searchSnippets()`
- IndexedDB persistence (GM only) with P2P sync support
- 5 default snippets included: Fireball, Cure Wounds, Sneak Attack, Second Wind, Opportunity Attack

**3. Character Templates:**

| File | Purpose |
|------|---------|
| `src/services/characterTemplates.ts` | Template definitions for D&D 5e, OSR, and Blank templates |

- **D&D 5e Template**: Standard stats (HP, AC, STR, DEX, CON, INT, WIS, CHA, Speed, Proficiency)
- **OSR Template**: Simplified stats (HP, AC, STR, DEX, WIL)
- **Blank Template**: Empty document for custom sheets
- Template picker modal appears when creating new character
- Templates stored as TipTap JSON documents

**4. Token Migration Service:**

| File | Purpose |
|------|---------|
| `src/services/tokenMigration.ts` | Migration utilities for converting old tokens to Characters |

- `migrateTokenToCharacter()` - Convert token with notes to Character
- `migrateTokensToCharacters()` - Batch migration
- `checkGameNeedsMigration()` - Detect if game has legacy tokens
- Preserves `hp`/`ac`/`conditions` for unlinked tokens
- HTML-to-TipTap conversion for legacy notes

**5. Keyboard Shortcuts and Command Palette:**

| File | Purpose |
|------|---------|
| `src/components/character/CharacterSheetEditor.tsx` | Added command palette and keyboard shortcuts |

- `/` - Opens command palette for inserting stats, actions, widgets
- `[[` - Transclusion autocomplete (logs available snippets)
- `{{` - Expression autocomplete support
- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `Ctrl/Cmd + K` - Insert link
- `Escape` - Close command palette
- Arrow keys + Enter - Navigate and select commands

**6. Snippet Library Panel:**

| File | Purpose |
|------|---------|
| `src/components/character/SnippetLibraryPanel.tsx` | UI for managing snippets |
| `src/components/character/SnippetLibraryPanel.css` | Panel styling |

- List all saved snippets with search and category filter
- Create, edit, delete snippets (GM only)
- Insert snippets directly into character sheet
- Category badges (spell, ability, rule, custom)
- Snippet editor with JSON content editing

**7. Character Library Panel Enhancements:**

| File | Purpose |
|------|---------|
| `src/components/character/CharacterLibraryPanel.tsx` | Added template picker, import/export, duplicate |
| `src/components/character/CharacterLibraryPanel.css` | Template picker and modal styling |

- Template picker modal when creating new character
- Import character from JSON file or pasted text
- Export individual character to JSON file
- Export all characters at once
- Duplicate character functionality

**8. Database Updates:**

- Added `snippets` table to IndexedDB (version 4)
- Storage functions: `saveSnippets()`, `loadSnippets()`, `addSnippet()`, `updateSnippet()`, `deleteSnippet()`
- Search function: `searchSnippets()` with name/description/tag matching
- GM-only persistence pattern (consistent with characters)

### Key Design Decisions

1. **Transclusion Read-Only**: Embedded content cannot be edited directly - must edit original snippet
2. **Default Snippets**: 5 common D&D snippets included to demonstrate system
3. **Backward Compatibility**: Existing games work unchanged (snippets are opt-in)
4. **P2P Sync**: Snippets sync across peers like characters
5. **Category System**: Spells (purple), Abilities (green), Rules (orange), Custom (gray)
6. **Command Palette**: Organized by category (stats, actions, widgets, format)
7. **Template Storage**: Templates as TipTap JSON for direct loading

### Files Created

- `vtt/src/types/snippet.ts`
- `vtt/src/stores/snippetStore.ts`
- `vtt/src/components/character/extensions/Transclusion.ts`
- `vtt/src/components/character/extensions/TransclusionComponent.tsx`
- `vtt/src/components/character/extensions/Transclusion.css`
- `vtt/src/services/characterTemplates.ts`
- `vtt/src/services/tokenMigration.ts`
- `vtt/src/components/character/SnippetLibraryPanel.tsx`
- `vtt/src/components/character/SnippetLibraryPanel.css`

### Files Modified

- `vtt/src/db/database.ts` - Added snippets table and functions
- `vtt/src/types/index.ts` - Re-exported Snippet types
- `vtt/src/components/character/CharacterSheetEditor.tsx` - Command palette, keyboard shortcuts, Transclusion integration
- `vtt/src/components/character/CharacterSheetEditor.css` - Command palette styles
- `vtt/src/components/character/CharacterLibraryPanel.tsx` - Template picker, import/export
- `vtt/src/components/character/CharacterLibraryPanel.css` - Template picker styles
- `vtt/src/components/character/CharacterSheetModal.tsx` - Template support
- `vtt/docs/PROJECT_PLAN.md` - Marked Phase 6 as completed

### Usage Examples

**Transclusion:**
```
[[Fireball]]   → Embeds the Fireball spell snippet
```

**Command Palette:**
1. Press `/` to open command palette
2. Type to filter (e.g., "HP" or "Attack")
3. Navigate with arrow keys
4. Press Enter to insert

**Template Picker:**
1. Click "+ New" in Character Library
2. Select template (D&D 5e, OSR, or Blank)
3. Character sheet opens with template content

**Snippet Management:**
1. Open Snippet Library Panel
2. Click "+ New" to create snippet
3. Set name, category, and content (TipTap JSON)
4. Use `[[SnippetName]]` to embed in character sheets

### Reactive Character Sheet System - Complete!

All 6 phases now implemented:
- Phase 1: Foundation - TipTap integration
- Phase 2: Custom Nodes - Stat Declarations
- Phase 3: Expressions and Action Buttons
- Phase 4: Widgets (Bars and Dots)
- Phase 5: Token Integration
- Phase 6: Transclusion and Polish

---

## 2026-01-13: Final Verification & Documentation

### Summary

The Reactive Character Sheet System (Section 3.11) has been fully implemented and verified. This is a comprehensive character sheet solution using TipTap WYSIWYG editor with reactive data binding.

### File Structure Overview

```
vtt/src/
├── components/
│   └── character/
│       ├── CharacterSheetEditor.tsx        # Main TipTap editor with all extensions
│       ├── CharacterSheetModal.tsx         # Modal wrapper
│       ├── CharacterLibraryPanel.tsx       # Character management UI
│       ├── SnippetLibraryPanel.tsx         # Snippet management UI
│       └── extensions/
│           ├── StatDeclaration.ts          # Key:: Value syntax
│           ├── StatDeclarationComponent.tsx
│           ├── Expression.ts               # {{ expression }} syntax
│           ├── ExpressionComponent.tsx
│           ├── ActionButton.ts             # [](action:) syntax
│           ├── ActionButtonComponent.tsx
│           ├── BarWidget.ts                # [bar:] syntax
│           ├── BarWidgetComponent.tsx
│           ├── DotsWidget.ts               # [dots:] syntax
│           ├── DotsWidgetComponent.tsx
│           ├── Transclusion.ts             # [[Name]] syntax
│           ├── TransclusionComponent.tsx
│           ├── SuggestionMenu.tsx          # Autocomplete UI
│           └── StatSuggestion.ts
├── stores/
│   ├── characterStore.ts                   # Character CRUD + P2P sync
│   └── snippetStore.ts                     # Snippet CRUD + P2P sync
├── services/
│   ├── shadowStateService.ts               # Parse document → JSON
│   ├── characterTemplates.ts               # D&D 5e, OSR, Blank templates
│   └── tokenMigration.ts                   # Legacy token migration
├── types/
│   ├── character.ts                        # Character interface + P2P types
│   ├── snippet.ts                          # Snippet interface
│   └── index.ts                            # Re-exports character types
└── db/
    └── database.ts                         # Characters + Snippets tables
```

### Key Features

| Feature | Syntax | Description |
|---------|--------|-------------|
| Stat Declaration | `Key:: Value` | Editable stat pills with projections |
| Expression | `{{ expression }}` | Computed values with expr-eval |
| Action Button | `[Label](action: dice)` | Dice rolls with optional cost |
| Bar Widget | `[bar: HP/MaxHP]` | Visual progress bar |
| Dots Widget | `[dots: 3/5]` | Filled/empty dot tracker |
| Transclusion | `[[SpellName]]` | Embed snippet content |
| Projections | `#bar`, `#badge` | Project stats to tokens |

### Usage Examples

**Creating a Character:**
1. Open Library Panel → Click "+ New Character"
2. Select template (D&D 5e, OSR, or Blank)
3. Edit sheet with TipTap editor

**Adding Stats:**
```
Strength:: 18
HP:: 45 #bar
AC:: 18 #badge
```

**Expression:**
```
{{ (Strength - 10) / 2 }}  → displays "4"
```

**Action Button:**
```
[Attack](action: 1d20+5)  → rolls dice, broadcasts to chat
[Smite](action: 2d8; cost: Slots)  → rolls, decrements Slots
```

**Widgets:**
```
[bar: HP/MaxHP]  → progress bar with color coding
[dots: Slots/MaxSlots]  → ●●●○○ dot tracker
```

**Linking to Token:**
1. Select token → Open Property Inspector
2. Select character from "Link Character" dropdown
3. Token now displays HP/AC from character

### P2P Sync

- Character updates broadcast to all peers
- Character deletions broadcast to all peers
- Snippets sync across peers
- Handlers registered in `useRoom.ts`

### Database Schema

- **Version 4** (IndexedDB): characters + snippets tables
- **GM-only persistence**: Only GM saves to IndexedDB
- **P2P sync**: Characters/snippets broadcast for real-time sync

### Integration Points Verified

| Component | Status | Notes |
|-----------|--------|-------|
| Token.tsx | ✅ | Reads HP/AC from character.shadowState |
| CombatTracker.tsx | ✅ | Character-aware HP, sync back to character |
| PropertyInspector.tsx | ✅ | Character link UI, edit sheet button |
| TokenConfigModal.tsx | ✅ | Character linking, create new character |
| useRoom.ts | ✅ | P2P handlers for character-update/delete |

### Default Content

**Templates:**
- D&D 5e: HP, AC, STR, DEX, CON, INT, WIS, CHA, Speed, Proficiency
- OSR: HP, AC, STR, DEX, WIL
- Blank: Empty document

**Default Snippets:**
- Fireball (spell)
- Cure Wounds (spell)
- Sneak Attack (ability)
- Second Wind (ability)
- Opportunity Attack (ability)

### Known Limitations

1. **Mobile keyboard**: TipTap editor may have issues on mobile keyboards
2. **Expression injection**: expr-eval sandbox prevents most injection, but user trust required
3. **Migration**: Legacy tokens with notes are not auto-migrated
4. **No duplicate detection**: Snippet names must be unique for transclusion

### Future Improvements (Deferred)

- Auto-migration of legacy tokens
- Character import from D&D Beyond API
- Character image/gallery support
- Bulk operations on multiple characters
- Character versioning/undo history

---

### Final Code Review Checklist

- [x] All TypeScript types properly defined (Character, Snippet, projections)
- [x] All components have error handling (graceful fallbacks)
- [x] All P2P messages properly typed (CharacterUpdateMessage, CharacterDeleteMessage)
- [x] All database operations handled (IndexedDB version 4)
- [x] All UI components have dark theme styling
- [x] All keyboard shortcuts documented (`/` for commands, `[[` for transclusion)
- [x] All templates properly defined (D&D 5e, OSR, Blank)
- [x] All default snippets included (Fireball, Cure Wounds, etc.)

### Version

- **v1.9.0** - Reactive Character Sheet System

---

*Add new session notes above this line*
