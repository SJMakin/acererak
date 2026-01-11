import { Group, Path, Rect, Text } from 'react-konva';
import type { Player, Point } from '../../../types';

interface PlayerCursorsProps {
  otherPlayerCursors: (Player & { cursor: Point })[];
  interpolatedCursors: Record<string, Point>;
}

export function PlayerCursors({
  otherPlayerCursors,
  interpolatedCursors,
}: PlayerCursorsProps) {
  return (
    <>
      {otherPlayerCursors.map(player => {
        const pos = interpolatedCursors[player.id] || player.cursor;
        return (
          <Group key={player.id} x={pos.x} y={pos.y}>
            {/* Cursor arrow */}
            <Path
              data="M 0 0 L 4 14 L 0 11 L -4 14 Z"
              fill={player.color}
              stroke="#000"
              strokeWidth={0.5}
            />
            {/* Name label background */}
            <Rect
              x={8}
              y={8}
              width={player.name.length * 7 + 8}
              height={18}
              fill={player.color}
              cornerRadius={3}
              opacity={0.9}
            />
            {/* Name label text */}
            <Text
              x={12}
              y={11}
              text={player.name}
              fontSize={12}
              fill="#fff"
              fontStyle="bold"
            />
          </Group>
        );
      })}
    </>
  );
}
