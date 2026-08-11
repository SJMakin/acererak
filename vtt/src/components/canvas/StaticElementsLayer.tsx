import { Layer } from 'react-konva';
import { MapImage } from '../MapImage';
import { Shape } from '../Shape';
import { TextLabel } from '../TextLabel';
import { Token } from '../Token';
import type { CanvasElement, GridSettings, ImageElement, ShapeElement, TextElement, TokenElement } from '../../types';

interface StaticElementsLayerProps {
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
  showTokenMetadata: boolean;
  onSelect: (id: string) => void;
  onShiftSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onTextDoubleClick: (id: string) => void;
}

export function StaticElementsLayer({
  elements,
  selectedElementId,
  selectedElementIds,
  layerVisibility,
  gridSettings,
  isGM,
  showTokenMetadata,
  onSelect,
  onShiftSelect,
  onDragStart,
  onDragEnd,
  onTextDoubleClick,
}: StaticElementsLayerProps) {
  return (
    <Layer listening={isGM}>
      {/* Map images */}
      {layerVisibility.map && elements
        .filter((el): el is ImageElement => el.layer === 'map' && el.type === 'image')
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
      {/* Locked shapes */}
      {layerVisibility.drawings && elements
        .filter((el): el is ShapeElement => el.type === 'shape' && el.locked)
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
      {/* Locked text */}
      {layerVisibility.text && elements
        .filter((el): el is TextElement => el.type === 'text' && el.locked)
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
      {/* Locked tokens */}
      {layerVisibility.tokens && elements
        .filter((el): el is TokenElement => el.type === 'token' && el.locked)
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
