import { Rect } from 'react-konva';
import type { Point } from '../../../types';

interface MarqueeSelectionProps {
  marqueeStart: Point | null;
  marqueeEnd: Point | null;
  isMarqueeSelecting: boolean;
}

export function MarqueeSelection({
  marqueeStart,
  marqueeEnd,
  isMarqueeSelecting,
}: MarqueeSelectionProps) {
  if (!marqueeStart || !marqueeEnd || !isMarqueeSelecting) return null;

  return (
    <Rect
      x={Math.min(marqueeStart.x, marqueeEnd.x)}
      y={Math.min(marqueeStart.y, marqueeEnd.y)}
      width={Math.abs(marqueeEnd.x - marqueeStart.x)}
      height={Math.abs(marqueeEnd.y - marqueeStart.y)}
      fill="rgba(34, 197, 94, 0.1)"
      stroke="#22c55e"
      strokeWidth={1}
      dash={[5, 5]}
    />
  );
}
