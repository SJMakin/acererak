import { Group, Circle } from 'react-konva';

interface Ping {
  id: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

interface PingsProps {
  pings: Ping[];
}

export function Pings({ pings }: PingsProps) {
  return (
    <>
      {pings.map(ping => {
        const age = Date.now() - ping.timestamp;
        const opacity = Math.max(0, 1 - age / 2000);
        const scale = 1 + (age / 2000) * 0.5;
        
        return (
          <Group key={ping.id} x={ping.x} y={ping.y}>
            <Circle
              radius={20 * scale}
              stroke={ping.color}
              strokeWidth={3}
              opacity={opacity}
            />
            <Circle
              radius={10 * scale}
              stroke={ping.color}
              strokeWidth={2}
              opacity={opacity * 0.6}
            />
          </Group>
        );
      })}
    </>
  );
}
