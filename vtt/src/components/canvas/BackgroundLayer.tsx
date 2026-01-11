import { Layer, Rect } from 'react-konva';
import { Grid } from '../Grid';
import type { GridSettings, Settings } from '../../types';

interface BackgroundLayerProps {
  gridSettings: GridSettings;
  settings: Settings;
  layerVisibility: {
    grid: boolean;
    map: boolean;
    drawings: boolean;
    tokens: boolean;
    text: boolean;
    fog: boolean;
  };
}

export function BackgroundLayer({
  gridSettings,
  settings,
  layerVisibility,
}: BackgroundLayerProps) {
  const gridWidth = gridSettings.width * gridSettings.cellSize;
  const gridHeight = gridSettings.height * gridSettings.cellSize;

  return (
    <Layer listening={false}>
      <Rect
        x={0}
        y={0}
        width={gridWidth}
        height={gridHeight}
        fill={settings.backgroundColor}
      />
      {layerVisibility.grid && gridSettings.showGrid && (
        <Grid
          gridType={gridSettings.gridType || 'square'}
          width={gridSettings.width}
          height={gridSettings.height}
          cellSize={gridSettings.cellSize}
          color={settings.gridColor}
        />
      )}
    </Layer>
  );
}
