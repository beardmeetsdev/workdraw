import { snapToGrid } from "./snapToGrid.js";
import { updatePreviewWorktop } from "./updatePreviewWorktop.js";
import { finalizeWorktop } from "./finalizeWorktop.js";
import { setInnerOuterEdges } from "./setInnerOuterEdges.js";

/**
 * Handle mouse up event
 * @param {Object} pointer - Mouse coordinates
 * @param {Object} canvas - Fabric.js canvas instance
 */
export function handleMouseUp(pointer, canvas) {
  // Get state from global scope
  const state = window.state;

  if (!state.isDrawing) return;

  // End drawing
  state.isDrawing = false;

  // Snap to grid if enabled
  const point = snapToGrid(pointer, state);

  if (state.detectedDirection) {
    // If we have a direction, update the preview one last time
    updatePreviewWorktop(point, canvas);

    // For the final worktop on mouse up, we need to determine if we're continuing from a turn
    // If we are, we should use the current edge labels that were set during the turn
    // Edge labels for the first segment were already set in handleMouseMove when direction was detected

    // For the last worktop (on mouse up), we need to determine the appropriate edge labels
    // based on the previous worktop and the current direction
    if (state.previousWorktop && !state.isFirstSegment) {
      // This is the last worktop in a sequence (D in A-B-C-D)
      // We need to call setInnerOuterEdges to properly set its edge labels

      // The key insight: for the last worktop, we need to continue the pattern
      // from the previous worktops, ensuring inner edges face the inside of the shape
      setInnerOuterEdges(
        state.detectedDirection, // Current direction
        state.previousWorktopDirection, // Previous direction
        state.detectedDirection // Use current direction as "turn" direction
      );
    }

    // Finalize the worktop (save it and keep it on the canvas)
    const worktop = finalizeWorktop(
      state.lastSignificantPoint,
      point,
      state.detectedDirection,
      state.detectedDirection, // Use current direction as turn direction
      canvas
    );

    // Store the current direction as previous for the next worktop
    state.previousWorktopDirection = state.detectedDirection;

    // Store the current worktop as previous for the next worktop
    state.previousWorktop = worktop;

    // Reset direction detection and state for next drawing
    state.detectedDirection = null;
    state.lastSignificantPoint = null;
    state.previousTurnDirection = null;

    // Reset isFirstSegment to true for the next structure
    // This ensures the next worktop structure starts fresh
    state.isFirstSegment = true;

    // Reset previous worktop references to ensure the next structure is disconnected
    // We always reset for new structures - double-click handling would need to be added if needed
    {
      state.previousWorktop = null;
      state.previousWorktopDirection = null;

      // Reset edge labels for the next structure
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
    }
  } else {
    // If we haven't detected a direction yet, just update the line
    state.currentLine.set({
      x2: point.x,
      y2: point.y,
    });

    // Remove the line since we didn't create a worktop
    canvas.remove(state.currentLine);
    canvas.remove(state.startDot);
  }

  canvas.renderAll();
}
