import { Line, Rect, Circle, Ellipse, Arrow } from 'react-konva';
import type { Point, ToolType } from '../../../types';

interface DrawingPreviewProps {
  currentLine: number[];
  selectedTool: ToolType;
  drawStartPoint: Point | null;
  isFogTool: boolean;
  drawingStrokeColor: string;
  drawingFillColor: string;
  drawingFillEnabled: boolean;
  drawingStrokeWidth: number;
}

export function DrawingPreview({
  currentLine,
  selectedTool,
  drawStartPoint,
  isFogTool,
  drawingStrokeColor,
  drawingFillColor,
  drawingFillEnabled,
  drawingStrokeWidth,
}: DrawingPreviewProps) {
  if (currentLine.length === 0) return null;

  return (
    <>
      {(selectedTool === 'draw-freehand' || isFogTool) && (
        <Line
          points={currentLine}
          stroke={selectedTool === 'fog-reveal' ? '#22c55e' : selectedTool === 'fog-hide' ? '#ef4444' : drawingStrokeColor}
          strokeWidth={isFogTool ? 3 : drawingStrokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          fill={selectedTool === 'fog-reveal' ? 'rgba(34, 197, 94, 0.2)' : selectedTool === 'fog-hide' ? 'rgba(239, 68, 68, 0.2)' : (drawingFillEnabled ? drawingFillColor : 'transparent')}
          closed={isFogTool}
        />
      )}
      {selectedTool === 'draw-line' && currentLine.length >= 4 && (
        <Line
          points={currentLine}
          stroke={drawingStrokeColor}
          strokeWidth={drawingStrokeWidth}
          lineCap="round"
        />
      )}
      {selectedTool === 'draw-rectangle' && currentLine.length >= 4 && drawStartPoint && (
        <Rect
          x={Math.min(drawStartPoint.x, currentLine[2])}
          y={Math.min(drawStartPoint.y, currentLine[3])}
          width={Math.abs(currentLine[2] - drawStartPoint.x)}
          height={Math.abs(currentLine[3] - drawStartPoint.y)}
          stroke={drawingStrokeColor}
          strokeWidth={drawingStrokeWidth}
          fill={drawingFillEnabled ? drawingFillColor : undefined}
        />
      )}
      {selectedTool === 'draw-circle' && currentLine.length >= 4 && drawStartPoint && (
        <Circle
          x={drawStartPoint.x}
          y={drawStartPoint.y}
          radius={Math.sqrt(
            Math.pow(currentLine[2] - drawStartPoint.x, 2) +
            Math.pow(currentLine[3] - drawStartPoint.y, 2)
          )}
          stroke={drawingStrokeColor}
          strokeWidth={drawingStrokeWidth}
          fill={drawingFillEnabled ? drawingFillColor : undefined}
        />
      )}
      {selectedTool === 'draw-ellipse' && currentLine.length >= 4 && drawStartPoint && (
        <Ellipse
          x={Math.min(drawStartPoint.x, currentLine[2]) + Math.abs(currentLine[2] - drawStartPoint.x) / 2}
          y={Math.min(drawStartPoint.y, currentLine[3]) + Math.abs(currentLine[3] - drawStartPoint.y) / 2}
          radiusX={Math.abs(currentLine[2] - drawStartPoint.x) / 2}
          radiusY={Math.abs(currentLine[3] - drawStartPoint.y) / 2}
          stroke={drawingStrokeColor}
          strokeWidth={drawingStrokeWidth}
          fill={drawingFillEnabled ? drawingFillColor : undefined}
        />
      )}
      {selectedTool === 'draw-arrow' && currentLine.length >= 4 && drawStartPoint && (
        <Arrow
          points={[drawStartPoint.x, drawStartPoint.y, currentLine[2], currentLine[3]]}
          stroke={drawingStrokeColor}
          strokeWidth={drawingStrokeWidth}
          fill={drawingStrokeColor}
          pointerLength={Math.max(10, drawingStrokeWidth * 3)}
          pointerWidth={Math.max(8, drawingStrokeWidth * 2.5)}
        />
      )}
      {/* AOE Circle preview */}
      {selectedTool === 'aoe-circle' && currentLine.length >= 4 && drawStartPoint && (
        <Circle
          x={drawStartPoint.x}
          y={drawStartPoint.y}
          radius={Math.sqrt(
            Math.pow(currentLine[2] - drawStartPoint.x, 2) +
            Math.pow(currentLine[3] - drawStartPoint.y, 2)
          )}
          stroke="#f97316"
          strokeWidth={3}
          fill="rgba(249, 115, 22, 0.3)"
        />
      )}
      {/* AOE Cone preview (curved arc) */}
      {selectedTool === 'aoe-cone' && currentLine.length >= 4 && drawStartPoint && (() => {
        const endX = currentLine[2];
        const endY = currentLine[3];
        const angle = Math.atan2(endY - drawStartPoint.y, endX - drawStartPoint.x);
        const length = Math.sqrt(Math.pow(endX - drawStartPoint.x, 2) + Math.pow(endY - drawStartPoint.y, 2));
        const coneAngle = Math.PI / 3; // 60 degree cone
        const arcSegments = 12;
        
        // Generate arc points
        const points: number[] = [drawStartPoint.x, drawStartPoint.y];
        for (let i = 0; i <= arcSegments; i++) {
          const segmentAngle = angle - coneAngle / 2 + (coneAngle * i) / arcSegments;
          points.push(
            drawStartPoint.x + Math.cos(segmentAngle) * length,
            drawStartPoint.y + Math.sin(segmentAngle) * length
          );
        }
        
        return (
          <Line
            points={points}
            stroke="#ef4444"
            strokeWidth={3}
            fill="rgba(239, 68, 68, 0.3)"
            closed={true}
          />
        );
      })()}
      {/* AOE Triangle preview (simple triangle) */}
      {selectedTool === 'aoe-triangle' && currentLine.length >= 4 && drawStartPoint && (() => {
        const endX = currentLine[2];
        const endY = currentLine[3];
        const angle = Math.atan2(endY - drawStartPoint.y, endX - drawStartPoint.x);
        const length = Math.sqrt(Math.pow(endX - drawStartPoint.x, 2) + Math.pow(endY - drawStartPoint.y, 2));
        const coneAngle = Math.PI / 3; // 60 degree cone
        
        const point2X = drawStartPoint.x + Math.cos(angle - coneAngle / 2) * length;
        const point2Y = drawStartPoint.y + Math.sin(angle - coneAngle / 2) * length;
        const point3X = drawStartPoint.x + Math.cos(angle + coneAngle / 2) * length;
        const point3Y = drawStartPoint.y + Math.sin(angle + coneAngle / 2) * length;
        
        return (
          <Line
            points={[drawStartPoint.x, drawStartPoint.y, point2X, point2Y, point3X, point3Y]}
            stroke="#f97316"
            strokeWidth={3}
            fill="rgba(249, 115, 22, 0.3)"
            closed={true}
          />
        );
      })()}
      {/* AOE Line preview */}
      {selectedTool === 'aoe-line' && currentLine.length >= 4 && drawStartPoint && (() => {
        const endX = currentLine[2];
        const endY = currentLine[3];
        const angle = Math.atan2(endY - drawStartPoint.y, endX - drawStartPoint.x);
        const perpAngle = angle + Math.PI / 2;
        const halfWidth = 12;
        
        const points = [
          drawStartPoint.x + Math.cos(perpAngle) * halfWidth, drawStartPoint.y + Math.sin(perpAngle) * halfWidth,
          drawStartPoint.x - Math.cos(perpAngle) * halfWidth, drawStartPoint.y - Math.sin(perpAngle) * halfWidth,
          endX - Math.cos(perpAngle) * halfWidth, endY - Math.sin(perpAngle) * halfWidth,
          endX + Math.cos(perpAngle) * halfWidth, endY + Math.sin(perpAngle) * halfWidth,
        ];
        
        return (
          <Line
            points={points}
            stroke="#3b82f6"
            strokeWidth={3}
            fill="rgba(59, 130, 246, 0.3)"
            closed={true}
          />
        );
      })()}
      {/* AOE Square preview */}
      {selectedTool === 'aoe-square' && currentLine.length >= 4 && drawStartPoint && (
        <Rect
          x={Math.min(drawStartPoint.x, currentLine[2])}
          y={Math.min(drawStartPoint.y, currentLine[3])}
          width={Math.abs(currentLine[2] - drawStartPoint.x)}
          height={Math.abs(currentLine[3] - drawStartPoint.y)}
          stroke="#8b5cf6"
          strokeWidth={3}
          fill="rgba(139, 92, 246, 0.3)"
        />
      )}
    </>
  );
}
