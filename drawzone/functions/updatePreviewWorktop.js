import { adjustWorktopCorners } from "./adjustWorktopCorners.js";
import { addAllEdgeMeasurements } from "./addMeasurementToWorktop.js";

/**
 * Update the preview worktop based on current mouse position
 * @param {Object} point - Current mouse position
 * @param {Object} canvas - Fabric.js canvas instance
 */
export function updatePreviewWorktop(point, canvas) {
  // Get state from global scope
  const state = window.state;

  if (!state.previewWorktop || !state.detectedDirection) {
    return;
  }

  const start = state.lastSignificantPoint;
  const halfWidth = state.worktopWidth / 2;
  let end = { ...point };

  // Snap the end point to the detected direction
  if (state.detectedDirection === "E" || state.detectedDirection === "W") {
    end.y = start.y; // Keep y coordinate the same for horizontal lines
  } else {
    end.x = start.x; // Keep x coordinate the same for vertical lines
  }

  // Apply corner adjustments for the preview
  const isFirstSegment = state.worktops.length === 0 || state.isFirstSegment;
  const isPrevious = false; // We don't adjust the end point in preview
  const isCurrent = true;

  const { adjustedStart, adjustedEnd } = adjustWorktopCorners(
    start,
    end,
    state.detectedDirection,
    isPrevious,
    isCurrent,
    isFirstSegment
  );

  // Calculate the four corners of the worktop using adjusted points
  let points = [];

  if (state.detectedDirection === "E" || state.detectedDirection === "W") {
    // For horizontal worktops (East or West)
    if (state.detectedDirection === "E") {
      // Drawing East (left to right)
      points = [
        { x: adjustedStart.x, y: adjustedStart.y - halfWidth }, // Top-left
        { x: adjustedEnd.x, y: adjustedEnd.y - halfWidth }, // Top-right
        { x: adjustedEnd.x, y: adjustedEnd.y + halfWidth }, // Bottom-right
        { x: adjustedStart.x, y: adjustedStart.y + halfWidth }, // Bottom-left
      ];
    } else {
      // Drawing West (right to left)
      points = [
        { x: adjustedEnd.x, y: adjustedEnd.y - halfWidth }, // Top-left
        { x: adjustedStart.x, y: adjustedStart.y - halfWidth }, // Top-right
        { x: adjustedStart.x, y: adjustedStart.y + halfWidth }, // Bottom-right
        { x: adjustedEnd.x, y: adjustedEnd.y + halfWidth }, // Bottom-left
      ];
    }

    // Update start line at the bottom
    state.startLine.set({
      x1: adjustedStart.x,
      y1: adjustedStart.y + halfWidth,
      x2: adjustedStart.x,
      y2: adjustedStart.y + halfWidth + 20, // 20px down
    });
  } else {
    // For vertical worktops (North or South)
    if (state.detectedDirection === "S") {
      // Drawing South (top to bottom)
      points = [
        { x: adjustedStart.x - halfWidth, y: adjustedStart.y }, // Top-left
        { x: adjustedStart.x + halfWidth, y: adjustedStart.y }, // Top-right
        { x: adjustedEnd.x + halfWidth, y: adjustedEnd.y }, // Bottom-right
        { x: adjustedEnd.x - halfWidth, y: adjustedEnd.y }, // Bottom-left
      ];
    } else {
      // Drawing North (bottom to top)
      points = [
        { x: adjustedEnd.x - halfWidth, y: adjustedEnd.y }, // Top-left
        { x: adjustedEnd.x + halfWidth, y: adjustedEnd.y }, // Top-right
        { x: adjustedStart.x + halfWidth, y: adjustedStart.y }, // Bottom-right
        { x: adjustedStart.x - halfWidth, y: adjustedStart.y }, // Bottom-left
      ];
    }

    // Update start line at the bottom (left side for vertical)
    state.startLine.set({
      x1: adjustedStart.x - halfWidth,
      y1: adjustedStart.y,
      x2: adjustedStart.x - halfWidth - 20, // 20px to the left
      y2: adjustedStart.y,
    });
  }

  // Remove the old polygon
  canvas.remove(state.previewWorktop);

  // Create a new polygon with the calculated points
  state.previewWorktop = new fabric.Polygon(points, {
    fill: "rgba(52, 152, 219, 0.5)", // More opaque fill
    stroke: "#3498db",
    strokeWidth: 3, // Thicker stroke
    selectable: false,
    evented: false,
    perPixelTargetFind: true,
  });

  // Add the new polygon to the canvas
  canvas.add(state.previewWorktop);
  state.previewWorktop.bringToFront();

  // Update the current point dot
  state.currentPointDot.set({
    left: end.x - 5,
    top: end.y - 5,
  });

  // Calculate and display measurements on the side panel
  updateMeasurementsPanel(
    adjustedStart,
    adjustedEnd,
    state.detectedDirection,
    isFirstSegment
  );

  // Calculate length in pixels
  let lengthPx;
  if (state.detectedDirection === "E" || state.detectedDirection === "W") {
    // For horizontal worktops (East or West)
    lengthPx = Math.abs(adjustedEnd.x - adjustedStart.x);
  } else {
    // For vertical worktops (North or South)
    lengthPx = Math.abs(adjustedEnd.y - adjustedStart.y);
  }

  // Calculate length in mm for display
  const lengthMm = Math.round(lengthPx * 5); // Convert to mm (1px = 5mm)

  // Add measurement text on all edges of the worktop (non-permanent for preview)
  addAllEdgeMeasurements(
    canvas,
    points,
    state.detectedDirection,
    lengthMm,
    600, // Fixed worktop width (600mm)
    false // Not permanent - will be removed on next update
  );

  // Render the canvas
  canvas.renderAll();
}

/**
 * Update the measurements panel with current worktop dimensions
 * This function is now empty as we're not displaying measurements in the debug console
 * The measurements are still shown directly on the canvas via addMeasurementToWorktop
 */
function updateMeasurementsPanel() {
  // Empty function - measurements are displayed directly on the canvas
}
