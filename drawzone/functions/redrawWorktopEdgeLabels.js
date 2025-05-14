/**
 * Redraw the edge labels for a worktop
 * @param {Object} worktop - The worktop to redraw edge labels for
 * @param {Object} canvas - Fabric.js canvas instance
 */
export function redrawWorktopEdgeLabels(worktop, canvas) {
  // First, find and remove any existing edge labels for this worktop
  const objects = canvas.getObjects();
  const edgeLabels = objects.filter(
    (obj) =>
      obj.type === "text" &&
      (obj.text === "Inner" || obj.text === "Outer") &&
      obj.left >= worktop.corners[0].x - 50 &&
      obj.left <= worktop.corners[2].x + 50 &&
      obj.top >= worktop.corners[0].y - 50 &&
      obj.top <= worktop.corners[2].y + 50
  );

  // Remove the existing edge labels
  edgeLabels.forEach((label) => {
    canvas.remove(label);
  });

  // Get the points and direction from the worktop
  const points = worktop.corners;
  const direction = worktop.direction;
  const edgeLabelsData = worktop.edgeLabels;

  // Add new edge labels based on the updated edge labels data
  if (direction === "E" || direction === "W") {
    // For horizontal worktops (East or West)
    // Top edge
    if (edgeLabelsData.top) {
      const topEdgeLabel = new fabric.Text(
        edgeLabelsData.top === "inner" ? "Inner" : "Outer",
        {
          left: (points[0].x + points[1].x) / 2,
          top: Math.min(points[0].y, points[1].y) - 15,
          fontSize: 10,
          fill: edgeLabelsData.top === "inner" ? "blue" : "red",
          backgroundColor: "rgba(255,255,255,0.7)",
          selectable: false,
          evented: false,
        }
      );
      canvas.add(topEdgeLabel);
    }

    // Bottom edge
    if (edgeLabelsData.bottom) {
      const bottomEdgeLabel = new fabric.Text(
        edgeLabelsData.bottom === "inner" ? "Inner" : "Outer",
        {
          left: (points[2].x + points[3].x) / 2,
          top: Math.max(points[2].y, points[3].y) + 5,
          fontSize: 10,
          fill: edgeLabelsData.bottom === "inner" ? "blue" : "red",
          backgroundColor: "rgba(255,255,255,0.7)",
          selectable: false,
          evented: false,
        }
      );
      canvas.add(bottomEdgeLabel);
    }
  } else {
    // For vertical worktops (North or South)
    // Always place left label on the left side and right label on the right side
    // regardless of direction (North or South)

    // Left edge
    if (edgeLabelsData.left) {
      const leftEdgeLabel = new fabric.Text(
        edgeLabelsData.left === "inner" ? "Inner" : "Outer",
        {
          // Always use the left side of the polygon (points[0] and points[3])
          left: Math.min(points[0].x, points[3].x) - 30,
          top: (points[0].y + points[3].y) / 2,
          fontSize: 10,
          fill: edgeLabelsData.left === "inner" ? "blue" : "red",
          backgroundColor: "rgba(255,255,255,0.7)",
          selectable: false,
          evented: false,
        }
      );
      canvas.add(leftEdgeLabel);
    }

    // Right edge
    if (edgeLabelsData.right) {
      const rightEdgeLabel = new fabric.Text(
        edgeLabelsData.right === "inner" ? "Inner" : "Outer",
        {
          // Always use the right side of the polygon (points[1] and points[2])
          left: Math.max(points[1].x, points[2].x) + 5,
          top: (points[1].y + points[2].y) / 2,
          fontSize: 10,
          fill: edgeLabelsData.right === "inner" ? "blue" : "red",
          backgroundColor: "rgba(255,255,255,0.7)",
          selectable: false,
          evented: false,
        }
      );
      canvas.add(rightEdgeLabel);
    }
  }

  // Render the canvas to show the updated labels
  canvas.renderAll();
}
