/**
 * main.js
 * Main entry point for the Workdraw application
 */

import { state } from "./state.js";
import { initCanvas, redrawCanvas } from "./canvas.js";
import {
  setupEventListeners,
  updateWorktopList,
  updateWorktopDetails,
} from "./ui.js";
import { detectWorktopConnections } from "./connections.js";
import { detectContinuousExteriorFaces } from "./exteriorFaces.js"; // Import new function

/**
 * Initialize the application
 */
function initApp() {
  // Initialize the canvas
  const canvas = document.getElementById("canvas");
  initCanvas(canvas);

  // Set up event listeners
  setupEventListeners();

  // Set initial mode to smart
  state.mode = "smart";

  // Initial draw
  // updateWorktopList(); // Call directly if needed for initial empty state
  // updateWorktopDetails(); // Call directly if needed
  redrawCanvas();
}

// Export the init function for potential external use
// The DOMContentLoaded listener in app.js will call this initApp.
export { initApp };
