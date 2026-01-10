# Dice Roller Implementation

## Overview
A complete dice rolling system has been implemented for the VTT with the following features:

## Features Implemented

### 1. Dice Roll Data Structure
- **DiceRoll interface** added to [`vtt/src/types/index.ts`](vtt/src/types/index.ts:148)
  - Includes: id, playerId, playerName, timestamp, formula, result, breakdown
- **DiceRollMessage** type for P2P communication

### 2. Dice Formula Parser
- **Service**: [`vtt/src/services/diceParser.ts`](vtt/src/services/diceParser.ts)
- Supports complex formulas:
  - Basic rolls: `2d6+3`, `1d20`, `4d6`
  - Advantage/Disadvantage: `1d20 advantage`, `1d20 disadvantage`
  - Drop lowest/highest: `4d6 drop lowest`, `6d6 drop highest 2`
  - Modifiers: `1d20+5`, `2d6-1`

### 3. DiceRoller Component
- **Component**: [`vtt/src/components/DiceRoller.tsx`](vtt/src/components/DiceRoller.tsx)
- **Features**:
  - Quick roll buttons for common dice (d4, d6, d8, d10, d12, d20, d100)
  - Advantage/Disadvantage buttons
  - Custom formula input field with examples
  - Roll history showing last 50 rolls
  - Visual differentiation between own rolls and other players' rolls
  - Clear history option
  - 3D dice animation area (placeholder ready for integration)

### 4. Game Store Integration
- **Store**: [`vtt/src/stores/gameStore.ts`](vtt/src/stores/gameStore.ts:333)
- **Actions**:
  - `addDiceRoll(roll)` - Add a dice roll to history
  - `clearDiceHistory()` - Clear all dice roll history
- **State**: 
  - `diceRolls` array in GameState (limited to 50 most recent rolls)

### 5. Sidebar Integration
- **Component**: [`vtt/src/components/Sidebar.tsx`](vtt/src/components/Sidebar.tsx:143)
- New "Dice" tab added to sidebar
- Available to all players (not just GM)

### 6. P2P Broadcasting
- **Hook**: [`vtt/src/hooks/useRoom.ts`](vtt/src/hooks/useRoom.ts:283)
- **Features**:
  - `broadcastDiceRoll(roll)` - Broadcast rolls to all connected players
  - Automatic roll reception and storage for all peers
  - Visual notification when other players roll dice
  - Notifications show: player name, formula, and result

## Usage

### Quick Rolls
1. Navigate to the "Dice" tab in the sidebar
2. Click any quick roll button (d4, d6, d8, d10, d12, d20, d100)
3. The result appears in the roll history

### Custom Formulas
1. Enter a formula in the custom input field
   - Examples: `2d6+3`, `4d6 drop lowest`, `1d20+5`
2. Press Enter or click "Roll"
3. The result appears in the roll history

### Advantage/Disadvantage
1. Click "Advantage" or "Disadvantage" button
2. System rolls 2d20 and takes the higher/lower result automatically

### Roll History
- Shows the last 50 rolls from all players
- Your rolls are highlighted with a purple border
- Each entry shows:
  - Player name
  - Formula used
  - Detailed breakdown of the roll
  - Final result (prominently displayed)
  - Timestamp

## Technical Details

### Dice Formula Parser
The parser supports:
- Multiple dice groups: `2d6+1d8+3`
- Drop mechanics: `4d6 drop lowest` (for ability scores)
- Advantage/Disadvantage: Special rolling mode for d20
- Modifiers: Any integer addition/subtraction

### P2P Synchronization
- All dice rolls are broadcast to connected peers
- Rolls are added to local history immediately
- Remote rolls trigger notifications
- History is synchronized but not persisted (resets on game load)

### 3D Dice Animation (Future Enhancement)
The dice-lib.js library is available at `../src/services/dice-lib.js` and can be integrated:
1. Import dice-lib components (DiceD4, DiceD6, DiceD8, DiceD10, DiceD12, DiceD20, DiceManager)
2. Set up Three.js scene and Cannon.js physics world
3. Create dice meshes based on formula
4. Animate roll with physics simulation
5. Read final values from settled dice

Current implementation includes a placeholder div ready for 3D rendering integration.

## Files Modified/Created

### Created:
- `vtt/src/services/diceParser.ts` - Dice formula parser
- `vtt/src/components/DiceRoller.tsx` - Main dice roller UI
- `vtt/DICE_ROLLER_IMPLEMENTATION.md` - This documentation

### Modified:
- `vtt/src/types/index.ts` - Added DiceRoll and DiceRollMessage types
- `vtt/src/stores/gameStore.ts` - Added dice roll state and actions
- `vtt/src/components/Sidebar.tsx` - Added Dice tab
- `vtt/src/hooks/useRoom.ts` - Added P2P dice roll broadcasting

## Testing Checklist

- [x] Quick roll buttons work correctly
- [x] Custom formula parsing works
- [x] Advantage/Disadvantage system functions
- [x] Drop lowest/highest works
- [x] Roll history displays correctly
- [x] P2P broadcasting sends rolls to other players
- [x] Notifications appear for remote rolls
- [x] Clear history button works
- [x] UI is responsive and user-friendly

## Future Enhancements

1. **3D Dice Animation**: Integrate the dice-lib.js library for visual dice rolling
2. **Roll Templates**: Save frequently used roll formulas
3. **Roll Macros**: Create custom roll buttons with saved formulas
4. **Dice Colors**: Allow players to customize their dice appearance
5. **Roll Statistics**: Track and display roll statistics over time
6. **Private Rolls**: Allow GM to make hidden rolls
7. **Roll Replay**: Ability to re-roll with the same formula
