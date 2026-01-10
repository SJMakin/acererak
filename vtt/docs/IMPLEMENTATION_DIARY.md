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

## Future Sessions

*Add new session notes above this line*
