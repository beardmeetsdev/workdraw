import { snapToGrid } from './snapToGrid.js';

/**
 * Handle mouse down event
 * @param {Object} pointer - Mouse coordinates
 * @param {Object} canvas - Fabric.js canvas instance
 */
export function handleMouseDown(pointer, canvas) {
  // Get state from global scope
  const state = window.state;
  
  // Start drawing
  state.isDrawing = true;

  // Snap to grid if enabled
  const point = snapToGrid(pointer, state);

  // Always use the clicked point as the start point
  // This allows creating disconnected worktops
  state.startPoint = { ...point };
  state.originalClickPoint = { ...point }; // Store original click point for reference

  // If we're starting a new drawing (not continuing from a previous one)
  // Reset the edge labels and set isFirstSegment flag
  if (!state.detectedDirection) {
    state.isFirstSegment = true;
    state.currentEdgeLabels = {
      top: null,
      bottom: null,
      left: null,
      right: null,
    };
    state.previousEdgeLabels = {
      top: null,
      bottom: null,
      left: null,
      right: null,
    };

    // Reset the previous worktop and direction
    state.previousWorktop = null;
    state.previousWorktopDirection = null;
    state.previousTurnDirection = null;
  }

  // Create a temporary line
  state.currentLine = new fabric.Line(
    [
      state.startPoint.x,
      state.startPoint.y,
      state.startPoint.x,
      state.startPoint.y,
    ],
    {
      stroke: "#3498db",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }
  );

  // Add line to canvas
  canvas.add(state.currentLine);
  canvas.renderAll();

  // Create visual indicator for start point (green dot)
  const startDot = new fabric.Circle({
    left: state.startPoint.x - 5,
    top: state.startPoint.y - 5,
    radius: 5,
    fill: "green",
    selectable: false,
    evented: false,
  });

  state.startDot = startDot;
  canvas.add(startDot);
}
