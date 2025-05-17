/**
 * Add measurement text to all edges of the worktop on the canvas
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {Array} points - Array of points defining the worktop polygon
 * @param {string} direction - Direction of the worktop (N, S, E, W)
 * @param {number} lengthMm - Length of the worktop in millimeters
 * @param {boolean} isPermanent - Whether this is a permanent measurement (default: false)
 * @param {Object} edgeLabels - Object containing edge labels (inner/outer)
 * @returns {Array} Array of created measurement text objects
 */
export function addAllEdgeMeasurements(
  canvas,
  points,
  direction,
  lengthMm,
  isPermanent = false,
  edgeLabels = null
) {
  // Only remove temporary (non-permanent) measurements
  // This allows permanent measurements to stay on the canvas
  const objects = canvas.getObjects();
  const temporaryMeasurements = objects.filter(
    (obj) => obj.measurementText === true && !obj.permanentMeasurement
  );

  temporaryMeasurements.forEach((obj) => {
    canvas.remove(obj);
  });

  // Get state to check if there's a previous worktop
  const state = window.state;

  // Calculate the outer length (for outer edges)
  let outerLengthMm = lengthMm;

  // For preview worktops, we use a simple rule: add 600mm if there's a previous worktop
  if (!isPermanent && state.previousWorktop) {
    outerLengthMm += 600; // Add 600mm (worktop width)
  }

  // For permanent worktops, we need to check if this is an outer edge
  // If it's an inner edge, we need to deduct 600mm for each connected worktop
  // This is only relevant for permanent measurements (finalized worktops)
  if (isPermanent) {
    // For now, we'll use the same logic as preview worktops
    // This will be enhanced in the future to check for connected worktops
    if (state.previousWorktop) {
      outerLengthMm += 600; // Add 600mm (worktop width)
    }
  }

  // Calculate the inner length (for inner edges)
  // Inner edges are always shorter than outer edges by 600mm
  // This applies to all worktops, including the first segment
  let innerLengthMm = lengthMm - 600;

  // Ensure inner length is not negative
  if (innerLengthMm < 0) {
    innerLengthMm = 0;
  }

  // Array to store all measurement text objects
  const measurementTexts = [];

  // Calculate center of the worktop
  const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
  const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

  // Add measurements based on direction
  if (direction === "E" || direction === "W") {
    // For horizontal worktops (East or West)

    // Top edge measurement (length)
    // Use inner or outer length based on edge label
    const topLength =
      edgeLabels && edgeLabels.top === "inner" ? innerLengthMm : outerLengthMm;
    const topMeasurement = new fabric.Text(`${topLength}mm`, {
      fontSize: 16,
      fill: "#444444", // Dark grey
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      selectable: false,
      evented: false,
      originX: "center",
      originY: "center",
      measurementText: true,
      permanentMeasurement: isPermanent,
      left: centerX,
      top: Math.min(points[0].y, points[1].y) - 25, // 25px above the top edge
      angle: 0,
      edge: "top",
      isInnerEdge: edgeLabels && edgeLabels.top === "inner",
    });
    canvas.add(topMeasurement);
    topMeasurement.bringToFront();
    measurementTexts.push(topMeasurement);

    // Bottom edge measurement (length)
    // Use inner or outer length based on edge label
    const bottomLength =
      edgeLabels && edgeLabels.bottom === "inner"
        ? innerLengthMm
        : outerLengthMm;
    const bottomMeasurement = new fabric.Text(`${bottomLength}mm`, {
      fontSize: 16,
      fill: "#444444", // Dark grey
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      selectable: false,
      evented: false,
      originX: "center",
      originY: "center",
      measurementText: true,
      permanentMeasurement: isPermanent,
      left: centerX,
      top: Math.max(points[2].y, points[3].y) + 25, // 25px below the bottom edge
      angle: 0,
      edge: "bottom",
      isInnerEdge: edgeLabels && edgeLabels.bottom === "inner",
    });
    canvas.add(bottomMeasurement);
    bottomMeasurement.bringToFront();
    measurementTexts.push(bottomMeasurement);

    // We don't add width measurements (600mm) on the left and right edges
  } else {
    // For vertical worktops (North or South)

    // Left edge measurement (length)
    // Use inner or outer length based on edge label
    const leftLength =
      edgeLabels && edgeLabels.left === "inner" ? innerLengthMm : outerLengthMm;
    const leftMeasurement = new fabric.Text(`${leftLength}mm`, {
      fontSize: 16,
      fill: "#444444", // Dark grey
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      selectable: false,
      evented: false,
      originX: "center",
      originY: "center",
      measurementText: true,
      permanentMeasurement: isPermanent,
      left: Math.min(points[0].x, points[3].x) - 25, // 25px to the left of the left edge
      top: centerY,
      angle: 90, // Rotate for vertical display
      edge: "left",
      isInnerEdge: edgeLabels && edgeLabels.left === "inner",
    });
    canvas.add(leftMeasurement);
    leftMeasurement.bringToFront();
    measurementTexts.push(leftMeasurement);

    // Right edge measurement (length)
    // Use inner or outer length based on edge label
    const rightLength =
      edgeLabels && edgeLabels.right === "inner"
        ? innerLengthMm
        : outerLengthMm;
    const rightMeasurement = new fabric.Text(`${rightLength}mm`, {
      fontSize: 16,
      fill: "#444444", // Dark grey
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      selectable: false,
      evented: false,
      originX: "center",
      originY: "center",
      measurementText: true,
      permanentMeasurement: isPermanent,
      left: Math.max(points[1].x, points[2].x) + 25, // 25px to the right of the right edge
      top: centerY,
      angle: 90, // Rotate for vertical display
      edge: "right",
      isInnerEdge: edgeLabels && edgeLabels.right === "inner",
    });
    canvas.add(rightMeasurement);
    rightMeasurement.bringToFront();
    measurementTexts.push(rightMeasurement);

    // We don't add width measurements (600mm) on the top and bottom edges
  }

  // Return the array of measurement text objects
  return measurementTexts;
}
