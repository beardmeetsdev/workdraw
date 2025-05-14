import { handleMouseDown } from './handleMouseDown.js';
import { handleMouseMove } from './handleMouseMove.js';
import { handleMouseUp } from './handleMouseUp.js';

/**
 * Set up canvas event listeners for drawing
 */
export function setupCanvasEvents(canvas) {
  // Mouse down event
  canvas.on("mouse:down", function (options) {
    handleMouseDown(options.pointer, canvas);
  });

  // Mouse move event
  canvas.on("mouse:move", function (options) {
    handleMouseMove(options.pointer, canvas);
  });

  // Mouse up event
  canvas.on("mouse:up", function (options) {
    handleMouseUp(options.pointer, canvas);
  });
}
