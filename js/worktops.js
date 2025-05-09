/**
 * worktops.js
 * Handles worktop creation, rendering, and management
 */

import { state } from "./state.js";
import { getContext } from "./canvas.js";
import { logMeasurement } from "./utils.js";

/**
 * Create a worktop rectangle from a line segment
 * @param {Object} segment - The line segment
 * @returns {Object} - The worktop object
 */
function createWorktopFromSegment(segment) {
  const { start, end, direction, isPrevious, isCurrent, isFirstSegment } =
    segment;
  const width = state.worktopWidth;
  const halfWidth = width / 2;

  // Create copies of start and end points that we can adjust
  let adjustedStart = { x: start.x, y: start.y };
  let adjustedEnd = { x: end.x, y: end.y };

  // Apply corner adjustments
  if (isPrevious) {
    // For previous worktop, extend the end point by half the worktop width
    if (direction === "horizontal") {
      // For horizontal worktops, extend in X direction
      if (end.x > start.x) {
        adjustedEnd.x += halfWidth; // Extend to the right
      } else {
        adjustedEnd.x -= halfWidth; // Extend to the left
      }
    } else {
      // vertical
      // For vertical worktops, extend in Y direction
      if (end.y > start.y) {
        adjustedEnd.y += halfWidth; // Extend downward
      } else {
        adjustedEnd.y -= halfWidth; // Extend upward
      }
    }
  }

  // For the first segment in a drawing session, don't shorten the start point
  // This ensures the worktop starts from the initial click point
  if (isCurrent && !isFirstSegment) {
    // For current worktop (but not the first segment), shorten the start point by half the worktop width
    if (direction === "horizontal") {
      // For horizontal worktops, shorten in X direction
      if (end.x > start.x) {
        adjustedStart.x += halfWidth; // Shorten from the left
      } else {
        adjustedStart.x -= halfWidth; // Shorten from the right
      }
    } else {
      // vertical
      // For vertical worktops, shorten in Y direction
      if (end.y > start.y) {
        adjustedStart.y += halfWidth; // Shorten from the top
      } else {
        adjustedStart.y -= halfWidth; // Shorten from the bottom
      }
    }
  }

  let x, y, w, h;

  if (direction === "horizontal") {
    // For horizontal segments, the width is the segment length
    // and the height is the fixed worktop width
    x = Math.min(adjustedStart.x, adjustedEnd.x);
    y = adjustedStart.y - width / 2; // Center the worktop on the line
    w = Math.abs(adjustedEnd.x - adjustedStart.x);
    h = width;
  } else {
    // For vertical segments, the height is the segment length
    // and the width is the fixed worktop width
    x = adjustedStart.x - width / 2; // Center the worktop on the line
    y = Math.min(adjustedStart.y, adjustedEnd.y);
    w = width;
    h = Math.abs(adjustedEnd.y - adjustedStart.y);
  }

  // Create the worktop object
  const worktop = {
    x,
    y,
    width: w,
    height: h,
    direction,
    start: { x: adjustedStart.x, y: adjustedStart.y },
    end: { x: adjustedEnd.x, y: adjustedEnd.y },
    originalStart: { x: start.x, y: start.y },
    originalEnd: { x: end.x, y: end.y },
    // Add edges property with explicit coordinates and connection tracking
    edges: {
      left: {
        original: { x1: x, y1: y, x2: x, y2: y + h },
        adjusted: { x1: x, y1: y, x2: x, y2: y + h },
        connectedTo: null, // Reference to another worktop object
        connectedEdge: null, // Which edge of the other worktop
        connectionSegment: {
          start: null, // {x, y} coordinates of where the connection starts
          end: null, // {x, y} coordinates of where the connection ends
        },
        cornerA: null, // Which corner of this worktop is involved
        cornerB: null, // Which corner of the other worktop is involved
        connectionLabel: null, // Label for the connection point
      },
      right: {
        original: { x1: x + w, y1: y, x2: x + w, y2: y + h },
        adjusted: { x1: x + w, y1: y, x2: x + w, y2: y + h },
        connectedTo: null,
        connectedEdge: null,
        connectionSegment: {
          start: null,
          end: null,
        },
        cornerA: null,
        cornerB: null,
        connectionLabel: null,
      },
      top: {
        original: { x1: x, y1: y, x2: x + w, y2: y },
        adjusted: { x1: x, y1: y, x2: x + w, y2: y },
        connectedTo: null,
        connectedEdge: null,
        connectionSegment: {
          start: null,
          end: null,
        },
        cornerA: null,
        cornerB: null,
        connectionLabel: null,
      },
      bottom: {
        original: { x1: x, y1: y + h, x2: x + w, y2: y + h },
        adjusted: { x1: x, y1: y + h, x2: x + w, y2: y + h },
        connectedTo: null,
        connectedEdge: null,
        connectionSegment: {
          start: null,
          end: null,
        },
        cornerA: null,
        cornerB: null,
        connectionLabel: null,
      },
    },
    // Keep the connections structure for UI display in updateWorktopDetails
    // This is used to show connection information in the worktop details panel
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
  };

  return worktop;
}

/**
 * Draw a worktop rectangle on the canvas
 * @param {Object} worktop - The worktop object
 * @param {boolean} isPreview - Whether this is a preview worktop
 */
function drawWorktop(worktop, isPreview = false) {
  const ctx = getContext();
  if (!ctx) return;

  // Fill the rectangle with a semi-transparent color
  ctx.fillStyle = isPreview
    ? "rgba(52, 152, 219, 0.3)"
    : "rgba(52, 152, 219, 0.5)";
  ctx.fillRect(worktop.x, worktop.y, worktop.width, worktop.height);

  // Don't draw any borders - this will completely hide all join lines
  // The shape will be defined by the fill color only

  // Add label only if not in preview mode
  if (!isPreview && worktop.label) {
    // Label styling
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#3498db";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Display the label in the center of the worktop
    ctx.fillText(
      worktop.label,
      worktop.x + worktop.width / 2,
      worktop.y + worktop.height / 2
    );
  }

  // Add measurements to the edges (for both final and preview worktops)
  drawWorktopMeasurements(worktop, isPreview);
}

/**
 * Draw measurements on a worktop
 * @param {Object} worktop - The worktop object
 * @param {boolean} isPreview - Whether this is a preview worktop
 */
function drawWorktopMeasurements(worktop, isPreview = false) {
  const ctx = getContext();
  if (!ctx) return;

  // Use different styling for preview measurements
  ctx.font = "12px Arial";
  ctx.fillStyle = isPreview ? "rgba(44, 62, 80, 0.6)" : "#2c3e50"; // Lighter color for preview

  // For non-preview worktops, show measurements based on adjusted coordinates if available
  if (!isPreview && worktop.edges) {
    // Draw measurements for each edge
    const edges = ["left", "right", "top", "bottom"];

    // Process each edge
    edges.forEach((edge) => {
      if (worktop.edges[edge]) {
        // Determine if this edge has been adjusted by comparing original and adjusted coordinates
        const original = worktop.edges[edge].original;
        const adjusted = worktop.edges[edge].adjusted;

        const isAdjusted =
          Math.abs(original.x1 - adjusted.x1) > 0.5 ||
          Math.abs(original.y1 - adjusted.y1) > 0.5 ||
          Math.abs(original.x2 - adjusted.x2) > 0.5 ||
          Math.abs(original.y2 - adjusted.y2) > 0.5;

        // Use the appropriate coordinates (adjusted or original)
        const coords = isAdjusted
          ? worktop.edges[edge].adjusted
          : worktop.edges[edge].original;

        // Calculate the length of the edge
        let lengthPx;
        if (edge === "top" || edge === "bottom") {
          // Horizontal edge
          lengthPx = Math.abs(coords.x2 - coords.x1);
        } else {
          // Vertical edge
          lengthPx = Math.abs(coords.y2 - coords.y1);
        }

        // Only show measurements for edges with length >= 1
        if (lengthPx >= 1) {
          const lengthMm = Math.round(lengthPx * state.pixelsToMm);

          // Log the measurement with detailed information
          const originalCoords = worktop.edges[edge].original;
          const adjustedCoords = worktop.edges[edge].adjusted;

          // Calculate original and adjusted lengths for comparison
          let originalLengthPx, adjustedLengthPx;
          if (edge === "top" || edge === "bottom") {
            originalLengthPx = Math.abs(originalCoords.x2 - originalCoords.x1);
            adjustedLengthPx = Math.abs(adjustedCoords.x2 - adjustedCoords.x1);
          } else {
            originalLengthPx = Math.abs(originalCoords.y2 - originalCoords.y1);
            adjustedLengthPx = Math.abs(adjustedCoords.y2 - adjustedCoords.y1);
          }

          const originalLengthMm = Math.round(
            originalLengthPx * state.pixelsToMm
          );
          const adjustedLengthMm = Math.round(
            adjustedLengthPx * state.pixelsToMm
          );

          // Create a detailed condition string
          const conditionDetails =
            `${isAdjusted ? "ADJUSTED" : "ORIGINAL"} - ` +
            `Original: ${originalLengthMm}mm, ` +
            `Adjusted: ${adjustedLengthMm}mm, ` +
            `Diff: ${Math.abs(originalLengthMm - adjustedLengthMm)}mm`;

          logMeasurement(
            worktop.label,
            edge,
            isAdjusted ? "adjusted" : "original",
            coords.x1,
            coords.y1,
            coords.x2,
            coords.y2,
            lengthPx,
            lengthMm,
            conditionDetails
          );

          // Position the text based on the edge
          let textX,
            textY,
            rotation = 0;

          switch (edge) {
            case "top":
              textX = (coords.x1 + coords.x2) / 2;
              textY = coords.y1 - 5;
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              break;
            case "bottom":
              textX = (coords.x1 + coords.x2) / 2;
              textY = coords.y2 + 15; // Position below the edge
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              break;
            case "left":
              textX = coords.x1 - 5;
              textY = (coords.y1 + coords.y2) / 2;
              rotation = -Math.PI / 2; // Rotate 90 degrees counter-clockwise
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              break;
            case "right":
              textX = coords.x2 + 5;
              textY = (coords.y1 + coords.y2) / 2;
              rotation = -Math.PI / 2; // Rotate 90 degrees counter-clockwise
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              break;
          }

          // Draw the measurement
          if (rotation !== 0) {
            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(rotation);
            ctx.fillText(`${lengthMm}mm`, 0, 0);
            ctx.restore();
          } else {
            ctx.fillText(`${lengthMm}mm`, textX, textY);
          }
        }
      }
    });
  }

  // For preview worktops, show the original measurements
  if (isPreview) {
    if (worktop.direction === "horizontal") {
      // For horizontal worktops, show length on the top edge
      const lengthPx = worktop.width;
      const lengthMm = Math.round(lengthPx * state.pixelsToMm);

      // Log the original horizontal measurement
      logMeasurement(
        worktop.label,
        "top",
        "preview",
        worktop.x,
        worktop.y,
        worktop.x + worktop.width,
        worktop.y,
        lengthPx,
        lengthMm,
        "preview-worktop"
      );

      // Draw measurement on top edge
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        `${lengthMm}mm`,
        worktop.x + worktop.width / 2,
        worktop.y - 5
      );

      // Show the fixed width (600mm)
      logMeasurement(
        worktop.label,
        "right",
        "preview-width",
        worktop.x + worktop.width,
        worktop.y,
        worktop.x + worktop.width,
        worktop.y + worktop.height,
        worktop.height,
        600,
        "preview-worktop"
      );

      ctx.save();
      ctx.translate(
        worktop.x + worktop.width + 5,
        worktop.y + worktop.height / 2
      );
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("600mm", 0, 0);
      ctx.restore();
    } else {
      // For vertical worktops, show length on the left edge
      const lengthPx = worktop.height;
      const lengthMm = Math.round(lengthPx * state.pixelsToMm);

      // Log the original vertical measurement
      logMeasurement(
        worktop.label,
        "left",
        "preview",
        worktop.x,
        worktop.y,
        worktop.x,
        worktop.y + worktop.height,
        lengthPx,
        lengthMm,
        "preview-worktop"
      );

      // Draw measurement on left edge
      ctx.save();
      ctx.translate(worktop.x - 5, worktop.y + worktop.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${lengthMm}mm`, 0, 0);
      ctx.restore();

      // Show the fixed width (600mm)
      logMeasurement(
        worktop.label,
        "top",
        "preview-width",
        worktop.x,
        worktop.y,
        worktop.x + worktop.width,
        worktop.y,
        worktop.width,
        600,
        "preview-worktop"
      );

      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("600mm", worktop.x + worktop.width / 2, worktop.y - 5);
    }
  }
}

// Export the worktop functions
export { createWorktopFromSegment, drawWorktop };
