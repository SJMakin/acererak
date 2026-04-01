import { useState, useEffect, useRef } from 'react';
import { useImageStore, notifyImageMissing } from '../stores/imageStore';

export default function useImage(url: string, imageId?: string): [HTMLImageElement | null, boolean] {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Subscribe only to the specific URL for our imageId (avoids cascade re-renders)
  const cachedUrl = useImageStore((s) => imageId ? s.urlCache.get(imageId) : undefined);

  // Track what we've already resolved to avoid resetting on unrelated changes
  const resolvedRef = useRef<{ url?: string; imageId?: string; src?: string }>({});

  // Hold reference to loading image so it isn't garbage collected before onload fires
  const loadingImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!imageId && !url) {
      setImage(null);
      setLoaded(false);
      resolvedRef.current = {};
      return;
    }

    // If we already resolved this exact (url, imageId) and have an image, skip
    if (resolvedRef.current.url === url && resolvedRef.current.imageId === imageId && image) {
      return;
    }

    let cancelled = false;

    const loadFromUrl = (src: string) => {
      // If we already loaded this exact src, skip
      if (resolvedRef.current.src === src && image) return;

      const img = new window.Image();
      loadingImgRef.current = img; // prevent GC before onload
      // Only set crossOrigin for external URLs (not blob: or data:)
      if (src.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        if (!cancelled) {
          resolvedRef.current = { url, imageId, src };
          setImage(img);
          setLoaded(true);
        }
      };
      img.onerror = () => {
        if (!cancelled) {
          // Retry without crossOrigin for external URLs (CORS fallback)
          if (img.crossOrigin) {
            const retry = new window.Image();
            loadingImgRef.current = retry;
            retry.onload = () => {
              if (!cancelled) {
                resolvedRef.current = { url, imageId, src };
                setImage(retry);
                setLoaded(true);
              }
            };
            retry.onerror = () => {
              if (!cancelled) setLoaded(true);
            };
            retry.src = src;
          } else {
            setLoaded(true);
          }
        }
      };
      img.src = src;
    };

    if (imageId) {
      // Fast path: already in cache (from prior load or P2P arrival)
      if (cachedUrl) {
        loadFromUrl(cachedUrl);
        return () => { cancelled = true; };
      }

      // Resolve from image store (IndexedDB → object URL)
      setLoaded(false);
      useImageStore.getState().getImageUrl(imageId).then((objectUrl) => {
        if (cancelled) return;
        if (objectUrl) {
          loadFromUrl(objectUrl);
        } else {
          // Image not found locally — request it over P2P
          notifyImageMissing(imageId);
          // Fall back to URL if available
          if (url) {
            loadFromUrl(url);
          } else {
            setLoaded(true); // No source available; will re-render when P2P delivers
          }
        }
      });
    } else {
      loadFromUrl(url);
    }

    return () => { cancelled = true; };
  }, [url, imageId, cachedUrl]);

  return [image, loaded];
}
