import { Line, Circle } from 'react-konva';
import type { Point } from '../../../types';

interface PolygonPreviewProps {
  selectedTool: string;
  polygonPoints: Point[];
  drawingStrokeColor: string;
  drawingFillColor: string;
  drawingFillEnabled: boolean;
  drawingStrokeWidth: number;
}

export function PolygonPreview({
  selectedTool,
  polygonPoints,
  drawingStrokeColor,
  drawingFillColor,
  drawingFillEnabled,
  drawingStrokeWidth,
}: PolygonPreviewProps) {
  if (selectedTool !== 'draw-polygon' || polygonPoints.length === 0) return null;

  return (
    <>
      {/* Draw lines between points */}
      <Line
        points={polygonPoints.flatMap(p => [p.x, p.y])}
        stroke={drawingStrokeColor}
        strokeWidth={drawingStrokeWidth}
        lineCap="round"
        lineJoin="round"
      />
      {/* Draw points as circles */}
      {polygonPoints.map((point, index) => (
        <Circle
          key={index}
          x={point.x}
          y={point.y}
          radius={4}
          fill={drawingStrokeColor}
        />
      ))}
      {/* Preview filled shape if enough points */}
      {polygonPoints.length >= 3 && (
        <Line
          points={polygonPoints.flatMap(p => [p.x, p.y])}
          stroke={drawingStrokeColor}
          strokeWidth={drawingStrokeWidth}
          fill={drawingFillEnabled ? drawingFillColor : undefined}
          closed={true}
          opacity={0.5}
        />
      )}
    </>
  );
}
