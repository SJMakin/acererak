import { useRef, useState, useCallback, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import './FloatingPanel.css';

interface FloatingPanelProps {
  children: React.ReactNode;
  defaultBounds: { x: number; y: number; width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  onBoundsChange?: (bounds: { x: number; y: number; width: number; height: number }) => void;
}

export function FloatingPanel({
  children,
  defaultBounds,
  minWidth = 500,
  minHeight = 400,
  onBoundsChange,
}: FloatingPanelProps) {
  const [pos, setPos] = useState({ x: defaultBounds.x, y: defaultBounds.y });
  const [size, setSize] = useState({ width: defaultBounds.width, height: defaultBounds.height });
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const posRef = useRef(pos);
  posRef.current = pos;

  const clampPos = useCallback((x: number, y: number, w: number) => {
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 40;
    return {
      x: Math.max(-w + 80, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  }, []);

  const rafRef = useRef<number>(0);
  const notifyBounds = useCallback((x: number, y: number, w: number, h: number) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      onBoundsChangeRef.current?.({ x, y, width: w, height: h });
    });
  }, []);

  // Track whether the drag started on the header
  const isDragging = useRef(false);

  const bindDrag = useDrag(
    ({ delta: [dx, dy], first, last, event }) => {
      if (first) {
        const target = event.target as HTMLElement;
        // Only drag when starting on the header, but not on interactive elements
        const inHeader = !!target.closest('.character-sheet-modal__header');
        const onInteractive = !!target.closest('input, button, [contenteditable]');
        isDragging.current = inHeader && !onInteractive;
      }
      if (!isDragging.current) return;
      if (last) {
        isDragging.current = false;
      }

      setPos((prev) => {
        const clamped = clampPos(prev.x + dx, prev.y + dy, sizeRef.current.width);
        notifyBounds(clamped.x, clamped.y, sizeRef.current.width, sizeRef.current.height);
        return clamped;
      });
    },
    { filterTaps: true },
  );

  const bindResize = useDrag(
    ({ delta: [dx, dy] }) => {
      setSize((prev) => {
        const w = Math.max(minWidth, prev.width + dx);
        const h = Math.max(minHeight, prev.height + dy);
        notifyBounds(posRef.current.x, posRef.current.y, w, h);
        return { width: w, height: h };
      });
    },
    { filterTaps: true },
  );

  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => clampPos(prev.x, prev.y, sizeRef.current.width));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPos]);

  return (
    <div
      className="floating-panel character-sheet-modal"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        width: size.width,
        height: size.height,
      }}
      {...bindDrag()}
    >
      {children}
      <div className="floating-panel__resize-handle" {...bindResize()} />
    </div>
  );
}
