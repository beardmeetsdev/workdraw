import { resizeCanvas } from './resizeCanvas.js';
import { createGrid } from './createGrid.js';

/**
 * Set up UI event listeners
 */
export function setupUIEvents(canvas) {
  // Get state from global scope
  const state = window.state;
  
  // Toggle grid snap
  document.getElementById("toggle-snap").addEventListener("click", function () {
    state.snapToGrid = !state.snapToGrid;
    this.textContent = `Grid Snap: ${state.snapToGrid ? "ON" : "OFF"}`;
    this.classList.toggle("active", state.snapToGrid);
  });

  // Clear canvas
  document.getElementById("clear").addEventListener("click", function () {
    // Remove all objects except grid
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      if (!state.gridLines.includes(obj)) {
        canvas.remove(obj);
      }
    });

    // Reset state
    state.worktops = [];
    state.nextLabel = "A";
    state.isFirstSegment = true;
    state.previousWorktop = null;
    state.previousWorktopDirection = null;
    state.previousTurnDirection = null;
    state.previewWorktop = null;
    state.currentPointDot = null;
    state.startLine = null;
    state.startDot = null;
    state.lastSignificantPoint = null;
    state.detectedDirection = null;

    // Reset edge labels
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

    // Clear worktop list
    document.getElementById("worktop-list").innerHTML = "";

    // Clear directions panel
    document.getElementById("directions-list").innerHTML = "";

    canvas.renderAll();
  });

  // Window resize
  window.addEventListener("resize", function () {
    resizeCanvas(canvas);
    createGrid(canvas, state);
  });
}
