/**
 * Add measurement text to all edges of the worktop on the canvas
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {Array} points - Array of points defining the worktop polygon
 * @param {string} direction - Direction of the worktop (N, S, E, W)
 * @param {number} lengthMm - Length of the worktop in millimeters
 * @param {number} widthMm - Width of the worktop in millimeters (default: 600)
 * @param {boolean} isPermanent - Whether this is a permanent measurement (default: false)
 * @returns {Array} Array of created measurement text objects
 */
export function addAllEdgeMeasurements(
  canvas,
  points,
  direction,
  lengthMm,
  widthMm = 600,
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

  // For non-first segments, add the worktop width (600mm)
  let displayLengthMm = lengthMm;
  if (state.previousWorktop) {
    displayLengthMm += 600; // Add 600mm (worktop width)
  }

  // Array to store all measurement text objects
  const measurementTexts = [];

  // Get edge labels from parameter or state (for future use if needed)
  // const edgeLabels = customEdgeLabels || state.currentEdgeLabels;

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

    // Left edge measurement (width)
    const leftMeasurement = new fabric.Text(`${widthMm}mm`, {
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

    // Right edge measurement (width)
    const rightMeasurement = new fabric.Text(`${widthMm}mm`, {
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

    // Top edge measurement (width)
    const topMeasurement = new fabric.Text(`${widthMm}mm`, {
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

    // Bottom edge measurement (width)
    const bottomMeasurement = new fabric.Text(`${widthMm}mm`, {
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
  }

  // Force canvas to render
  canvas.renderAll();

  // Return all measurement text objects
  return measurementTexts;
}

/**
 * Add measurement text to the worktop on the canvas (legacy function for backward compatibility)
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {Array} points - Array of points defining the worktop polygon
 * @param {string} direction - Direction of the worktop (N, S, E, W)
 * @param {number} lengthMm - Length of the worktop in millimeters
 * @param {boolean} isPermanent - Whether this is a permanent measurement (default: false)
 * @param {Object} customEdgeLabels - Optional edge labels to use instead of state.currentEdgeLabels
 * @returns {Object} The created measurement text object
 */
export function addMeasurementToWorktop(
  canvas,
  points,
  direction,
  lengthMm,
  isPermanent = false,
  customEdgeLabels = null
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

  // Get edge labels from parameter or state to determine which edge is outer
  const edgeLabels = customEdgeLabels || state.currentEdgeLabels;

  // Check if we're in a turn scenario for the first segment
  const inTurn = state.previousTurnDirection !== null;

  if (direction === "E" || direction === "W") {
    // For horizontal worktops (East or West)
    textX = centerX;

    // Check which edge is outer and position accordingly, even for first segment
    if (edgeLabels && edgeLabels.bottom === "outer") {
      // Position text below the worktop if bottom is outer
      textY = Math.max(points[2].y, points[3].y) + 25; // 25px below the bottom edge
    } else if (edgeLabels && edgeLabels.top === "outer") {
      // Position text above the worktop if top is outer
      textY = Math.min(points[0].y, points[1].y) - 25; // 25px above the top edge
    } else {
      // Default positioning if no edge labels are available
      // For first segment without turn, default to the top (since that's typically outer for horizontal)
      if (state.isFirstSegment && !inTurn) {
        textY = Math.min(points[0].y, points[1].y) - 25; // 25px above the top edge
      } else {
        // Default to top for other cases
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

    // Check which edge is outer and position accordingly, even for first segment
    if (edgeLabels && edgeLabels.right === "outer") {
      // Position text to the right of the worktop if right is outer
      textX = Math.max(points[1].x, points[2].x) + 25; // 25px to the right of the right edge
    } else if (edgeLabels && edgeLabels.left === "outer") {
      // Position text to the left of the worktop if left is outer
      textX = Math.min(points[0].x, points[3].x) - 25; // 25px to the left of the left edge
    } else {
      // Default positioning if no edge labels are available
      // For first segment without turn, default to the right side (since that's typically outer for vertical)
      if (state.isFirstSegment && !inTurn) {
        textX = Math.max(points[1].x, points[2].x) + 25; // 25px to the right of the right edge
      } else {
        // Default to left side for other cases
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
