import { adjustWorktopCorners } from "./adjustWorktopCorners.js";
import { addMeasurementToWorktop } from "./addMeasurementToWorktop.js";

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

  console.log("Preview worktop length:", {
    lengthPx,
    lengthMm,
    direction: state.detectedDirection,
    isFirstSegment,
  });

  // Add measurement text on the side of the worktop (non-permanent for preview)
  addMeasurementToWorktop(
    canvas,
    points,
    state.detectedDirection,
    lengthMm,
    isFirstSegment,
    false // Not permanent - will be removed on next update
  );

  // Render the canvas
  canvas.renderAll();
}

/**
 * Update the measurements panel with current worktop dimensions
 * @param {Object} start - Start point of the worktop
 * @param {Object} end - End point of the worktop
 * @param {string} direction - Direction of the worktop (N, S, E, W)
 * @param {boolean} isFirstSegment - Whether this is the first segment
 */
function updateMeasurementsPanel(start, end, direction, isFirstSegment) {
  // Get state from global scope
  const state = window.state;

  // Get the directions panel element
  const directionsPanel = document.getElementById("directions-list");

  // Calculate the length of the worktop in pixels
  let lengthPx;
  if (direction === "E" || direction === "W") {
    // For horizontal worktops (East or West)
    lengthPx = Math.abs(end.x - start.x);
  } else {
    // For vertical worktops (North or South)
    lengthPx = Math.abs(end.y - start.y);
  }

  // Convert to millimeters (20 pixels = 100mm, so 1 pixel = 5mm)
  // Each grid box is 20px and represents 100mm
  const pixelsToMm = 5; // 1 pixel = 5mm
  const lengthMm = Math.round(lengthPx * pixelsToMm);

  // Fixed worktop width (600mm)
  const widthMm = 600;

  // Create or update the measurements section
  let measurementsSection = document.querySelector(".measurements-section");
  if (!measurementsSection) {
    // Create a new section for measurements if it doesn't exist
    measurementsSection = document.createElement("div");
    measurementsSection.className = "measurements-section";
    measurementsSection.style.marginTop = "20px";
    measurementsSection.style.borderTop = "1px solid #ccc";
    measurementsSection.style.paddingTop = "10px";

    // Add a heading
    const heading = document.createElement("h4");
    heading.textContent = "Measurements";
    heading.style.margin = "0 0 10px 0";
    heading.style.color = "#2c3e50";
    measurementsSection.appendChild(heading);

    // Add to the directions panel
    directionsPanel.appendChild(measurementsSection);
  }

  // Update the content of the measurements section
  measurementsSection.innerHTML = `
    <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Measurements</h4>
    <div style="font-family: monospace; font-size: 12px;">
      <div style="margin-bottom: 5px; color: ${
        isFirstSegment ? "red" : "black"
      }">
        Length: ${lengthMm}mm
      </div>
      <div style="margin-bottom: 5px;">
        Width: ${widthMm}mm
      </div>
      <div style="font-size: 10px; color: #7f8c8d; margin-top: 10px;">
        All sizes in mm
      </div>
    </div>
  `;
}
