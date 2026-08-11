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
  const [embeddedPreview, setEmbeddedPreview] = useState<{
    imageId: string;
    url: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const actionIdRef = useRef(0);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const { isGenerating, generationError, generateImage } = useAIStore();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      actionIdRef.current += 1;
    };
  }, []);

  // Resolve a preview for the current imageId. Store the ID alongside the URL
  // so a slow lookup for a previous value can never display the wrong image.
  // Object URLs from imageStore are cache-managed and must not be revoked here.
  useEffect(() => {
    const imageId = value.imageId;
    actionIdRef.current += 1;
    setProcessing(false);

    if (!imageId) {
      setEmbeddedPreview(null);
      return;
    }

    let cancelled = false;
    void useImageStore.getState().getImageUrl(imageId)
      .then((objectUrl) => {
        if (cancelled || !objectUrl) return;
        setEmbeddedPreview({ imageId, url: objectUrl });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load image preview:', err);
        setError('Failed to load image preview.');
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
    const actionId = ++actionIdRef.current;
    setProcessing(true);
    setError(null);
    try {
      const embedded = await ingestImage(file);
      await useImageStore.getState().storeImage(embedded);
      const objectUrl = await useImageStore.getState().getImageUrl(embedded.id);
      if (!mountedRef.current || actionId !== actionIdRef.current) return;
      setEmbeddedPreview(objectUrl ? { imageId: embedded.id, url: objectUrl } : null);
      onChange({
        imageId: embedded.id,
        imageUrl: undefined,
        width: embedded.width,
        height: embedded.height,
      });
    } catch (err) {
      console.error('Failed to process image:', err);
      if (mountedRef.current && actionId === actionIdRef.current) {
        setError('Failed to process image. Try a different file.');
      }
    } finally {
      if (mountedRef.current && actionId === actionIdRef.current) {
        setProcessing(false);
      }
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
    actionIdRef.current += 1;
    setProcessing(false);
    setEmbeddedPreview(null);
    setError(null);
    onChange({
      imageUrl: url || undefined,
      imageId: undefined,
    });
  }, [onChange]);

  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    const actionId = ++actionIdRef.current;
    setError(null);
    try {
      const result = await generateImage(aiPrompt.trim());
      if (result && mountedRef.current && actionId === actionIdRef.current) {
        const objectUrl = await useImageStore.getState().getImageUrl(result.imageId);
        if (!mountedRef.current || actionId !== actionIdRef.current) return;
        setEmbeddedPreview(objectUrl ? { imageId: result.imageId, url: objectUrl } : null);
        onChange({
          imageId: result.imageId,
          imageUrl: undefined,
          width: result.width,
          height: result.height,
        });
        setAiExpanded(false);
        setAiPrompt('');
      }
    } catch (err) {
      console.error('Failed to load generated image:', err);
      if (mountedRef.current && actionId === actionIdRef.current) {
        setError('The image was generated but its preview could not be loaded.');
      }
    }
  }, [aiPrompt, generateImage, onChange]);

  const hasImage = !!(value.imageId || value.imageUrl);
  const previewUrl = embeddedPreview && embeddedPreview.imageId === value.imageId
    ? embeddedPreview.url
    : null;

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
                actionIdRef.current += 1;
                setProcessing(false);
                setEmbeddedPreview(null);
                setError(null);
                onChange({ imageUrl: undefined, imageId: undefined });
              }}
              style={{ fontSize: 14, color: '#868e96' }}
              title="Clear embedded image"
              aria-label="Clear embedded image"
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
