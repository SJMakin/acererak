import React, { useState } from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';

import { useGame } from '../contexts/GameContext';
import type { SelectedTheme } from '../types';

import SetupModal from './SetupModal';

const GameSetupWizard: React.FC = () => {
  const { selectSystem, completeSetup, isGeneratingCharacter, setCharacterSheet } = useGame();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Handle the complete setup process
  const handleSetupComplete = async (
    system: string,
    preferences: string | undefined,
    themes: SelectedTheme[] | null,
    previewedCharacterSheet?: string,
    previewedStoryPlan?: string
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      let characterSheet = previewedCharacterSheet;

      // Only generate character if not already previewed
      if (!characterSheet) {
        characterSheet = await selectSystem(system, preferences);

        if (!characterSheet) {
          throw new Error(
            'Failed to generate character. Please check your API key and try again.'
          );
        }
      } else {
        // Set the previewed character sheet in context
        setCharacterSheet(characterSheet);
      }

      // Complete the setup process and start the game with themes, passing the character sheet
      // Also pass the previewed story plan if available
      completeSetup(themes, characterSheet, previewedStoryPlan);

      // Setup completed successfully, clear processing state
      setIsProcessing(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to complete setup. Please try again.';
      console.error('Failed to complete setup:', errorMessage);
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  // Show loading state when generating
  if (isGeneratingCharacter || isProcessing) {
    return (
      <Box
        minH="100vh"
        bg="gray.900"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack gap={4}>
          <Text fontSize="xl" color="purple.300" fontWeight="bold">
            Creating Your Adventure...
          </Text>
          <Text color="gray.400">
            Generating character and world, this may take a moment
          </Text>
          {error && (
            <Box
              p={4}
              bg="red.900"
              borderRadius="md"
              border="1px solid"
              borderColor="red.600"
            >
              <Text color="red.200">{error}</Text>
            </Box>
          )}
        </VStack>
      </Box>
    );
  }

  return <SetupModal onSetupComplete={handleSetupComplete} />;
};

export default GameSetupWizard;
