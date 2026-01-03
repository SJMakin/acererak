/**
 * SetupModal - A clean, mobile-friendly game setup wizard using Chakra UI
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';

import { useApiKey } from '../contexts/ApiKeyContext';
import { useModel } from '../contexts/ModelContext';
import { generateAICharacterSheet } from '../services/aiCharacterGenerator';
import { generateStoryPlan } from '../services/openRouterService';
import type { SelectedTheme } from '../types';

import Settings from './Settings';

interface SetupModalProps {
  onSetupComplete: (
    system: string,
    preferences: string | undefined,
    themes: SelectedTheme[] | null,
    previewedCharacterSheet?: string,
    previewedStoryPlan?: string
  ) => void;
  onClose?: () => void;
  isProcessing?: boolean;
}

type Step = 'system' | 'character' | 'themes' | 'preview' | 'settings';

const PREDEFINED_SYSTEMS = [
  'D&D 5e',
  'Pathfinder 2e',
  'Call of Cthulhu',
  'Warhammer Fantasy',
  'Vampire: The Masquerade',
  'Shadowrun',
  'Star Wars RPG',
  'Cyberpunk RED',
];

const SetupModal: React.FC<SetupModalProps> = ({ onSetupComplete, onClose, isProcessing: externalProcessing }) => {
  const { hasKey } = useApiKey();
  const { selectedModel } = useModel();

  // Current step
  const [step, setStep] = useState<Step>(hasKey ? 'system' : 'settings');

  // Form state
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [customSystem, setCustomSystem] = useState('');
  const [characterPreferences, setCharacterPreferences] = useState('');
  const [freeTextThemes, setFreeTextThemes] = useState('');
  const [useRandomThemes, setUseRandomThemes] = useState(false);

  // Preview state
  const [characterPreview, setCharacterPreview] = useState('');
  const [storyPlanPreview, setStoryPlanPreview] = useState('');
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [previewTab, setPreviewTab] = useState<'character' | 'story'>('character');

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentSystem = selectedSystem || customSystem;
  const canProceed = currentSystem.trim().length > 0;

  const handleSystemSelect = (system: string) => {
    setSelectedSystem(system);
    setCustomSystem('');
  };

  const handleCustomSystemChange = (value: string) => {
    setCustomSystem(value);
    if (value.trim()) {
      setSelectedSystem(null);
    }
  };

  const generateCharacterPreview = async () => {
    if (!currentSystem) return;
    setIsGeneratingCharacter(true);
    try {
      const sheet = await generateAICharacterSheet({
        system: currentSystem,
        preferences: characterPreferences.trim() || undefined,
      });
      setCharacterPreview(sheet);
    } catch (error) {
      console.error('Failed to generate character:', error);
    } finally {
      setIsGeneratingCharacter(false);
    }
  };

  const generateStoryPreview = async () => {
    setIsGeneratingStory(true);
    try {
      let themes: SelectedTheme[] | null = null;
      if (!useRandomThemes && freeTextThemes.trim()) {
        themes = freeTextThemes
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 3)
          .map((theme) => ({ category: 'Custom', theme }));
      }
      const plan = await generateStoryPlan(selectedModel, themes);
      setStoryPlanPreview(plan);
    } catch (error) {
      console.error('Failed to generate story plan:', error);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const generateAllPreviews = async () => {
    await Promise.all([generateCharacterPreview(), generateStoryPreview()]);
  };

  const handleSubmit = () => {
    if (!hasKey) {
      alert('Please add your OpenRouter API key in Settings.');
      setStep('settings');
      return;
    }

    setIsSubmitting(true);
    const system = currentSystem || PREDEFINED_SYSTEMS[0];
    const themes =
      useRandomThemes || !freeTextThemes.trim()
        ? null
        : freeTextThemes
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 3)
            .map((theme) => ({ category: 'Custom', theme }));

    onSetupComplete(
      system,
      characterPreferences.trim() || undefined,
      themes,
      characterPreview || undefined,
      storyPlanPreview || undefined
    );
  };

  // Loading state
  if (isSubmitting || externalProcessing) {
    const needsGeneration = !characterPreview || !storyPlanPreview;
    return (
      <Box
        bg="gray.900"
        borderRadius="lg"
        maxW="700px"
        w="95%"
        maxH="90vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={8}
        boxShadow="2xl"
      >
        <VStack gap={4}>
          <Heading size="lg" color="purple.400">
            {needsGeneration ? 'Creating Your Adventure...' : 'Starting Your Adventure...'}
          </Heading>
          <Text color="gray.400">
            {needsGeneration
              ? 'Generating character and world'
              : 'Preparing the first scene'}
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      bg="gray.900"
      color="gray.100"
      position="relative"
      borderRadius="lg"
      maxW="700px"
      w="95%"
      maxH="90vh"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      boxShadow="2xl"
    >
      {/* Header */}
      <Box
        bg="gray.800"
        borderBottom="1px solid"
        borderColor="gray.700"
        py={4}
        px={4}
        flexShrink={0}
      >
        <Flex justify="space-between" align="center">
          <Box w="40px" /> {/* Spacer for centering */}
          <Heading size="md" textAlign="center" color="purple.300">
            🎲 Create Your Adventure
          </Heading>
          {onClose ? (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          ) : (
            <Box w="40px" />
          )}
        </Flex>
      </Box>

      {/* Step Indicator */}
      <Box bg="gray.850" py={3} borderBottom="1px solid" borderColor="gray.700" flexShrink={0}>
        <Box px={4}>
          <HStack justify="center" gap={2} flexWrap="wrap">
            {[
              { key: 'system', label: '1. System' },
              { key: 'character', label: '2. Character' },
              { key: 'themes', label: '3. Themes' },
              { key: 'preview', label: '4. Preview' },
            ].map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant="outline"
                px={4}
                bg={step === key ? 'purple.600' : 'gray.800'}
                color={step === key ? 'white' : 'gray.300'}
                borderColor={step === key ? 'purple.500' : 'gray.600'}
                borderWidth="1px"
                _hover={step === key ? { bg: 'purple.500' } : { bg: 'gray.700', borderColor: 'gray.500' }}
                onClick={() => setStep(key as Step)}
                disabled={key !== 'system' && key !== 'settings' && !canProceed}
              >
                {label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              px={4}
              bg={step === 'settings' ? 'purple.600' : 'gray.800'}
              color={step === 'settings' ? 'white' : 'gray.300'}
              borderColor={step === 'settings' ? 'purple.500' : 'gray.600'}
              borderWidth="1px"
              _hover={step === 'settings' ? { bg: 'purple.500' } : { bg: 'gray.700', borderColor: 'gray.500' }}
              onClick={() => setStep('settings')}
            >
              ⚙️ Settings
            </Button>
          </HStack>
        </Box>
      </Box>

      {/* Content */}
      <Box flex={1} overflowY="auto" py={6} px={4}>
        {/* System Selection */}
        {step === 'system' && (
          <VStack gap={6} align="stretch">
            <Heading size="md" color="purple.300">
              Choose Your RPG System
            </Heading>

            <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
              {PREDEFINED_SYSTEMS.map((system) => (
                <Button
                  key={system}
                  variant="outline"
                  bg={selectedSystem === system ? 'purple.600' : 'gray.800'}
                  color={selectedSystem === system ? 'white' : 'gray.300'}
                  borderColor={selectedSystem === system ? 'purple.500' : 'gray.600'}
                  borderWidth="1px"
                  _hover={selectedSystem === system ? { bg: 'purple.500' } : { bg: 'gray.700', borderColor: 'purple.400' }}
                  onClick={() => handleSystemSelect(system)}
                  size="sm"
                  height="auto"
                  py={3}
                  whiteSpace="normal"
                  textAlign="center"
                >
                  {system}
                </Button>
              ))}
            </SimpleGrid>

            <Box>
              <Text fontSize="sm" color="gray.400" mb={2}>
                Or enter any RPG system:
              </Text>
              <Input
                value={customSystem}
                onChange={(e) => handleCustomSystemChange(e.target.value)}
                placeholder="e.g., Blades in the Dark, FATE, etc."
                bg="gray.800"
                borderColor="gray.600"
              />
            </Box>

            <Flex justify="flex-end">
              <Button
                colorPalette="purple"
                onClick={() => setStep('character')}
                disabled={!canProceed}
              >
                Next: Character →
              </Button>
            </Flex>
          </VStack>
        )}

        {/* Character Preferences */}
        {step === 'character' && (
          <VStack gap={6} align="stretch">
            <Heading size="md" color="purple.300">
              Character Preferences
            </Heading>

            <Text color="gray.400">
              Describe your ideal character. Leave blank for a surprise!
            </Text>

            <Textarea
              value={characterPreferences}
              onChange={(e) => setCharacterPreferences(e.target.value)}
              placeholder="e.g., A grizzled dwarf warrior with a mysterious past, skilled in smithing and reluctant to use magic..."
              rows={5}
              bg="gray.800"
              borderColor="gray.600"
            />

            <Text fontSize="sm" color="gray.500">
              The AI will generate a complete character sheet based on your
              preferences and the selected system.
            </Text>

            <Flex justify="space-between">
              <Button
                variant="outline"
                px={4}
                bg="gray.800"
                color="gray.300"
                borderColor="gray.600"
                borderWidth="1px"
                _hover={{ bg: 'gray.700', borderColor: 'gray.500' }}
                onClick={() => setStep('system')}
              >
                ← Back
              </Button>
              <Button colorPalette="purple" onClick={() => setStep('themes')}>
                Next: Themes →
              </Button>
            </Flex>
          </VStack>
        )}

        {/* Adventure Themes */}
        {step === 'themes' && (
          <VStack gap={6} align="stretch">
            <Heading size="md" color="purple.300">
              Adventure Themes
            </Heading>

            <Box>
              <HStack mb={3}>
                <Button
                  size="sm"
                  variant="outline"
                  bg={!useRandomThemes ? 'purple.600' : 'gray.800'}
                  color={!useRandomThemes ? 'white' : 'gray.300'}
                  borderColor={!useRandomThemes ? 'purple.500' : 'gray.600'}
                  borderWidth="1px"
                  _hover={!useRandomThemes ? { bg: 'purple.500' } : { bg: 'gray.700', borderColor: 'purple.400' }}
                  onClick={() => setUseRandomThemes(false)}
                >
                  Custom Themes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  bg={useRandomThemes ? 'purple.600' : 'gray.800'}
                  color={useRandomThemes ? 'white' : 'gray.300'}
                  borderColor={useRandomThemes ? 'purple.500' : 'gray.600'}
                  borderWidth="1px"
                  _hover={useRandomThemes ? { bg: 'purple.500' } : { bg: 'gray.700', borderColor: 'purple.400' }}
                  onClick={() => setUseRandomThemes(true)}
                >
                  🎲 Random
                </Button>
              </HStack>

              {!useRandomThemes && (
                <Textarea
                  value={freeTextThemes}
                  onChange={(e) => setFreeTextThemes(e.target.value)}
                  placeholder="e.g., ancient ruins, revenge, dragon (comma-separated, up to 3)"
                  rows={3}
                  bg="gray.800"
                  borderColor="gray.600"
                />
              )}

              {useRandomThemes && (
                <Box
                  p={4}
                  bg="gray.800"
                  borderRadius="md"
                  borderColor="gray.600"
                  border="1px solid"
                >
                  <Text color="gray.400" fontStyle="italic">
                    🎲 The AI will choose exciting themes for your adventure!
                  </Text>
                </Box>
              )}
            </Box>

            <Flex justify="space-between">
              <Button
                variant="outline"
                px={4}
                bg="gray.800"
                color="gray.300"
                borderColor="gray.600"
                borderWidth="1px"
                _hover={{ bg: 'gray.700', borderColor: 'gray.500' }}
                onClick={() => setStep('character')}
              >
                ← Back
              </Button>
              <Button colorPalette="purple" onClick={() => setStep('preview')}>
                Next: Preview →
              </Button>
            </Flex>
          </VStack>
        )}

        {/* Preview */}
        {step === 'preview' && (
          <VStack gap={4} align="stretch" height="100%">
            <Flex justify="space-between" align="center" flexShrink={0}>
              <Heading size="md" color="purple.300">
                Preview Your Adventure
              </Heading>
              <Button
                size="sm"
                colorPalette="blue"
                onClick={generateAllPreviews}
                disabled={isGeneratingCharacter || isGeneratingStory}
              >
                {isGeneratingCharacter || isGeneratingStory
                  ? 'Generating...'
                  : characterPreview || storyPlanPreview
                    ? 'Regenerate'
                    : 'Generate Previews'}
              </Button>
            </Flex>

            <HStack flexShrink={0}>
              <Button
                size="sm"
                variant="outline"
                bg={previewTab === 'character' ? 'purple.600' : 'gray.800'}
                color={previewTab === 'character' ? 'white' : 'gray.300'}
                borderColor={previewTab === 'character' ? 'purple.500' : 'gray.600'}
                borderWidth="1px"
                _hover={previewTab === 'character' ? { bg: 'purple.500' } : { bg: 'gray.700', borderColor: 'purple.400' }}
                onClick={() => setPreviewTab('character')}
              >
                Character {characterPreview && '✓'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                bg={previewTab === 'story' ? 'purple.600' : 'gray.800'}
                color={previewTab === 'story' ? 'white' : 'gray.300'}
                borderColor={previewTab === 'story' ? 'purple.500' : 'gray.600'}
                borderWidth="1px"
                _hover={previewTab === 'story' ? { bg: 'purple.500' } : { bg: 'gray.700', borderColor: 'purple.400' }}
                onClick={() => setPreviewTab('story')}
              >
                Story Plan {storyPlanPreview && '✓'}
              </Button>
            </HStack>

            <Box
              bg="gray.800"
              p={4}
              borderRadius="md"
              flex={1}
              minH="150px"
              overflowY="auto"
            >
              {previewTab === 'character' && (
                <>
                  {isGeneratingCharacter && (
                    <Text color="gray.400">Generating character...</Text>
                  )}
                  {!isGeneratingCharacter && !characterPreview && (
                    <Text color="gray.500">
                      Click "Generate Previews" to see your character.
                    </Text>
                  )}
                  {characterPreview && (
                    <Box className="markdown-content">
                      <ReactMarkdown>{characterPreview}</ReactMarkdown>
                    </Box>
                  )}
                </>
              )}
              {previewTab === 'story' && (
                <>
                  {isGeneratingStory && (
                    <Text color="gray.400">Generating story plan...</Text>
                  )}
                  {!isGeneratingStory && !storyPlanPreview && (
                    <Text color="gray.500">
                      Click "Generate Previews" to see your adventure plan.
                    </Text>
                  )}
                  {storyPlanPreview && (
                    <Box className="markdown-content">
                      <ReactMarkdown>{storyPlanPreview}</ReactMarkdown>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </VStack>
        )}

        {/* Settings */}
        {step === 'settings' && (
          <VStack gap={6} align="stretch">
            {!hasKey && (
              <Box
                p={4}
                bg="orange.900"
                borderRadius="md"
                border="1px solid"
                borderColor="orange.600"
              >
                <Text fontWeight="bold" color="orange.200">
                  ⚠️ API Key Required
                </Text>
                <Text color="orange.300" fontSize="sm">
                  Add your OpenRouter API key below to start your adventure.
                </Text>
              </Box>
            )}

            <Settings />

            {hasKey && (
              <Button colorPalette="purple" onClick={() => setStep('system')}>
                Continue to Setup →
              </Button>
            )}
          </VStack>
        )}
      </Box>

      {/* Fixed Footer for Preview Step */}
      {step === 'preview' && (
        <Box
          bg="gray.800"
          borderTop="1px solid"
          borderColor="gray.700"
          py={4}
          px={4}
          flexShrink={0}
        >
          <Flex justify="space-between" align="center">
            <Button
              variant="outline"
              px={4}
              bg="gray.800"
              color="gray.300"
              borderColor="gray.600"
              borderWidth="1px"
              _hover={{ bg: 'gray.700', borderColor: 'gray.500' }}
              onClick={() => setStep('themes')}
            >
              ← Back
            </Button>
            <Button
              colorPalette="green"
              size="lg"
              onClick={handleSubmit}
              disabled={!canProceed}
            >
              🎮 Begin Adventure
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
};

export default SetupModal;