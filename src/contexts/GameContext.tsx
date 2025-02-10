import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { createRoot } from 'react-dom/client';
import { nanoid } from 'nanoid';
import DiceAnimation from '../components/DiceAnimation';
import {
  GraphData,
  Edge,
  StoryNode,
  ChoiceNode,
  isStoryNode,
  isChoiceNode,
  isValidStoryResponse,
  RollResult,
  DiceRoll,
} from '../types';
import { performRoll, formatRollResults } from '../services/diceService';
import { generateStoryNode } from '../services/aiService';
import { generateCharacterSheet } from '../services/characterGenerator';

interface GameState {
  graphData: GraphData;
  currentStoryNode: StoryNode | null;
  isLoading: boolean;
  error: string | null;
  characterSheet: string;
  currentRollResult: RollResult | null;
  showDiceAnimation: boolean;
}

interface GameContextProps extends GameState {
  loadStoryNode: (nodeId: string) => Promise<void>;
  chooseOption: (choiceNodeId: string) => Promise<void>;
  resetError: () => void;
  restartGame: () => Promise<void>;
  updateCharacterSheet: (
    updates: Array<{ oldText: string; newText: string }>
  ) => void;
  performDiceRoll: (roll: DiceRoll) => Promise<RollResult>;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const updateCharacterSheet = useCallback(
    (updates: Array<{ oldText: string; newText: string }>) => {
      setState(prev => {
        let newSheet = prev.characterSheet;
        updates.forEach(update => {
          newSheet = newSheet.replace(update.oldText, update.newText);
        });
        return { ...prev, characterSheet: newSheet };
      });
    },
    []
  );
  const [state, setState] = useState<GameState>({
    graphData: { nodes: [], edges: [] },
    currentStoryNode: null,
    isLoading: true,
    error: null,
    characterSheet: generateCharacterSheet(),
    currentRollResult: null,
  showDiceAnimation: false,
  });

  const setGraphData = useCallback((newData: GraphData) => {
    setState(prev => ({ ...prev, graphData: newData }));
  }, []);

  const setCurrentStoryNode = useCallback((node: StoryNode | null) => {
    setState(prev => ({ ...prev, currentStoryNode: node }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, [setError]);

  const performDiceRoll = useCallback(async (roll: DiceRoll): Promise<RollResult> => {
    try {
      const result = performRoll(roll);
      setState(prev => ({
        ...prev,
        currentRollResult: result,
        showDiceAnimation: true
      }));
      return result;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error performing dice roll');
      throw error;
    }
  }, [setError]);

  const createInitialStory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setState(prev => ({
        ...prev,
        graphData: { nodes: [], edges: [] },
        currentStoryNode: null,
        characterSheet: prev.characterSheet,
      }));

      const initialPrompt = `You find yourself in a medieval fantasy world. As a lone adventurer, you're about to embark on a quest. Your journey begins in a small village tavern, where rumors of adventure and danger circulate among the patrons.`;

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const response = await generateStoryNode(
            initialPrompt,
            state.characterSheet
          );

          // Validate response structure using type guard
          if (!isValidStoryResponse(response)) {
            throw new Error('Invalid story response structure');
          }

          // Initial story node centered at the top
          const initialPosition = { x: window.innerWidth / 2, y: 50 }; // Ensure comma separation between properties in object literals

          const storyNode: StoryNode = {
            id: nanoid(),
            type: 'story',
            content: response.story.content,
            summary: response.story.summary,
            position: initialPosition,
            data: { label: response.story.summary || 'Start' },
          };

          // Position choice nodes in an arc below the story node
          const choiceNodes: ChoiceNode[] = response.choices.map(
            (choice, index) => {
              const choiceCount = response.choices.length;
              const spacing = 200; // Horizontal spacing between choices
              const totalWidth = (choiceCount - 1) * spacing;
              const startX = initialPosition.x - totalWidth / 2;

              return {
                id: nanoid(),
                type: 'choice',
                text: choice.text,
                target: choice.nextNodeId,
                position: {
                  x: startX + index * spacing,
                  y: initialPosition.y + 100,
                },
                data: { label: choice.text },
              };
            }
          );

          const edges: Edge[] = choiceNodes.map(choice => ({
            id: `e-${storyNode.id}-${choice.id}`,
            source: storyNode.id,
            target: choice.id,
            type: 'smoothstep',
          }));

          const newGraphData: GraphData = {
            nodes: [storyNode, ...choiceNodes],
            edges,
          };

          setGraphData(newGraphData);
          setCurrentStoryNode(storyNode);
          break; // Success - exit retry loop
        } catch (error) {
          console.error(`Attempt ${retryCount + 1} failed:`, error);
          retryCount++;

          if (retryCount === maxRetries) {
            throw new Error(
              `Failed to generate story after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to generate initial story';
      console.error('Story generation failed:', error);
      setError(
        `Unable to start new game: ${errorMessage}. Please refresh the page to try again.`
      );

      // Reset to clean state
      setState(prev => ({
        ...prev,
        graphData: { nodes: [], edges: [] },
        currentStoryNode: null,
        isLoading: false,
        characterSheet: prev.characterSheet,
      }));
    } finally {
      setLoading(false);
    }
  }, [
    state.characterSheet,
    setCurrentStoryNode,
    setError,
    setGraphData,
    setLoading,
  ]);

  const loadStoryNode = async (nodeId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Find the node and validate its type
      const node = state.graphData.nodes.find(n => n.id === nodeId);
      if (!node) {
        throw new Error('Node not found in current graph');
      }

      if (!isStoryNode(node)) {
        throw new Error('Selected node is not a story node');
      }

      // Update current node and clear any previous errors
      setCurrentStoryNode(node);
      setError(null);
    } catch (error) {
      console.error('Error loading story node:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load story node'
      );
      // Keep the previous story node selected if there's an error
    } finally {
      setLoading(false);
    }
  };

  const chooseOption = async (choiceNodeId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Validate choice node exists
      const choiceNode = state.graphData.nodes.find(n => n.id === choiceNodeId);
      if (!choiceNode) {
        throw new Error('Invalid choice selected');
      }

      if (!choiceNode || !isChoiceNode(choiceNode)) {
        throw new Error(
          `Choice node not found or invalid type: ${choiceNodeId}`
        );
      }

      // Build context from current story path
      // Removed unused variable 'currentNodeId' state.currentStoryNode?.id;
      const storyPath = [];
      let currentNode = state.currentStoryNode;

      // Get story nodes for context
      while (currentNode) {
        storyPath.unshift(currentNode.content);
        // Find edge leading to current node
        const previousEdge = state.graphData.edges.find(
          e => e.target === currentNode?.id
        );
        if (!previousEdge) break;

        // Find the choice that led here
        const previousChoice = state.graphData.nodes.find(
          n => n.id === previousEdge.source
        );
        if (!previousChoice || !isChoiceNode(previousChoice)) break;

        // Include the choice text
        storyPath.unshift(previousChoice.text);

        // Find the story node before the choice
        const prevToChoiceEdge = state.graphData.edges.find(
          e => e.target === previousChoice.id
        );
        if (!prevToChoiceEdge) break;

        const previousStory = state.graphData.nodes.find(
          n => n.id === prevToChoiceEdge.source
        );
        if (!previousStory || !isStoryNode(previousStory)) break;

        currentNode = previousStory;
      }

      // Handle required dice rolls
      let rollResults: RollResult[] | undefined;
      const typedChoiceNode = choiceNode as ChoiceNode;
      const rolls = typedChoiceNode.requiredRolls;

      if (rolls && rolls.length > 0) {
        try {
          rollResults = [];
          // Start roll animations immediately but don't wait for them
          for (const roll of rolls) {
            const result = await performDiceRoll(roll);
            rollResults.push(result);
          }

          // Animation handling is now managed by the DiceAnimation component
          console.log('roll results: ', rollResults);
        } catch (error) {
          console.error('Error performing roll:', error);
          throw new Error('Failed to perform dice roll');
        }
      }

      const context = `Previous events: ${storyPath.join(' Then ')}

      Current choice: ${(choiceNode as ChoiceNode).text}
      ${rollResults ? `\nDice rolls:\n${formatRollResults(rollResults)}` : ''}

      Continue the story in a D&D style, considering previous events${rollResults ? ', dice roll results,' : ''} and the chosen action. Include potential consequences and maintain narrative consistency.`;

      console.log(context);

      // Generate new story node based on the enhanced context
      const newStoryData = await generateStoryNode(
        context,
        state.characterSheet
      );

      // Handle any character sheet updates
      if (
        newStoryData.characterUpdates &&
        newStoryData.characterUpdates.length > 0
      ) {
        console.log('Character updates:', newStoryData.characterUpdates);
        updateCharacterSheet(newStoryData.characterUpdates);
      }

      // Calculate new node positions based on current graph layout
      const calculateNewNodePosition = () => {
        const choiceNode = state.graphData.nodes.find(
          n => n.id === choiceNodeId
        );
        if (!choiceNode) return { x: 250, y: 5 };

        // Find all nodes connected to the selected choice
        const connectedNodes = state.graphData.edges
          .filter(e => e.source === choiceNodeId || e.target === choiceNodeId)
          .flatMap(e => [
            state.graphData.nodes.find(n => n.id === e.source),
            state.graphData.nodes.find(n => n.id === e.target),
          ])
          .filter(Boolean);

        // Calculate the next vertical position based on connected nodes
        const connectedMaxY = Math.max(
          ...connectedNodes.map(n => n?.position.y ?? 0)
        );

        return {
          x: choiceNode.position.x,
          y: connectedMaxY + 200, // Increased vertical spacing
        };
      };

      const newPosition = calculateNewNodePosition();

      const newStoryNode: StoryNode = {
        id: nanoid(),
        type: 'story',
        content: newStoryData.story.content,
        summary: newStoryData.story.summary,
        position: newPosition,
        data: { label: newStoryData.story.summary || 'Continue' },
        characterUpdateDescription: newStoryData.characterUpdates
          ?.map(update => update.description)
          .join('\n'),
        rollResults: rollResults,
      };

      const newChoiceNodes: ChoiceNode[] = newStoryData.choices.map(
        (choice, index) => {
          const choiceCount = newStoryData.choices.length;
          const spacing = 200; // Horizontal spacing between choices
          const totalWidth = (choiceCount - 1) * spacing;
          const startX = newPosition.x - totalWidth / 2;

          return {
            id: nanoid(),
            type: 'choice',
            text: choice.text,
            target: choice.nextNodeId,
            position: {
              x: startX + index * spacing,
              y: newPosition.y + 100,
            },
            data: { label: choice.text },
            requiredRolls: choice.requiredRolls,
          };
        }
      );

      // Create edge from choice to new story node
      const storyEdge: Edge = {
        id: `edge-${choiceNodeId}-${newStoryNode.id}`,
        source: choiceNodeId,
        target: newStoryNode.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#718096', strokeWidth: 2, opacity: 0.8 },
      };

      // Create edges from story node to new choices
      const choiceEdges: Edge[] = newChoiceNodes.map(choice => ({
        id: `edge-${newStoryNode.id}-${choice.id}`,
        source: newStoryNode.id,
        target: choice.id,
        type: 'smoothstep',
        style: { stroke: '#718096', strokeWidth: 2, opacity: 0.8 },
      }));

      // Filter out any existing nodes that would be below the new story node
      const newY = newStoryNode.position.y;
      const filteredNodes = state.graphData.nodes.filter(
        node => node.position.y < newY || node.id === choiceNodeId
      );

      // Filter out edges connected to removed nodes
      const filteredEdges = state.graphData.edges.filter(edge => {
        const sourceNode = filteredNodes.find(n => n.id === edge.source);
        const targetNode = filteredNodes.find(n => n.id === edge.target);
        return sourceNode && targetNode;
      });

      const newGraphData: GraphData = {
        nodes: [...filteredNodes, newStoryNode, ...newChoiceNodes],
        edges: [...filteredEdges, storyEdge, ...choiceEdges],
      };

      setGraphData(newGraphData);
      // Update state with new story node
      setState(prev => ({
        ...prev,
        currentStoryNode: newStoryNode,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to process choice';
      console.error('Error processing choice:', error);
      setError(
        `Unable to continue story: ${errorMessage}. Please try again or restart the game.`
      );

      // Revert to previous state if possible
      if (state.currentStoryNode) {
        await loadStoryNode(state.currentStoryNode.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const restartGame = async () => {
    setState({
      graphData: { nodes: [], edges: [] },
      currentStoryNode: null,
      isLoading: true,
      error: null,
      characterSheet: generateCharacterSheet(),
      currentRollResult: null,
      showDiceAnimation: false,
    });
    await createInitialStory();
  };

  const initialLoadedRef = useRef(false);
  useEffect(() => {
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      createInitialStory();
    }
  }, [createInitialStory]);

  const value = {
    ...state,
    loadStoryNode,
    chooseOption,
    resetError,
    restartGame,
    updateCharacterSheet,
    performDiceRoll,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
      {state.showDiceAnimation && state.currentRollResult && (() => {
        let container = document.getElementById('dice-animation-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'dice-animation-container';
          container.style.position = 'fixed';
          container.style.top = '50%';
          container.style.left = '50%';
          container.style.transform = 'translate(-50%, -50%)';
          container.style.width = '100vw';
          container.style.height = '100vh';
          container.style.backgroundColor = 'transparent';
          container.style.zIndex = '1000';
          document.body.appendChild(container);
        }
        const root = createRoot(container);
        root.render(
          <DiceAnimation 
            roll={state.currentRollResult}
            onAnimationComplete={() => {
              setState(prev => ({ ...prev, showDiceAnimation: false }));
              setTimeout(() => {
                root.unmount();
                container?.remove();
              }, 100);
            }}
          />
        );
        return null;
      })()}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
