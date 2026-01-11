import { useState, useEffect } from 'react';
import type { Point } from '../types';

interface PlayerWithCursor {
  id: string;
  cursor: Point;
}

interface UseCursorInterpolationProps {
  otherPlayerCursors: PlayerWithCursor[];
}

export function useCursorInterpolation({ otherPlayerCursors }: UseCursorInterpolationProps) {
  const [interpolatedCursors, setInterpolatedCursors] = useState<Record<string, Point>>({});

  useEffect(() => {
    if (otherPlayerCursors.length === 0) return;

    let animationFrameId: number;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      setInterpolatedCursors(prev => {
        const next: Record<string, Point> = { ...prev };
        let changed = false;

        for (const player of otherPlayerCursors) {
          const target = player.cursor;
          const current = prev[player.id] || target;

          // Lerp factor of 0.2 gives smooth but responsive movement
          const newX = lerp(current.x, target.x, 0.2);
          const newY = lerp(current.y, target.y, 0.2);

          // Only update if there's meaningful change (>0.5px)
          const dx = Math.abs(newX - current.x);
          const dy = Math.abs(newY - current.y);
          if (dx > 0.5 || dy > 0.5) {
            next[player.id] = { x: newX, y: newY };
            changed = true;
          }
        }

        return changed ? next : prev;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [otherPlayerCursors]);

  return interpolatedCursors;
}
