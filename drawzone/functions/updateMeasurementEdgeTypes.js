/**
 * Update the isInnerEdge property of measurement objects when edge labels change
 * and update the measurement text to show the correct inner/outer length
 * @param {Object} worktop - The worktop object containing measurement objects
 * @param {Object} canvas - Optional Fabric.js canvas instance for rendering
 */
export function updateMeasurementEdgeTypes(worktop, canvas = null) {
  // Skip if no measurement objects
  if (!worktop.measurementObjects || worktop.measurementObjects.length === 0) {
    return;
  }

  // Get the edge labels
  const edgeLabels = worktop.edgeLabels;
  if (!edgeLabels) {
    return;
  }

  // Calculate length in pixels
  let lengthPx;
  if (worktop.direction === "E" || worktop.direction === "W") {
    // For horizontal worktops (East or West)
    lengthPx = Math.abs(worktop.adjustedEnd.x - worktop.adjustedStart.x);
  } else {
    // For vertical worktops (North or South)
    lengthPx = Math.abs(worktop.adjustedEnd.y - worktop.adjustedStart.y);
  }

  // Convert to millimeters (1 pixel = 5mm)
  let outerLengthMm = Math.round(lengthPx * 5);

  // Add 600mm if not the first segment (for outer edges)
  if (!worktop.isFirstSegment) {
    outerLengthMm += 600; // Add 600mm (worktop width)
  }

  // Count the number of connections for this worktop
  let connectionPointCount = 0;
  if (worktop.connections) {
    // Check each edge for connections and log details
    ["left", "right", "top", "bottom"].forEach((edge) => {
      if (worktop.connections[edge] && worktop.connections[edge].connectedTo) {
        connectionPointCount++;
        console.log(
          `Worktop ${worktop.label}: Connection found on ${edge} edge to Worktop ${worktop.connections[edge].connectedTo.label}`
        );
      }
    });
  }

  // Each connection has 2 connection points (one on each worktop)
  // So divide by 2 to get the actual number of connections
  let connectionCount = Math.ceil(connectionPointCount / 2);

  // For the last segment, subtract 1 from the connection count
  // This is a workaround for the issue where the last segment always shows 2 connections
  if (worktop.isLastSegment && connectionCount > 1) {
    console.log(
      `Worktop ${
        worktop.label
      }: Last segment - reducing connection count from ${connectionCount} to ${
        connectionCount - 1
      }`
    );
    connectionCount -= 1;
  }

  console.log(
    `Worktop ${worktop.label}: Connection points: ${connectionPointCount}, Actual connections: ${connectionCount}`
  );

  // For worktops in a sequence (like B in A-B-C), force the connection count to 2
  // This is a temporary fix until we properly detect connections
  if (worktop.label !== "A" && !worktop.isLastSegment) {
    // If this is a middle segment (not A and not the last segment), it should have 2 connections
    if (connectionCount < 2) {
      console.log(
        `Worktop ${worktop.label}: Forcing connection count from ${connectionCount} to 2 (middle segment)`
      );
      connectionCount = 2;
    }
  }

  // For the last segment, force the connection count to 1
  if (worktop.isLastSegment && worktop.label !== "A") {
    if (connectionCount < 1) {
      console.log(
        `Worktop ${worktop.label}: Forcing connection count from ${connectionCount} to 1 (last segment)`
      );
      connectionCount = 1;
    }
  }

  console.log(
    `Worktop ${worktop.label}: Found ${connectionCount} connections, isFirstSegment: ${worktop.isFirstSegment}`
  );

  // Calculate inner length based on number of connections
  // Each connection reduces the inner length by 600mm
  // If there are no connections, default to 600mm less than outer
  const reductionAmount = connectionCount > 0 ? connectionCount * 600 : 600;
  const innerLengthMm = Math.max(0, outerLengthMm - reductionAmount);

  console.log(
    `Worktop ${worktop.label}: Calculated outer=${outerLengthMm}mm, inner=${innerLengthMm}mm`
  );

  // Update each measurement object
  for (const measurementObj of worktop.measurementObjects) {
    const edge = measurementObj.edge;

    // Update the isInnerEdge property based on the current edge labels
    let isInnerEdge = false;
    if (edge === "top" && edgeLabels.top) {
      isInnerEdge = edgeLabels.top === "inner";
    } else if (edge === "bottom" && edgeLabels.bottom) {
      isInnerEdge = edgeLabels.bottom === "inner";
    } else if (edge === "left" && edgeLabels.left) {
      isInnerEdge = edgeLabels.left === "inner";
    } else if (edge === "right" && edgeLabels.right) {
      isInnerEdge = edgeLabels.right === "inner";
    }

    // Update the isInnerEdge property
    measurementObj.isInnerEdge = isInnerEdge;

    // Use inner length for inner edges, outer length for outer edges
    const displayLength = isInnerEdge ? innerLengthMm : outerLengthMm;

    // Update the measurement text
    measurementObj.set({
      text: `${displayLength}mm`,
    });

    console.log(
      `Updated ${edge} edge measurement for worktop ${worktop.label}: isInnerEdge = ${isInnerEdge}, length = ${displayLength}mm`
    );
  }

  // Always render the canvas if provided
  if (canvas) {
    console.log(
      `Rendering canvas for worktop ${worktop.label} with updated measurements`
    );
    canvas.renderAll();
  } else {
    console.warn(
      `No canvas provided for worktop ${worktop.label}, measurements won't be visible until next render`
    );
    // Try to get the canvas from the global scope
    if (window.canvas) {
      console.log(`Using global canvas for worktop ${worktop.label}`);
      window.canvas.renderAll();
    }
  }

  // Debug output for connection count and reduction amount
  console.log(
    `DEBUG: Worktop ${worktop.label} - ConnectionCount: ${connectionCount}, Reduction: ${reductionAmount}mm, Inner: ${innerLengthMm}mm, Outer: ${outerLengthMm}mm`
  );
}
