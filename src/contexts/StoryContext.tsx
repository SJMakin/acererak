import React, { createContext, useState, useCallback, useContext } from 'react';
import { nanoid } from 'nanoid';
import { GraphData, Edge, StoryNode, ChoiceNode, isStoryNode, isChoiceNode, isValidStoryResponse } from '../types';
import { generateStoryNode } from '../services/storyGenerationService';
import { generateCharacterUpdates } from '../services/characterUpdateService';

export interface StoryState {
  graphData: GraphData;
  currentStoryNode: StoryNode | null;
  isLoading: boolean;
  error: string | null;
}

export interface StoryContextProps extends StoryState {
  loadStoryNode: (nodeId: string) => Promise<void>;
  chooseOption: (choiceNodeId: string, characterSheet: string) => Promise<void>;
  resetError: () => void;
  restartGame: (characterSheet: string) => Promise<void>;
}

const StoryContext = createContext<StoryContextProps | undefined>(undefined);

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StoryState>({
    graphData: { nodes: [], edges: [] },
    currentStoryNode: null,
    isLoading: true,
    error: null
  });

  // Core story state management functions here
  // ... (copy relevant functions from GameContext)

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
      console.error('Error loading story node:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load story node'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const chooseOption = async (choiceNodeId: string, characterSheet: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const choiceNode = state.graphData.nodes.find(n => n.id === choiceNodeId);
      if (!choiceNode || !isChoiceNode(choiceNode)) {
        throw new Error(`Choice node not found or invalid type: ${choiceNodeId}`);
      }

      const context = `Current choice: ${choiceNode.text}\nCharacter Sheet:\n${characterSheet}`;
      
      const newStoryData = await generateStoryNode(context, {
        player: characterSheet
      });
      if (!isValidStoryResponse(newStoryData)) {
        throw new Error('Invalid story response structure');
      }

      const newPosition = {
        x: choiceNode.position.x,
        y: choiceNode.position.y + 200
      };

      const newStoryNode: StoryNode = {
        id: nanoid(),
        type: 'story',
        content: newStoryData.story.content,
        summary: newStoryData.story.summary,
        position: newPosition,
        data: { label: newStoryData.story.summary || 'Continue' }
      };

      const newChoiceNodes: ChoiceNode[] = newStoryData.choices.map((choice, index) => ({
        id: nanoid(),
        type: 'choice',
        text: choice.text,
        target: choice.nextNodeId,
        position: {
          x: newPosition.x + (index - (newStoryData.choices.length - 1) / 2) * 200,
          y: newPosition.y + 100
        },
        data: { label: choice.text },
        choiceType: choice.type || 'story',
        requiredRolls: choice.requiredRolls || [],
        combatData: choice.type === 'combat' ? choice.combatData : undefined
      }));

      const newEdges: Edge[] = [
        {
          id: `edge-${choiceNodeId}-${newStoryNode.id}`,
          source: choiceNodeId,
          target: newStoryNode.id,
          type: 'smoothstep' as const
        },
        ...newChoiceNodes.map(choice => ({
          id: `edge-${newStoryNode.id}-${choice.id}`,
          source: newStoryNode.id,
          target: choice.id,
          type: 'smoothstep' as const
        }))
      ];

      setState(prev => ({
        ...prev,
        graphData: {
          nodes: [...prev.graphData.nodes, newStoryNode, ...newChoiceNodes],
          edges: [...prev.graphData.edges, ...newEdges]
        },
        currentStoryNode: newStoryNode
      }));
    } catch (error) {
      console.error('Error processing choice:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to process choice'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const resetError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const restartGame = async (characterSheet: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const initialPrompt = 'Begin the story. Introduce the character to the world.';
      const newStoryData = await generateStoryNode(initialPrompt, {
        player: characterSheet
      });
      
      if (!isValidStoryResponse(newStoryData)) {
        throw new Error('Invalid story response structure');
      }

      const initialPosition = { x: window.innerWidth / 2, y: 50 };
      
      const storyNode: StoryNode = {
        id: nanoid(),
        type: 'story',
        content: newStoryData.story.content,
        summary: newStoryData.story.summary,
        position: initialPosition,
        data: { label: newStoryData.story.summary || 'Start' }
      };

      const choiceNodes: ChoiceNode[] = newStoryData.choices.map((choice, index) => ({
        id: nanoid(),
        type: 'choice',
        text: choice.text,
        target: choice.nextNodeId,
        position: {
          x: initialPosition.x + (index - (newStoryData.choices.length - 1) / 2) * 200,
          y: initialPosition.y + 100
        },
        data: { label: choice.text },
        choiceType: choice.type || 'story',
        requiredRolls: choice.requiredRolls || [],
        combatData: choice.type === 'combat' ? choice.combatData : undefined
      }));

      const edges: Edge[] = choiceNodes.map(choice => ({
        id: `edge-${storyNode.id}-${choice.id}`,
        source: storyNode.id,
        target: choice.id,
        type: 'smoothstep' as const
      }));

      setState({
        graphData: {
          nodes: [storyNode, ...choiceNodes],
          edges
        },
        currentStoryNode: storyNode,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Error starting game:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start game',
        isLoading: false
      }));
    }
  };

  const value = {
    ...state,
    loadStoryNode,
    chooseOption,
    resetError,
    restartGame
  };

  return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
};

export const useStory = () => {
  const context = useContext(StoryContext);
  if (context === undefined) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
};
