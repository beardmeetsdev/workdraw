import { updateMeasurementEdgeTypes } from "./updateMeasurementEdgeTypes.js";

/**
 * Update measurements for all worktops after connections are detected
 * @param {Object} canvas - Fabric.js canvas instance
 */
export function updateMeasurementsAfterConnections(canvas) {
  // Get state to access worktops
  const state = window.state;

  // Process each worktop
  for (const worktop of state.worktops) {
    // Skip if no measurement objects
    if (
      !worktop.measurementObjects ||
      worktop.measurementObjects.length === 0
    ) {
      continue;
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
    let lengthMm = Math.round(lengthPx * 5);

    // Add 600mm if not the first segment (for outer edges)
    if (!worktop.isFirstSegment) {
      lengthMm += 600; // Add 600mm (worktop width)
    }

    // Check for inner edges and connections
    const edgeLabels = worktop.edgeLabels;

    // For horizontal worktops (East or West)
    if (worktop.direction === "E" || worktop.direction === "W") {
      // Check if top or bottom is inner
      if (edgeLabels && edgeLabels.top === "inner") {
        // Count connections for top edge
        let connectionCount = 0;
        if (worktop.connections.top && worktop.connections.top.connectedTo) {
          connectionCount++;
        }
        // Deduct 600mm for each connection on inner edge
        if (connectionCount > 0) {
          lengthMm -= 600 * connectionCount;
          console.log(
            `Worktop ${
              worktop.label
            }: Inner top edge has ${connectionCount} connections, deducting ${
              600 * connectionCount
            }mm`
          );
        }
      } else if (edgeLabels && edgeLabels.bottom === "inner") {
        // Count connections for bottom edge
        let connectionCount = 0;
        if (
          worktop.connections.bottom &&
          worktop.connections.bottom.connectedTo
        ) {
          connectionCount++;
        }
        // Deduct 600mm for each connection on inner edge
        if (connectionCount > 0) {
          lengthMm -= 600 * connectionCount;
          console.log(
            `Worktop ${
              worktop.label
            }: Inner bottom edge has ${connectionCount} connections, deducting ${
              600 * connectionCount
            }mm`
          );
        }
      }
    }
    // For vertical worktops (North or South)
    else {
      // Check if left or right is inner
      if (edgeLabels && edgeLabels.left === "inner") {
        // Count connections for left edge
        let connectionCount = 0;
        if (worktop.connections.left && worktop.connections.left.connectedTo) {
          connectionCount++;
        }
        // Deduct 600mm for each connection on inner edge
        if (connectionCount > 0) {
          lengthMm -= 600 * connectionCount;
          console.log(
            `Worktop ${
              worktop.label
            }: Inner left edge has ${connectionCount} connections, deducting ${
              600 * connectionCount
            }mm`
          );
        }
      } else if (edgeLabels && edgeLabels.right === "inner") {
        // Count connections for right edge
        let connectionCount = 0;
        if (
          worktop.connections.right &&
          worktop.connections.right.connectedTo
        ) {
          connectionCount++;
        }
        // Deduct 600mm for each connection on inner edge
        if (connectionCount > 0) {
          lengthMm -= 600 * connectionCount;
          console.log(
            `Worktop ${
              worktop.label
            }: Inner right edge has ${connectionCount} connections, deducting ${
              600 * connectionCount
            }mm`
          );
        }
      }
    }

    // Count connection points
    let connectionPointCount = 0;
    if (worktop.connections) {
      // Check each edge for connections
      ["left", "right", "top", "bottom"].forEach((edge) => {
        if (
          worktop.connections[edge] &&
          worktop.connections[edge].connectedTo
        ) {
          connectionPointCount++;
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

    // Calculate inner length based on number of connections
    // Each connection reduces the inner length by 600mm
    // If there are no connections, default to 600mm less than outer
    const reductionAmount = connectionCount > 0 ? connectionCount * 600 : 600;
    const innerLengthMm = Math.max(0, lengthMm - reductionAmount);

    // Log the calculated lengths for debugging
    console.log(
      `Worktop ${worktop.label}: Outer length = ${lengthMm}mm, Inner length = ${innerLengthMm}mm`
    );

    // Update the measurement edge types to match the current edge labels
    // This will also update the measurement text on the canvas with the correct inner/outer lengths
    updateMeasurementEdgeTypes(worktop, canvas);
  }

  // Render the canvas to show updated measurements
  canvas.renderAll();
}
