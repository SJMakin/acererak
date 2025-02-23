# Project Handover: Acererak

React/TypeScript game implementing an AI-driven narrative system with D&D-style mechanics.

## Core Architecture
- React/TypeScript with Context API for state management
- 3D dice system using THREE.js
- Node-based story progression with Gemini AI integration
- Character sheet system with dynamic updates

## Key Components
1. Game State Management:
   - Story/choice graph data
   - Character state and updates
   - Dice mechanics and animations
   - Loading/error states
   - AI response processing

2. Type System:
   ```typescript
   GraphData, Edge          // Story structure
   StoryNode, ChoiceNode   // Narrative elements with positions
   RollResult, DiceRoll    // Dice mechanics with modifiers
   StoryGenerationResponse // AI response structure with schema validation
   ```

## Services Layer
- `diceService`: 3D dice roll mechanics with physics
- `aiService`: Story generation using Gemini API
  - Theme-based story seeding
  - Structured JSON responses with schema validation
  - Debug logging for story generation steps
  - Categories: environments, emotions, objects, concepts, creatures, rituals, factions
- `characterGenerator`: Character creation and updates

## Project Structure
```
/src
  /components
    CharacterSheet.tsx    // Character UI
    DiceAnimation.tsx     // 3D dice system
    GameGraph.tsx         // Story visualization
    StoryDisplay.tsx      // Narrative UI
  /contexts              // State management
  /services
    aiService.ts         // Gemini integration
    diceService.ts       // Dice mechanics
    characterGenerator.ts // Character system
  /types
    index.ts            // Core type definitions
    schemas.ts          // Response schemas
```

## AI Integration
- Uses Gemini 2.0 Flash Experimental model
- Structured JSON responses with schema validation
- Dynamic story generation based on theme combinations
- Character sheet modification tracking
- Dice roll requirements for choices

## Build/Deploy
- Vite for build system
- Environment variables required:
  - VITE_GEMINI_KEY: Google AI API key

## Project Location
- Local: `C:/Users/Sam/Documents/node/acererak/`
- Repository: github.com:SJMakin/acererak.git