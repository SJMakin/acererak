import { Group, Line, Circle, Text, Rect } from 'react-konva';
import type { Point } from '../../../types';

interface MeasureToolProps {
  measureWaypoints: Point[];
  measureCurrentPoint: Point | null;
  measureDifficultTerrain: boolean;
  cellSize: number;
}

export function MeasureTool({
  measureWaypoints,
  measureCurrentPoint,
  measureDifficultTerrain,
  cellSize,
}: MeasureToolProps) {
  if (measureWaypoints.length === 0) return null;

  // Build all points including current mouse position for preview
  const allPoints = measureCurrentPoint
    ? [...measureWaypoints, measureCurrentPoint]
    : measureWaypoints;
  
  // Calculate segment distances
  const segments: { start: Point; end: Point; distance: number }[] = [];
  let totalDistance = 0;
  
  for (let i = 1; i < allPoints.length; i++) {
    const start = allPoints[i - 1];
    const end = allPoints[i];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    const gridDistance = pixelDistance / cellSize;
    // Apply difficult terrain modifier (2x distance)
    const effectiveDistance = measureDifficultTerrain ? gridDistance * 2 : gridDistance;
    segments.push({ start, end, distance: effectiveDistance });
    totalDistance += effectiveDistance;
  }
  
  const measureColor = measureDifficultTerrain ? '#f59e0b' : '#22c55e';
  
  return (
    <>
      {/* Draw all segment lines */}
      {segments.map((segment, index) => (
        <Line
          key={`segment-${index}`}
          points={[segment.start.x, segment.start.y, segment.end.x, segment.end.y]}
          stroke={measureColor}
          strokeWidth={2}
          dash={[10, 5]}
          lineCap="round"
        />
      ))}
      
      {/* Draw waypoint markers */}
      {measureWaypoints.map((point, index) => (
        <Group key={`waypoint-${index}`} x={point.x} y={point.y}>
          <Circle
            radius={8}
            fill={index === 0 ? measureColor : '#3b82f6'}
            stroke="#ffffff"
            strokeWidth={2}
          />
          <Text
            x={-4}
            y={-5}
            text={String(index + 1)}
            fontSize={10}
            fill="#ffffff"
            fontStyle="bold"
          />
        </Group>
      ))}
      
      {/* Draw per-segment distance labels on committed segments */}
      {segments.slice(0, measureWaypoints.length - 1).map((segment, index) => {
        const midX = (segment.start.x + segment.end.x) / 2;
        const midY = (segment.start.y + segment.end.y) / 2;
        
        return (
          <Group key={`label-${index}`} x={midX} y={midY - 20}>
            <Rect
              x={-25}
              y={-10}
              width={50}
              height={20}
              fill="rgba(31, 41, 55, 0.9)"
              stroke={measureColor}
              strokeWidth={1}
              cornerRadius={3}
            />
            <Text
              text={`${segment.distance.toFixed(0)}ft`}
              fontSize={11}
              fill={measureColor}
              fontStyle="bold"
              align="center"
              width={50}
              x={-25}
              y={-6}
            />
          </Group>
        );
      })}
      
      {/* Total distance label at final point */}
      {allPoints.length >= 2 && (
        <Group
          x={allPoints[allPoints.length - 1].x + 15}
          y={allPoints[allPoints.length - 1].y - 10}
        >
          <Rect
            x={0}
            y={-12}
            width={85}
            height={24}
            fill="#1f2937"
            stroke={measureColor}
            strokeWidth={2}
            cornerRadius={4}
          />
          <Text
            text={`Total: ${totalDistance.toFixed(0)}ft`}
            fontSize={12}
            fill={measureColor}
            fontStyle="bold"
            align="center"
            width={85}
            x={0}
            y={-7}
          />
        </Group>
      )}
    </>
  );
}
