/**
 * detectConnections.js
 * Handles detection of connections between worktops and updates measurements accordingly
 */

import { updateMeasurementsAfterConnections } from "./updateMeasurementsAfterConnections.js";

/**
 * Function to create an edge object for connection detection
 * @param {Object} worktop - The worktop object
 * @param {string} side - The side of the worktop ('left', 'right', 'top', 'bottom')
 * @returns {Object} Edge object with coordinates and metadata
 */
function createEdge(worktop, side) {
  // If the worktop has an edges structure, use it
  if (worktop.edges && worktop.edges[side]) {
    const edge = worktop.edges[side];
    const coords = edge.adjusted || edge.original;

    let x1 = coords.x1;
    let y1 = coords.y1;
    let x2 = coords.x2;
    let y2 = coords.y2;

    // Determine if this is a horizontal or vertical edge
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

  // Fallback for worktops without edges structure
  console.warn(`Worktop missing edges structure for side: ${side}`);
  return null;
}

/**
 * Function to check if two edges are connected
 * @param {Object} edgeA - The first edge
 * @param {Object} edgeB - The second edge
 * @returns {Object|null} - Connection information or null if not connected
 */
function checkEdgeConnection(edgeA, edgeB) {
  if (!edgeA || !edgeB) return null;

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

      // Determine the overlap segment
      const overlapStart = { x: Math.max(aLeft, bLeft), y: edgeA.y1 };
      const overlapEnd = { x: Math.min(aRight, bRight), y: edgeA.y1 };

      // Determine which part of each edge is involved (start, end, or middle)
      const aStartDist = Math.min(
        Math.abs(overlapStart.x - edgeA.x1),
        Math.abs(overlapStart.x - edgeA.x2)
      );
      const aEndDist = Math.min(
        Math.abs(overlapEnd.x - edgeA.x1),
        Math.abs(overlapEnd.x - edgeA.x2)
      );
      const bStartDist = Math.min(
        Math.abs(overlapStart.x - edgeB.x1),
        Math.abs(overlapStart.x - edgeB.x2)
      );
      const bEndDist = Math.min(
        Math.abs(overlapEnd.x - edgeB.x1),
        Math.abs(overlapEnd.x - edgeB.x2)
      );

      // Determine if the connection is at a corner or in the middle
      const cornerA =
        aStartDist < 1 || aEndDist < 1
          ? aStartDist < aEndDist
            ? edgeA.corner1
            : edgeA.corner2
          : "middle";
      const cornerB =
        bStartDist < 1 || bEndDist < 1
          ? bStartDist < bEndDist
            ? edgeB.corner1
            : edgeB.corner2
          : "middle";

      return {
        start: overlapStart,
        end: overlapEnd,
        cornerA,
        cornerB,
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

      // Determine the overlap segment
      const overlapStart = { x: edgeA.x1, y: Math.max(aTop, bTop) };
      const overlapEnd = { x: edgeA.x1, y: Math.min(aBottom, bBottom) };

      // Determine which part of each edge is involved (start, end, or middle)
      const aStartDist = Math.min(
        Math.abs(overlapStart.y - edgeA.y1),
        Math.abs(overlapStart.y - edgeA.y2)
      );
      const aEndDist = Math.min(
        Math.abs(overlapEnd.y - edgeA.y1),
        Math.abs(overlapEnd.y - edgeA.y2)
      );
      const bStartDist = Math.min(
        Math.abs(overlapStart.y - edgeB.y1),
        Math.abs(overlapStart.y - edgeB.y2)
      );
      const bEndDist = Math.min(
        Math.abs(overlapEnd.y - edgeB.y1),
        Math.abs(overlapEnd.y - edgeB.y2)
      );

      // Determine if the connection is at a corner or in the middle
      const cornerA =
        aStartDist < 1 || aEndDist < 1
          ? aStartDist < aEndDist
            ? edgeA.corner1
            : edgeA.corner2
          : "middle";
      const cornerB =
        bStartDist < 1 || bEndDist < 1
          ? bStartDist < bEndDist
            ? edgeB.corner1
            : edgeB.corner2
          : "middle";

      return {
        start: overlapStart,
        end: overlapEnd,
        cornerA,
        cornerB,
      };
    }
  }

  // Case 2: Perpendicular edges that meet at a corner
  if (edgeA.direction !== edgeB.direction) {
    // Determine if horizontal and vertical edges
    const isEdgeAHorizontal = edgeA.direction === "horizontal";
    const horizontalEdge = isEdgeAHorizontal ? edgeA : edgeB;
    const verticalEdge = isEdgeAHorizontal ? edgeB : edgeA;

    // Check if the edges meet at a corner
    const hLeft = Math.min(horizontalEdge.x1, horizontalEdge.x2);
    const hRight = Math.max(horizontalEdge.x1, horizontalEdge.x2);
    const vTop = Math.min(verticalEdge.y1, verticalEdge.y2);
    const vBottom = Math.max(verticalEdge.y1, verticalEdge.y2);

    // Check if the vertical edge's x-coordinate is within the horizontal edge's x-range
    // and if the horizontal edge's y-coordinate is within the vertical edge's y-range
    if (
      verticalEdge.x1 >= hLeft - 1 &&
      verticalEdge.x1 <= hRight + 1 &&
      horizontalEdge.y1 >= vTop - 1 &&
      horizontalEdge.y1 <= vBottom + 1
    ) {
      // The edges meet at a corner
      const cornerPoint = {
        x: verticalEdge.x1,
        y: horizontalEdge.y1,
      };

      // Determine which corners are involved
      let cornerH, cornerV;

      // For horizontal edge
      if (Math.abs(cornerPoint.x - horizontalEdge.x1) < 1) {
        cornerH = horizontalEdge.corner1; // Left corner
      } else if (Math.abs(cornerPoint.x - horizontalEdge.x2) < 1) {
        cornerH = horizontalEdge.corner2; // Right corner
      } else {
        cornerH = "middle"; // Middle of the edge
      }

      // For vertical edge
      if (Math.abs(cornerPoint.y - verticalEdge.y1) < 1) {
        cornerV = verticalEdge.corner1; // Top corner
      } else if (Math.abs(cornerPoint.y - verticalEdge.y2) < 1) {
        cornerV = verticalEdge.corner2; // Bottom corner
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

  // No connection found
  return null;
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

  // Adjust the edge coordinates based on the connection
  if (isHorizontal) {
    // For horizontal edges (top or bottom), adjust x-coordinates

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
      Math.abs(connection.start.x - original.x2) < 1 ||
      Math.abs(connection.start.x - adjusted.x2) < 1
    ) {
      // Adjust the right end of the edge
      adjusted.x2 = connection.end.x;
    }
    // Connection is in the middle - don't adjust
  } else {
    // For vertical edges (left or right), adjust y-coordinates

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
      Math.abs(connection.start.y - original.y2) < 1 ||
      Math.abs(connection.start.y - adjusted.y2) < 1
    ) {
      // Adjust the bottom end of the edge
      adjusted.y2 = connection.end.y;
    }
    // Connection is in the middle - don't adjust
  }

  // Update the adjusted coordinates
  worktop.edges[edge].adjusted = adjusted;
}

/**
 * Function to detect and record connections between worktops
 * @param {Object} canvas - Fabric.js canvas instance
 */
export function detectWorktopConnections(canvas) {
  // Get state from global scope
  const state = window.state;

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
              // For segment connections, use the midpoint
              else {
                connectionX = (connection.start.x + connection.end.x) / 2;
                connectionY = (connection.start.y + connection.end.y) / 2;
              }

              // Create a unique label for this connection
              connectionLabel = nextConnectionLabel;
              nextConnectionLabel = String.fromCharCode(
                nextConnectionLabel.charCodeAt(0) + 1
              );

              // Store the connection point for display
              state.connectionPoints.push({
                x: connectionX,
                y: connectionY,
                label: connectionLabel,
              });
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

  // Update measurements after connections are detected
  updateMeasurementsAfterConnections(canvas);
}
