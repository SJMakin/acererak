import { Layer } from 'react-konva';
import { Shape } from '../Shape';
import { TextLabel } from '../TextLabel';
import { Token } from '../Token';
import { MapImage } from '../MapImage';
import type { CanvasElement, GridSettings, ImageElement, ShapeElement, TextElement, TokenElement } from '../../types';

interface InteractiveElementsLayerProps {
  elements: CanvasElement[];
  selectedElementId: string | null;
  selectedElementIds: string[];
  layerVisibility: {
    grid: boolean;
    map: boolean;
    drawings: boolean;
    tokens: boolean;
    text: boolean;
    fog: boolean;
  };
  gridSettings: GridSettings;
  isGM: boolean;
  isDrawingTool: boolean;
  showTokenMetadata: boolean;
  onSelect: (id: string) => void;
  onShiftSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onTextDoubleClick: (id: string) => void;
}

export function InteractiveElementsLayer({
  elements,
  selectedElementId,
  selectedElementIds,
  layerVisibility,
  gridSettings,
  isGM,
  isDrawingTool,
  showTokenMetadata,
  onSelect,
  onShiftSelect,
  onDragStart,
  onDragEnd,
  onTextDoubleClick,
}: InteractiveElementsLayerProps) {
  return (
    <Layer listening={!isDrawingTool}>
      {/* Unlocked shapes */}
      {layerVisibility.drawings && elements
        .filter((el): el is ShapeElement => el.type === 'shape' && !el.locked)
        .map(el => (
          <Shape
            key={el.id}
            element={el}
            isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
            onSelect={() => onSelect(el.id)}
            onShiftSelect={() => onShiftSelect(el.id)}
            onDragStart={() => onDragStart(el.id)}
            onDragEnd={(x, y) => onDragEnd(el.id, x, y)}
            isGM={isGM}
          />
        ))}
      {/* Unlocked text */}
      {layerVisibility.text && elements
        .filter((el): el is TextElement => el.type === 'text' && !el.locked)
        .map(el => (
          <TextLabel
            key={el.id}
            element={el}
            isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
            onSelect={() => onSelect(el.id)}
            onShiftSelect={() => onShiftSelect(el.id)}
            onDragStart={() => onDragStart(el.id)}
            onDragEnd={(x, y) => onDragEnd(el.id, x, y)}
            onDoubleClick={() => onTextDoubleClick(el.id)}
            isGM={isGM}
          />
        ))}
      {/* Unlocked images */}
      {layerVisibility.map && elements
        .filter((el): el is ImageElement => el.type === 'image' && !el.locked)
        .map(el => (
          <MapImage
            key={el.id}
            element={el}
            isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
            onSelect={() => onSelect(el.id)}
            onShiftSelect={() => onShiftSelect(el.id)}
            onDragStart={() => onDragStart(el.id)}
            onDragEnd={(x, y) => onDragEnd(el.id, x, y)}
            isGM={isGM}
          />
        ))}
      {/* Unlocked tokens */}
      {layerVisibility.tokens && elements
        .filter((el): el is TokenElement => el.type === 'token' && !el.locked)
        .map(el => (
          <Token
            key={el.id}
            element={el}
            cellSize={gridSettings.cellSize}
            isSelected={selectedElementId === el.id || selectedElementIds.includes(el.id)}
            onSelect={() => onSelect(el.id)}
            onShiftSelect={() => onShiftSelect(el.id)}
            onDragStart={() => onDragStart(el.id)}
            onDragEnd={(x, y) => onDragEnd(el.id, x, y)}
            isGM={isGM}
            showMetadata={showTokenMetadata}
          />
        ))}
    </Layer>
  );
}
