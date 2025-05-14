/**
 * Create grid on canvas
 */
export function createGrid(canvas, state) {
  // Clear any existing grid
  if (state.gridLines) {
    state.gridLines.forEach((line) => canvas.remove(line));
  }

  state.gridLines = [];
  const width = canvas.getWidth();
  const height = canvas.getHeight();

  // Create vertical lines
  for (let i = 0; i <= width; i += state.gridSize) {
    const line = new fabric.Line([i, 0, i, height], {
      stroke: "#ddd",
      selectable: false,
      evented: false,
      strokeWidth: i % 100 === 0 ? 2 : 1, // Make every 5th line thicker
    });
    state.gridLines.push(line);
    canvas.add(line);
    line.sendToBack();
  }

  // Create horizontal lines
  for (let i = 0; i <= height; i += state.gridSize) {
    const line = new fabric.Line([0, i, width, i], {
      stroke: "#ddd",
      selectable: false,
      evented: false,
      strokeWidth: i % 100 === 0 ? 2 : 1, // Make every 5th line thicker
    });
    state.gridLines.push(line);
    canvas.add(line);
    line.sendToBack();
  }

  canvas.renderAll();
}
