import { initCanvas } from "./initCanvas.js";
import { setupUIEvents } from "./setupUIEvents.js";
import { updateDirectionsPanel } from "./updateDirectionsPanel.js";

/**
 * Initialize the application
 */
export function init() {
  // Get state from global scope
  const state = window.state;

  // Initialize canvas
  const canvas = initCanvas(null, state);

  // Store canvas in global scope for other functions to access
  window.canvas = canvas;

  // Set up UI event listeners
  setupUIEvents(canvas);

  // Initialize the directions panel
  updateDirectionsPanel();
}
