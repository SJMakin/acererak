import { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';

export interface Ping {
  id: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

export function usePings() {
  const [pings, setPings] = useState<Ping[]>([]);
  const [, setPingTick] = useState(0);
  const hasPings = pings.length > 0;

  // Cleanup old pings and force re-render for animation
  useEffect(() => {
    if (!hasPings) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setPings(prev => prev.filter(p => now - p.timestamp < 2000));
      // Force re-render for smooth animation
      setPingTick(n => n + 1);
    }, 50);

    return () => clearInterval(interval);
  }, [hasPings]);

  const addPing = (x: number, y: number, color: string = '#f59e0b') => {
    const pingData: Ping = { id: nanoid(), x, y, color, timestamp: Date.now() };
    setPings(prev => [...prev, pingData]);
  };

  return { pings, addPing };
}
