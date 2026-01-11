import { Line } from 'react-konva';

// Square Grid component
export function SquareGrid({
  width, height, cellSize, color
}: {
  width: number;
  height: number;
  cellSize: number;
  color: string;
}) {
  const lines = [];

  // Vertical lines
  for (let i = 0; i <= width; i++) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i * cellSize, 0, i * cellSize, height * cellSize]}
        stroke={color}
        strokeWidth={1}
        listening={false} />
    );
  }

  // Horizontal lines
  for (let i = 0; i <= height; i++) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[0, i * cellSize, width * cellSize, i * cellSize]}
        stroke={color}
        strokeWidth={1}
        listening={false} />
    );
  }

  return <>{lines}</>;
}
