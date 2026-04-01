import type { ImageElement } from '@/types';
import type Konva from 'konva';
import { Group, Image, Rect } from 'react-konva';
import useImage from '../hooks/useImage';

// Map image component
export function MapImage({
  element, isSelected, onSelect, onShiftSelect, onDragStart, onDragEnd, isGM,
}: {
  element: ImageElement;
  isSelected: boolean;
  onSelect: () => void;
  onShiftSelect: () => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  isGM: boolean;
}) {
  const [image] = useImage(element.imageUrl, element.imageId);

  const visible = element.visibleTo === 'all' ||
    (isGM && (element.visibleTo === 'gm' || Array.isArray(element.visibleTo)));

  if (!visible || !image) return null;

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
      onDragStart={onDragStart}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd(node.x(), node.y());
      }}
    >
      <Image
        image={image}
        width={element.width}
        height={element.height}
        rotation={element.rotation || 0} />
      {isSelected && (
        <Rect
          x={-2}
          y={-2}
          width={element.width + 4}
          height={element.height + 4}
          stroke="#22c55e"
          strokeWidth={2}
          listening={false} />
      )}
    </Group>
  );
}
