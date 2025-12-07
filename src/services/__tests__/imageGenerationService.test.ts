import { describe, it, expect } from 'vitest';
import { createImagePromptFromStory } from '../imageGenerationService';

// Test the updated image prompt creation function
describe('createImagePromptFromStory', () => {
  it('should use dedicated imagePrompt when provided', () => {
    const storyContent = 'The dark forest looms ahead, filled with eerie shadows.';
    const storySummary = 'Entering the dark forest';
    const imagePrompt = 'A dark fantasy forest scene with twisted trees, eerie green mist, and gothic architecture in the background. Cinematic lighting with deep shadows and a sense of impending doom.';

    const result = createImagePromptFromStory(storyContent, storySummary, imagePrompt);
    expect(result).toBe(imagePrompt.slice(0, 500));
  });

  it('should fall back to story content when imagePrompt is not provided', () => {
    const storyContent = 'The dark forest looms ahead, filled with eerie shadows.';
    const storySummary = 'Entering the dark forest';

    const result = createImagePromptFromStory(storyContent, storySummary);
    expect(result).toContain('Entering the dark forest');
  });

  it('should prefer storySummary over storyContent when imagePrompt is not provided', () => {
    const storyContent = 'The dark forest looms ahead, filled with eerie shadows.';
    const storySummary = 'Entering the dark forest';

    const result = createImagePromptFromStory(storyContent, storySummary);
    expect(result).toContain('Entering the dark forest');
  });

  it('should limit the prompt length to 500 characters', () => {
    const longPrompt = 'A'.repeat(600);
    const result = createImagePromptFromStory('', '', longPrompt);
    expect(result.length).toBe(500);
  });
});