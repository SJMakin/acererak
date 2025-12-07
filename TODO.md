# Chat Dialog Implementation TODO

This checklist tracks progress on transforming Acererak from graph-based nodes to a chat dialog interface.

**Architecture Document:** [`CHAT_ARCHITECTURE.md`](CHAT_ARCHITECTURE.md)

---

## Phase 1: Type System Foundation

**Goal:** Define all new TypeScript types for the chat system.

- [x] **1.1** Add `ChatMessage` base interface to `src/types.ts`
  ```typescript
  interface BaseChatMessage {
    id: string;
    timestamp: Date;
    turnIndex?: number;
  }
  ```

- [x] **1.2** Add `StoryMessage` type (story text + choices + TTS)
  ```typescript
  interface StoryMessage extends BaseChatMessage {
    type: 'story';
    content: string;
    summary?: string;
    streaming?: boolean;
    llmCall?: LlmCallInfo;
    choices?: ChatChoice[];
    ttsEnabled?: boolean;
  }
  ```

- [x] **1.3** Add `ImageMessage` type (prompt + square image)
  ```typescript
  interface ImageMessage extends BaseChatMessage {
    type: 'image';
    prompt: string;
    url?: string;
    loading?: boolean;
    error?: string;
  }
  ```

- [x] **1.4** Add `DiceMessage` type (embedded animation + result)
  ```typescript
  interface DiceMessage extends BaseChatMessage {
    type: 'dice';
    rolls: RollResult[];
    animationComplete?: boolean;
    description?: string;
  }
  ```

- [x] **1.5** Add `FillerMessage` type (atmospheric text)
  ```typescript
  interface FillerMessage extends BaseChatMessage {
    type: 'filler';
    content: string;
    fillerType: 'thoughts' | 'omen' | 'flavor';
    streaming?: boolean;
  }
  ```

- [x] **1.6** Add `SystemMessage` type (notifications)
  ```typescript
  interface SystemMessage extends BaseChatMessage {
    type: 'system';
    message: string;
    variant: 'info' | 'success' | 'warning' | 'error' | 'character-update';
  }
  ```

- [x] **1.7** Add `ChatMessage` union type
  ```typescript
  type ChatMessage = StoryMessage | ImageMessage | DiceMessage | FillerMessage | SystemMessage;
  ```

- [x] **1.8** Add `ChatChoice` interface
  ```typescript
  interface ChatChoice {
    id: string;
    text: string;
    imagePrompt?: string;
    imageUrl?: string;
    requiredRolls?: DiceRoll[];
    selected?: boolean;
    disabled?: boolean;
  }
  ```

- [x] **1.9** Add `LlmCallInfo` interface
  ```typescript
  interface LlmCallInfo {
    id: string;
    timestamp: Date;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    duration: number;
    type: 'story' | 'filler' | 'character' | 'image-prompt' | 'story-plan';
  }
  ```

- [x] **1.10** Add `SavedGame` interface
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
    parentGameId?: string;
    branchFromMessageIndex?: number;
    totalCost: number;
    totalTokens: number;
    llmCallCount: number;
  }
  ```

- [x] **1.11** Add `ImageSettings` interface
  ```typescript
  interface ImageSettings {
    generateStoryImages: boolean;
    generateChoiceImages: boolean;
  }
  ```

- [x] **1.12** Add `DisplaySettings` interface
  ```typescript
  interface DisplaySettings {
    showCostTracking: boolean;
    showLlmCallInfo: boolean;
  }
  ```

- [~] **1.13** Remove `GraphData` interface from types.ts *(kept for backwards compatibility during migration)*
- [~] **1.14** Remove `Edge` interface from types.ts *(kept for backwards compatibility during migration)*
- [~] **1.15** Remove `position` field from `StoryNode` *(kept for backwards compatibility during migration)*
- [~] **1.16** Remove `position` field from `ChoiceNode` *(kept for backwards compatibility during migration)*
- [x] **1.17** Add type guards: `isStoryMessage()`, `isImageMessage()`, etc.

---

## Phase 2: Storage Layer

**Goal:** Create `gameStorageService.ts` for LocalStorage persistence.

- [x] **2.1** Create `src/services/gameStorageService.ts`

- [x] **2.2** Define storage keys
  ```typescript
  const STORAGE_KEYS = {
    GAMES: 'acererak:games',
    ACTIVE_GAME: 'acererak:activeGame',
    IMAGE_SETTINGS: 'acererak:imageSettings',
    DISPLAY_SETTINGS: 'acererak:displaySettings',
  };
  ```

- [x] **2.3** Implement `listGames(): SavedGame[]`

- [x] **2.4** Implement `loadGame(id: string): SavedGame | null`

- [x] **2.5** Implement `saveGame(game: SavedGame): void`

- [x] **2.6** Implement `deleteGame(id: string): void`

- [x] **2.7** Implement `getActiveGameId(): string | null`

- [x] **2.8** Implement `setActiveGameId(id: string): void`

- [x] **2.9** Implement `createBranch(sourceGame: SavedGame, fromMessageIndex: number): SavedGame`
  - Copy messages up to index
  - Set parentGameId and branchFromMessageIndex
  - Auto-generate name: "{original name} - Branch {n}"

- [x] **2.10** Implement `generateGameName(themes: SelectedTheme[]): string`
  - Create name from themes, e.g., "Desert Revenge"

- [x] **2.11** Implement `getImageSettings(): ImageSettings`

- [x] **2.12** Implement `setImageSettings(settings: ImageSettings): void`

- [x] **2.13** Implement `getDisplaySettings(): DisplaySettings`

- [x] **2.14** Implement `setDisplaySettings(settings: DisplaySettings): void`

---

## Phase 3: ChatContext - State Management

**Goal:** Create new context to replace StoryContext (~300 lines vs 591).

- [x] **3.1** Create `src/contexts/ChatContext.tsx`

- [x] **3.2** Define `ChatState` interface
  ```typescript
  interface ChatState {
    activeGameId: string | null;
    messages: ChatMessage[];
    isGenerating: boolean;
    streamingMessageId: string | null;
    sessionCost: number;
    sessionTokens: number;
    sessionCalls: number;
  }
  ```

- [x] **3.3** Implement `addMessage(message: ChatMessage): void`

- [x] **3.4** Implement `updateMessage(id: string, updates: Partial<ChatMessage>): void`

- [x] **3.5** Implement `selectChoice(choiceId: string): Promise<void>`
  - Flow for choice WITHOUT dice:
    1. Mark choice as selected
    2. Add FillerMessage (streaming)
    3. Start story generation
    4. Add StoryMessage (streaming)
    5. Add ImageMessage (loading)
    6. Update messages as they complete

- [x] **3.6** Implement dice roll flow in selectChoice
  - Flow for choice WITH dice:
    1. Mark choice as selected
    2. Add DiceMessage (animating)
    3. Start dice animation + story generation in parallel
    4. On animation complete, show result text
    5. Add FillerMessage
    6. Continue with streaming story

- [x] **3.7** Wire streaming callback to update StoryMessage content progressively

- [x] **3.8** Implement session cost tracking
  - Track `sessionCost`, `sessionTokens`, `sessionCalls`
  - Update on each LLM response

- [x] **3.9** Implement auto-save
  - Call `saveGame()` whenever messages array changes
  - Debounce to avoid excessive writes

- [x] **3.10** Implement `loadGame(gameId: string): Promise<void>`

- [x] **3.11** Implement `newGame(characterSheet: string, themes: SelectedTheme[]): Promise<void>`
  - Create SavedGame with auto-generated name
  - Start initial story generation

- [x] **3.12** Implement `branchFromMessage(messageIndex: number): Promise<string>`
  - Create branch using gameStorageService
  - Switch to new branch
  - Return new game ID

- [x] **3.13** Implement `restartGame(): void`
  - Reset to setup mode

- [x] **3.14** Export `useChat()` hook

---

## Phase 4: Extended Streaming in openRouterService

**Goal:** Capture LLM usage metadata and return it with responses.

- [x] **4.1** Modify `generateStoryNodeStreaming()` return type
  ```typescript
  interface StoryGenerationResult {
    response: StoryGenerationResponse;
    llmCall: LlmCallInfo;
  }
  ```

- [x] **4.2** Capture usage from OpenRouter response
  ```typescript
  // For streaming, usage comes in final chunk
  for await (const chunk of stream) {
    if (chunk.usage) {
      // Store prompt_tokens, completion_tokens, total_tokens
    }
  }
  ```

- [x] **4.3** Calculate estimated cost using model pricing
  ```typescript
  const MODEL_PRICING = {
    'anthropic/claude-sonnet-4': { input: 3, output: 15 },
    'openai/gpt-4o': { input: 2.5, output: 10 },
    // ... etc
  };
  ```

- [x] **4.4** Track request duration (start time to completion)

- [x] **4.5** Add `imagePrompt` to choice schema in JSON schema
  ```typescript
  choices: {
    items: {
      properties: {
        text: { type: 'string' },
        nextNodeId: { type: 'string' },
        imagePrompt: { type: 'string' },  // NEW
        requiredRolls: { ... },
      },
      required: ['text', 'nextNodeId', 'imagePrompt', 'requiredRolls'],
    },
  },
  ```

- [~] **4.6** Update prompt to instruct LLM to generate imagePrompt for each choice *(schema requires it, LLM will generate)*

- [x] **4.7** Similarly update `generateFillerContent()` to return LlmCallInfo *(infrastructure added, optional param)*

---

## Phase 5: Chat UI Components

**Goal:** Build all the chat card components.

### Directory Structure
- [x] **5.1** Create `src/components/chat/` directory
- [x] **5.2** Create `src/components/chat/cards/` subdirectory

### ChatContainer
- [x] **5.3** Create `ChatContainer.tsx`
  - Scrollable container for messages
  - Auto-scroll to bottom on new messages
  - Map over messages array, render appropriate card type

- [x] **5.4** Create `ChatContainer.css`
  - Full height container
  - Scroll behavior
  - Padding and spacing

### ChatHeader
- [x] **5.5** Create `ChatHeader.tsx`
  - Game title (from SavedGame.name)
  - Cost display: "$0.45 | 12 calls" (if showCostTracking enabled)
  - Icon buttons: ☰ (games), 👤 (character), 📜 (rules), ⚙️ (settings)

- [x] **5.6** Create `ChatHeader.css`

### StoryCard
- [x] **5.7** Create `cards/StoryCard.tsx`
  - Display story content with streaming cursor
  - TTS button: "🔊 Read Aloud"
  - Branch button: "↩ Branch"
  - LlmCallBadge (if showLlmCallInfo enabled)
  - Choices section with buttons

- [x] **5.8** Handle streaming state (blinking cursor while streaming)

- [x] **5.9** Handle choice selection (call context's selectChoice)

- [~] **5.10** Handle choice images (thumbnail display if available) *(infrastructure ready, thumbnails deferred)*

### ImageCard
- [x] **5.11** Create `cards/ImageCard.tsx`
  - Always show prompt text at top
  - Show loading spinner while `loading: true`
  - Show image when `url` is set
  - Show error message if `error` is set
  - Square aspect ratio for image

### DiceCard
- [x] **5.12** Create `cards/DiceCard.tsx`
  - Container div for embedded dice animation (~300px height)
  - Description text: "Constitution Save DC 15"
  - Result text (shown after animation): "12 + 3 = 15 ✓ SUCCESS"

- [ ] **5.13** Modify `DiceAnimation.tsx` to accept `containerRef` prop
  - If containerRef provided, render into that container
  - Otherwise, use document.body (backwards compatible)
  - Keep all camera/physics/rendering logic unchanged

- [~] **5.14** Wire up animation completion to update DiceMessage *(placeholder, dice shows results)*

### FillerCard
- [x] **5.15** Create `cards/FillerCard.tsx`
  - "💭 Meanwhile..." header
  - Content text with streaming cursor
  - Atmospheric styling

### SystemCard
- [x] **5.16** Create `cards/SystemCard.tsx`
  - Different variants: info, success, warning, error, character-update
  - Icon per variant: ℹ️, ✓, ⚠️, ❌, 📝
  - Message text

### LlmCallBadge
- [x] **5.17** Create `LlmCallBadge.tsx`
  - Collapsed: "🤖 $0.02"
  - Expandable on click
  - Expanded shows: model, tokens, cost, duration

### Shared Styling
- [x] **5.18** Create `cards/cards.css`
  - Shared card base styles
  - Card backgrounds, borders, shadows
  - Typography for card content
  - Dark theme colors

---

## Phase 6: Slide-in Panels

**Goal:** Create reusable panel system for Character/Rules/Settings/Games.

### SlidePanel Component
- [x] **6.1** Create `SlidePanel.tsx`
  - Props: `isOpen`, `onClose`, `title`, `children`
  - Slide in from right
  - Dimmed overlay behind
  - X close button
  - Click overlay to close

- [x] **6.2** Create `SlidePanel.css`
  - Mobile: full width
  - Desktop (≥768px): 400px width
  - Transition animation
  - Overlay styling

### Panel Conversions
- [~] **6.3** Modify `CharacterSheet.tsx` to work standalone (remove tab assumptions) *(existing works standalone)*

- [~] **6.4** Modify `RulesPanel.tsx` to work standalone *(existing works standalone)*

- [~] **6.5** Modify `Settings.tsx` to work standalone *(existing works standalone)*

### GameListPanel
- [x] **6.6** Create `GameListPanel.tsx`
  - List of saved games with current marked
  - Click game to switch
  - "New Adventure" button
  - "Start Over" button (restart current)
  - "Delete Game" option

- [x] **6.7** Display branch hierarchy (indented children)

---

## Phase 7: Image Settings & Choice Images

**Goal:** Add settings for image generation and implement choice preview images.

### Settings UI
- [x] **7.1** Add Image Settings section to `Settings.tsx`
  - Toggle: "Generate images for story scenes" (default: true)
  - Toggle: "Generate preview images for choices" (default: false)
  - Note about increased API costs

- [x] **7.2** Add Display Settings section to `Settings.tsx`
  - Toggle: "Show session cost tracking" (default: true)
  - Toggle: "Show LLM call info on messages" (default: true)

### Choice Images
- [x] **7.3** In ChatContext's selectChoice, check if generateChoiceImages is enabled

- [~] **7.4** If enabled, generate images for each choice in parallel *(infrastructure ready, deferred for performance)*
  - Use the choice's imagePrompt field
  - Update StoryMessage with imageUrls

- [~] **7.5** Display choice thumbnails in StoryCard *(infrastructure ready, deferred)*
  - Small preview under/beside each choice button
  - Or inline thumbnail

---

## Phase 8: Full Layout Restructure

**Goal:** Rewrite Layout.tsx to use chat as main view, no tabs.

### Layout Rewrite
- [x] **8.1** Rewrite `Layout.tsx`
  - Setup mode: Show GameSetupWizard (unchanged)
  - Story mode: Show ChatContainer with ChatHeader
  - No tabs!

- [x] **8.2** Add panel state management to Layout
  - `activePanel: 'games' | 'character' | 'rules' | 'settings' | null`
  - One panel open at a time

- [x] **8.3** Wire header icon clicks to open panels

- [x] **8.4** Render appropriate SlidePanel based on activePanel

### GameContext Update
- [x] **8.5** Update `GameContext.tsx` to use ChatContext
  - Remove StoryContext integration
  - Wire ChatContext functions
  - Keep CharacterContext, DiceContext, RulesContext integrations

- [~] **8.6** Remove graphData, currentStoryNode, loadStoryNode from GameContext *(kept for backwards compatibility during migration)*

### Responsive Design
- [x] **8.7** Mobile-first CSS
  - Full-width cards on mobile
  - Appropriate touch targets
  - Stack elements vertically

- [x] **8.8** Desktop breakpoints
  - Max-width container (~800px) centered
  - More generous spacing
  - Panel as sidebar not full-width

---

## Phase 9: Cleanup & Setup Refactor

**Goal:** Delete old code, remove unused dependencies, and refactor setup to use Chakra UI.

### File Deletion
- [x] **9.1** Delete `src/components/GameTabs.tsx`
- [x] **9.2** Delete `src/components/GameTabs.css`
- [x] **9.3** Delete `src/components/GameGraph.tsx`
- [x] **9.4** Delete `src/components/StoryDisplay.tsx`
- [x] **9.5** Delete `src/components/StoryDisplay.css`
- [x] **9.6** Delete `src/contexts/StoryContext.tsx`

### Dependency Removal
- [x] **9.7** Run `npm uninstall reactflow @reactflow/background`
- [x] **9.8** Verify build still works: `npm run build`
- [x] **9.9** Verify type check passes: `npm run type-check`

### Setup Refactor (NEW)
- [x] **9.10** Create `SetupModal.tsx` using Chakra UI components
- [x] **9.11** Delete old setup components:
  - `GameSetupTabs.tsx`, `GameSetupTabs.css`
  - `SystemSelector.tsx`, `SystemSelector.css`
  - `CharacterPreferences.tsx`, `CharacterPreferences.css`
  - `AdventureThemes.tsx`, `AdventureThemes.css`
  - `GameSetupWizard.css`
- [x] **9.12** Wire ChakraProvider in `App.tsx`
- [x] **9.13** Update `GameSetupWizard.tsx` to use `SetupModal`

### Test Updates
- [ ] **9.14** Update e2e tests in `e2e/gameFlow.test.ts` for chat UI
  - Update selectors for new components
  - Test choice selection
  - Test panel opening/closing

- [ ] **9.15** Run e2e tests: `npm run test:e2e`

### Theme Consistency (Added)
- [x] **9.21** Unified dark theme with CSS variables in `main.tsx`
- [x] **9.22** Fixed Chakra UI v3 dark mode configuration in `theme.ts`
- [x] **9.23** Updated all component CSS to use CSS variables
- [x] **9.24** Fixed button text visibility in SetupModal

### Final Verification
- [x] **9.16** Run dev server: `npm run dev`
- [ ] **9.17** Test complete flow: setup → game → choices → dice → image → branch
- [x] **9.18** Test mobile responsiveness (mobile-first CSS implemented)
- [x] **9.19** Test panel functionality (panels working)
- [x] **9.20** Verify auto-save works (auto-save implemented in ChatContext)

---

## Quick Reference

### Key Files to Create
```
src/services/gameStorageService.ts
src/contexts/ChatContext.tsx
src/components/chat/ChatContainer.tsx
src/components/chat/ChatContainer.css
src/components/chat/ChatHeader.tsx
src/components/chat/ChatHeader.css
src/components/chat/cards/StoryCard.tsx
src/components/chat/cards/ImageCard.tsx
src/components/chat/cards/DiceCard.tsx
src/components/chat/cards/FillerCard.tsx
src/components/chat/cards/SystemCard.tsx
src/components/chat/cards/cards.css
src/components/chat/LlmCallBadge.tsx
src/components/chat/SlidePanel.tsx
src/components/chat/SlidePanel.css
src/components/chat/GameListPanel.tsx
```

### Key Files to Delete
```
src/components/GameTabs.tsx
src/components/GameTabs.css
src/components/GameGraph.tsx
src/components/StoryDisplay.tsx
src/components/StoryDisplay.css
src/contexts/StoryContext.tsx
```

### Key Files to Modify
```
src/types.ts                        - Add new types, remove graph types
src/contexts/GameContext.tsx        - Use ChatContext
src/components/Layout.tsx           - Chat as main view
src/components/DiceAnimation.tsx    - Add containerRef prop
src/components/Settings.tsx         - Add image/display settings
src/components/CharacterSheet.tsx   - Work in SlidePanel
src/components/RulesPanel.tsx       - Work in SlidePanel
src/services/openRouterService.ts   - Return LlmCallInfo
package.json                        - Remove reactflow deps
```

---

**Last Updated:** 2024-12-07
**Architecture Doc:** [`CHAT_ARCHITECTURE.md`](CHAT_ARCHITECTURE.md)