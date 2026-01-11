import { HexGrid } from './HexGrid';
import { SquareGrid } from './SquareGrid';

// Grid dispatcher component
export function Grid({
  gridType = 'square', width, height, cellSize, color
}: {
  gridType?: 'square' | 'hex' | 'none';
  width: number;
  height: number;
  cellSize: number;
  color: string;
}) {
  if (gridType === 'none') {
    return null;
  }

  if (gridType === 'hex') {
    return <HexGrid width={width} height={height} cellSize={cellSize} color={color} />;
  }

  return <SquareGrid width={width} height={height} cellSize={cellSize} color={color} />;
}
