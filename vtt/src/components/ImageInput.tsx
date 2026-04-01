import { useState, useRef, useCallback, useEffect } from 'react';
import { TextInput, Group, Text, Image, Stack, UnstyledButton, Textarea, Button, Loader, Collapse } from '@mantine/core';
import { ingestImage } from '../services/imageService';
import { useImageStore } from '../stores/imageStore';
import { useAIStore } from '../stores/aiStore';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface ImageInputValue {
  imageUrl?: string;
  imageId?: string;
  width?: number;
  height?: number;
}

interface ImageInputProps {
  value: ImageInputValue;
  onChange: (value: ImageInputValue) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  aiAvailable?: boolean;
}

export default function ImageInput({
  value,
  onChange,
  label = 'Image',
  placeholder = 'https://example.com/image.png',
  required,
  autoFocus,
  aiAvailable,
}: ImageInputProps) {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const { isGenerating, generationError, generateImage } = useAIStore();

  // Resolve preview URL from imageStore when value has an imageId (e.g. on edit).
  // Object URLs from imageStore are cache-managed — we must NOT revoke them.
  useEffect(() => {
    if (!value.imageId) {
      if (!value.imageUrl) setPreviewUrl(null);
      return;
    }
    // If we already have a preview for this imageId, keep it
    if (previewUrl) return;

    // Resolve embedded image to object URL for preview
    let cancelled = false;
    useImageStore.getState().getImageUrl(value.imageId).then((objectUrl) => {
      if (cancelled || !objectUrl) return;
      setPreviewUrl(objectUrl);
    });
    return () => { cancelled = true; };
  }, [value.imageId, value.imageUrl]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large (max 10MB)');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const embedded = await ingestImage(file);
      await useImageStore.getState().storeImage(embedded);
      const objectUrl = await useImageStore.getState().getImageUrl(embedded.id);
      setPreviewUrl(objectUrl);
      onChange({
        imageId: embedded.id,
        imageUrl: undefined,
        width: embedded.width,
        height: embedded.height,
      });
    } catch (err) {
      console.error('Failed to process image:', err);
      setError('Failed to process image. Try a different file.');
    } finally {
      setProcessing(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    // Don't process paste when in embedded mode
    if (value.imageId) return;
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleFile(file);
        return;
      }
    }
    // If not an image file, let the paste go through as text (URL)
  }, [handleFile, value.imageId]);

  const handleUrlChange = useCallback((url: string) => {
    setPreviewUrl(null);
    setError(null);
    onChange({
      imageUrl: url || undefined,
      imageId: undefined,
    });
  }, [onChange]);

  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setError(null);
    const result = await generateImage(aiPrompt.trim());
    if (result) {
      const objectUrl = await useImageStore.getState().getImageUrl(result.imageId);
      setPreviewUrl(objectUrl);
      onChange({
        imageId: result.imageId,
        imageUrl: undefined,
        width: result.width,
        height: result.height,
      });
      setAiExpanded(false);
      setAiPrompt('');
    }
  }, [aiPrompt, generateImage, onChange]);

  const hasImage = !!(value.imageId || value.imageUrl);

  return (
    <Stack gap="xs">
      <TextInput
        label={label}
        placeholder={placeholder}
        value={value.imageId ? '(embedded image)' : value.imageUrl || ''}
        onChange={(e) => handleUrlChange(e.currentTarget.value)}
        onPaste={handlePaste}
        required={required}
        autoFocus={autoFocus}
        data-autofocus={autoFocus || undefined}
        readOnly={!!value.imageId}
        error={error}
        rightSection={
          value.imageId ? (
            <UnstyledButton
              onClick={() => {
                setPreviewUrl(null);
                setError(null);
                onChange({ imageUrl: undefined, imageId: undefined });
              }}
              style={{ fontSize: 14, color: '#868e96' }}
              title="Clear embedded image"
            >
              ✕
            </UnstyledButton>
          ) : undefined
        }
      />

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        style={{
          border: `2px dashed ${dragOver ? '#228be6' : '#495057'}`,
          borderRadius: 8,
          padding: '12px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragOver ? 'rgba(34, 139, 230, 0.05)' : undefined,
          transition: 'all 150ms ease',
        }}
      >
        <Text size="sm" c="dimmed">
          {processing ? 'Compressing...' : 'Drop image here or click to upload'}
        </Text>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Generate with AI */}
      {aiAvailable && (
        <>
          {!aiExpanded ? (
            <Button
              variant="subtle"
              size="compact-sm"
              onClick={() => setAiExpanded(true)}
              disabled={isGenerating}
            >
              Generate with AI
            </Button>
          ) : (
            <Collapse in={aiExpanded}>
              <Stack gap="xs" style={{ border: '1px solid #495057', borderRadius: 8, padding: 12 }}>
                <Textarea
                  placeholder="Describe the image..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.currentTarget.value)}
                  minRows={2}
                  maxRows={4}
                  disabled={isGenerating}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAIGenerate();
                    }
                  }}
                />
                <Group gap="xs">
                  <Button
                    size="compact-sm"
                    onClick={handleAIGenerate}
                    disabled={!aiPrompt.trim() || isGenerating}
                    leftSection={isGenerating ? <Loader size={14} /> : undefined}
                  >
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </Button>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={() => { setAiExpanded(false); setAiPrompt(''); }}
                    disabled={isGenerating}
                  >
                    Cancel
                  </Button>
                </Group>
                {generationError && (
                  <Text size="xs" c="red">{generationError}</Text>
                )}
              </Stack>
            </Collapse>
          )}
        </>
      )}

      {/* Thumbnail preview */}
      {hasImage && (
        <Group justify="center">
          <Image
            src={previewUrl || value.imageUrl || ''}
            alt={value.imageId ? 'Embedded image preview' : 'URL image preview'}
            h={80}
            w="auto"
            fit="contain"
            radius="sm"
          />
        </Group>
      )}
    </Stack>
  );
}
