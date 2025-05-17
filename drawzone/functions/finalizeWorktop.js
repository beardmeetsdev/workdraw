import { adjustWorktopCorners } from "./adjustWorktopCorners.js";
import { updateDirectionsPanel } from "./updateDirectionsPanel.js";

// Import the measurement function
import { addAllEdgeMeasurements } from "./addAllEdgeMeasurements.js";

/**
 * Finalize a worktop by saving it and keeping it on the canvas
 * @param {Object} start - Start point of the worktop centerline
 * @param {Object} end - End point of the worktop centerline
 * @param {string} direction - Direction of the worktop ('N', 'S', 'E', 'W')
 * @param {string} turnDirection - Direction of the turn (if any): 'N', 'S', 'E', 'W'
 * @param {Object} canvas - Fabric.js canvas instance
 * @returns {Object} The created worktop data
 */
export function finalizeWorktop(
  start,
  end,
  direction,
  turnDirection = null,
  canvas
) {
  // Get state from global scope
  const state = window.state;

  const halfWidth = state.worktopWidth / 2;

  // Snap the end point to the detected direction
  let finalEnd = { ...end };
  if (direction === "E" || direction === "W") {
    finalEnd.y = start.y; // Keep y coordinate the same for horizontal lines
  } else {
    finalEnd.x = start.x; // Keep x coordinate the same for vertical lines
  }

  // Check if this is the first segment
  // For worktops created at a turn, we need to check if it's the first segment in the structure
  // For worktops created on mouseup, we need to check if it's the first segment in the structure
  const isFirstSegment =
    state.worktops.length === 0 ||
    (state.isFirstSegment && state.previousWorktop === null);

  // Apply corner adjustments
  // For worktops created at a turn, we need to extend the end point
  // For worktops created on mouseup, we should NOT extend the end point
  // Only extend the end point if this is a turn (turnDirection is not null and not the same as direction)
  const isPrevious = turnDirection !== null && turnDirection !== direction;
  const isCurrent = true;

  const { adjustedStart, adjustedEnd } = adjustWorktopCorners(
    start,
    finalEnd,
    direction,
    isPrevious,
    isCurrent,
    isFirstSegment
  );

  // First, calculate the basic rectangle corners
  let points = [];
  if (direction === "E" || direction === "W") {
    // For horizontal worktops (East or West)
    if (direction === "E") {
      // Drawing East (left to right)
      points = [
        { x: adjustedStart.x, y: adjustedStart.y - halfWidth }, // Top-left
        { x: adjustedEnd.x, y: adjustedEnd.y - halfWidth }, // Top-right
        { x: adjustedEnd.x, y: adjustedEnd.y + halfWidth }, // Bottom-right
        { x: adjustedStart.x, y: adjustedStart.y + halfWidth }, // Bottom-left
      ];
    } else {
      // Drawing West (right to left)
      points = [
        { x: adjustedEnd.x, y: adjustedEnd.y - halfWidth }, // Top-left
        { x: adjustedStart.x, y: adjustedStart.y - halfWidth }, // Top-right
        { x: adjustedStart.x, y: adjustedStart.y + halfWidth }, // Bottom-right
        { x: adjustedEnd.x, y: adjustedEnd.y + halfWidth }, // Bottom-left
      ];
    }
  } else {
    // For vertical worktops (North or South)
    if (direction === "S") {
      // Drawing South (top to bottom)
      points = [
        { x: adjustedStart.x - halfWidth, y: adjustedStart.y }, // Top-left
        { x: adjustedStart.x + halfWidth, y: adjustedStart.y }, // Top-right
        { x: adjustedEnd.x + halfWidth, y: adjustedEnd.y }, // Bottom-right
        { x: adjustedEnd.x - halfWidth, y: adjustedEnd.y }, // Bottom-left
      ];
    } else {
      // Drawing North (bottom to top)
      points = [
        { x: adjustedEnd.x - halfWidth, y: adjustedEnd.y }, // Top-left
        { x: adjustedEnd.x + halfWidth, y: adjustedEnd.y }, // Top-right
        { x: adjustedStart.x + halfWidth, y: adjustedStart.y }, // Bottom-right
        { x: adjustedStart.x - halfWidth, y: adjustedStart.y }, // Bottom-left
      ];
    }
  }

  // Create a new polygon for the finalized worktop
  const finalWorktop = new fabric.Polygon(points, {
    fill: "rgba(52, 152, 219, 0.5)", // Same fill as preview
    stroke: "#3498db",
    strokeWidth: 3,
    selectable: false,
    evented: false,
    perPixelTargetFind: true,
  });

  // Add to canvas
  canvas.add(finalWorktop);

  // Add corner coordinate labels for debugging
  points.forEach((point, index) => {
    const cornerNames = ["TL", "TR", "BR", "BL"];
    const cornerLabel = new fabric.Text(
      `${cornerNames[index]}: (${Math.round(point.x)},${Math.round(point.y)})`,
      {
        left: point.x,
        top: point.y,
        fontSize: 10,
        fill: "black",
        backgroundColor: "rgba(255,255,255,0.7)",
        selectable: false,
        evented: false,
      }
    );
    canvas.add(cornerLabel);
  });

  // The moving direction is already encoded in the compass direction
  let movingDirection = direction; // N, S, E, W

  // Add inner/outer edge labels based on the determined values
  if (direction === "E" || direction === "W") {
    // For horizontal worktops (East or West)
    // Top edge
    if (state.currentEdgeLabels.top) {
      const topEdgeLabel = new fabric.Text(
        state.currentEdgeLabels.top === "inner" ? "Inner" : "Outer",
        {
          left: (points[0].x + points[1].x) / 2,
          top: Math.min(points[0].y, points[1].y) - 15,
          fontSize: 10,
          fill: state.currentEdgeLabels.top === "inner" ? "blue" : "red",
          backgroundColor: "rgba(255,255,255,0.7)",
          selectable: false,
          evented: false,
        }
      );
      canvas.add(topEdgeLabel);
    }

    // Bottom edge
    if (state.currentEdgeLabels.bottom) {
      const bottomEdgeLabel = new fabric.Text(
        state.currentEdgeLabels.bottom === "inner" ? "Inner" : "Outer",
        {
          left: (points[2].x + points[3].x) / 2,
          top: Math.max(points[2].y, points[3].y) + 5,
          fontSize: 10,
          fill: state.currentEdgeLabels.bottom === "inner" ? "blue" : "red",
          backgroundColor: "rgba(255,255,255,0.7)",
          selectable: false,
          evented: false,
        }
      );
      canvas.add(bottomEdgeLabel);
    }
  } else {
    // For vertical worktops (North or South)
    // Always place left label on the left side and right label on the right side
    // regardless of direction (North or South)

    // Left edge
    if (state.currentEdgeLabels.left) {
      const leftEdgeLabel = new fabric.Text(
        state.currentEdgeLabels.left === "inner" ? "Inner" : "Outer",
        {
          // Always use the left side of the polygon (points[0] and points[3])
          left: Math.min(points[0].x, points[3].x) - 30,
          top: (points[0].y + points[3].y) / 2,
          fontSize: 10,
          fill: state.currentEdgeLabels.left === "inner" ? "blue" : "red",
          backgroundColor: "rgba(255,255,255,0.7)",
          selectable: false,
          evented: false,
        }
      );
      canvas.add(leftEdgeLabel);
    }

    // Right edge
    if (state.currentEdgeLabels.right) {
      const rightEdgeLabel = new fabric.Text(
        state.currentEdgeLabels.right === "inner" ? "Inner" : "Outer",
        {
          // Always use the right side of the polygon (points[1] and points[2])
          left: Math.max(points[1].x, points[2].x) + 5,
          top: (points[1].y + points[2].y) / 2,
          fontSize: 10,
          fill: state.currentEdgeLabels.right === "inner" ? "blue" : "red",
          backgroundColor: "rgba(255,255,255,0.7)",
          selectable: false,
          evented: false,
        }
      );
      canvas.add(rightEdgeLabel);
    }
  }

  // We already determined the moving direction above

  // Store the worktop data

  // Make sure we have valid edge labels
  let edgeLabels = { ...state.currentEdgeLabels };

  // If this is the first segment and edge labels are not set, set default edge labels
  if (
    isFirstSegment &&
    !edgeLabels.top &&
    !edgeLabels.bottom &&
    !edgeLabels.left &&
    !edgeLabels.right
  ) {
    console.log("Setting default edge labels for first segment");
    if (direction === "E" || direction === "W") {
      // East or West (horizontal)
      edgeLabels = {
        top: "outer", // Top is always outer for first horizontal worktop
        bottom: "inner", // Bottom is always inner for first horizontal worktop
        left: null,
        right: null,
      };
    } else if (direction === "S") {
      // South (top to bottom)
      edgeLabels = {
        top: null,
        bottom: null,
        left: "inner", // Left is inner for South
        right: "outer", // Right is outer for South
      };
    } else {
      // North (bottom to top)
      edgeLabels = {
        top: null,
        bottom: null,
        left: "outer", // Left is outer for North
        right: "inner", // Right is inner for North
      };
    }
  }

  const worktopData = {
    id: state.worktops.length,
    label: state.nextLabel,
    direction: direction,
    movingDirection: movingDirection, // Store the moving direction
    start: { ...start },
    end: { ...finalEnd },
    adjustedStart: { ...adjustedStart },
    adjustedEnd: { ...adjustedEnd },
    corners: [...points],
    fabricObject: finalWorktop,
    isFirstSegment: isFirstSegment,
    isLastSegment: true, // Initially set as the last segment, will be updated when new worktops are added
    turnDirection: turnDirection,
    edgeLabels: edgeLabels, // Store the edge labels with the worktop

    // Add connections structure for detecting connections
    connections: {
      left: {
        connectedTo: null,
        connectedEdge: null,
        connectionSegment: {
          start: null,
          end: null,
        },
      },
      right: {
        connectedTo: null,
        connectedEdge: null,
        connectionSegment: {
          start: null,
          end: null,
        },
      },
      top: {
        connectedTo: null,
        connectedEdge: null,
        connectionSegment: {
          start: null,
          end: null,
        },
      },
      bottom: {
        connectedTo: null,
        connectedEdge: null,
        connectionSegment: {
          start: null,
          end: null,
        },
      },
    },

    // Add edges structure for connection detection
    edges: {
      left: {
        original: {
          x1: points[0].x, // TL
          y1: points[0].y,
          x2: points[3].x, // BL
          y2: points[3].y,
        },
        adjusted: {
          x1: points[0].x, // TL
          y1: points[0].y,
          x2: points[3].x, // BL
          y2: points[3].y,
        },
        connectedTo: null,
        connectedEdge: null,
        connectionSegment: null,
      },
      right: {
        original: {
          x1: points[1].x, // TR
          y1: points[1].y,
          x2: points[2].x, // BR
          y2: points[2].y,
        },
        adjusted: {
          x1: points[1].x, // TR
          y1: points[1].y,
          x2: points[2].x, // BR
          y2: points[2].y,
        },
        connectedTo: null,
        connectedEdge: null,
        connectionSegment: null,
      },
      top: {
        original: {
          x1: points[0].x, // TL
          y1: points[0].y,
          x2: points[1].x, // TR
          y2: points[1].y,
        },
        adjusted: {
          x1: points[0].x, // TL
          y1: points[0].y,
          x2: points[1].x, // TR
          y2: points[1].y,
        },
        connectedTo: null,
        connectedEdge: null,
        connectionSegment: null,
      },
      bottom: {
        original: {
          x1: points[3].x, // BL
          y1: points[3].y,
          x2: points[2].x, // BR
          y2: points[2].y,
        },
        adjusted: {
          x1: points[3].x, // BL
          y1: points[3].y,
          x2: points[2].x, // BR
          y2: points[2].y,
        },
        connectedTo: null,
        connectedEdge: null,
        connectionSegment: null,
      },
    },
  };

  // Update isLastSegment for previous worktops
  if (state.worktops.length > 0) {
    // Set isLastSegment to false for all existing worktops
    for (const worktop of state.worktops) {
      worktop.isLastSegment = false;
    }
  }

  // Add to worktops array
  state.worktops.push(worktopData);

  // Update next label (A, B, C, etc.)
  state.nextLabel = String.fromCharCode(state.nextLabel.charCodeAt(0) + 1);

  // Update directions panel
  updateDirectionsPanel(worktopData);

  // Calculate length in pixels and convert to mm
  let lengthPx;
  if (direction === "E" || direction === "W") {
    // For horizontal worktops (East or West)
    lengthPx = Math.abs(adjustedEnd.x - adjustedStart.x);
  } else {
    // For vertical worktops (North or South)
    lengthPx = Math.abs(adjustedEnd.y - adjustedStart.y);
  }

  // Convert to millimeters (1 pixel = 5mm)
  const lengthMm = Math.round(lengthPx * 5);

  // Add permanent measurement text to all edges of the worktop
  const measurementTexts = addAllEdgeMeasurements(
    canvas,
    points,
    direction,
    lengthMm,
    true, // Set as permanent measurement
    edgeLabels // Pass edge labels to determine inner/outer edges
  );

  // Store the measurement objects with the worktop data
  worktopData.measurementObjects = measurementTexts;

  // For backward compatibility, store the first measurement as measurementObject
  if (measurementTexts.length > 0) {
    worktopData.measurementObject = measurementTexts[0];
  }

  // Update the worktop in the array with the measurement object
  state.worktops[state.worktops.length - 1] = worktopData;

  // Clean up preview elements
  canvas.remove(state.previewWorktop);
  canvas.remove(state.currentPointDot);
  canvas.remove(state.startLine);
  canvas.remove(state.startDot);

  // Reset for next worktop
  state.previewWorktop = null;
  state.currentPointDot = null;
  state.startLine = null;

  // Return the worktop data
  return worktopData;
}
