# Acererak Project Handover

## Session Summary

This session implemented **streaming story content** display to reduce perceived latency. The old-school text adventure typewriter effect was well-received and sparked a new vision: transform the entire UI from a graph-based node system to a **chat dialog interface**.

---

## What Was Built This Session

### 1. Filler Content During Loading
- **Purpose**: Show engaging content while waiting for LLM response
- **Implementation**: 
  - `pendingFiller` state in [`StoryContext.tsx`](src/contexts/StoryContext.tsx)
  - Generates "thoughts", "omen", or "flavor" text via [`generateFillerContent()`](src/services/openRouterService.ts:166-214)
  - Shows for minimum 1 second before transitioning

### 2. Streaming Story Content
- **Key Files**:
  - [`generateStoryNodeStreaming()`](src/services/openRouterService.ts:318-505) - streams OpenRouter responses
  - `streamingContent` + `isStreaming` state in [`StoryContext.tsx`](src/contexts/StoryContext.tsx:42-43)
  - [`StoryDisplay.tsx`](src/components/StoryDisplay.tsx) - renders streaming view with blinking cursor

### 3. Regex-Based Partial JSON Extraction
- **Why**: `partial-json-parser` library couldn't extract incomplete strings
- **Solution**: Custom regex extracts content as it arrives:
  ```typescript
  const contentMatch = accumulated.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
  ```
- Handles escape sequences: `\n`, `\"`, `\\`
- Dependency removed, keeping codebase minimal

---

## Technical Knowledge Gained

### OpenRouter/OpenAI SDK Streaming
```typescript
const stream = await openRouter.chat.completions.create({
  model: currentModel.id,
  messages: [...],
  stream: true,  // Enable streaming
  response_format: { type: 'json_schema', json_schema: {...} }
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content || '';
  accumulated += delta;
}
```

### JSON Schema with Streaming
- Works! The schema is still enforced, just delivered in chunks
- Content arrives before choices, so story text streams first
- Final response is still fully validated before proceeding

### State Flow Architecture
```
User clicks choice
    ↓
isLoading: true, pendingFiller: "..."
    ↓
generateFillerContent() runs parallel
    ↓ (update pendingFiller when ready)
Wait 1s minimum, then 500ms transition
    ↓
isStreaming: true, pendingFiller: null
    ↓
generateStoryNodeStreaming() with callback
    ↓ (update streamingContent progressively)
Response complete + validated
    ↓
isLoading: false, create story node + choices
```

---

## Current Architecture Overview

### Key React Contexts
- [`StoryContext`](src/contexts/StoryContext.tsx) - Story state, streaming, loading, filler
- [`GameContext`](src/contexts/GameContext.tsx) - Orchestrates Story + Character + Dice + Rules
- [`CharacterContext`](src/contexts/CharacterContext.tsx) - Character sheet management
- [`DiceContext`](src/contexts/DiceContext.tsx) - 3D dice rolling with physics
- [`ModelContext`](src/contexts/ModelContext.tsx) - LLM model selection
- [`RulesContext`](src/contexts/RulesContext.tsx) - Custom game rules

### Core Services
- [`openRouterService.ts`](src/services/openRouterService.ts) - Story generation, filler, image prompts
- [`openRouterClient.ts`](src/services/openRouterClient.ts) - OpenRouter API client
- [`imageGenerationService.ts`](src/services/imageGenerationService.ts) - AI image generation
- [`characterUpdateService.ts`](src/services/characterUpdateService.ts) - Auto-updates character sheet based on story events

### Data Flow
1. User makes choice → `chooseOption()` in StoryContext
2. Filler generated in parallel, shown during loading
3. Streaming starts → UI shows typewriter effect
4. Response validated → StoryNode + ChoiceNodes created
5. Graph updated, image generation started in background

### Type System
- [`types.ts`](src/types.ts) - Core types: StoryNode, ChoiceNode, DiceRoll, RollResult, etc.
- `StoryGenerationResponse` - Shape of LLM response
- `isValidStoryResponse()` - Runtime validation

---

## The New Vision: Chat Dialog UI

### Current Problems
1. **Graph view is clunky** - was meant for branching but overcomplicates simple play
2. **Image takes too much space** - dominates the view
3. **Choices are awkward** - buttons at bottom feel disconnected
4. **Streaming doesn't match final view** - jarring transition

### Proposed Chat Dialog Interface

```
┌────────────────────────────────────────────┐
│ [Character: Thane the Barbarian]  [⚙️]     │
├────────────────────────────────────────────┤
│                                            │
│ ┌────────────────────────────────────┐     │
│ │ 💀 Acererak                        │     │
│ │ The dungeon air thickens with      │     │
│ │ dread as you approach the altar... │     │
│ └────────────────────────────────────┘     │
│                                            │
│ ┌────────────────────────────────────┐     │
│ │ 🎨 Image: "Dark altar, glowing..." │     │
│ │ [Loading image... ████████░░ 80%]  │     │
│ └────────────────────────────────────┘     │
│                                            │
│ ┌────────────────────────────────────┐     │
│ │ 🎲 Dice Roll                       │     │
│ │ Perception Check DC 15: 18 ✓       │     │
│ └────────────────────────────────────┘     │
│                                            │
│ ┌────────────────────────────────────┐     │
│ │ 💭 Filler: Meanwhile...            │     │
│ │ Your heart pounds as you sense     │     │
│ │ something watching from shadows... │▊    │
│ └────────────────────────────────────┘     │
│                                            │
├────────────────────────────────────────────┤
│ > Approach the altar cautiously            │
│ > Search for traps first                   │
│ > Call out into the darkness               │
└────────────────────────────────────────────┘
```

### Benefits
1. **Natural history** - scroll up to see past turns
2. **Visible LLM activity** - show generating state inline
3. **Modular nodes** - story, image, dice, filler all separate components
4. **Better streaming fit** - typewriter effect natural in chat bubbles
5. **Mobile-friendly** - vertical scroll, familiar UI pattern
6. **Cleaner architecture** - each message type = one component

### Implementation Ideas

#### New Types
```typescript
type ChatMessage = 
  | { type: 'story'; content: string; streaming?: boolean }
  | { type: 'image'; prompt: string; url?: string; loading?: boolean }
  | { type: 'dice'; roll: RollResult }
  | { type: 'filler'; content: string }
  | { type: 'choices'; options: Choice[] }
  | { type: 'system'; message: string }  // "Game started", "Character updated"
```

#### State Structure
```typescript
interface ChatState {
  messages: ChatMessage[];
  inputDisabled: boolean;
  streamingMessageId?: string;
}
```

#### Components to Create
- `ChatContainer.tsx` - scrollable message list
- `ChatMessage.tsx` - renders appropriate node type
- `StoryMessage.tsx` - story text with optional streaming
- `ImageMessage.tsx` - image with loading state + prompt preview
- `DiceMessage.tsx` - formatted roll result
- `ChoicesInput.tsx` - choice buttons (replaces bottom buttons)

### Architecture Approach

**Replace graph logic entirely** - don't keep it alongside. New chat-based state is cleaner:

1. Remove graph nodes/edges data structures
2. Replace with simple messages array
3. Each chat = one game session
4. LocalStorage persistence (like existing settings pattern)

### Branching as Feature
- "Branch from here" creates a **new chat** forked from that point
- Original chat preserved, new chat starts from the branched message
- Chat list in sidebar or modal to switch between sessions

### Persistence Model
```typescript
interface SavedGame {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  characterSheet: string;
  storyPlan: string;
  themes: SelectedTheme[];
  messages: ChatMessage[];
  parentGameId?: string;  // For branched games
  branchFromMessageIndex?: number;  // Where it branched
}

// LocalStorage keys
// acererak:games - SavedGame[]
// acererak:activeGameId - string
// acererak:settings - existing settings
```

### Extended Streaming
**Stream choices too, not just story content!**

Update regex to extract as JSON array streams:
```typescript
// Story content (existing)
const contentMatch = accumulated.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);

// Choices array - extract each as it completes
const choicesMatch = accumulated.match(/"choices"\s*:\s*\[(.*)/s);
// Then parse individual choice objects as they complete
```

Display choices progressively in UI - each appears as the LLM outputs it.

### LLM Call Visibility (Debug Mode)
**Settings toggle to show API calls in UI:**

```typescript
interface DebugSettings {
  showLlmCalls: boolean;  // Show API call indicators on messages
  showCostTracking: boolean;  // Display token usage and costs
}
```

**How it works:**
- Small 🤖 icon on messages that triggered LLM calls
- Click to expand: shows prompt, model used, tokens, cost
- Non-intrusive - just a subtle indicator until clicked
- Replaces console.log debugging with proper UI

**API Call Metadata:**
```typescript
interface LlmCallInfo {
  id: string;
  timestamp: Date;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;  // From model pricing
  prompt: string;  // The actual prompt sent
  response?: string;  // Raw response (optional, large)
  duration: number;  // ms
  type: 'story' | 'filler' | 'character' | 'image-prompt';
}

// Attach to relevant ChatMessage
interface ChatMessage {
  // ...existing fields
  llmCall?: LlmCallInfo;  // If this message came from/triggered an LLM call
}
```

**UI Design:**
```
┌────────────────────────────────────────┐
│ 💀 Acererak                     🤖 $0.02│  <- Icon shows call, cost badge
│ The dungeon air thickens...           │
│                                       │
│ ┌─────── LLM Call Details ──────────┐ │  <- Expandable on click
│ │ Model: gpt-4-turbo                │ │
│ │ Tokens: 1,234 in / 456 out        │ │
│ │ Cost: ~$0.018                     │ │
│ │ Duration: 3.2s                    │ │
│ │ [View Full Prompt]                │ │
│ └───────────────────────────────────┘ │
└────────────────────────────────────────┘
```

**Session Cost Tracker:**
- Running total in header/footer: "Session: $0.45 | 12 calls"
- Per-game totals saved with game state
- Helps users understand API spending

**OpenRouter Response Headers:**
OpenRouter returns usage info in response - capture it:
```typescript
// response.usage contains:
{
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
// Multiply by model pricing for cost estimate
```

### Image Generation Events
**Two types of images, user-configurable:**

```typescript
interface ImageSettings {
  generateStoryImages: boolean;  // Image after story text
  generateChoiceImages: boolean; // Image per choice option (preview of consequence)
}
```

**Schema update** - add imagePrompt to choices:
```typescript
{
  "story": {
    "content": "...",
    "summary": "...",
    "imagePrompt": "..."  // Existing
  },
  "choices": [{
    "text": "Approach the altar",
    "nextNodeId": "...",
    "imagePrompt": "Hand reaching toward glowing altar...",  // NEW
    "requiredRolls": [...]
  }]
}
```

**UI for choice images:**
- Thumbnail preview on hover/focus
- Or inline small preview under each choice
- Both generated in parallel if enabled

### Migration Steps
1. Create new `ChatContext.tsx` with messages array + persistence
2. Create `ChatMessage` type union
3. Build `ChatContainer.tsx` + message components
4. Update `generateStoryNodeStreaming()` to parse choices progressively
5. Add imagePrompt to choice schema
6. Add image settings to settings page
7. Replace `StoryDisplay` import with `ChatContainer`
8. Delete graph-related code (GraphData, edges, positions, etc.)
9. Update game init to create new SavedGame
10. Add chat list/switcher UI

---

## Files Relevant to Next Session

### Must Understand
- [`src/contexts/StoryContext.tsx`](src/contexts/StoryContext.tsx) - Current orchestration (to replace)
- [`src/services/openRouterService.ts`](src/services/openRouterService.ts) - LLM calls + streaming
- [`src/components/StoryDisplay.tsx`](src/components/StoryDisplay.tsx) - Current UI to replace
- [`src/types.ts`](src/types.ts) - Will need new ChatMessage + SavedGame types
- [`src/contexts/ApiKeyContext.tsx`](src/contexts/ApiKeyContext.tsx) - Reference for localStorage pattern

### Will Create
- `src/contexts/ChatContext.tsx` - New context replacing StoryContext
- `src/components/ChatContainer.tsx` - Main chat view
- `src/components/messages/` - StoryMessage, ImageMessage, DiceMessage, etc.
- `src/services/gameStorageService.ts` - LocalStorage persistence

### Will Delete/Deprecate
- `src/components/GameGraph.tsx` - Graph view no longer needed
- GraphData type, edges, node positions - all removed from types

### Good Reference
- [`src/components/DiceAnimation.tsx`](src/components/DiceAnimation.tsx) - 3D dice component
- [`src/components/CharacterSheet.tsx`](src/components/CharacterSheet.tsx) - Side panel design
- [`src/components/Settings.tsx`](src/components/Settings.tsx) - Settings pattern to follow for image toggles

---

## Quick Commands

```bash
# Run dev server
npm run dev

# Type check
npx tsc --noEmit

# Run tests
npm test

# Note: ttsService.ts has a pre-existing unused variable warning - ignore it
```

---

## Things That Worked Well

1. **Regex for partial JSON** - simpler and more reliable than parsing libraries
2. **Parallel filler generation** - doesn't delay main content
3. **Request tokens** - prevent stale state updates when user is fast
4. **Streaming callbacks** - clean separation of concerns
5. **CSS animations** - `fadeIn` and `blink` cursor feel polished

## Gotchas

1. **React state batching** - sometimes streaming updates batch together; may need `flushSync` for smoother animation
2. **Model variations** - some models buffer entire response before "streaming"; test with different models
3. **JSON schema + streaming** - works but content in strings must complete before regex can extract
4. **Escape sequences in content** - must manually unescape `\n`, `\"`, `\\`

---

## Summary of Next Session Goals

1. **New ChatContext** - Messages array, persistence, branching support
2. **LocalStorage persistence** - Save/load games, auto-save on changes
3. **Chat UI components** - Container + individual message types
4. **Extended streaming** - Parse choices as they arrive
5. **Choice image generation** - New schema field + settings toggle
6. **LLM call visibility** - Debug mode with cost tracking
7. **Remove graph architecture** - Clean break, simpler codebase

---

Ready to transform into a chat-based text adventure! 🎮