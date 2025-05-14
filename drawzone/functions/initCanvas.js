import { resizeCanvas } from "./resizeCanvas.js";
import { createGrid } from "./createGrid.js";
import { setupCanvasEvents } from "./setupCanvasEvents.js";

/**
 * Initialize the Fabric.js canvas
 */
export function initCanvas(canvas, state) {
  // Create canvas instance
  canvas = new fabric.Canvas("canvas", {
    selection: false, // Disable group selection
    preserveObjectStacking: true, // Maintain object stacking order
  });

  // Set canvas dimensions based on container
  resizeCanvas(canvas);

  // Create grid
  createGrid(canvas, state);

  // Set up canvas event listeners
  setupCanvasEvents(canvas);

  return canvas;
}
