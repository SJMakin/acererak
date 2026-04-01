import { Layer, Rect, Image } from 'react-konva';
import { Grid } from '../Grid';
import useImage from '../../hooks/useImage';
import type { GridSettings, Settings } from '../../types';

interface BackgroundLayerProps {
  gridSettings: GridSettings;
  settings: Settings;
  backgroundUrl?: string;
  backgroundImageId?: string;
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
  backgroundUrl,
  backgroundImageId,
  layerVisibility,
}: BackgroundLayerProps) {
  const gridWidth = gridSettings.width * gridSettings.cellSize;
  const gridHeight = gridSettings.height * gridSettings.cellSize;
  const [bgImage] = useImage(backgroundUrl || '', backgroundImageId);

  return (
    <Layer listening={false}>
      {/* Background image or color */}
      {bgImage ? (
        <Image
          image={bgImage}
          x={0}
          y={0}
          width={gridWidth}
          height={gridHeight}
          listening={false}
        />
      ) : (
        <Rect
          x={0}
          y={0}
          width={gridWidth}
          height={gridHeight}
          fill={settings.backgroundColor}
          listening={false}
        />
      )}
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
