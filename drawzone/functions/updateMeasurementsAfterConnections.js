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
    if (!worktop.measurementObjects || worktop.measurementObjects.length === 0) {
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
          console.log(`Worktop ${worktop.label}: Inner top edge has ${connectionCount} connections, deducting ${600 * connectionCount}mm`);
        }
      } else if (edgeLabels && edgeLabels.bottom === "inner") {
        // Count connections for bottom edge
        let connectionCount = 0;
        if (worktop.connections.bottom && worktop.connections.bottom.connectedTo) {
          connectionCount++;
        }
        // Deduct 600mm for each connection on inner edge
        if (connectionCount > 0) {
          lengthMm -= 600 * connectionCount;
          console.log(`Worktop ${worktop.label}: Inner bottom edge has ${connectionCount} connections, deducting ${600 * connectionCount}mm`);
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
          console.log(`Worktop ${worktop.label}: Inner left edge has ${connectionCount} connections, deducting ${600 * connectionCount}mm`);
        }
      } else if (edgeLabels && edgeLabels.right === "inner") {
        // Count connections for right edge
        let connectionCount = 0;
        if (worktop.connections.right && worktop.connections.right.connectedTo) {
          connectionCount++;
        }
        // Deduct 600mm for each connection on inner edge
        if (connectionCount > 0) {
          lengthMm -= 600 * connectionCount;
          console.log(`Worktop ${worktop.label}: Inner right edge has ${connectionCount} connections, deducting ${600 * connectionCount}mm`);
        }
      }
    }
    
    // Update all measurement objects with the new length
    for (const measurementObj of worktop.measurementObjects) {
      measurementObj.set({
        text: `${lengthMm}mm`
      });
    }
  }
  
  // Render the canvas to show updated measurements
  canvas.renderAll();
}
