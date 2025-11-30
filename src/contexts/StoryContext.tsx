import { nanoid } from 'nanoid';
import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
} from 'react';

import type { CharacterUpdate } from '../services/characterUpdateService';
import { generateCharacterUpdates } from '../services/characterUpdateService';
import { setCurrentModel } from '../services/openRouterClient';
import {
  generateStoryNode,
  setSelectedThemes,
  generateFillerContent,
  generateStoryImage,
} from '../services/openRouterService';
import type {
  GraphData,
  Edge,
  StoryNode,
  ChoiceNode,
  RollResult,
  Entity,
  SelectedTheme,
} from '../types';
import { isStoryNode, isChoiceNode, isValidStoryResponse } from '../types';

import { useCharacter } from './CharacterContext';
import { useDice } from './DiceContext';
import { useModel } from './ModelContext';
import { useRules } from './RulesContext';

export interface StoryState {
  graphData: GraphData;
  currentStoryNode: StoryNode | null;
  isLoading: boolean;
  error: string | null;
}

// Note: StoryNode already has characterUpdateDescription and rollResults properties in types.ts

export interface StoryContextProps extends StoryState {
  loadStoryNode: (_nodeId: string) => Promise<void>;
  chooseOption: (
    _choiceNodeId: string,
    _characterSheet: string
  ) => Promise<void>;
  resetError: () => void;
  restartGame: (_characterSheet: string) => Promise<void>;
  selectThemes: (
    _themes: SelectedTheme[] | null,
    _characterSheet: string
  ) => void;
}

const StoryContext = createContext<StoryContextProps | undefined>(undefined);

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<StoryState>({
    graphData: { nodes: [], edges: [] },
    currentStoryNode: null,
    isLoading: true,
    error: null,
  });

  const loadStoryNode = async (nodeId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const node = state.graphData.nodes.find(n => n.id === nodeId);
      if (!node) {
        throw new Error('Node not found in current graph');
      }

      if (!isStoryNode(node)) {
        throw new Error('Selected node is not a story node');
      }

      setState(prev => ({ ...prev, currentStoryNode: node }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load story node';
      console.error('Story node error:', message);
      setState(prev => ({ ...prev, error: message }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const { performDiceRoll } = useDice();

  const chooseOption = async (choiceNodeId: string, characterSheet: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const choiceNode = state.graphData.nodes.find(n => n.id === choiceNodeId);
      if (!choiceNode || !isChoiceNode(choiceNode)) {
        throw new Error(
          `Choice node not found or invalid type: ${choiceNodeId}`
        );
      }

      let context = `Current choice: ${choiceNode.text}\nCharacter Sheet:\n${characterSheet}`;
      let rollResults: RollResult[] = [];

      // Generate filler content immediately to display while waiting
      let fillerContent: string | undefined;
      const fillerTypes: Array<'thoughts' | 'omen' | 'flavor'> = [
        'thoughts',
        'omen',
        'flavor',
      ];
      const randomFillerType =
        fillerTypes[Math.floor(Math.random() * fillerTypes.length)];

      // Start filler content generation (don't await - let it run in parallel)
      const fillerPromise = generateFillerContent(
        context,
        randomFillerType
      ).catch(err => {
        console.error('Filler content generation failed:', err);
        return undefined;
      });

      // Handle dice rolls if required
      if (choiceNode.requiredRolls && choiceNode.requiredRolls.length > 0) {
        // Start dice rolls and get their results
        const rollPromises = choiceNode.requiredRolls.map(roll =>
          performDiceRoll(roll)
        );

        // Get results for story generation, but don't wait for animations
        rollResults = await Promise.all(rollPromises);

        // Add roll results to story generation context
        context += `\nDice Rolls:\n${rollResults.map(r => r.formatted).join('\n')}`;
      }

      // Get rules for story context
      const rules = getEnabledRulesForStoryContext();

      const newStoryData = await generateStoryNode(context, {
        player: characterSheet,
        customRules: rules.length > 0 ? rules : undefined,
      });

      // Get filler content if it's ready
      fillerContent = await fillerPromise;
      if (!isValidStoryResponse(newStoryData)) {
        throw new Error('Invalid story response structure');
      }

      // Generate character updates based on the new story content
      const playerEntity: Entity = {
        id: 'player',
        type: 'player',
        sheet: characterSheet,
      };

      // Extract events from the story content
      const events = [choiceNode.text, newStoryData.story.content];

      // Generate character updates
      let characterUpdates: CharacterUpdate[] = [];
      try {
        characterUpdates = await generateCharacterUpdates(
          playerEntity,
          events,
          context
        );

        // Apply updates to character sheet if there are any
        if (characterUpdates.length > 0) {
          updateCharacterSheet(characterUpdates);
        }
      } catch (error) {
        console.error('Failed to generate character updates:', error);
        // Continue with story generation even if updates fail
      }

      const newPosition = {
        x: choiceNode.position.x,
        y: choiceNode.position.y + 200,
      };

      // Generate image for the story node (don't await - let it happen in background)
      const imagePromise = generateStoryImage(
        newStoryData.story.content,
        newStoryData.story.summary
      ).catch(err => {
        console.error('Image generation failed:', err);
        return undefined;
      });

      const newStoryNode: StoryNode = {
        id: nanoid(),
        type: 'story',
        content: newStoryData.story.content,
        summary: newStoryData.story.summary,
        position: newPosition,
        data: { label: newStoryData.story.summary || 'Continue' },
        rollResults: rollResults.length > 0 ? rollResults : undefined,
        characterUpdateDescription:
          characterUpdates.length > 0
            ? characterUpdates.map(update => update.description).join('\n')
            : undefined,
        fillerContent: fillerContent,
        imageUrl: undefined, // Will be updated when image is ready
      };

      const newChoiceNodes: ChoiceNode[] = newStoryData.choices.map(
        (choice, index) => ({
          id: nanoid(),
          type: 'choice',
          text: choice.text,
          target: choice.nextNodeId,
          position: {
            x:
              newPosition.x +
              (index - (newStoryData.choices.length - 1) / 2) * 200,
            y: newPosition.y + 100,
          },
          data: { label: choice.text },
          choiceType: choice.type || 'story',
          requiredRolls: choice.requiredRolls || [],
          combatData: choice.type === 'combat' ? choice.combatData : undefined,
        })
      );

      const newEdges: Edge[] = [
        {
          id: `edge-${choiceNodeId}-${newStoryNode.id}`,
          source: choiceNodeId,
          target: newStoryNode.id,
          type: 'smoothstep' as const,
        },
        ...newChoiceNodes.map(choice => ({
          id: `edge-${newStoryNode.id}-${choice.id}`,
          source: newStoryNode.id,
          target: choice.id,
          type: 'smoothstep' as const,
        })),
      ];

      setState(prev => ({
        ...prev,
        graphData: {
          nodes: [...prev.graphData.nodes, newStoryNode, ...newChoiceNodes],
          edges: [...prev.graphData.edges, ...newEdges],
        },
        currentStoryNode: newStoryNode,
      }));

      // Update the story node with the image URL when it's ready
      imagePromise.then(imageUrl => {
        if (imageUrl) {
          setState(prev => ({
            ...prev,
            graphData: {
              ...prev.graphData,
              nodes: prev.graphData.nodes.map(node =>
                node.id === newStoryNode.id && isStoryNode(node)
                  ? { ...node, imageUrl }
                  : node
              ),
            },
            currentStoryNode:
              prev.currentStoryNode?.id === newStoryNode.id
                ? { ...newStoryNode, imageUrl }
                : prev.currentStoryNode,
          }));
        }
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to process choice';
      console.error('Choice processing error:', message);
      setState(prev => ({ ...prev, error: message }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const resetError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const { updateCharacterSheet } = useCharacter();
  const { getEnabledRulesForStoryContext } = useRules();
  const { selectedModel } = useModel();

  // Set the current model from the ModelContext
  useEffect(() => {
    setCurrentModel(selectedModel);
  }, [selectedModel]);

  // Function to handle theme selection
  const selectThemes = useCallback(
    (themes: SelectedTheme[] | null, currentCharacterSheet: string) => {
      console.log('StoryContext: Theme selection received', themes);

      // Set the selected themes in the story generation service
      setSelectedThemes(themes);

      // Start the game with selected themes
      setState(prev => ({
        ...prev,
        isLoading: true,
      }));

      // Start the game with the selected themes and character sheet
      startGameWithThemes(currentCharacterSheet);
    },
    [
      getEnabledRulesForStoryContext,
      updateCharacterSheet,
    ]
  );

  // This function starts the actual game after themes are selected
  const startGameWithThemes = async (characterSheet: string) => {
    try {
      const initialPrompt =
        'Begin the story. Introduce the character to the world.';

      // Get rules for story context
      const rules = getEnabledRulesForStoryContext();
 
      console.log('StoryContext: Generating initial story node');
      const newStoryData = await generateStoryNode(initialPrompt, {
        player: characterSheet,
        customRules: rules.length > 0 ? rules : undefined,
      });

      if (!isValidStoryResponse(newStoryData)) {
        throw new Error('Invalid story response structure');
      }

      // Generate character updates for the initial story
      const playerEntity: Entity = {
        id: 'player',
        type: 'player',
        sheet: characterSheet,
      };

      // Extract events from the story content
      const events = [newStoryData.story.content];
      const context = `Initial story: ${newStoryData.story.content}`;

      // Generate character updates
      let characterUpdates: CharacterUpdate[] = [];
      try {
        characterUpdates = await generateCharacterUpdates(
          playerEntity,
          events,
          context
        );

        // Apply updates to character sheet if there are any
        if (characterUpdates.length > 0) {
          updateCharacterSheet(characterUpdates);
        }
      } catch (error) {
        console.error('Failed to generate initial character updates:', error);
        // Continue with story generation even if updates fail
      }

      const initialPosition = { x: window.innerWidth / 2, y: 50 };

      // Generate image for the initial story node (don't await)
      const initialImagePromise = generateStoryImage(
        newStoryData.story.content,
        newStoryData.story.summary
      ).catch(err => {
        console.error('Initial image generation failed:', err);
        return undefined;
      });

      const storyNode: StoryNode = {
        id: nanoid(),
        type: 'story',
        content: newStoryData.story.content,
        summary: newStoryData.story.summary,
        position: initialPosition,
        data: { label: newStoryData.story.summary || 'Start' },
        characterUpdateDescription:
          characterUpdates.length > 0
            ? characterUpdates.map(update => update.description).join('\n')
            : undefined,
        imageUrl: undefined, // Will be updated when image is ready
      };

      const choiceNodes: ChoiceNode[] = newStoryData.choices.map(
        (choice, index) => ({
          id: nanoid(),
          type: 'choice',
          text: choice.text,
          target: choice.nextNodeId,
          position: {
            x:
              initialPosition.x +
              (index - (newStoryData.choices.length - 1) / 2) * 200,
            y: initialPosition.y + 100,
          },
          data: { label: choice.text },
          choiceType: choice.type || 'story',
          requiredRolls: choice.requiredRolls || [],
          combatData: choice.type === 'combat' ? choice.combatData : undefined,
        })
      );

      const edges: Edge[] = choiceNodes.map(choice => ({
        id: `edge-${storyNode.id}-${choice.id}`,
        source: storyNode.id,
        target: choice.id,
        type: 'smoothstep' as const,
      }));

      console.log(
        'StoryContext: Story node generated successfully, updating state'
      );
      setState({
        graphData: {
          nodes: [storyNode, ...choiceNodes],
          edges,
        },
        currentStoryNode: storyNode,
        isLoading: false,
        error: null,
      });

      // Update the initial story node with the image URL when it's ready
      initialImagePromise.then(imageUrl => {
        if (imageUrl) {
          setState(prev => ({
            ...prev,
            graphData: {
              ...prev.graphData,
              nodes: prev.graphData.nodes.map(node =>
                node.id === storyNode.id && isStoryNode(node)
                  ? { ...node, imageUrl }
                  : node
              ),
            },
            currentStoryNode:
              prev.currentStoryNode?.id === storyNode.id
                ? { ...storyNode, imageUrl }
                : prev.currentStoryNode,
          }));
        }
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start game';
      console.error('Game start error:', message);
      setState(prev => ({ ...prev, error: message, isLoading: false }));
    }
  };

  const restartGame = async (_characterSheet: string) => {
    try {
      // Reset the game state
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        graphData: { nodes: [], edges: [] }, // Clear the graph
        currentStoryNode: null, // Clear current node
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to restart game';
      console.error('Game restart error:', message);
      setState(prev => ({ ...prev, error: message, isLoading: false }));
    }
  };

  const value = {
    ...state,
    loadStoryNode,
    chooseOption,
    resetError,
    restartGame,
    selectThemes,
  };

  return (
    <StoryContext.Provider value={value}>{children}</StoryContext.Provider>
  );
};

export const useStory = () => {
  const context = useContext(StoryContext);
  if (context === undefined) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
};
