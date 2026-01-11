import { Line } from 'react-konva';

// Hex Grid component (flat-top hexagons)
export function HexGrid({
  width, height, cellSize, color
}: {
  width: number;
  height: number;
  cellSize: number;
  color: string;
}) {
  const hexagons = [];

  // Hex dimensions for flat-top hexagons
  // cellSize represents the width of the hex
  const hexWidth = cellSize;
  const hexHeight = (Math.sqrt(3) / 2) * hexWidth;

  // Spacing between hex centers
  const horizSpacing = hexWidth * 0.75;
  const vertSpacing = hexHeight;

  // Calculate number of hexagons needed
  const totalWidth = width * cellSize;
  const totalHeight = height * cellSize;
  const cols = Math.ceil(totalWidth / horizSpacing) + 1;
  const rows = Math.ceil(totalHeight / vertSpacing) + 1;

  // Generate hexagon points for flat-top orientation
  const getHexPoints = (cx: number, cy: number): number[] => {
    const points: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = cx + (hexWidth / 2) * Math.cos(angle);
      const y = cy + (hexWidth / 2) * Math.sin(angle);
      points.push(x, y);
    }
    return points;
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Offset every other column
      const xOffset = col * horizSpacing;
      const yOffset = row * vertSpacing + (col % 2 === 1 ? vertSpacing / 2 : 0);

      // Only draw if within bounds
      if (xOffset <= totalWidth + hexWidth && yOffset <= totalHeight + hexHeight) {
        hexagons.push(
          <Line
            key={`hex-${row}-${col}`}
            points={getHexPoints(xOffset, yOffset)}
            stroke={color}
            strokeWidth={1}
            closed={true}
            listening={false} />
        );
      }
    }
  }

  return <>{hexagons}</>;
}
