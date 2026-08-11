import { useEffect, useRef, useState } from 'react';
import { notifyImageMissing, useImageStore } from '../stores/imageStore';

export default function useImage(url: string, imageId?: string): [HTMLImageElement | null, boolean] {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Subscribe only to the requested image. A P2P delivery updates this entry and
  // automatically retries the load without re-rendering every image consumer.
  const cachedUrl = useImageStore((state) => (
    imageId ? state.urlCache.get(imageId) : undefined
  ));
  const loadingImageRef = useRef<HTMLImageElement | null>(null);
  const requestKey = `${imageId ?? ''}\u0000${url}\u0000${cachedUrl ?? ''}`;
  const resolvedRequestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Never keep rendering the previous source while a new one is resolving.
    resolvedRequestKeyRef.current = null;
    setImage(null);
    setLoaded(false);

    const loadImage = (src: string, useCors = true): Promise<HTMLImageElement | null> => (
      new Promise((resolve) => {
        const nextImage = new window.Image();
        loadingImageRef.current = nextImage;

        if (useCors && /^https?:/i.test(src)) {
          nextImage.crossOrigin = 'anonymous';
        }

        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => resolve(null);
        nextImage.src = src;
      })
    );

    const resolveImage = async () => {
      let src = cachedUrl;

      if (imageId && !src) {
        src = await useImageStore.getState().getImageUrl(imageId) ?? undefined;
        if (cancelled) return;

        if (!src) {
          notifyImageMissing(imageId);
          src = url || undefined;
        }
      } else if (!imageId) {
        src = url || undefined;
      }

      if (!src) {
        if (!cancelled) {
          resolvedRequestKeyRef.current = requestKey;
          setLoaded(true);
        }
        return;
      }

      let nextImage = await loadImage(src);
      if (cancelled) return;

      // Some remote servers render images but reject anonymous CORS requests.
      // Preserve the existing fallback behavior for display-only use.
      if (!nextImage && /^https?:/i.test(src)) {
        nextImage = await loadImage(src, false);
        if (cancelled) return;
      }

      resolvedRequestKeyRef.current = requestKey;
      setImage(nextImage);
      setLoaded(true);
    };

    void resolveImage().catch((error: unknown) => {
      if (cancelled) return;
      console.error('Failed to resolve image:', error);
      resolvedRequestKeyRef.current = requestKey;
      setImage(null);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
      const loadingImage = loadingImageRef.current;
      if (loadingImage) {
        loadingImage.onload = null;
        loadingImage.onerror = null;
      }
      loadingImageRef.current = null;
    };
  }, [url, imageId, cachedUrl, requestKey]);

  const isCurrentRequest = resolvedRequestKeyRef.current === requestKey;
  return [isCurrentRequest ? image : null, isCurrentRequest ? loaded : false];
}
