import type { TextElement } from '@/types';
import type Konva from 'konva';
import { Group, Rect, Text } from 'react-konva';

// Text component
export function TextLabel({
  element, isSelected, onSelect, onShiftSelect, onDragStart, onDragEnd, onDoubleClick, isGM,
}: {
  element: TextElement;
  isSelected: boolean;
  onSelect: () => void;
  onShiftSelect: () => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  onDoubleClick: () => void;
  isGM: boolean;
}) {
  const visible = element.visibleTo === 'all' ||
    (isGM && (element.visibleTo === 'gm' || Array.isArray(element.visibleTo)));

  if (!visible) return null;

  const { style } = element;
  const fontSize = style?.fontSize || 16;
  const fontFamily = style?.fontFamily || 'sans-serif';
  const fontWeight = style?.fontWeight || 'normal';
  const fontStyle = style?.fontStyle || 'normal';
  const textAlign = style?.textAlign || 'left';
  const textColor = style?.strokeColor || '#ffffff';
  const width = element.width || 200;

  // Background properties
  const backgroundEnabled = style?.backgroundEnabled ?? true;
  const backgroundColor = style?.backgroundColor || 'rgba(0, 0, 0, 0.7)';
  const backgroundOpacity = style?.backgroundOpacity ?? 0.7;

  // Build fontStyle string for Konva (accepts 'normal', 'italic', 'bold', 'italic bold')
  let konvaFontStyle = 'normal';
  if (fontStyle === 'italic' && fontWeight === 'bold') {
    konvaFontStyle = 'italic bold';
  } else if (fontStyle === 'italic') {
    konvaFontStyle = 'italic';
  } else if (fontWeight === 'bold') {
    konvaFontStyle = 'bold';
  }

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;
    if (evt.shiftKey) {
      onShiftSelect();
    } else {
      onSelect();
    }
  };

  return (
    <Group
      x={element.x}
      y={element.y}
      draggable={!element.locked}
      onClick={handleClick}
      onTap={onSelect}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
      onDragStart={onDragStart}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd(node.x(), node.y());
      }}
    >
      {/* Background rectangle */}
      {backgroundEnabled && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={(element.height || fontSize * 1.5) + 8}
          fill={backgroundColor}
          opacity={backgroundOpacity}
          cornerRadius={4} />
      )}

      {/* Text content with wrapping */}
      <Text
        text={element.content}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontStyle={konvaFontStyle}
        fill={textColor}
        width={width}
        padding={4}
        align={textAlign}
        wrap="word" />

      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-2}
          y={-2}
          width={width + 4}
          height={(element.height || fontSize * 1.5) + 12}
          stroke="#22c55e"
          strokeWidth={2}
          listening={false} />
      )}
    </Group>
  );
}
