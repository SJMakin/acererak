import type { Point, ToolType } from '../../types';

interface ToolHintsProps {
  selectedTool: ToolType;
  polygonPoints: Point[];
  measureWaypoints: Point[];
  measureDifficultTerrain: boolean;
}

export default function ToolHints({
  selectedTool,
  polygonPoints,
  measureWaypoints,
  measureDifficultTerrain,
}: ToolHintsProps) {
  return (
    <>
      {/* Polygon tool hint overlay */}
      {selectedTool === 'draw-polygon' && polygonPoints.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          {polygonPoints.length} point{polygonPoints.length !== 1 ? 's' : ''} •
          {polygonPoints.length >= 3
            ? ' Press Enter or double-click to finish'
            : ` Add ${3 - polygonPoints.length} more point${3 - polygonPoints.length !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Measure tool hint overlay */}
      {selectedTool === 'measure' && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          {measureWaypoints.length === 0
            ? 'Click to start measuring'
            : `${measureWaypoints.length} waypoint${measureWaypoints.length !== 1 ? 's' : ''}`}
          {measureWaypoints.length > 0 && ' • Click to add waypoint • '}
          {measureWaypoints.length > 0 && (
            <span style={{ color: measureDifficultTerrain ? '#f59e0b' : '#86efac' }}>
              [D] Terrain: {measureDifficultTerrain ? '2×' : '1×'}
            </span>
          )}
          {measureWaypoints.length > 0 && ' • [Backspace] Undo • [Esc] Clear'}
        </div>
      )}
    </>
  );
}
