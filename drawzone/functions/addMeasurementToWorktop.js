/**
 * Add measurement text to the worktop on the canvas
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {Array} points - Array of points defining the worktop polygon
 * @param {string} direction - Direction of the worktop (N, S, E, W)
 * @param {number} lengthMm - Length of the worktop in millimeters
 * @param {boolean} isPermanent - Whether this is a permanent measurement (default: false)
 * @returns {Object} The created measurement text object
 */
export function addMeasurementToWorktop(
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

  // For non-first segments, add the worktop width (600mm)
  let displayLengthMm = lengthMm;

  // Get state to check if there's a previous worktop
  const state = window.state;

  // Add 600mm if there's a previous worktop, regardless of isFirstSegment flag
  if (state.previousWorktop) {
    displayLengthMm += 600; // Add 600mm (worktop width)
  }

  // Create the measurement text
  let measurementText = new fabric.Text(`${displayLengthMm}mm`, {
    fontSize: 16,
    // Removed bold
    fill: "#444444", // Dark grey for all segments
    backgroundColor: "rgba(255, 255, 255, 0.7)", // Semi-transparent white background
    selectable: false,
    evented: false,
    originX: "center",
    originY: "center",
    measurementText: true, // Custom property to identify measurement elements
    permanentMeasurement: isPermanent, // Flag to identify permanent measurements
  });

  // Position the text based on the direction and which edge is outer
  let textX, textY;

  // Calculate center of the worktop
  const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
  const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

  // Get edge labels from state to determine which edge is outer
  const edgeLabels = state.currentEdgeLabels;

  // Check if we're in a turn scenario for the first segment
  const inTurn = state.previousTurnDirection !== null;
  console.log("In turn:", inTurn);
  console.log("isFirstSegment:", state.isFirstSegment);

  if (direction === "E" || direction === "W") {
    // For horizontal worktops (East or West)
    textX = centerX;

    // Special handling for first segment
    if (state.isFirstSegment && !inTurn) {
      // For the very first drawing action, default to top
      textY = Math.min(points[0].y, points[1].y) - 25; // 25px above the top edge
    } else {
      // For non-first segments or first segments in a turn
      // Check which edge is outer and position accordingly
      if (edgeLabels && edgeLabels.bottom === "outer") {
        // Position text below the worktop if bottom is outer
        textY = Math.max(points[2].y, points[3].y) + 25; // 25px below the bottom edge
      } else {
        // Default to top (either top is outer or no edge labels available)
        textY = Math.min(points[0].y, points[1].y) - 25; // 25px above the top edge
      }
    }

    measurementText.set({
      left: textX,
      top: textY,
      originX: "center",
      originY: "center",
      angle: 0, // No rotation for horizontal measurements
    });
  } else {
    // For vertical worktops (North or South)
    textY = centerY;

    // Special handling for first segment
    if (state.isFirstSegment && !inTurn) {
      // For the very first drawing action, default to left
      textX = Math.min(points[0].x, points[3].x) - 25; // 25px to the left of the left edge
    } else {
      // For non-first segments or first segments in a turn
      // Check which edge is outer and position accordingly
      if (edgeLabels && edgeLabels.right === "outer") {
        // Position text to the right of the worktop if right is outer
        textX = Math.max(points[1].x, points[2].x) + 25; // 25px to the right of the right edge
      } else {
        // Default to left (either left is outer or no edge labels available)
        textX = Math.min(points[0].x, points[3].x) - 25; // 25px to the left of the left edge
      }
    }

    // Create a rotated text for vertical measurements
    measurementText.set({
      left: textX,
      top: textY,
      originX: "center",
      originY: "center",
    });
  }

  // Position the text
  measurementText.set({
    left: textX,
    top: textY,
  });

  // If vertical, rotate the text (with correct orientation)
  if (direction === "N" || direction === "S") {
    // For North/South, use 90 degrees instead of -90 to fix upside down text
    measurementText.set({
      angle: 90,
    });
  }

  // Add the text to the canvas
  canvas.add(measurementText);

  // Bring the text to the front
  measurementText.bringToFront();

  // Force canvas to render
  canvas.renderAll();

  // Return the measurement text object so it can be stored with the worktop
  return measurementText;
}
