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

  // Override updateWorktopList to also update connections and details
  const originalUpdateWorktopList = updateWorktopList;
  window.updateWorktopList = function () {
    // Save current canvas dimensions
    const currentWidth = canvas.width;
    const currentHeight = canvas.height;

    // Detect connections between worktops
    detectWorktopConnections();

    // Update the worktop list
    originalUpdateWorktopList.apply(this, arguments);

    // Update worktop details
    updateWorktopDetails();

    // Restore canvas dimensions if they were changed
    if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
      canvas.width = currentWidth;
      canvas.height = currentHeight;
      redrawCanvas();
    }
  };

  // Initial draw
  redrawCanvas();
}

// Initialize the app when the DOM is ready
document.addEventListener("DOMContentLoaded", initApp);

// Export the init function for potential external use
export { initApp };
