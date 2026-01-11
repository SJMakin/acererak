import type { ShapeElement } from '@/types';
import type Konva from 'konva';
import { Group, Line, Rect, Circle, Ellipse, Arrow } from 'react-konva';

// Shape component
export function Shape({
  element, isSelected, onSelect, onShiftSelect, onDragStart, onDragEnd, isGM,
}: {
  element: ShapeElement;
  isSelected: boolean;
  onSelect: () => void;
  onShiftSelect: () => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  isGM: boolean;
}) {
  const visible = element.visibleTo === 'all' ||
    (isGM && (element.visibleTo === 'gm' || Array.isArray(element.visibleTo)));

  if (!visible) return null;

  const { style } = element;
  const stroke = style?.strokeColor || '#ffffff';
  const fill = style?.fillColor || 'transparent';
  const strokeWidth = style?.lineWidth || 2;

  // Calculate bounds for selection highlight
  let boundsX = element.x;
  let boundsY = element.y;
  let boundsWidth = element.width || 100;
  let boundsHeight = element.height || 100;

  if (element.shapeType === 'freehand' || element.shapeType === 'line' || element.shapeType === 'polygon') {
    // Calculate bounding box from points
    if (element.points.length > 0) {
      const xs = element.points.map(p => p.x);
      const ys = element.points.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      boundsX = minX;
      boundsY = minY;
      boundsWidth = maxX - minX;
      boundsHeight = maxY - minY;
    }
  } else if (element.shapeType === 'circle') {
    const radius = Math.min(element.width || 50, element.height || 50) / 2;
    boundsX = element.x - radius;
    boundsY = element.y - radius;
    boundsWidth = radius * 2;
    boundsHeight = radius * 2;
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
      onDragStart={onDragStart}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd(node.x(), node.y());
      }}
    >
      {/* Shape rendering */}
      {(element.shapeType === 'freehand' || element.shapeType === 'line' || element.shapeType === 'polygon') && (
        <Line
          points={element.points.flatMap(p => [p.x, p.y])}
          stroke={stroke}
          strokeWidth={strokeWidth}
          closed={element.shapeType === 'polygon'}
          fill={element.shapeType === 'polygon' ? fill : undefined}
          tension={element.shapeType === 'freehand' ? 0.5 : 0} />
      )}

      {element.shapeType === 'rectangle' && (
        <Rect
          x={0}
          y={0}
          width={element.width || 100}
          height={element.height || 100}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill} />
      )}

      {element.shapeType === 'circle' && (
        <Circle
          x={0}
          y={0}
          radius={Math.min(element.width || 50, element.height || 50) / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill} />
      )}

      {element.shapeType === 'ellipse' && (
        <Ellipse
          x={(element.width || 100) / 2}
          y={(element.height || 100) / 2}
          radiusX={(element.width || 100) / 2}
          radiusY={(element.height || 100) / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill} />
      )}

      {element.shapeType === 'arrow' && element.points.length >= 2 && (
        <Arrow
          points={[element.points[0].x, element.points[0].y, element.points[1].x, element.points[1].y]}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={style?.fillColor || stroke}
          pointerLength={Math.max(10, strokeWidth * 3)}
          pointerWidth={Math.max(8, strokeWidth * 2.5)} />
      )}

      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={boundsX - element.x - 2}
          y={boundsY - element.y - 2}
          width={boundsWidth + 4}
          height={boundsHeight + 4}
          stroke="#22c55e"
          strokeWidth={2}
          listening={false} />
      )}
    </Group>
  );
}
