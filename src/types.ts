export interface SelectedTheme {
  category: string;
  theme: string;
}

// ============================================================================
// DICE TYPES
// ============================================================================

export interface DiceRoll {
  type: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';
  count: number;
  modifier?: number;
  difficulty?: number; // DC for skill checks
  skill?: string; // The skill being checked
  description: string; // What this roll is for
}

export interface RollResult {
  roll: DiceRoll;
  results: number[];
  total: number;
  success?: boolean; // For skill checks
  formatted: string;
}

export type DiceGeometryType =
  | 'd4'
  | 'd6'
  | 'd8'
  | 'd10'
  | 'd12'
  | 'd20'
  | 'd100';

export interface Dice3DAnimationState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };
}

// ============================================================================
// ENTITY TYPES
// ============================================================================

export interface Entity {
  id: string;
  type: 'player' | 'npc';
  sheet: string; // Markdown format
}

// ============================================================================
// STORY GENERATION RESPONSE (from LLM)
// ============================================================================

export interface StoryGenerationResponse {
  story: {
    content: string;
    summary: string;
    imagePrompt?: string; // Optional - LLM may not always generate
  };
  choices: Array<{
    text: string;
    nextNodeId: string;
    imagePrompt?: string; // Scene preview for this choice
    requiredRolls?: DiceRoll[];
  }>;
  characterUpdates?: Array<{
    oldText: string;
    newText: string;
    description: string;
  }>;
  rollResults?: RollResult[];
}

export function isValidStoryResponse(
  response: unknown
): response is StoryGenerationResponse {
  try {
    if (!response || typeof response !== 'object') {
      console.error('Invalid response structure');
      return false;
    }

    const typedResponse = response as Record<string, unknown>;

    if (!typedResponse.story || typeof typedResponse.story !== 'object') {
      console.error('Invalid or missing story object');
      return false;
    }

    const story = typedResponse.story as Record<string, unknown>;

    if (typeof story.content !== 'string') {
      console.error('Invalid or missing story content');
      return false;
    }

    if (typeof story.summary !== 'string') {
      console.error('Invalid or missing story summary');
      return false;
    }

    // imagePrompt is optional - don't fail validation if missing
    if (story.imagePrompt !== undefined && typeof story.imagePrompt !== 'string') {
      console.error('Invalid story imagePrompt type');
      return false;
    }

    if (
      !Array.isArray(typedResponse.choices) ||
      typedResponse.choices.length < 2
    ) {
      console.error('Invalid or insufficient choices');
      return false;
    }

    if (
      !typedResponse.choices.every((choice: unknown) => {
        if (!choice || typeof choice !== 'object') return false;
        const typedChoice = choice as Record<string, unknown>;
        return (
          typeof typedChoice.text === 'string' &&
          typeof typedChoice.nextNodeId === 'string'
        );
      })
    ) {
      console.error('Invalid choice structure');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating story response:', error);
    return false;
  }
}

// ============================================================================
// LEGACY NODE TYPES (for backwards compatibility during migration)
// TODO: Remove these after Phase 9 cleanup
// ============================================================================

export interface StoryNode {
  id: string;
  type: 'story';
  content: string;
  summary?: string;
  imagePrompt?: string;
  position: { x: number; y: number };
  data: { label: string };
  characterUpdateDescription?: string;
  rollResults?: RollResult[];
  imageUrl?: string;
}

export interface ChoiceNode {
  id: string;
  type: 'choice';
  choiceType: 'story';
  text: string;
  target: string;
  position: { x: number; y: number };
  data: { label: string };
  requiredRolls?: DiceRoll[];
}

export type Node = StoryNode | ChoiceNode;

export function isStoryNode(node: Node): node is StoryNode {
  return node.type === 'story';
}

export function isChoiceNode(node: Node): node is ChoiceNode {
  return node.type === 'choice' && node.choiceType === 'story';
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: 'smoothstep';
  animated?: boolean;
  style?: {
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

// ============================================================================
// CHAT MESSAGE TYPES (Phase 1)
// ============================================================================

/**
 * Base interface for all chat messages
 */
export interface BaseChatMessage {
  id: string;
  timestamp: Date;
  turnIndex?: number; // Groups related messages (story + its choices)
}

/**
 * Story text - the main narrative content with choices attached
 */
export interface StoryMessage extends BaseChatMessage {
  type: 'story';
  content: string;
  summary?: string;
  streaming?: boolean; // True while content is being streamed
  llmCall?: LlmCallInfo; // API call that generated this
  choices?: ChatChoice[]; // Choices attached to this story beat
  ttsEnabled?: boolean; // Show TTS controls
}

/**
 * Image card - shows prompt while loading, then the image
 */
export interface ImageMessage extends BaseChatMessage {
  type: 'image';
  prompt: string; // Always shown as context
  url?: string; // Set when image is ready
  loading?: boolean; // True while generating
  error?: string; // If generation failed
}

/**
 * Dice roll with embedded 3D animation
 */
export interface DiceMessage extends BaseChatMessage {
  type: 'dice';
  rolls: RollResult[]; // Can have multiple rolls
  animationComplete?: boolean; // Controls whether to show animation or result
  description?: string; // e.g., "Constitution Save DC 15"
}

/**
 * Atmospheric filler while waiting
 */
export interface FillerMessage extends BaseChatMessage {
  type: 'filler';
  content: string;
  fillerType: 'thoughts' | 'omen' | 'flavor';
  streaming?: boolean;
}

/**
 * System notifications
 */
export interface SystemMessage extends BaseChatMessage {
  type: 'system';
  message: string;
  variant: 'info' | 'success' | 'warning' | 'error' | 'character-update';
}

/**
 * Union type for all chat message types
 */
export type ChatMessage =
  | StoryMessage
  | ImageMessage
  | DiceMessage
  | FillerMessage
  | SystemMessage;

/**
 * Choice within a story - not a separate message type
 */
export interface ChatChoice {
  id: string;
  text: string;
  imagePrompt?: string; // For generating preview image
  imageUrl?: string; // Preview thumbnail
  requiredRolls?: DiceRoll[];
  selected?: boolean; // User picked this
  disabled?: boolean; // Can't be selected
}

// ============================================================================
// LLM CALL METADATA
// ============================================================================

/**
 * Information about an LLM API call for cost tracking
 */
export interface LlmCallInfo {
  id: string;
  timestamp: Date;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number; // Calculated from model pricing
  duration: number; // ms
  type: 'story' | 'filler' | 'character' | 'image-prompt' | 'story-plan';
}

// ============================================================================
// SAVED GAME & SETTINGS
// ============================================================================

/**
 * A complete saved game state
 */
export interface SavedGame {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  // Character state
  characterSheet: string;

  // Story context
  storyPlan: string;
  themes: SelectedTheme[];

  // Chat history
  messages: ChatMessage[];

  // Branching support
  parentGameId?: string; // If this game was branched from another
  branchFromMessageIndex?: number; // The message index where branch occurred

  // Cost tracking
  totalCost: number;
  totalTokens: number;
  llmCallCount: number;
}

/**
 * Settings for image generation behavior
 */
export interface ImageSettings {
  generateStoryImages: boolean; // Image after story text (default: true)
  generateChoiceImages: boolean; // Preview images for choices (default: false)
}

/**
 * Settings for display preferences
 */
export interface DisplaySettings {
  showCostTracking: boolean; // Session totals in header/footer
  showLlmCallInfo: boolean; // Per-message API call details
}

// ============================================================================
// CHAT MESSAGE TYPE GUARDS
// ============================================================================

export function isStoryMessage(message: ChatMessage): message is StoryMessage {
  return message.type === 'story';
}

export function isImageMessage(message: ChatMessage): message is ImageMessage {
  return message.type === 'image';
}

export function isDiceMessage(message: ChatMessage): message is DiceMessage {
  return message.type === 'dice';
}

export function isFillerMessage(
  message: ChatMessage
): message is FillerMessage {
  return message.type === 'filler';
}

export function isSystemMessage(
  message: ChatMessage
): message is SystemMessage {
  return message.type === 'system';
}
