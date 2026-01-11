import { Layer } from 'react-konva';
import {
  DrawingPreview,
  PolygonPreview,
  MarqueeSelection,
  Pings,
  MeasureTool,
  PlayerCursors,
} from './overlay';
import type { Point, ToolType, GridSettings, Player } from '../../types';

interface Ping {
  id: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

interface OverlayLayerProps {
  currentLine: number[];
  selectedTool: ToolType;
  drawStartPoint: Point | null;
  drawingStrokeColor: string;
  drawingStrokeWidth: number;
  drawingFillEnabled: boolean;
  drawingFillColor: string;
  isFogTool: boolean;
  polygonPoints: Point[];
  marqueeStart: Point | null;
  marqueeEnd: Point | null;
  isMarqueeSelecting: boolean;
  pings: Ping[];
  measureWaypoints: Point[];
  measureCurrentPoint: Point | null;
  measureDifficultTerrain: boolean;
  gridSettings: GridSettings;
  otherPlayerCursors: (Player & { cursor: Point })[];
  interpolatedCursors: Record<string, Point>;
}

export function OverlayLayer({
  currentLine,
  selectedTool,
  drawStartPoint,
  drawingStrokeColor,
  drawingStrokeWidth,
  drawingFillEnabled,
  drawingFillColor,
  isFogTool,
  polygonPoints,
  marqueeStart,
  marqueeEnd,
  isMarqueeSelecting,
  pings,
  measureWaypoints,
  measureCurrentPoint,
  measureDifficultTerrain,
  gridSettings,
  otherPlayerCursors,
  interpolatedCursors,
}: OverlayLayerProps) {
  return (
    <Layer listening={false}>
      <DrawingPreview
        currentLine={currentLine}
        selectedTool={selectedTool}
        drawStartPoint={drawStartPoint}
        isFogTool={isFogTool}
        drawingStrokeColor={drawingStrokeColor}
        drawingFillColor={drawingFillColor}
        drawingFillEnabled={drawingFillEnabled}
        drawingStrokeWidth={drawingStrokeWidth}
      />
      <PolygonPreview
        selectedTool={selectedTool}
        polygonPoints={polygonPoints}
        drawingStrokeColor={drawingStrokeColor}
        drawingFillColor={drawingFillColor}
        drawingFillEnabled={drawingFillEnabled}
        drawingStrokeWidth={drawingStrokeWidth}
      />
      <MarqueeSelection
        marqueeStart={marqueeStart}
        marqueeEnd={marqueeEnd}
        isMarqueeSelecting={isMarqueeSelecting}
      />
      <Pings pings={pings} />
      <MeasureTool
        measureWaypoints={measureWaypoints}
        measureCurrentPoint={measureCurrentPoint}
        measureDifficultTerrain={measureDifficultTerrain}
        cellSize={gridSettings.cellSize}
      />
      <PlayerCursors
        otherPlayerCursors={otherPlayerCursors}
        interpolatedCursors={interpolatedCursors}
      />
    </Layer>
  );
}
