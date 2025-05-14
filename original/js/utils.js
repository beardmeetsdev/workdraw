/**
 * utils.js
 * Utility functions for the Workdraw application
 */

import { state } from './state.js';

/**
 * Snap a coordinate to the grid
 * @param {number} coord - The coordinate to snap
 * @returns {number} - The snapped coordinate
 */
function snapToGrid(coord) {
  if (!state.snapToGrid) return coord;
  return Math.round(coord / state.gridSize) * state.gridSize;
}

/**
 * Get mouse coordinates relative to canvas
 * @param {MouseEvent} e - The mouse event
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @returns {Object} - The x and y coordinates
 */
function getMouseCoordinates(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  let x = Math.round(e.clientX - rect.left);
  let y = Math.round(e.clientY - rect.top);

  // Apply grid snapping if enabled
  if (state.snapToGrid) {
    x = snapToGrid(x);
    y = snapToGrid(y);
  }

  return { x, y };
}

/**
 * Get corner coordinates for a worktop
 * @param {Object} worktop - The worktop object
 * @returns {Object} - The corner coordinates
 */
function getCornerCoordinates(worktop) {
  return {
    TL: { x: worktop.x, y: worktop.y }, // Top-Left
    TR: { x: worktop.x + worktop.width, y: worktop.y }, // Top-Right
    BL: { x: worktop.x, y: worktop.y + worktop.height }, // Bottom-Left
    BR: { x: worktop.x + worktop.width, y: worktop.y + worktop.height }, // Bottom-Right
  };
}

// Debug logs for measurements
let measurementLogs = [];

/**
 * Log measurement data for debugging
 */
function logMeasurement(
  worktopLabel,
  edge,
  type,
  x1,
  y1,
  x2,
  y2,
  lengthPx,
  lengthMm,
  condition = ""
) {
  measurementLogs.push({
    worktop: worktopLabel || "Preview",
    edge,
    type,
    coords: { x1, y1, x2, y2 },
    lengthPx,
    lengthMm,
    condition,
  });
}

/**
 * Show all measurement logs
 */
function showMeasurementLogs() {
  // Format the logs as a readable text file
  let logText = "=== MEASUREMENT LOGS ===\n\n";

  // Add a header row
  logText +=
    "Worktop\tEdge\tType\tX1\tY1\tX2\tY2\tLength(px)\tLength(mm)\tDetails\n";

  // Add each log entry
  measurementLogs.forEach((log) => {
    logText += `${log.worktop}\t${log.edge}\t${log.type}\t${Math.round(
      log.coords.x1
    )}\t${Math.round(log.coords.y1)}\t${Math.round(
      log.coords.x2
    )}\t${Math.round(log.coords.y2)}\t${Math.round(log.lengthPx)}\t${
      log.lengthMm
    }\t${log.condition}\n`;
  });

  // Create a blob with the text content
  const blob = new Blob([logText], { type: "text/plain" });

  // Create a download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "measurement_logs.txt";

  // Trigger the download
  document.body.appendChild(a);
  a.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);

  // Also log to console for debugging
  console.clear();
  console.log("=== MEASUREMENT LOGS ===");
  console.table(measurementLogs);

  // Clear logs after showing
  measurementLogs = [];
}

// Export the utility functions
export {
  snapToGrid,
  getMouseCoordinates,
  getCornerCoordinates,
  logMeasurement,
  showMeasurementLogs
};
