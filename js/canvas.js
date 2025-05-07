/**
 * canvas.js
 * Handles canvas setup, grid drawing, and basic rendering functions
 */

import { state } from './state.js';

let canvas;
let ctx;

/**
 * Initialize the canvas
 * @param {HTMLCanvasElement} canvasElement - The canvas element
 */
function initCanvas(canvasElement) {
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
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
 * This function will be implemented fully once all modules are created
 */
function redrawCanvas() {
  if (!ctx) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  drawGrid();
  
  // The rest of the redraw functionality will be added
  // once other modules are implemented
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
  getCanvas
};
