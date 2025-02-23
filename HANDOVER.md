# Project Handover: Acererak

React/TypeScript game implementing an AI-driven narrative system with D&D-style mechanics, combat system, and entity management.

## Core Architecture
- React/TypeScript with Context API for state management
- 3D dice system using THREE.js
- Node-based story progression with Gemini AI integration
- Character sheet system with dynamic updates
- Turn-based combat system with initiative tracking
- NPC and enemy entity management

## Key Components
1. Game State Management:
   - Story/choice graph data
   - Character state and updates
   - Combat state and turn management
   - Dice mechanics and animations
   - Loading/error states
   - AI response processing

2. Type System:
   ```typescript
   GraphData, Edge          // Story structure
   StoryNode, ChoiceNode   // Narrative elements with positions
   RollResult, DiceRoll    // Dice mechanics with modifiers
   Entity                  // Base type for players, NPCs, and enemies
   CombatState            // Combat system state management
   CombatAction           // Combat action tracking
   StoryGenerationResponse // AI response structure with schema validation
   ```

## Services Layer
- `diceService`: 3D dice roll mechanics with physics
- `storyGenerationService`: Story node generation using Gemini API
  - Theme-based story seeding
  - Structured JSON responses with schema validation
  - Combat encounter generation
  - Categories: environments, emotions, objects, concepts, creatures, rituals, factions
- `characterUpdateService`: Processes character sheet updates based on events
- `entityGenerator`: Generates NPCs and enemies with appropriate stats
- `combatSystem`: Manages turn-based combat mechanics
- `characterGenerator`: Character creation and updates

## Project Structure
```
/src
  /components
    CharacterSheet.tsx    // Character UI
    CombatDisplay.tsx    // Combat interface
    DiceAnimation.tsx    // 3D dice system
    GameGraph.tsx        // Story visualization
    StoryDisplay.tsx     // Narrative UI
  /contexts             // State management
    CharacterContext.tsx // Character state
    CombatContext.tsx   // Combat state
    DiceContext.tsx     // Dice system state
    GameContext.tsx     // Core game state
    StoryContext.tsx    // Narrative state
  /services
    characterUpdateService.ts // Character updates
    combatSystem.ts         // Combat mechanics
    diceService.ts          // Dice mechanics
    entityGenerator.ts      // NPC/Enemy generation
    storyGenerationService.ts // Story generation
    characterGenerator.ts    // Character system
  /types
    index.ts               // Core type definitions
```

## Game Modes
1. Story Mode:
   - Narrative progression through choice nodes
   - Character sheet updates based on story events
   - Skill checks and dice rolls for actions

2. Combat Mode:
   - Turn-based combat with initiative order
   - Action selection and targeting
   - Dynamic enemy/NPC behavior
   - Combat log tracking
   - Automatic mode switching based on story choices

## AI Integration
- Uses Gemini 2.0 Flash Experimental model
- Structured JSON responses with schema validation
- Dynamic story generation based on theme combinations
- Combat encounter generation with appropriate enemies
- Character and entity state updates
- Dice roll requirements for choices and actions

## Entity System
1. Players:
   - Full character sheets with stats
   - Inventory and equipment tracking
   - Experience and leveling

2. NPCs:
   - Simplified character sheets
   - Role-specific actions and abilities
   - Personality traits

3. Enemies:
   - Combat-focused stats
   - Difficulty-based scaling
   - Special abilities and attacks

## Combat System
1. Initiative:
   - Turn order based on dice rolls
   - Entity type-specific modifiers

2. Actions:
   - Attack actions with targeting
   - Special abilities
   - Item usage
   - Movement (planned)

3. State Management:
   - HP tracking
   - Status effects
   - Combat log
   - Victory/defeat conditions

## Build/Deploy
- Vite for build system
- Environment variables required:
  - VITE_GEMINI_KEY: Google AI API key

## Project Location
- Local: `C:/Users/Sam/Documents/node/acererak/`
- Repository: github.com:SJMakin/acererak.git

## Testing
1. Unit Tests (Vitest):
   - Located in `src/services/__tests__/`
   - Focus on core game mechanics
   - Run with: `npm test`
   - Key test suites:
     - `diceService.test.ts`: Dice roll mechanics, modifiers, skill checks

2. E2E Tests (Playwright):
   - Located in `tests-e2e/`
   - Tests complete game flows
   - Run with: `npm run test:e2e`
   - Key test suites:
     - `gameFlow.spec.ts`: Story progression, combat transitions, hook error detection
   - Tests verify:
     - Story mode navigation
     - Combat mode transitions
     - Dice roll animations
     - Hook usage compliance
     - Error handling

## Recent Updates
- Added comprehensive test suite with Vitest and Playwright
- Fixed invalid hook usage in StoryContext
- Added E2E tests for complete game flow
- Added unit tests for dice mechanics
- Split AI services into separate modules for better separation of concerns
- Added combat system with turn-based mechanics
- Implemented NPC and enemy generation
- Enhanced character sheet updates
- Added combat mode UI with initiative tracking
- Fixed JSON response handling in Gemini API integration
