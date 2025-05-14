/**
 * exteriorFaces.js
 * Handles detection and drawing of continuous exterior faces.
 * A continuous exterior face is a sequence of connected, collinear worktop edges
 * that form an outermost boundary of the drawn shape.
 */

import { state } from "./state.js";
import { getCornerCoordinates, logMeasurement } from "./utils.js";
import { getContext } from "./canvas.js";
import { createEdge } from "./connections.js"; // We'll need createEdge to get standardized edge info

/**
 * Checks if a point is inside any worktop.
 * @param {number} x - The x-coordinate of the point.
 * @param {number} y - The y-coordinate of the point.
 * @param {Array} worktops - The array of worktop objects.
 * @param {Object} excludeWorktop - A worktop to exclude from the check (optional).
 * @returns {boolean} - True if the point is inside a worktop, false otherwise.
 */
function isPointInsideWorktop(x, y, worktops, excludeWorktop = null) {
  for (const worktop of worktops) {
    if (worktop === excludeWorktop) continue;
    if (
      x >= worktop.x &&
      x <= worktop.x + worktop.width &&
      y >= worktop.y &&
      y <= worktop.y + worktop.height
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if an edge is an exterior edge.
 * An edge is considered exterior if a point slightly offset outwards from its midpoint
 * does not fall inside another worktop.
 * @param {Object} worktop - The worktop the edge belongs to.
 * @param {string} edgeSide - The side of the edge ('top', 'bottom', 'left', 'right').
 * @param {Array} allWorktops - All worktop objects.
 * @returns {boolean} - True if the edge is exterior, false otherwise.
 */
function isEdgeExterior(worktop, edgeSide, allWorktops) {
  const edge = worktop.edges[edgeSide].adjusted; // Use adjusted coordinates
  const offset = state.gridSize / 2; // Small offset outwards

  let testX, testY;
  let midX = (edge.x1 + edge.x2) / 2;
  let midY = (edge.y1 + edge.y2) / 2;

  switch (edgeSide) {
    case "top":
      testX = midX;
      testY = midY - offset;
      break;
    case "bottom":
      testX = midX;
      testY = midY + offset;
      break;
    case "left":
      testX = midX - offset;
      testY = midY;
      break;
    case "right":
      testX = midX + offset;
      testY = midY;
      break;
    default:
      return false; // Should not happen
  }
  // Check if this test point is inside any *other* worktop
  return !isPointInsideWorktop(testX, testY, allWorktops, worktop);
}

/**
 * Detects continuous exterior faces from the worktops.
 */
export function detectContinuousExteriorFaces() {
  console.log("--- detectContinuousExteriorFaces START ---");
  if (state.worktops.length === 0) {
    console.log("detectContinuousExteriorFaces: No worktops to process.");
    return;
  }

  // Reset isPartOfExteriorFace flags on all edges
  for (const worktop of state.worktops) {
    for (const edgeSide in worktop.edges) {
      if (worktop.edges[edgeSide]) {
        worktop.edges[edgeSide].isPartOfExteriorFace = false;
      }
    }
  }

  const allWorktops = state.worktops;
  let potentialFaces = [];

  // Iterate through each worktop and each of its edges
  for (let i = 0; i < allWorktops.length; i++) {
    const currentWorktop = allWorktops[i];
    const sides = ["top", "right", "bottom", "left"];

    for (const currentEdgeSide of sides) {
      // Check if this edge has already been processed as part of a face
      if (currentWorktop.edges[currentEdgeSide].isPartOfExteriorFace) {
        continue;
      }

      // Check if this edge is exterior
      if (!isEdgeExterior(currentWorktop, currentEdgeSide, allWorktops)) {
        continue;
      }

      let currentEdgeData = createEdge(currentWorktop, currentEdgeSide);
      let faceEdges = [currentEdgeData];
      let faceWorktops = [currentWorktop]; // Keep track of worktops in this face
      let currentEdgeObject = currentWorktop.edges[currentEdgeSide];

      // Try to extend the face in one direction (e.g., from corner2 of the current edge)
      let lastWorktopInFace = currentWorktop;
      let lastEdgeSideInFace = currentEdgeSide;
      let lastEdgeDataInFace = currentEdgeData;
      let lastEdgeObjectInFace = currentEdgeObject;

      let searching = true;
      while (searching) {
        searching = false;
        const cornerToSearchFrom = lastEdgeDataInFace.corner2; // e.g., TR for a 'top' edge
        const connectionInfo = lastEdgeObjectInFace.connectedTo
          ? lastWorktopInFace.connections[lastEdgeSideInFace]
          : null;

        if (connectionInfo && connectionInfo.connectedTo) {
          const connectedWorktop = connectionInfo.connectedTo;
          const connectedWorktopEdgeSide = connectionInfo.connectedEdge;
          const connectedWorktopEdgeObject =
            connectedWorktop.edges[connectedWorktopEdgeSide];
          const connectedWorktopEdgeData = createEdge(
            connectedWorktop,
            connectedWorktopEdgeSide
          );

          // Check for collinearity and if the connection is at the correct corner
          // For a 'top' edge (corner1=TL, corner2=TR), we are looking from TR.
          // If it connects to another 'top' edge's TL, they are collinear and connected.
          if (
            connectedWorktopEdgeData.direction ===
              lastEdgeDataInFace.direction && // Same orientation
            Math.abs(connectedWorktopEdgeData.y1 - lastEdgeDataInFace.y1) < 1 && // Same y-level (for horizontal)
            lastEdgeDataInFace.side === connectedWorktopEdgeSide && // e.g. both are 'top' edges
            connectionInfo.cornerA === lastEdgeDataInFace.corner2 && // connection from current edge's end
            connectionInfo.cornerB === connectedWorktopEdgeData.corner1 && // to next edge's start
            isEdgeExterior(
              connectedWorktop,
              connectedWorktopEdgeSide,
              allWorktops
            ) &&
            !faceWorktops.includes(connectedWorktop) // Avoid cycles with same worktop
          ) {
            // console.log(
            //  `  Extending face: ${lastWorktopInFace.label}-${lastEdgeSideInFace} with ${connectedWorktop.label}-${connectedWorktopEdgeSide}`
            // );
            faceEdges.push(connectedWorktopEdgeData);
            faceWorktops.push(connectedWorktop);
            lastWorktopInFace = connectedWorktop;
            lastEdgeSideInFace = connectedWorktopEdgeSide;
            lastEdgeDataInFace = connectedWorktopEdgeData;
            lastEdgeObjectInFace = connectedWorktopEdgeObject;
            searching = true;
          }
        }
      }

      // If we found a sequence of 1 or more edges (a single exterior edge can be a "face")
      if (faceEdges.length > 0) {
        // console.log(
        //   `Potential face found with ${faceEdges.length} edge(s). First edge: ${faceEdges[0].side} of worktop ${faceWorktops[0].label}`
        // );
        potentialFaces.push({
          edges: faceEdges,
          worktops: faceWorktops, // Keep track of actual worktop objects
          direction: faceEdges[0].direction,
        });
        // ONLY mark edges if they form part of a MULTI-EDGE face
        if (faceEdges.length > 1) {
          faceWorktops.forEach((wt, index) => {
            const edgeSide = faceEdges[index].side;
            wt.edges[edgeSide].isPartOfExteriorFace = true;
          });
        }
      }
    }
  }

  // Process potentialFaces to calculate lengths and coordinates
  for (const face of potentialFaces) {
    if (face.edges.length === 0) continue;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let totalLength = 0;

    face.edges.forEach((edge) => {
      totalLength += edge.length;
      minX = Math.min(minX, edge.x1, edge.x2);
      minY = Math.min(minY, edge.y1, edge.y2);
      maxX = Math.max(maxX, edge.x1, edge.x2);
      maxY = Math.max(maxY, edge.y1, edge.y2);
    });

    // For the U-shape example (A-top + B-top), A-top length is worktopWidth (120px)
    // B-top length is B.width. Total should be A.width + B.width.
    // The createEdge function returns edge.length based on worktop.width/height.
    // For a 'top' edge of a vertical worktop, its length is worktop.width.
    // For a 'top' edge of a horizontal worktop, its length is worktop.width.
    // This seems correct. The 2800mm example was A's width (600mm) + B's length (2200mm).
    // A's top edge length = A.width (120px). B's top edge length = B.width (440px).
    // Total length in pixels = 120 + 440 = 560px. 560px * 5mm/px = 2800mm. This logic is sound.

    state.continuousExteriorFaces.push({
      startX: face.direction === "horizontal" ? minX : (minX + maxX) / 2,
      startY: face.direction === "vertical" ? minY : (minY + maxY) / 2,
      endX: face.direction === "horizontal" ? maxX : (minX + maxX) / 2,
      endY: face.direction === "vertical" ? maxY : (minY + maxY) / 2,
      length: totalLength,
      direction: face.direction,
      worktopLabels: face.worktops.map((w) => w.label).join("+"),
      id: `face-${minX}-${minY}-${maxX}-${maxY}`, // Unique ID for the face
    });
  }
  console.log(
    "detectContinuousExteriorFaces: state.worktops before processing:",
    state.worktops.length,
    JSON.parse(JSON.stringify(state.worktops)) // Deep copy for logging
  );

  // Log before filtering
  console.log(
    "detectContinuousExteriorFaces: Raw potential faces before final push to state:",
    JSON.parse(JSON.stringify(potentialFaces)) // Log the collected potentialFaces
  );

  // Clear and then populate state.continuousExteriorFaces from potentialFaces
  state.continuousExteriorFaces = [];
  for (const face of potentialFaces) {
    // Iterate over potentialFaces collected in this run
    if (face.edges.length === 0) continue;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let totalLength = 0;

    face.edges.forEach((edge) => {
      // These are edgeData objects
      totalLength += edge.length;
      minX = Math.min(minX, edge.x1, edge.x2);
      minY = Math.min(minY, edge.y1, edge.y2);
      maxX = Math.max(maxX, edge.x1, edge.x2);
      maxY = Math.max(maxY, edge.y1, edge.y2);
    });

    state.continuousExteriorFaces.push({
      startX: face.direction === "horizontal" ? minX : (minX + maxX) / 2,
      startY: face.direction === "vertical" ? minY : (minY + maxY) / 2,
      endX: face.direction === "horizontal" ? maxX : (minX + maxX) / 2,
      endY: face.direction === "vertical" ? maxY : (minY + maxY) / 2,
      length: totalLength,
      direction: face.direction,
      worktopLabels: face.worktops.map((w) => w.label).join("+"), // face.worktops are actual worktop objects
      id: `face-${minX}-${minY}-${maxX}-${maxY}`,
    });
  }

  // Filter out duplicate faces
  const uniqueFaces = [];
  const seenFaceIds = new Set();
  for (const face of state.continuousExteriorFaces) {
    if (!seenFaceIds.has(face.id)) {
      uniqueFaces.push(face);
      seenFaceIds.add(face.id);
    } else {
      // console.log("Filtering out duplicate face with id:", face.id);
    }
  }
  state.continuousExteriorFaces = uniqueFaces;
  console.log(
    "detectContinuousExteriorFaces: Final state.continuousExteriorFaces after filtering:",
    JSON.parse(JSON.stringify(state.continuousExteriorFaces))
  );
  console.log("--- detectContinuousExteriorFaces END ---");
}

/**
 * Draws the measurements for continuous exterior faces.
 */
export function drawContinuousExteriorFaceMeasurements() {
  const ctx = getContext();
  if (!ctx || state.continuousExteriorFaces.length === 0) {
    return;
  }

  ctx.font = "bold 14px Arial";
  ctx.fillStyle = "#008000"; // Dark Green for these special measurements

  for (const face of state.continuousExteriorFaces) {
    const lengthMm = Math.round(face.length * state.pixelsToMm);
    let textX, textY;

    if (face.direction === "horizontal") {
      textX = (face.startX + face.endX) / 2;
      textY = face.startY - 15; // Position above the face
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
    } else {
      // Vertical
      textX = face.startX - 15; // Position to the left of the face
      textY = (face.startY + face.endY) / 2;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
    }

    // Basic check to avoid drawing if length is too small (e.g. single point)
    if (face.length < state.gridSize / 2) continue;

    // Draw the text
    if (face.direction === "vertical") {
      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(-Math.PI / 2); // Rotate text for vertical lines
      ctx.textAlign = "center"; // Adjust alignment after rotation
      ctx.fillText(`${lengthMm}mm`, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(`${lengthMm}mm`, textX, textY);
    }

    logMeasurement(
      `ExteriorFace (${face.worktopLabels})`,
      face.direction,
      "exterior-face",
      face.startX,
      face.startY,
      face.endX,
      face.endY,
      face.length,
      lengthMm,
      "continuous-exterior-face"
    );
  }
}
