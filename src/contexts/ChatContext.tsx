/**
 * ChatContext - State Management for Chat Dialog Interface
 *
 * Replaces StoryContext with a simpler, linear chat history model.
 * ~300 lines vs StoryContext's ~591 lines.
 */

import { nanoid } from 'nanoid';
import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';

import type { CharacterUpdate } from '../services/characterUpdateService';
import { generateCharacterUpdates } from '../services/characterUpdateService';
import {
  createGame,
  createBranch,
  getImageSettings,
  exportGameToFile,
  importGameFromFile,
} from '../services/gameStorageService';
import { setCurrentModel } from '../services/openRouterClient';
import {
  generateStoryNodeStreaming,
  setSelectedThemes,
  generateFillerContent,
  generateStoryImage,
  generateStoryPlan,
  type StoryGenerationResult,
} from '../services/openRouterService';
import type {
  ChatMessage,
  StoryMessage,
  ImageMessage,
  DiceMessage,
  FillerMessage,
  SystemMessage,
  ChatChoice,
  SavedGame,
  SelectedTheme,
  RollResult,
  Entity,
} from '../types';
import { isValidStoryResponse } from '../types';

import { useCharacter } from './CharacterContext';
import { useDice } from './DiceContext';
import { useModel } from './ModelContext';
import { useRules } from './RulesContext';

// ============================================================================
// STATE TYPES
// ============================================================================

export interface ChatState {
  currentGame: SavedGame | null;
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingMessageId: string | null;
  error: string | null;
  hasUnsavedChanges: boolean;

  // Session cost tracking
  sessionCost: number;
  sessionTokens: number;
  sessionCalls: number;
}

export interface ChatContextProps extends ChatState {
  // Message management
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;

  // Choice handling
  selectChoice: (messageId: string, choiceId: string) => Promise<void>;

  // Game management
  newGame: (characterSheet: string, themes: SelectedTheme[], previewedStoryPlan?: string) => Promise<void>;
  branchFromMessage: (messageIndex: number) => Promise<string>;
  restartGame: () => void;

  // File operations
  exportGame: () => void;
  importGame: () => Promise<void>;

  // Utility
  resetError: () => void;
  markSaved: () => void;
}

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<ChatState>({
    currentGame: null,
    messages: [],
    isGenerating: false,
    streamingMessageId: null,
    error: null,
    hasUnsavedChanges: false,
    sessionCost: 0,
    sessionTokens: 0,
    sessionCalls: 0,
  });

  // Track request tokens to avoid stale updates
  const requestTokenRef = useRef<number>(0);

  // Context dependencies
  const { characterSheet, updateCharacterSheet } = useCharacter();
  const { performDiceRoll } = useDice();
  const { getEnabledRulesForStoryContext } = useRules();
  const { selectedModel } = useModel();

  // Set the current model from the ModelContext
  useEffect(() => {
    setCurrentModel(selectedModel);
  }, [selectedModel]);

  // ============================================================================
  // UNSAVED CHANGES WARNING
  // ============================================================================

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges && state.messages.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved game progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges, state.messages.length]);

  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================

  const addMessage = useCallback((message: ChatMessage) => {
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
      hasUnsavedChanges: true,
    }));
  }, []);

  const updateMessage = useCallback(
    (id: string, updates: Partial<ChatMessage>) => {
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === id ? ({ ...msg, ...updates } as ChatMessage) : msg
        ),
        hasUnsavedChanges: true,
      }));
    },
    []
  );

  // ============================================================================
  // CHOICE SELECTION FLOW
  // ============================================================================

  const selectChoice = useCallback(
    async (messageId: string, choiceId: string) => {
      const currentRequestToken = ++requestTokenRef.current;
      const startTime = Date.now();

      try {
        setState((prev) => ({
          ...prev,
          isGenerating: true,
          error: null,
        }));

        // Find the story message and choice
        const storyMessage = state.messages.find(
          (m) => m.id === messageId && m.type === 'story'
        ) as StoryMessage | undefined;

        if (!storyMessage || !storyMessage.choices) {
          throw new Error('Story message or choices not found');
        }

        const choice = storyMessage.choices.find((c) => c.id === choiceId);
        if (!choice) {
          throw new Error('Choice not found');
        }

        // Mark choice as selected
        updateMessage(messageId, {
          choices: storyMessage.choices.map((c) => ({
            ...c,
            selected: c.id === choiceId,
            disabled: true,
          })),
        });

        let context = `Current choice: ${choice.text}\nCharacter Sheet:\n${characterSheet}`;
        let rollResults: RollResult[] = [];

        // Handle dice rolls if required
        if (choice.requiredRolls && choice.requiredRolls.length > 0) {
          // Add dice message
          const diceMessageId = nanoid();
          const diceMessage: DiceMessage = {
            id: diceMessageId,
            type: 'dice',
            timestamp: new Date(),
            turnIndex: storyMessage.turnIndex,
            rolls: [],
            animationComplete: false,
            description: choice.requiredRolls
              .map((r) => `${r.skill || 'Roll'} DC ${r.difficulty}`)
              .join(', '),
          };
          addMessage(diceMessage);

          // Perform rolls
          const rollPromises = choice.requiredRolls.map((roll) =>
            performDiceRoll(roll)
          );
          rollResults = await Promise.all(rollPromises);

          // Update dice message with results
          updateMessage(diceMessageId, {
            rolls: rollResults,
            animationComplete: true,
          });

          context += `\nDice Rolls:\n${rollResults.map((r) => r.formatted).join('\n')}`;
        }

        // Generate and show filler content
        const fillerTypes: Array<'thoughts' | 'omen' | 'flavor'> = [
          'thoughts',
          'omen',
          'flavor',
        ];
        const randomFillerType =
          fillerTypes[Math.floor(Math.random() * fillerTypes.length)];

        const fillerMessageId = nanoid();
        const fillerMessage: FillerMessage = {
          id: fillerMessageId,
          type: 'filler',
          timestamp: new Date(),
          content: '...',
          fillerType: randomFillerType,
          streaming: true,
        };
        addMessage(fillerMessage);

        // Generate filler content
        const fillerContent = await generateFillerContent(
          context,
          randomFillerType
        ).catch(() => 'The tension builds...');

        if (requestTokenRef.current === currentRequestToken) {
          updateMessage(fillerMessageId, {
            content: fillerContent,
            streaming: false,
          });
        }

        // Wait minimum filler time
        const fillerDuration = Date.now() - startTime;
        const minFillerTime = 1000;
        if (fillerDuration < minFillerTime) {
          await new Promise((resolve) =>
            setTimeout(resolve, minFillerTime - fillerDuration)
          );
        }

        // Create story message (streaming)
        const newTurnIndex = (storyMessage.turnIndex || 0) + 1;
        const storyMsgId = nanoid();
        const newStoryMessage: StoryMessage = {
          id: storyMsgId,
          type: 'story',
          timestamp: new Date(),
          turnIndex: newTurnIndex,
          content: '',
          streaming: true,
        };
        addMessage(newStoryMessage);

        setState((prev) => ({
          ...prev,
          streamingMessageId: storyMsgId,
        }));

        // Get rules for story context
        const rules = getEnabledRulesForStoryContext();

        // Generate story with streaming
        const storyResult: StoryGenerationResult = await generateStoryNodeStreaming(
          context,
          {
            player: characterSheet,
            customRules: rules.length > 0 ? rules : undefined,
          },
          (partialContent: string) => {
            if (requestTokenRef.current === currentRequestToken) {
              updateMessage(storyMsgId, { content: partialContent });
            }
          }
        );

        const { response: storyData, llmCall } = storyResult;

        // Generate character updates
        const playerEntity: Entity = {
          id: 'player',
          type: 'player',
          sheet: characterSheet,
        };

        let characterUpdates: CharacterUpdate[] = [];
        try {
          characterUpdates = await generateCharacterUpdates(
            playerEntity,
            [choice.text, storyData.story.content],
            context
          );

          if (characterUpdates.length > 0) {
            updateCharacterSheet(characterUpdates);

            // Add system message for character updates
            const updateMessage: SystemMessage = {
              id: nanoid(),
              type: 'system',
              timestamp: new Date(),
              turnIndex: newTurnIndex,
              message: characterUpdates.map((u) => u.description).join('\n'),
              variant: 'character-update',
            };
            addMessage(updateMessage);
          }
        } catch (error) {
          console.error('Failed to generate character updates:', error);
        }

        // Convert choices to ChatChoice format
        const chatChoices: ChatChoice[] = storyData.choices.map((c) => ({
          id: nanoid(),
          text: c.text,
          imagePrompt: c.imagePrompt,
          requiredRolls: c.requiredRolls,
        }));

        // Update story message with final content, choices, and LLM call info
        updateMessage(storyMsgId, {
          content: storyData.story.content,
          summary: storyData.story.summary,
          streaming: false,
          choices: chatChoices,
          llmCall: llmCall,
        });

        // Update session costs with LLM call info
        setState((prev) => ({
          ...prev,
          streamingMessageId: null,
          sessionCalls: prev.sessionCalls + 1,
          sessionCost: prev.sessionCost + llmCall.estimatedCost,
          sessionTokens: prev.sessionTokens + llmCall.totalTokens,
        }));

        // Generate image if enabled
        const imageSettings = getImageSettings();
        if (imageSettings.generateStoryImages) {
          const imageMsgId = nanoid();
          const imageMessage: ImageMessage = {
            id: imageMsgId,
            type: 'image',
            timestamp: new Date(),
            turnIndex: newTurnIndex,
            prompt: storyData.story.imagePrompt || storyData.story.summary || 'Scene from the story',
            loading: true,
          };
          addMessage(imageMessage);

          generateStoryImage(
            storyData.story.content,
            storyData.story.summary,
            storyData.story.imagePrompt
          )
            .then((url) => {
              updateMessage(imageMsgId, { url, loading: false });
            })
            .catch((err) => {
              console.error('Image generation failed:', err);
              updateMessage(imageMsgId, {
                loading: false,
                error: 'Failed to generate image',
              });
            });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to process choice';
        console.error('Choice processing error:', message);
        setState((prev) => ({
          ...prev,
          error: message,
          isGenerating: false,
          streamingMessageId: null,
        }));
      } finally {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
        }));
      }
    },
    [
      state.messages,
      characterSheet,
      addMessage,
      updateMessage,
      performDiceRoll,
      getEnabledRulesForStoryContext,
      updateCharacterSheet,
    ]
  );

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  const exportGame = useCallback(() => {
    if (!state.currentGame) {
      console.warn('No active game to export');
      return;
    }

    // Update game with current state before export
    const gameToExport: SavedGame = {
      ...state.currentGame,
      messages: state.messages,
      totalCost: state.currentGame.totalCost + state.sessionCost,
      totalTokens: state.currentGame.totalTokens + state.sessionTokens,
      llmCallCount: state.currentGame.llmCallCount + state.sessionCalls,
      updatedAt: new Date(),
    };

    exportGameToFile(gameToExport);
    
    // Mark as saved after export
    setState((prev) => ({
      ...prev,
      hasUnsavedChanges: false,
    }));
  }, [state.currentGame, state.messages, state.sessionCost, state.sessionTokens, state.sessionCalls]);

  const importGame = useCallback(async () => {
    try {
      const game = await importGameFromFile();
      setSelectedThemes(game.themes);

      setState({
        currentGame: game,
        messages: game.messages,
        isGenerating: false,
        streamingMessageId: null,
        error: null,
        hasUnsavedChanges: false,
        sessionCost: 0,
        sessionTokens: 0,
        sessionCalls: 0,
      });
    } catch (error) {
      if (error instanceof Error && error.message !== 'File selection cancelled') {
        console.error('Import failed:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to import game',
        }));
      }
    }
  }, []);

  // ============================================================================
  // GAME MANAGEMENT
  // ============================================================================

  const newGame = useCallback(
    async (newCharacterSheet: string, themes: SelectedTheme[], previewedStoryPlan?: string) => {
      try {
        setState((prev) => ({
          ...prev,
          isGenerating: true,
          error: null,
        }));

        // Set themes for story generation
        setSelectedThemes(themes);

        // Use previewed story plan if available, otherwise generate one
        const storyPlan = previewedStoryPlan || await generateStoryPlan(selectedModel, themes);

        // Create the game
        const game = createGame(newCharacterSheet, storyPlan, themes);

        // Get rules for story context
        const rules = getEnabledRulesForStoryContext();

        // Generate initial story
        const context = 'Begin the story. Introduce the character to the world.';

        const storyMsgId = nanoid();
        const initialStoryMessage: StoryMessage = {
          id: storyMsgId,
          type: 'story',
          timestamp: new Date(),
          turnIndex: 0,
          content: '',
          streaming: true,
        };

        setState((prev) => ({
          ...prev,
          currentGame: game,
          messages: [initialStoryMessage],
          streamingMessageId: storyMsgId,
          hasUnsavedChanges: true,
        }));

        const storyResult: StoryGenerationResult = await generateStoryNodeStreaming(
          context,
          {
            player: newCharacterSheet,
            customRules: rules.length > 0 ? rules : undefined,
          },
          (partialContent: string) => {
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) =>
                msg.id === storyMsgId
                  ? { ...msg, content: partialContent }
                  : msg
              ),
            }));
          }
        );

        const { response: storyData, llmCall } = storyResult;

        // Convert choices
        const chatChoices: ChatChoice[] = storyData.choices.map((c) => ({
          id: nanoid(),
          text: c.text,
          imagePrompt: c.imagePrompt,
          requiredRolls: c.requiredRolls,
        }));

        // Create the complete story message with LLM call info
        const completeStoryMessage: StoryMessage = {
          id: storyMsgId,
          type: 'story',
          timestamp: new Date(),
          turnIndex: 0,
          content: storyData.story.content,
          summary: storyData.story.summary,
          streaming: false,
          choices: chatChoices,
          llmCall: llmCall,
        };

        const messages: ChatMessage[] = [completeStoryMessage];

        // Generate image if enabled
        const imageSettings = getImageSettings();
        if (imageSettings.generateStoryImages) {
          const imageMsgId = nanoid();
          const imageMessage: ImageMessage = {
            id: imageMsgId,
            type: 'image',
            timestamp: new Date(),
            turnIndex: 0,
            prompt: storyData.story.imagePrompt || storyData.story.summary || 'Scene from the story',
            loading: true,
          };
          messages.push(imageMessage);

          // Generate image in background
          generateStoryImage(
            storyData.story.content,
            storyData.story.summary,
            storyData.story.imagePrompt
          )
            .then((url) => {
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === imageMsgId
                    ? { ...msg, url, loading: false }
                    : msg
                ),
              }));
            })
            .catch((err) => {
              console.error('Image generation failed:', err);
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === imageMsgId
                    ? { ...msg, loading: false, error: 'Failed to generate image' }
                    : msg
                ),
              }));
            });
        }

        setState((prev) => ({
          ...prev,
          currentGame: {
            ...game,
            messages,
          },
          messages,
          isGenerating: false,
          streamingMessageId: null,
          sessionCalls: prev.sessionCalls + 1,
          sessionCost: prev.sessionCost + llmCall.estimatedCost,
          sessionTokens: prev.sessionTokens + llmCall.totalTokens,
          hasUnsavedChanges: true,
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to start new game';
        console.error('New game error:', message);
        setState((prev) => ({
          ...prev,
          error: message,
          isGenerating: false,
          streamingMessageId: null,
        }));
      }
    },
    [selectedModel, getEnabledRulesForStoryContext]
  );

  const branchFromMessage = useCallback(
    async (messageIndex: number): Promise<string> => {
      if (!state.currentGame) {
        throw new Error('No active game to branch from');
      }

      const branch = createBranch(state.currentGame, messageIndex);

      setState({
        currentGame: branch,
        messages: branch.messages,
        isGenerating: false,
        streamingMessageId: null,
        error: null,
        hasUnsavedChanges: true,
        sessionCost: 0,
        sessionTokens: 0,
        sessionCalls: 0,
      });

      return branch.id;
    },
    [state.currentGame]
  );

  const restartGame = useCallback(() => {
    setState({
      currentGame: null,
      messages: [],
      isGenerating: false,
      streamingMessageId: null,
      error: null,
      hasUnsavedChanges: false,
      sessionCost: 0,
      sessionTokens: 0,
      sessionCalls: 0,
    });
  }, []);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const markSaved = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasUnsavedChanges: false,
    }));
  }, []);

  const resetError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: ChatContextProps = {
    ...state,
    addMessage,
    updateMessage,
    selectChoice,
    newGame,
    branchFromMessage,
    restartGame,
    exportGame,
    importGame,
    resetError,
    markSaved,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// ============================================================================
// HOOK
// ============================================================================

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;