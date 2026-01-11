import { Layer, Shape as KonvaShape } from 'react-konva';
import type { FogOfWar, GridSettings } from '../../types';

interface FogOfWarLayerProps {
  fogOfWar: FogOfWar;
  gridSettings: GridSettings;
  layerVisibility: {
    grid: boolean;
    map: boolean;
    drawings: boolean;
    tokens: boolean;
    text: boolean;
    fog: boolean;
  };
  isGM: boolean;
}

export function FogOfWarLayer({
  fogOfWar,
  gridSettings,
  layerVisibility,
  isGM,
}: FogOfWarLayerProps) {
  const gridWidth = gridSettings.width * gridSettings.cellSize;
  const gridHeight = gridSettings.height * gridSettings.cellSize;

  if (!fogOfWar.enabled || !layerVisibility.fog || isGM) {
    return null;
  }

  return (
    <Layer listening={false}>
      <KonvaShape
        sceneFunc={(context, shape) => {
          const width = gridWidth;
          const height = gridHeight;

          // Draw the full fog overlay
          context.fillStyle = 'rgba(0, 0, 0, 0.85)';
          context.fillRect(0, 0, width, height);

          // Cut out revealed areas using destination-out composite operation
          context.globalCompositeOperation = 'destination-out';

          fogOfWar.revealed.forEach((polygon) => {
            if (polygon.length > 0) {
              context.beginPath();
              context.moveTo(polygon[0].x, polygon[0].y);
              for (let i = 1; i < polygon.length; i++) {
                context.lineTo(polygon[i].x, polygon[i].y);
              }
              context.closePath();
              context.fill();
            }
          });

          // Reset composite operation
          context.globalCompositeOperation = 'source-over';

          // Konva requires this
          context.fillStrokeShape(shape);
        }}
      />
    </Layer>
  );
}
