/**
 * state.js
 * Manages the application state for the Workdraw application
 */

// Application state
const state = {
  mode: "smart", // Only 'smart' is used now
  isDrawing: false, // Whether we're currently drawing
  isDragging: false, // Whether the mouse is down
  currentPoint: null, // Current point (start of the current line)
  originalClickPoint: null, // Store the original mouse click point before backfilling
  worktopWidth: 120, // Fixed width for worktop rectangles (in pixels) (600mm in real-world terms)
  worktops: [], // Store all completed worktop rectangles
  currentSegments: [], // Store line segments for the current drag operation
  snapToGrid: true, // Enable grid snapping by default
  gridSize: 20, // Grid size for snapping (20px = 100mm with 5mm per pixel)
  detectedDirection: null, // 'horizontal' or 'vertical' for smart mode
  initialDirectionThreshold: 60, // Minimum pixel movement to detect initial direction
  directionChangeThreshold: 70, // Minimum pixel movement to detect a change in direction
  lastDirection: null, // Store the direction of the last line for alternating
  lastSignificantPoint: null, // Last point where direction changed
  nextWorktopLabel: "A", // Next letter to use for labeling worktops
  pixelsToMm: 5, // Conversion factor: 1 pixel = 5mm (120px = 600mm, 20px grid = 100mm)
  isFirstSegment: true, // Flag to track if this is the first segment in a drawing session
  connectionPoints: [], // Array to store connection points with labels
};

/**
 * Reset the drawing state
 */
function resetDrawingState() {
  state.isDrawing = false;
  state.isDragging = false;
  state.detectedDirection = null;
  state.currentPoint = null;
  state.originalClickPoint = null;
  state.lastDirection = null;
  state.currentSegments = [];
  state.lastSignificantPoint = null;
  state.lastMousePosition = null;
}

/**
 * Clear all worktops and reset the state
 */
function clearState() {
  state.worktops = [];
  state.nextWorktopLabel = "A"; // Reset the label counter
  resetDrawingState();
}

// Export the state and functions
export {
  state,
  resetDrawingState,
  clearState
};
