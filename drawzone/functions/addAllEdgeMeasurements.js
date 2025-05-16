/**
 * Add measurement text to all edges of the worktop on the canvas
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {Array} points - Array of points defining the worktop polygon
 * @param {string} direction - Direction of the worktop (N, S, E, W)
 * @param {number} lengthMm - Length of the worktop in millimeters
 * @param {boolean} isPermanent - Whether this is a permanent measurement (default: false)
 * @returns {Array} Array of created measurement text objects
 */
export function addAllEdgeMeasurements(
  canvas,
  points,
  direction,
  lengthMm,
  isPermanent = false
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

  // Calculate the display length based on connections
  let displayLengthMm = lengthMm;

  // For preview worktops, we use a simple rule: add 600mm if there's a previous worktop
  if (!isPermanent && state.previousWorktop) {
    displayLengthMm += 600; // Add 600mm (worktop width)
  }

  // For permanent worktops, we need to check if this is an outer edge
  // If it's an inner edge, we need to deduct 600mm for each connected worktop
  // This is only relevant for permanent measurements (finalized worktops)
  if (isPermanent) {
    // For now, we'll use the same logic as preview worktops
    // This will be enhanced in the future to check for connected worktops
    if (state.previousWorktop) {
      displayLengthMm += 600; // Add 600mm (worktop width)
    }
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
    const topMeasurement = new fabric.Text(`${displayLengthMm}mm`, {
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
    });
    canvas.add(topMeasurement);
    topMeasurement.bringToFront();
    measurementTexts.push(topMeasurement);

    // Bottom edge measurement (length)
    const bottomMeasurement = new fabric.Text(`${displayLengthMm}mm`, {
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
    });
    canvas.add(bottomMeasurement);
    bottomMeasurement.bringToFront();
    measurementTexts.push(bottomMeasurement);

    // We don't add width measurements (600mm) on the left and right edges
  } else {
    // For vertical worktops (North or South)

    // Left edge measurement (length)
    const leftMeasurement = new fabric.Text(`${displayLengthMm}mm`, {
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
    });
    canvas.add(leftMeasurement);
    leftMeasurement.bringToFront();
    measurementTexts.push(leftMeasurement);

    // Right edge measurement (length)
    const rightMeasurement = new fabric.Text(`${displayLengthMm}mm`, {
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
    });
    canvas.add(rightMeasurement);
    rightMeasurement.bringToFront();
    measurementTexts.push(rightMeasurement);

    // We don't add width measurements (600mm) on the top and bottom edges
  }

  // Return the array of measurement text objects
  return measurementTexts;
}
