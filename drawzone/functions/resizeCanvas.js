/**
 * Resize canvas to fit container
 */
export function resizeCanvas(canvas) {
  const container = document.querySelector(".canvas-container");
  const width = container.clientWidth - 20; // Subtract padding
  const height = container.clientHeight - 20; // Subtract padding

  canvas.setWidth(width);
  canvas.setHeight(height);
  canvas.renderAll();
}
