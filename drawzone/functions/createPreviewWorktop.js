/**
 * Create a preview worktop based on the detected direction
 */
export function createPreviewWorktop(canvas) {
  // Get state from global scope
  const state = window.state;
  
  // Remove any existing preview
  if (state.previewWorktop) {
    canvas.remove(state.previewWorktop);
  }

  // Create initial points for the polygon (will be updated later)
  const initialPoints = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  // Create a new polygon for the preview worktop
  state.previewWorktop = new fabric.Polygon(initialPoints, {
    fill: "rgba(52, 152, 219, 0.5)", // More opaque fill
    stroke: "#3498db",
    strokeWidth: 3, // Thicker stroke
    selectable: false,
    evented: false,
    perPixelTargetFind: true,
    left: 0,
    top: 0,
  });

  // Add to canvas
  canvas.add(state.previewWorktop);
  state.previewWorktop.bringToFront();

  // Create a red dot to mark the current point
  if (state.currentPointDot) {
    canvas.remove(state.currentPointDot);
  }

  state.currentPointDot = new fabric.Circle({
    left: state.lastSignificantPoint.x - 5,
    top: state.lastSignificantPoint.y - 5,
    radius: 5,
    fill: "red",
    selectable: false,
    evented: false,
  });

  canvas.add(state.currentPointDot);

  // Create start line at the bottom
  if (state.startLine) {
    canvas.remove(state.startLine);
  }

  state.startLine = new fabric.Line([], {
    stroke: "#3498db",
    strokeWidth: 2,
    selectable: false,
    evented: false,
  });

  canvas.add(state.startLine);
}
