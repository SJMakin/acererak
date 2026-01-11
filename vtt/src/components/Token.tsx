import type { TokenElement } from '@/types';
import type Konva from 'konva';
import { Group, Image, Circle, Rect, Text } from 'react-konva';
import useImage from '../hooks/useImage';

// Token component
export function Token({
  element, cellSize, isSelected, isCurrentTurn, onSelect, onShiftSelect, onDragStart, onDragEnd, isGM, showMetadata = true,
}: {
  element: TokenElement;
  cellSize: number;
  isSelected: boolean;
  isCurrentTurn?: boolean;
  onSelect: () => void;
  onShiftSelect: () => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  isGM: boolean;
  showMetadata?: boolean;
}) {
  const [image] = useImage(element.imageUrl);
  const width = element.width * cellSize;
  const height = element.height * cellSize;

  // Check visibility
  const visible = element.visibleTo === 'all' ||
    (isGM && (element.visibleTo === 'gm' || Array.isArray(element.visibleTo)));

  if (!visible) return null;

  // Calculate HP percentage and color
  const hpPercent = element.hp ? (element.hp.current / element.hp.max) : 1;
  const hpColor = hpPercent > 0.66 ? '#22c55e' : hpPercent > 0.33 ? '#f59e0b' : '#ef4444';

  // Scale factors for metadata
  const scale = Math.max(0.5, Math.min(1, width / 50)); // Scale based on token size
  const fontSize = 12 * scale;
  const badgeSize = 20 * scale;
  const conditionBadgeSize = 16 * scale;

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
      {/* Token image or placeholder */}
      {image ? (
        <Image
          image={image}
          width={width}
          height={height}
          cornerRadius={width / 2} />
      ) : (
        <Circle
          x={width / 2}
          y={height / 2}
          radius={width / 2}
          fill="#6366f1" />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <Rect
          x={-2}
          y={-2}
          width={width + 4}
          height={height + 4}
          stroke="#22c55e"
          strokeWidth={2}
          cornerRadius={width / 2}
          listening={false} />
      )}

      {/* Current turn indicator */}
      {isCurrentTurn && (
        <Circle
          x={width / 2}
          y={height / 2}
          radius={width / 2 + 4}
          stroke="#fbbf24"
          strokeWidth={3}
          dash={[8, 4]}
          listening={false} />
      )}

      {showMetadata && (
        <>
          {/* Name label with background */}
          {element.name && (
            <Group y={height + 2}>
              <Rect
                x={-2}
                y={0}
                width={width + 4}
                height={fontSize + 6}
                fill="rgba(0, 0, 0, 0.7)"
                cornerRadius={3} />
              <Text
                x={0}
                y={3}
                width={width}
                text={element.name}
                fontSize={fontSize}
                fill="white"
                align="center"
                fontStyle="bold" />
            </Group>
          )}

          {/* HP bar with text */}
          {element.hp && (
            <Group y={height + (element.name ? fontSize + 10 : 4)}>
              {/* HP bar background */}
              <Rect
                width={width}
                height={6 * scale}
                fill="#1f2937"
                cornerRadius={3} />
              {/* HP bar foreground */}
              <Rect
                width={hpPercent * width}
                height={6 * scale}
                fill={hpColor}
                cornerRadius={3} />
              {/* HP text */}
              <Text
                x={0}
                y={8 * scale}
                width={width}
                text={`${element.hp.current}/${element.hp.max}`}
                fontSize={fontSize * 0.85}
                fill="white"
                align="center"
                fontStyle="bold"
                shadowColor="black"
                shadowBlur={3}
                shadowOffsetX={1}
                shadowOffsetY={1} />
            </Group>
          )}

          {/* AC badge (top-right corner) */}
          {element.ac !== undefined && (
            <Group x={width - badgeSize / 2} y={badgeSize / 2}>
              {/* Shield background */}
              <Circle
                radius={badgeSize / 2}
                fill="#3b82f6"
                stroke="#1e40af"
                strokeWidth={1.5} />
              {/* AC text */}
              <Text
                x={-badgeSize / 2}
                y={-badgeSize / 2}
                width={badgeSize}
                height={badgeSize}
                text={String(element.ac)}
                fontSize={fontSize * 0.9}
                fill="white"
                align="center"
                verticalAlign="middle"
                fontStyle="bold" />
            </Group>
          )}

          {/* Condition badges (around token) */}
          {element.conditions && element.conditions.length > 0 && (
            <>
              {element.conditions.slice(0, 6).map((condition, index) => {
                // Position conditions around the token in a circle
                const angle = (index / Math.min(element.conditions!.length, 6)) * Math.PI * 2 - Math.PI / 2;
                const radius = width / 2 + conditionBadgeSize;
                const x = width / 2 + Math.cos(angle) * radius;
                const y = height / 2 + Math.sin(angle) * radius;

                // Get condition color
                const conditionColors: Record<string, string> = {
                  'poisoned': '#10b981',
                  'stunned': '#f59e0b',
                  'paralyzed': '#6366f1',
                  'charmed': '#ec4899',
                  'frightened': '#8b5cf6',
                  'restrained': '#ef4444',
                  'blinded': '#64748b',
                  'deafened': '#64748b',
                  'invisible': '#a855f7',
                  'prone': '#78716c',
                };
                const conditionColor = conditionColors[condition.toLowerCase()] || '#94a3b8';

                return (
                  <Group key={condition + index} x={x} y={y}>
                    {/* Condition badge background */}
                    <Circle
                      radius={conditionBadgeSize / 2}
                      fill={conditionColor}
                      stroke="#000"
                      strokeWidth={1} />
                    {/* Condition initial */}
                    <Text
                      x={-conditionBadgeSize / 2}
                      y={-conditionBadgeSize / 2}
                      width={conditionBadgeSize}
                      height={conditionBadgeSize}
                      text={condition.charAt(0).toUpperCase()}
                      fontSize={fontSize * 0.75}
                      fill="white"
                      align="center"
                      verticalAlign="middle"
                      fontStyle="bold" />
                  </Group>
                );
              })}
            </>
          )}

          {/* Token size indicator for large tokens */}
          {(element.width > 1 || element.height > 1) && (
            <Group x={badgeSize / 2} y={badgeSize / 2}>
              <Circle
                radius={badgeSize / 2}
                fill="rgba(0, 0, 0, 0.7)"
                stroke="#6b7280"
                strokeWidth={1} />
              <Text
                x={-badgeSize / 2}
                y={-badgeSize / 2}
                width={badgeSize}
                height={badgeSize}
                text={`${element.width}×${element.height}`}
                fontSize={fontSize * 0.65}
                fill="white"
                align="center"
                verticalAlign="middle"
                fontStyle="bold" />
            </Group>
          )}
        </>
      )}

      {/* GM-only indicator */}
      {element.visibleTo === 'gm' && isGM && (
        <Circle
          x={width - 6}
          y={height - 6}
          radius={6}
          fill="#7c3aed"
          opacity={0.8} />
      )}
    </Group>
  );
}
