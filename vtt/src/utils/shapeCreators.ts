import type { Point, ShapeElement, StyleProps } from '../types';

/**
 * Creates a freehand shape element from a series of points
 */
export function createFreehandShape(
  points: Point[],
  style: StyleProps,
  zIndex: number
): Omit<ShapeElement, 'id'> {
  return {
    type: 'shape',
    layer: 'drawing',
    shapeType: 'freehand',
    x: 0,
    y: 0,
    points,
    visibleTo: 'all',
    locked: false,
    zIndex,
    style: {
      strokeColor: style.strokeColor,
      fillColor: style.fillColor || 'transparent',
      lineWidth: style.lineWidth,
    },
  };
}

/**
 * Creates a line shape element between two points
 */
export function createLineShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  style: StyleProps,
  zIndex: number
): Omit<ShapeElement, 'id'> {
  return {
    type: 'shape',
    layer: 'drawing',
    shapeType: 'line',
    x: 0,
    y: 0,
    points: [{ x: startX, y: startY }, { x: endX, y: endY }],
    visibleTo: 'all',
    locked: false,
    zIndex,
    style: {
      strokeColor: style.strokeColor,
      fillColor: 'transparent',
      lineWidth: style.lineWidth,
    },
  };
}

/**
 * Creates a rectangle shape element
 */
export function createRectangleShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  style: StyleProps,
  fillEnabled: boolean,
  fillColor: string,
  zIndex: number
): Omit<ShapeElement, 'id'> {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  return {
    type: 'shape',
    layer: 'drawing',
    shapeType: 'rectangle',
    x,
    y,
    width,
    height,
    points: [],
    visibleTo: 'all',
    locked: false,
    zIndex,
    style: {
      strokeColor: style.strokeColor,
      fillColor: fillEnabled ? fillColor : 'transparent',
      lineWidth: style.lineWidth,
    },
  };
}

/**
 * Creates a circle shape element
 */
export function createCircleShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  style: StyleProps,
  fillEnabled: boolean,
  fillColor: string,
  zIndex: number
): Omit<ShapeElement, 'id'> {
  const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

  return {
    type: 'shape',
    layer: 'drawing',
    shapeType: 'circle',
    x: startX,
    y: startY,
    width: radius * 2,
    height: radius * 2,
    points: [],
    visibleTo: 'all',
    locked: false,
    zIndex,
    style: {
      strokeColor: style.strokeColor,
      fillColor: fillEnabled ? fillColor : 'transparent',
      lineWidth: style.lineWidth,
    },
  };
}

/**
 * Creates an ellipse shape element
 */
export function createEllipseShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  style: StyleProps,
  fillEnabled: boolean,
  fillColor: string,
  zIndex: number
): Omit<ShapeElement, 'id'> {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  return {
    type: 'shape',
    layer: 'drawing',
    shapeType: 'ellipse',
    x,
    y,
    width,
    height,
    points: [],
    visibleTo: 'all',
    locked: false,
    zIndex,
    style: {
      strokeColor: style.strokeColor,
      fillColor: fillEnabled ? fillColor : 'transparent',
      lineWidth: style.lineWidth,
    },
  };
}

/**
 * Creates an arrow shape element
 */
export function createArrowShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  style: StyleProps,
  zIndex: number
): Omit<ShapeElement, 'id'> {
  return {
    type: 'shape',
    layer: 'drawing',
    shapeType: 'arrow',
    x: 0,
    y: 0,
    points: [{ x: startX, y: startY }, { x: endX, y: endY }],
    visibleTo: 'all',
    locked: false,
    zIndex,
    style: {
      strokeColor: style.strokeColor,
      fillColor: style.strokeColor, // Arrow head uses stroke color
      lineWidth: style.lineWidth,
    },
  };
}

/**
 * Creates an AOE circle shape element (e.g., Fireball)
 */
export function createAoeCircleShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  zIndex: number
): Omit<ShapeElement, 'id'> {
  const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

  return {
    type: 'shape',
    layer: 'drawing',
    shapeType: 'circle',
    x: startX,
    y: startY,
    width: radius * 2,
    height: radius * 2,
    points: [],
    visibleTo: 'all',
    locked: false,
    zIndex,
    style: {
      strokeColor: '#f97316', // Orange for AOE
      fillColor: 'rgba(249, 115, 22, 0.3)', // Semi-transparent orange
      lineWidth: 3,
    },
  };
}

/**
 * Creates an AOE cone shape element with curved arc edge (fan shape)
 */
export function createAoeConeShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  zIndex: number
): Omit<ShapeElement, 'id'> {
  const angle = Math.atan2(endY - startY, endX - startX);
  const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  const coneAngle = Math.PI / 3; // 60 degree cone

  // Generate points along the arc for a smooth curve
  const arcSegments = 12; // Number of segments for the arc
  const points: Point[] = [{ x: startX, y: startY }]; // Start with origin

  // Generate arc points from left edge to right edge
  for (let i = 0; i <= arcSegments; i++) {
    const segmentAngle = angle - coneAngle / 2 + (coneAngle * i) / arcSegments;
    points.push({
      x: startX + Math.cos(segmentAngle) * length,
      y: startY + Math.sin(segmentAngle) * length,
    });
  }

  return {
    type: 'shape',
    layer: 'drawing',
    shapeType: 'polygon',
    x: 0,
    y: 0,
    points,
    visibleTo: 'all',
    locked: false,
    zIndex,
    style: {
      strokeColor: '#ef4444', // Red for cone
      fillColor: 'rgba(239, 68, 68, 0.3)', // Semi-transparent red
      lineWidth: 3,
    },
  };
}

/**
 * Creates an AOE triangle shape element (D&D RAW interpretation)
 */
export function createAoeTriangleShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  zIndex: number
): Omit<ShapeElement, 'id'> {
  const angle = Math.atan2(endY - startY, endX - startX);
  const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  const coneAngle = Math.PI / 3; // 60 degree cone

  // Simple 3-point triangle
  const point1X = startX;
  const point1Y = startY;
  const point2X = startX + Math.cos(angle - coneAngle / 2) * length;
  const point2Y = startY + Math.sin(angle - coneAngle / 2) * length;
  const point3X = startX + Math.cos(angle + coneAngle / 2) * length;
  const point3Y = startY + Math.sin(angle + coneAngle / 2) * length;

  return {
    type: 'shape',
    layer: 'drawing',
    shapeType: 'polygon',
    x: 0,
    y: 0,
    points: [
      { x: point1X, y: point1Y },
      { x: point2X, y: point2Y },
      { x: point3X, y: point3Y },
    ],
    visibleTo: 'all',
    locked: false,
    zIndex,
    style: {
      strokeColor: '#f97316', // Orange for triangle
      fillColor: 'rgba(249, 115, 22, 0.3)', // Semi-transparent orange
      lineWidth: 3,
    },
  };
}

/**
 * Creates an AOE line shape element (e.g., Lightning Bolt)
 */
export function createAoeLineShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  zIndex: number
): Omit<ShapeElement, 'id'> {
  const angle = Math.atan2(endY - startY, endX - startX);
  const perpAngle = angle + Math.PI / 2;
  const halfWidth = 12; // 5ft wide represented as ~12px

  // Calculate rectangle points for the line
  const points: Point[] = [
    { x: startX + Math.cos(perpAngle) * halfWidth, y: startY + Math.sin(perpAngle) * halfWidth },
    { x: startX - Math.cos(perpAngle) * halfWidth, y: startY - Math.sin(perpAngle) * halfWidth },
    { x: endX - Math.cos(perpAngle) * halfWidth, y: endY - Math.sin(perpAngle) * halfWidth },
    { x: endX + Math.cos(perpAngle) * halfWidth, y: endY + Math.sin(perpAngle) * halfWidth },
  ];

  return {
    type: 'shape',
    layer: 'drawing',
    shapeType: 'polygon',
    x: 0,
    y: 0,
    points,
    visibleTo: 'all',
    locked: false,
    zIndex,
    style: {
      strokeColor: '#3b82f6', // Blue for line
      fillColor: 'rgba(59, 130, 246, 0.3)', // Semi-transparent blue
      lineWidth: 3,
    },
  };
}

/**
 * Creates an AOE square shape element (e.g., Cloud of Daggers)
 */
export function createAoeSquareShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  zIndex: number
): Omit<ShapeElement, 'id'> {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  return {
    type: 'shape',
    layer: 'drawing',
    shapeType: 'rectangle',
    x,
    y,
    width,
    height,
    points: [],
    visibleTo: 'all',
    locked: false,
    zIndex,
    style: {
      strokeColor: '#8b5cf6', // Purple for square AOE
      fillColor: 'rgba(139, 92, 246, 0.3)', // Semi-transparent purple
      lineWidth: 3,
    },
  };
}
