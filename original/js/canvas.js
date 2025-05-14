/**
 * canvas.js
 * Handles canvas setup, grid drawing, and basic rendering functions
 */

import { state } from "./state.js";
import {
  createWorktopFromSegment,
  drawFinalWorktop,
  drawPreviewWorktop,
} from "./worktops.js"; // Added createWorktopFromSegment
import { detectWalls, drawWallMeasurements } from "./walls.js";
import { drawContinuousExteriorFaceMeasurements } from "./exteriorFaces.js";

let canvas;
let ctx;

/**
 * Initialize the canvas
 * @param {HTMLCanvasElement} canvasElement - The canvas element
 */
function initCanvas(canvasElement) {
  canvas = canvasElement;
  ctx = canvas.getContext("2d");
  resizeCanvas();
}

/**
 * Make canvas responsive to its container
 */
function resizeCanvas() {
  if (!canvas) return;

  const container = document.querySelector(".canvas-container");
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Set canvas dimensions to match container
  canvas.width = containerWidth - 20; // Subtract padding
  canvas.height = containerHeight - 20;

  // Redraw everything after resize
  redrawCanvas();
}

/**
 * Draw the grid on the canvas
 */
function drawGrid() {
  if (!ctx) return;

  const gridSize = state.gridSize;

  ctx.beginPath();
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 0.5;

  // Vertical lines
  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }

  // Horizontal lines
  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }

  ctx.stroke();

  // Draw thicker lines every 5 grid cells (500mm or 0.5m)
  ctx.beginPath();
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0; x <= canvas.width; x += gridSize * 5) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }

  // Horizontal lines
  for (let y = 0; y <= canvas.height; y += gridSize * 5) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }

  // Add measurements to the grid (every 500mm)
  ctx.font = "10px Arial";
  ctx.fillStyle = "#888";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Add horizontal measurements (along the top)
  for (let x = gridSize * 5; x <= canvas.width; x += gridSize * 5) {
    const mm = (x / gridSize) * 100; // Convert to mm
    ctx.fillText(`${mm}mm`, x + 2, 2);
  }

  // Add vertical measurements (along the left side)
  for (let y = gridSize * 5; y <= canvas.height; y += gridSize * 5) {
    const mm = (y / gridSize) * 100; // Convert to mm
    ctx.fillText(`${mm}mm`, 2, y + 2);
  }

  ctx.stroke();
}

/**
 * Draw a point marker
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {string} color - The color of the point
 */
function drawPoint(x, y, color = "#3498db") {
  if (!ctx) return;

  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Clear the canvas and redraw everything
 */
function redrawCanvas() {
  if (!ctx) {
    console.error("No canvas context available for redraw");
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw grid
  drawGrid();

  // Functions are now imported at the top of the file

  // Draw all completed worktops
  if (state.worktops && state.worktops.length > 0) {
    for (const worktop of state.worktops) {
      drawFinalWorktop(worktop);
    }

    // Detect and draw wall measurements
    // detectWalls(); // Temporarily disable for focused logging
    // drawWallMeasurements(); // Temporarily disable for focused logging

    // Draw continuous exterior face measurements
    drawContinuousExteriorFaceMeasurements();
  }

  // If currently drawing, draw previews
  if (state.isDrawing) {
    // Draw already committed segments of the current drag operation
    if (state.currentSegments.length > 0) {
      for (const segment of state.currentSegments) {
        const previewSegmentData = {
          ...segment, // Includes original start, end, direction, isFirstSegment
          isCurrent: !segment.isFirstSegment, // Shorten start if not the very first segment of the entire drawing
          isPrevious: true, // Extend end, as it's previous to the next (active) segment or mouse position
        };
        const previewWorktop = createWorktopFromSegment(previewSegmentData);
        drawPreviewWorktop(previewWorktop);
      }
    }

    // Draw preview for the active segment being formed (from lastSignificantPoint to mouse)
    if (
      state.lastSignificantPoint &&
      state.detectedDirection &&
      state.lastMousePosition
    ) {
      const lastPoint = state.lastSignificantPoint;
      const mousePos = state.lastMousePosition;
      let previewEndX, previewEndY;

      if (state.detectedDirection === "horizontal") {
        previewEndX = mousePos.x;
        previewEndY = lastPoint.y;
      } else {
        // Vertical
        previewEndX = lastPoint.x;
        previewEndY = mousePos.y;
      }

      const activePreviewSegment = {
        start: { x: lastPoint.x, y: lastPoint.y },
        end: { x: previewEndX, y: previewEndY },
        direction: state.detectedDirection,
        isCurrent: true, // This is the current active segment, so its start should be shortened if not first
        isFirstSegment: state.currentSegments.length === 0, // True if no segments yet committed
        isPrevious: false, // The active segment is not "previous" to anything yet
      };
      const activePreviewWorktop =
        createWorktopFromSegment(activePreviewSegment);
      drawPreviewWorktop(activePreviewWorktop);
    }

    // Draw points at significant locations
    if (state.originalClickPoint) {
      drawPoint(
        state.originalClickPoint.x,
        state.originalClickPoint.y,
        "#00FF00"
      );
    }
    if (state.currentPoint) {
      drawPoint(state.currentPoint.x, state.currentPoint.y, "#FF0000");
    }
    if (state.lastSignificantPoint) {
      drawPoint(state.lastSignificantPoint.x, state.lastSignificantPoint.y);
    }
    // Draw end points of current segments
    for (const segment of state.currentSegments) {
      drawPoint(segment.end.x, segment.end.y, "#FFA500"); // Orange for segment ends
    }
  }

  console.log("Canvas redraw complete");
}

/**
 * Get the canvas context
 * @returns {CanvasRenderingContext2D} - The canvas context
 */
function getContext() {
  return ctx;
}

/**
 * Get the canvas element
 * @returns {HTMLCanvasElement} - The canvas element
 */
function getCanvas() {
  return canvas;
}

// Export the canvas functions
export {
  initCanvas,
  resizeCanvas,
  drawGrid,
  drawPoint,
  redrawCanvas,
  getContext,
  getCanvas,
};
