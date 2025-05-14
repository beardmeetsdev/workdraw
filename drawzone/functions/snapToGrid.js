/**
 * Snap point to grid
 * @param {Object} point - Point with x and y coordinates
 * @param {Object} state - Application state
 * @returns {Object} - Snapped point
 */
export function snapToGrid(point, state) {
  if (!state.snapToGrid) return point;

  return {
    x: Math.round(point.x / state.gridSize) * state.gridSize,
    y: Math.round(point.y / state.gridSize) * state.gridSize,
  };
}
