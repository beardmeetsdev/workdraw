/**
 * connections.js
 * Handles connection detection and management between worktops
 */

import { state } from './state.js';
import { getCornerCoordinates } from './utils.js';

/**
 * Create edge object with coordinates and properties
 * @param {Object} worktop - The worktop object
 * @param {string} side - The side of the worktop (left, right, top, bottom)
 * @returns {Object} - The edge object
 */
function createEdge(worktop, side) {
  // All worktops should have the edges structure, but check just in case
  if (worktop.edges && worktop.edges[side]) {
    const edge = worktop.edges[side];
    const { x1, y1, x2, y2 } = edge.adjusted;

    // Determine direction and length
    const direction =
      side === "top" || side === "bottom" ? "horizontal" : "vertical";
    const length =
      direction === "horizontal" ? Math.abs(x2 - x1) : Math.abs(y2 - y1);

    // Determine corners
    let corner1, corner2;
    switch (side) {
      case "left":
        corner1 = "TL"; // Top-Left
        corner2 = "BL"; // Bottom-Left
        break;
      case "right":
        corner1 = "TR"; // Top-Right
        corner2 = "BR"; // Bottom-Right
        break;
      case "top":
        corner1 = "TL"; // Top-Left
        corner2 = "TR"; // Top-Right
        break;
      case "bottom":
        corner1 = "BL"; // Bottom-Left
        corner2 = "BR"; // Bottom-Right
        break;
    }

    return {
      x1,
      y1,
      x2,
      y2,
      direction,
      length,
      side,
      corner1,
      corner2,
    };
  }

  // This is a fallback for backward compatibility
  // All new worktops should have the edges structure
  console.warn(`Worktop missing edges structure for side: ${side}`);
  
  let x1, y1, x2, y2, direction, length;
  let corner1, corner2;

  switch (side) {
    case "left":
      x1 = worktop.x;
      y1 = worktop.y;
      x2 = worktop.x;
      y2 = worktop.y + worktop.height;
      direction = "vertical";
      length = worktop.height;
      corner1 = "TL"; // Top-Left
      corner2 = "BL"; // Bottom-Left
      break;
    case "right":
      x1 = worktop.x + worktop.width;
      y1 = worktop.y;
      x2 = worktop.x + worktop.width;
      y2 = worktop.y + worktop.height;
      direction = "vertical";
      length = worktop.height;
      corner1 = "TR"; // Top-Right
      corner2 = "BR"; // Bottom-Right
      break;
    case "top":
      x1 = worktop.x;
      y1 = worktop.y;
      x2 = worktop.x + worktop.width;
      y2 = worktop.y;
      direction = "horizontal";
      length = worktop.width;
      corner1 = "TL"; // Top-Left
      corner2 = "TR"; // Top-Right
      break;
    case "bottom":
      x1 = worktop.x;
      y1 = worktop.y + worktop.height;
      x2 = worktop.x + worktop.width;
      y2 = worktop.y + worktop.height;
      direction = "horizontal";
      length = worktop.width;
      corner1 = "BL"; // Bottom-Left
      corner2 = "BR"; // Bottom-Right
      break;
  }

  return {
    x1,
    y1,
    x2,
    y2,
    direction,
    length,
    side,
    corner1,
    corner2,
  };
}

/**
 * Function to adjust edge coordinates based on connections
 * @param {Object} worktop - The worktop object
 * @param {string} edge - The edge to adjust
 */
function adjustEdgeCoordinates(worktop, edge) {
  if (!worktop.edges || !worktop.edges[edge].connectedTo) return;

  const connection = worktop.edges[edge].connectionSegment;
  if (!connection.start || !connection.end) return;

  // Get the original edge coordinates
  const original = worktop.edges[edge].original;
  // Use the current adjusted coordinates as the starting point
  // This allows multiple adjustments to the same edge
  const adjusted = { ...worktop.edges[edge].adjusted };

  // Determine if this is a horizontal or vertical edge
  const isHorizontal = edge === "top" || edge === "bottom";

  // For horizontal edges (top, bottom)
  if (isHorizontal) {
    // Check if connection is at the left end of original or adjusted edge
    if (
      Math.abs(connection.start.x - original.x1) < 1 ||
      Math.abs(connection.start.x - adjusted.x1) < 1
    ) {
      // Adjust the left end of the edge
      adjusted.x1 = connection.end.x;
    }
    // Check if connection is at the right end of original or adjusted edge
    else if (
      Math.abs(connection.end.x - original.x2) < 1 ||
      Math.abs(connection.end.x - adjusted.x2) < 1
    ) {
      // Adjust the right end of the edge
      adjusted.x2 = connection.start.x;
    }
    // Check if connection is at the right end (reversed order) of original or adjusted edge
    else if (
      Math.abs(connection.start.x - original.x2) < 1 ||
      Math.abs(connection.start.x - adjusted.x2) < 1
    ) {
      // Adjust the right end of the edge
      adjusted.x2 = connection.end.x;
    }
    // Check if connection is at the left end (reversed order) of original or adjusted edge
    else if (
      Math.abs(connection.end.x - original.x1) < 1 ||
      Math.abs(connection.end.x - adjusted.x1) < 1
    ) {
      // Adjust the left end of the edge
      adjusted.x1 = connection.start.x;
    }
    // Connection is in the middle - don't adjust
  }
  // For vertical edges (left, right)
  else {
    // Check if connection is at the top end of original or adjusted edge
    if (
      Math.abs(connection.start.y - original.y1) < 1 ||
      Math.abs(connection.start.y - adjusted.y1) < 1
    ) {
      // Adjust the top end of the edge
      adjusted.y1 = connection.end.y;
    }
    // Check if connection is at the bottom end of original or adjusted edge
    else if (
      Math.abs(connection.end.y - original.y2) < 1 ||
      Math.abs(connection.end.y - adjusted.y2) < 1
    ) {
      // Adjust the bottom end of the edge
      adjusted.y2 = connection.start.y;
    }
    // Check if connection is at the bottom end (reversed order) of original or adjusted edge
    else if (
      Math.abs(connection.start.y - original.y2) < 1 ||
      Math.abs(connection.start.y - adjusted.y2) < 1
    ) {
      // Adjust the bottom end of the edge
      adjusted.y2 = connection.end.y;
    }
    // Check if connection is at the top end (reversed order) of original or adjusted edge
    else if (
      Math.abs(connection.end.y - original.y1) < 1 ||
      Math.abs(connection.end.y - adjusted.y1) < 1
    ) {
      // Adjust the top end of the edge
      adjusted.y1 = connection.start.y;
    }
    // Connection is in the middle - don't adjust
  }

  // Update the adjusted coordinates
  worktop.edges[edge].adjusted = adjusted;
}

/**
 * Function to check if two edges are connected
 * @param {Object} edgeA - The first edge
 * @param {Object} edgeB - The second edge
 * @returns {Object|null} - Connection information or null if not connected
 */
function checkEdgeConnection(edgeA, edgeB) {
  // For edges to be connected, they must be parallel and have some overlap
  // OR they must form a corner (perpendicular and meet at a point)

  // Case 1: Parallel edges with overlap
  if (edgeA.direction === edgeB.direction) {
    // For horizontal edges
    if (edgeA.direction === "horizontal") {
      // Edges must be at the same y-coordinate (or very close)
      if (Math.abs(edgeA.y1 - edgeB.y1) > 1) {
        return null;
      }

      // Check for x-overlap
      const aLeft = Math.min(edgeA.x1, edgeA.x2);
      const aRight = Math.max(edgeA.x1, edgeA.x2);
      const bLeft = Math.min(edgeB.x1, edgeB.x2);
      const bRight = Math.max(edgeB.x1, edgeB.x2);

      // No overlap
      if (aRight < bLeft || bRight < aLeft) {
        return null;
      }

      // There is overlap, calculate the overlap segment
      const overlapStart = Math.max(aLeft, bLeft);
      const overlapEnd = Math.min(aRight, bRight);

      // Determine which corners are involved in the connection
      let cornerA, cornerB;

      // For edge A
      if (Math.abs(overlapStart - aLeft) < 1) {
        cornerA = edgeA.corner1; // Left corner
      } else if (Math.abs(overlapEnd - aRight) < 1) {
        cornerA = edgeA.corner2; // Right corner
      } else {
        cornerA = "middle"; // Middle of the edge
      }

      // For edge B
      if (Math.abs(overlapStart - bLeft) < 1) {
        cornerB = edgeB.corner1; // Left corner
      } else if (Math.abs(overlapEnd - bRight) < 1) {
        cornerB = edgeB.corner2; // Right corner
      } else {
        cornerB = "middle"; // Middle of the edge
      }

      return {
        start: { x: overlapStart, y: edgeA.y1 },
        end: { x: overlapEnd, y: edgeA.y1 },
        cornerA: cornerA,
        cornerB: cornerB,
      };
    }
    // For vertical edges
    else {
      // Edges must be at the same x-coordinate (or very close)
      if (Math.abs(edgeA.x1 - edgeB.x1) > 1) {
        return null;
      }

      // Check for y-overlap
      const aTop = Math.min(edgeA.y1, edgeA.y2);
      const aBottom = Math.max(edgeA.y1, edgeA.y2);
      const bTop = Math.min(edgeB.y1, edgeB.y2);
      const bBottom = Math.max(edgeB.y1, edgeB.y2);

      // No overlap
      if (aBottom < bTop || bBottom < aTop) {
        return null;
      }

      // There is overlap, calculate the overlap segment
      const overlapStart = Math.max(aTop, bTop);
      const overlapEnd = Math.min(aBottom, bBottom);

      // Determine which corners are involved in the connection
      let cornerA, cornerB;

      // For edge A
      if (Math.abs(overlapStart - aTop) < 1) {
        cornerA = edgeA.corner1; // Top corner
      } else if (Math.abs(overlapEnd - aBottom) < 1) {
        cornerA = edgeA.corner2; // Bottom corner
      } else {
        cornerA = "middle"; // Middle of the edge
      }

      // For edge B
      if (Math.abs(overlapStart - bTop) < 1) {
        cornerB = edgeB.corner1; // Top corner
      } else if (Math.abs(overlapEnd - bBottom) < 1) {
        cornerB = edgeB.corner2; // Bottom corner
      } else {
        cornerB = "middle"; // Middle of the edge
      }

      return {
        start: { x: edgeA.x1, y: overlapStart },
        end: { x: edgeA.x1, y: overlapEnd },
        cornerA: cornerA,
        cornerB: cornerB,
      };
    }
  }
  // Case 2: Perpendicular edges forming a corner
  else {
    // One is horizontal, one is vertical
    let hEdge, vEdge, isEdgeAHorizontal;

    if (edgeA.direction === "horizontal") {
      hEdge = edgeA;
      vEdge = edgeB;
      isEdgeAHorizontal = true;
    } else {
      hEdge = edgeB;
      vEdge = edgeA;
      isEdgeAHorizontal = false;
    }

    // Check if the vertical edge's x-coordinate is within the horizontal edge's x-range
    const hLeft = Math.min(hEdge.x1, hEdge.x2);
    const hRight = Math.max(hEdge.x1, hEdge.x2);

    if (vEdge.x1 < hLeft || vEdge.x1 > hRight) {
      return null;
    }

    // Check if the horizontal edge's y-coordinate is within the vertical edge's y-range
    const vTop = Math.min(vEdge.y1, vEdge.y2);
    const vBottom = Math.max(vEdge.y1, vEdge.y2);

    if (hEdge.y1 < vTop || hEdge.y1 > vBottom) {
      return null;
    }

    // They form a corner, the connection point is at the intersection
    const cornerPoint = { x: vEdge.x1, y: hEdge.y1 };

    // Determine which corners are involved
    let cornerH, cornerV;

    // For horizontal edge
    if (Math.abs(vEdge.x1 - hLeft) < 1) {
      cornerH = hEdge.corner1; // Left corner
    } else if (Math.abs(vEdge.x1 - hRight) < 1) {
      cornerH = hEdge.corner2; // Right corner
    } else {
      cornerH = "middle"; // Middle of the edge
    }

    // For vertical edge
    if (Math.abs(hEdge.y1 - vTop) < 1) {
      cornerV = vEdge.corner1; // Top corner
    } else if (Math.abs(hEdge.y1 - vBottom) < 1) {
      cornerV = vEdge.corner2; // Bottom corner
    } else {
      cornerV = "middle"; // Middle of the edge
    }

    // For a corner connection, the start and end points are the same
    return {
      start: cornerPoint,
      end: cornerPoint,
      cornerA: isEdgeAHorizontal ? cornerH : cornerV,
      cornerB: isEdgeAHorizontal ? cornerV : cornerH,
    };
  }
}

/**
 * Function to detect and record connections between worktops
 */
function detectWorktopConnections() {
  // Reset all connections first
  for (const worktop of state.worktops) {
    // Reset old connections structure
    worktop.connections.left.connectedTo = null;
    worktop.connections.right.connectedTo = null;
    worktop.connections.top.connectedTo = null;
    worktop.connections.bottom.connectedTo = null;

    // Reset new edges structure
    if (worktop.edges) {
      worktop.edges.left.connectedTo = null;
      worktop.edges.right.connectedTo = null;
      worktop.edges.top.connectedTo = null;
      worktop.edges.bottom.connectedTo = null;

      // Reset adjusted coordinates to original
      worktop.edges.left.adjusted = { ...worktop.edges.left.original };
      worktop.edges.right.adjusted = { ...worktop.edges.right.original };
      worktop.edges.top.adjusted = { ...worktop.edges.top.original };
      worktop.edges.bottom.adjusted = { ...worktop.edges.bottom.original };
    }
  }

  // Reset connection points array
  state.connectionPoints = [];
  let nextConnectionLabel = "A";

  // Check each pair of worktops for connections
  for (let i = 0; i < state.worktops.length; i++) {
    const worktopA = state.worktops[i];

    for (let j = i + 1; j < state.worktops.length; j++) {
      const worktopB = state.worktops[j];

      // Check each edge of worktopA against each edge of worktopB
      const edgesA = ["left", "right", "top", "bottom"];
      const edgesB = ["left", "right", "top", "bottom"];

      for (const edgeA of edgesA) {
        for (const edgeB of edgesB) {
          // Get edge coordinates
          const edgeACoords = createEdge(worktopA, edgeA);
          const edgeBCoords = createEdge(worktopB, edgeB);

          // Check if these edges are connected
          const connection = checkEdgeConnection(edgeACoords, edgeBCoords);

          if (connection) {
            // We only want to label actual connection points between worktops
            // This means we need to check if this is a corner-to-corner or corner-to-edge connection
            // but NOT middle-to-middle connections

            let connectionLabel = null;

            // Only create connection points when at least one corner is involved
            // (not for middle-to-middle connections)
            if (
              connection.cornerA !== "middle" ||
              connection.cornerB !== "middle"
            ) {
              let connectionX, connectionY;

              // For point connections (like corner-to-corner), use the connection point
              if (
                connection.start.x === connection.end.x &&
                connection.start.y === connection.end.y
              ) {
                connectionX = connection.start.x;
                connectionY = connection.start.y;
              }
              // For segment connections, use one of the endpoints that corresponds to a corner
              else {
                // If cornerA is a real corner (not middle), use its coordinates
                if (connection.cornerA !== "middle") {
                  // Find the coordinates of the corner
                  const cornersA = getCornerCoordinates(worktopA);
                  connectionX = cornersA[connection.cornerA].x;
                  connectionY = cornersA[connection.cornerA].y;
                }
                // Otherwise use cornerB's coordinates
                else if (connection.cornerB !== "middle") {
                  // Find the coordinates of the corner
                  const cornersB = getCornerCoordinates(worktopB);
                  connectionX = cornersB[connection.cornerB].x;
                  connectionY = cornersB[connection.cornerB].y;
                }
              }

              // Check if this connection point already exists
              const existingPoint = state.connectionPoints.find(
                (cp) =>
                  Math.abs(cp.x - connectionX) < 2 &&
                  Math.abs(cp.y - connectionY) < 2
              );

              if (existingPoint) {
                connectionLabel = existingPoint.label;
              } else {
                // Create a new connection point
                connectionLabel = nextConnectionLabel;
                nextConnectionLabel = String.fromCharCode(
                  nextConnectionLabel.charCodeAt(0) + 1
                );

                state.connectionPoints.push({
                  x: connectionX,
                  y: connectionY,
                  label: connectionLabel,
                });
              }
            }

            // Record the connection for both worktops
            // Update the old connections structure
            worktopA.connections[edgeA] = {
              connectedTo: worktopB,
              connectedEdge: edgeB,
              connectionSegment: {
                start: { x: connection.start.x, y: connection.start.y },
                end: { x: connection.end.x, y: connection.end.y },
              },
              cornerA: connection.cornerA,
              cornerB: connection.cornerB,
              connectionLabel: connectionLabel,
            };

            worktopB.connections[edgeB] = {
              connectedTo: worktopA,
              connectedEdge: edgeA,
              connectionSegment: {
                start: { x: connection.start.x, y: connection.start.y },
                end: { x: connection.end.x, y: connection.end.y },
              },
              cornerA: connection.cornerB,
              cornerB: connection.cornerA,
              connectionLabel: connectionLabel,
            };

            // Update the new edges structure
            worktopA.edges[edgeA].connectedTo = worktopB;
            worktopA.edges[edgeA].connectedEdge = edgeB;
            worktopA.edges[edgeA].connectionSegment = {
              start: { x: connection.start.x, y: connection.start.y },
              end: { x: connection.end.x, y: connection.end.y },
            };
            worktopA.edges[edgeA].cornerA = connection.cornerA;
            worktopA.edges[edgeA].cornerB = connection.cornerB;
            worktopA.edges[edgeA].connectionLabel = connectionLabel;

            worktopB.edges[edgeB].connectedTo = worktopA;
            worktopB.edges[edgeB].connectedEdge = edgeA;
            worktopB.edges[edgeB].connectionSegment = {
              start: { x: connection.start.x, y: connection.start.y },
              end: { x: connection.end.x, y: connection.end.y },
            };
            worktopB.edges[edgeB].cornerA = connection.cornerB;
            worktopB.edges[edgeB].cornerB = connection.cornerA;
            worktopB.edges[edgeB].connectionLabel = connectionLabel;

            // Adjust the edge coordinates based on the connection
            adjustEdgeCoordinates(worktopA, edgeA);
            adjustEdgeCoordinates(worktopB, edgeB);
          }
        }
      }
    }
  }
}

// Export the connection functions
export {
  createEdge,
  adjustEdgeCoordinates,
  checkEdgeConnection,
  detectWorktopConnections
};
