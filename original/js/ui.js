/**
 * ui.js
 * Handles UI interactions and updates
 */

import { state, resetDrawingState } from "./state.js";
import {
  getCanvas,
  redrawCanvas,
  resizeCanvas as importedResizeCanvas,
} from "./canvas.js"; // Import resizeCanvas
import {
  getMouseCoordinates,
  getCornerCoordinates,
  showMeasurementLogs as importedShowMeasurementLogs,
} from "./utils.js"; // Import showMeasurementLogs
import {
  createWorktopFromSegment,
  drawWorktop,
  drawPreviewWorktop,
  drawFinalWorktop,
} from "./worktops.js";
import { detectWorktopConnections } from "./connections.js";
import { detectWalls } from "./walls.js"; // Import detectWalls
import { detectContinuousExteriorFaces } from "./exteriorFaces.js"; // Import detectContinuousExteriorFaces

/**
 * Update the worktop list in the UI
 */
function updateWorktopList() {
  const worktopListElement = document.getElementById("worktop-list");
  worktopListElement.innerHTML = ""; // Clear the list

  // Add each worktop to the list
  for (const worktop of state.worktops) {
    const p = document.createElement("p");

    // Calculate dimensions in millimeters
    let length, width;
    if (worktop.direction === "horizontal") {
      length = Math.round(worktop.width * state.pixelsToMm);
      width = 600; // Fixed width
    } else {
      length = Math.round(worktop.height * state.pixelsToMm);
      width = 600; // Fixed width
    }

    p.textContent = `${worktop.label}: ${length} x ${width}mm`;
    worktopListElement.appendChild(p);
  }
}

/**
 * Update the worktop details panel
 */
function updateWorktopDetails() {
  const worktopDetailsElement = document.getElementById("worktop-details");
  if (!worktopDetailsElement) return; // Exit if element doesn't exist

  worktopDetailsElement.innerHTML = ""; // Clear the details

  if (state.worktops.length === 0) {
    const noWorktopsElement = document.createElement("p");
    noWorktopsElement.textContent = "No worktops to display.";
    worktopDetailsElement.appendChild(noWorktopsElement);
    return;
  }

  // Outline measurements section has been removed

  // Add each worktop to the details panel
  for (const worktop of state.worktops) {
    // Create a container for this worktop's details
    const worktopElement = document.createElement("div");
    worktopElement.className = "worktop-detail";

    // Create header with worktop label and dimensions
    const headerElement = document.createElement("h4");

    // Calculate dimensions in millimeters
    let length, width;
    if (worktop.direction === "horizontal") {
      length = Math.round(worktop.width * state.pixelsToMm);
      width = 600; // Fixed width
    } else {
      length = Math.round(worktop.height * state.pixelsToMm);
      width = 600; // Fixed width
    }

    headerElement.textContent = `Worktop ${worktop.label}: ${length} x ${width}mm (${worktop.direction})`;

    // Add the header to the container
    worktopElement.appendChild(headerElement);

    // Create a container for the corner details
    const cornerDetailsContainer = document.createElement("div");
    cornerDetailsContainer.className = "corner-details-container";

    // Get corner coordinates
    const corners = getCornerCoordinates(worktop);

    // Add details for each corner
    Object.entries(corners).forEach(([corner, coords]) => {
      const cornerDetail = document.createElement("p");
      cornerDetail.className = "corner-detail";
      cornerDetail.textContent = `${corner}: (${Math.round(
        coords.x
      )}, ${Math.round(coords.y)})`;
      cornerDetailsContainer.appendChild(cornerDetail);
    });

    // Add the corner details container to the worktop container
    worktopElement.appendChild(cornerDetailsContainer);

    // Create a container for the edge details
    const edgeDetailsContainer = document.createElement("div");
    edgeDetailsContainer.className = "edge-details-container";

    // Add a header for edges
    const edgesHeader = document.createElement("p");
    edgesHeader.className = "edges-header";
    edgesHeader.textContent = "Edges:";
    edgeDetailsContainer.appendChild(edgesHeader);

    // Check if the worktop has the new edges structure
    if (worktop.edges) {
      // Add details for each edge
      const edges = ["left", "right", "top", "bottom"];

      edges.forEach((edge) => {
        const edgeDetail = document.createElement("p");
        edgeDetail.className = "edge-detail";

        // Get the original and adjusted coordinates
        const original = worktop.edges[edge].original;
        const adjusted = worktop.edges[edge].adjusted;

        // Calculate lengths
        let originalLength, adjustedLength;
        if (edge === "top" || edge === "bottom") {
          // Horizontal edge
          originalLength = Math.abs(original.x2 - original.x1);
          adjustedLength = Math.abs(adjusted.x2 - adjusted.x1);
        } else {
          // Vertical edge
          originalLength = Math.abs(original.y2 - original.y1);
          adjustedLength = Math.abs(adjusted.y2 - adjusted.y1);
        }

        // Convert to mm
        const originalLengthMm = Math.round(originalLength * state.pixelsToMm);
        const adjustedLengthMm = Math.round(adjustedLength * state.pixelsToMm);

        // Check if adjusted coordinates are different from original
        const isDifferent =
          Math.abs(original.x1 - adjusted.x1) > 0.5 ||
          Math.abs(original.y1 - adjusted.y1) > 0.5 ||
          Math.abs(original.x2 - adjusted.x2) > 0.5 ||
          Math.abs(original.y2 - adjusted.y2) > 0.5;

        // Format the edge details - show the most relevant measurement
        let edgeText = `${edge.toUpperCase()}: `;

        if (isDifferent) {
          // If adjusted, show both with adjusted highlighted
          edgeText += `${originalLengthMm}mm → ${adjustedLengthMm}mm`;
          edgeDetail.style.color = "#e74c3c"; // Highlight adjusted edges in red
        } else {
          // If not adjusted, just show the original
          edgeText += `${originalLengthMm}mm`;
        }

        edgeDetail.textContent = edgeText;
        edgeDetailsContainer.appendChild(edgeDetail);
      });
    } else {
      // If the worktop doesn't have the new edges structure, show a message
      const noEdgesDetail = document.createElement("p");
      noEdgesDetail.className = "edge-detail";
      noEdgesDetail.textContent = "Edge details not available";
      edgeDetailsContainer.appendChild(noEdgesDetail);
    }

    // Add the edge details container to the worktop container
    worktopElement.appendChild(edgeDetailsContainer);

    // Create a container for the connection details
    const connectionDetailsContainer = document.createElement("div");
    connectionDetailsContainer.className = "connection-details-container";

    // Add a header for connections
    const connectionsHeader = document.createElement("p");
    connectionsHeader.className = "connections-header";
    connectionsHeader.textContent = "Connections:";
    connectionDetailsContainer.appendChild(connectionsHeader);

    // Track connections we've already displayed to avoid duplicates
    const displayedConnections = new Set();

    // Check each edge for connections
    const edges = ["left", "right", "top", "bottom"];
    let hasConnections = false;

    edges.forEach((edge) => {
      const connection = worktop.connections[edge];

      if (connection.connectedTo) {
        hasConnections = true;

        // Create a unique key for this connection
        const connectionKey = [
          worktop.label,
          connection.cornerA,
          connection.connectedTo.label,
          connection.cornerB,
        ]
          .sort()
          .join("-");

        // Only display each connection once
        if (!displayedConnections.has(connectionKey)) {
          displayedConnections.add(connectionKey);

          // Create connection detail
          const connectionDetail = document.createElement("p");
          connectionDetail.className = "connection-detail";

          // Format: "A-TR to B-TL (Connection C)"
          const connectionLabel = connection.connectionLabel || "";
          connectionDetail.textContent = `${worktop.label}-${connection.cornerA} to ${connection.connectedTo.label}-${connection.cornerB}`;

          if (connectionLabel) {
            connectionDetail.textContent += ` (Connection ${connectionLabel})`;
          }

          // Add connection coordinates
          const startX = Math.round(connection.connectionSegment.start.x);
          const startY = Math.round(connection.connectionSegment.start.y);
          const endX = Math.round(connection.connectionSegment.end.x);
          const endY = Math.round(connection.connectionSegment.end.y);

          // Check if this is a corner connection (start and end are the same)
          if (startX === endX && startY === endY) {
            connectionDetail.textContent += ` at (${startX}, ${startY})`;
          } else {
            connectionDetail.textContent += ` from (${startX}, ${startY}) to (${endX}, ${endY})`;
          }

          connectionDetailsContainer.appendChild(connectionDetail);
        }
      }
    });

    // If no connections, show a message
    if (!hasConnections) {
      const noConnectionsDetail = document.createElement("p");
      noConnectionsDetail.className = "connection-detail";
      noConnectionsDetail.textContent = "No connections";
      connectionDetailsContainer.appendChild(noConnectionsDetail);
    }

    // Add the connection details container to the worktop container
    worktopElement.appendChild(connectionDetailsContainer);

    // Add the worktop container to the details panel
    worktopDetailsElement.appendChild(worktopElement);
  }
}

/**
 * Toggle grid snapping
 */
function toggleGridSnap() {
  state.snapToGrid = !state.snapToGrid;
  const button = document.getElementById("toggle-snap");

  if (state.snapToGrid) {
    button.classList.add("active");
    button.textContent = "Grid Snap: ON";
  } else {
    button.classList.remove("active");
    button.textContent = "Grid Snap: OFF";
  }

  // Redraw if we're in the middle of drawing
  if (state.currentPoint && state.activeLineCollection) {
    redrawCanvas();
    // drawPoint(state.currentPoint.x, state.currentPoint.y); // This was part of the original, but redrawCanvas now handles points
  }
}

/**
 * Clear the canvas and reset the state
 */
function clearCanvas() {
  state.worktops = [];
  state.wallMeasurements = []; // Clear wall measurements
  state.nextWorktopLabel = "A"; // Reset the label counter
  resetDrawingState();

  // Clear the worktop list
  const worktopListElement = document.getElementById("worktop-list");
  worktopListElement.innerHTML = "";

  // Clear the worktop details panel
  const worktopDetailsElement = document.getElementById("worktop-details");
  if (worktopDetailsElement) {
    worktopDetailsElement.innerHTML = "";
  }

  // Redraw the canvas
  redrawCanvas();
}

/**
 * Handle mouse down event
 * @param {MouseEvent} e - The mouse event
 */
function handleMouseDown(e) {
  const canvas = getCanvas();

  // Reset the current drawing state
  state.isDragging = true;
  state.isDrawing = true;
  state.currentSegments = [];
  state.isFirstSegment = true; // Mark this as the first segment in a new drawing session

  // Get coordinates
  const { x, y } = getMouseCoordinates(e, canvas);

  // Store the mouse position
  state.lastMousePosition = { x, y };

  // Set the starting point
  state.currentPoint = { x, y };
  state.originalClickPoint = { x, y }; // Store the original click point
  state.lastSignificantPoint = { x, y };

  // Reset direction detection for this new drawing
  state.detectedDirection = null;

  // Redraw canvas (which now includes drawing the point marker and other previews)
  redrawCanvas();
}

/**
 * Handle mouse move event
 * @param {MouseEvent} e - The mouse event
 */
function handleMouseMove(e) {
  const canvas = getCanvas();

  // If we're not in drawing mode or not dragging, return
  if (!state.isDrawing || !state.isDragging) {
    return;
  }

  const { x, y } = getMouseCoordinates(e, canvas);

  // Update the last mouse position
  state.lastMousePosition = { x, y };

  // If direction isn't set yet, detect initial direction
  if (!state.detectedDirection) {
    const dx = Math.abs(x - state.currentPoint.x);
    const dy = Math.abs(y - state.currentPoint.y);

    // Only detect direction if we've moved enough pixels
    // Use the smaller initial threshold for first direction detection
    if (
      dx > state.initialDirectionThreshold ||
      dy > state.initialDirectionThreshold
    ) {
      // Determine direction based on which axis has more movement
      if (dx > dy) {
        state.detectedDirection = "horizontal";
        console.log("Detected horizontal direction");
      } else {
        state.detectedDirection = "vertical";
        console.log("Detected vertical direction");
      }

      // We've detected the initial direction, so this is no longer the first segment
      // for future direction changes
      state.isFirstSegment = false;
    }
  } else {
    // We already have a direction, check if we need to change it
    const currentDirection = state.detectedDirection;
    const lastPoint = state.lastSignificantPoint;

    // Calculate movement from the last significant point
    const dx = Math.abs(x - lastPoint.x);
    const dy = Math.abs(y - lastPoint.y);

    // Check if we've moved significantly in the perpendicular direction
    if (
      currentDirection === "horizontal" &&
      dy > state.directionChangeThreshold
    ) {
      // We were moving horizontally but now have significant vertical movement

      // Create a new segment for the completed horizontal line (Previous worktop)
      const endX = x; // Use current mouse x for the corner
      const endY = lastPoint.y; // Keep y the same as the last significant point

      state.currentSegments.push({
        start: { x: lastPoint.x, y: lastPoint.y },
        end: { x: endX, y: endY },
        direction: "horizontal",
        isPrevious: true,
        isFirstSegment: state.currentSegments.length === 0,
      });

      state.lastSignificantPoint = { x: endX, y: endY };
      state.detectedDirection = "vertical";
    } else if (
      currentDirection === "vertical" &&
      dx > state.directionChangeThreshold
    ) {
      // We were moving vertically but now have significant horizontal movement
      const endX = lastPoint.x; // Keep x the same
      const endY = y; // Use current mouse y for the corner

      state.currentSegments.push({
        start: { x: lastPoint.x, y: lastPoint.y },
        end: { x: endX, y: endY },
        direction: "vertical",
        isPrevious: true,
        isFirstSegment: state.currentSegments.length === 0,
      });

      state.lastSignificantPoint = { x: endX, y: endY };
      state.detectedDirection = "horizontal";
    }
  }

  // Redraw canvas with all segments, previews, and points
  redrawCanvas();
}

/**
 * Handle mouse up event
 * @param {MouseEvent} e - The mouse event
 */
function handleMouseUp(e) {
  const canvas = getCanvas();

  if (!state.isDrawing || !state.isDragging) return;

  state.isDragging = false;
  state.isDrawing = false;

  const { x, y } = getMouseCoordinates(e, canvas);

  // Add the final segment if we have a direction
  if (state.detectedDirection) {
    let endX, endY;

    if (state.detectedDirection === "horizontal") {
      endX = x;
      endY = state.lastSignificantPoint.y;
    } else if (state.detectedDirection === "vertical") {
      endX = state.lastSignificantPoint.x;
      endY = y;
    } else {
      endX = x;
      endY = state.lastSignificantPoint.y;
      state.detectedDirection = "horizontal";
    }

    const isFirstSegmentBeingCreated = state.currentSegments.length === 0;

    state.currentSegments.push({
      start: {
        x: state.lastSignificantPoint.x,
        y: state.lastSignificantPoint.y,
      },
      end: { x: endX, y: endY },
      direction: state.detectedDirection,
      isCurrent: true,
      isFirstSegment: isFirstSegmentBeingCreated,
    });
  }

  if (state.currentSegments.length > 0) {
    if (!state.currentSegments[state.currentSegments.length - 1].isCurrent) {
      state.currentSegments[state.currentSegments.length - 1].isCurrent = true;
    }
    for (let i = 0; i < state.currentSegments.length - 1; i++) {
      if (!state.currentSegments[i].isPrevious) {
        state.currentSegments[i].isPrevious = true;
      }
    }
  }

  for (const segment of state.currentSegments) {
    const length = Math.sqrt(
      Math.pow(segment.end.x - segment.start.x, 2) +
        Math.pow(segment.end.y - segment.start.y, 2)
    );

    if (length > 10) {
      const worktop = createWorktopFromSegment(segment);
      worktop.label = state.nextWorktopLabel;
      if (state.nextWorktopLabel === "Z") {
        state.nextWorktopLabel = "AA";
      } else if (
        state.nextWorktopLabel.length > 1 &&
        state.nextWorktopLabel[1] === "Z"
      ) {
        state.nextWorktopLabel =
          String.fromCharCode(state.nextWorktopLabel.charCodeAt(0) + 1) + "A";
      } else {
        state.nextWorktopLabel =
          state.nextWorktopLabel.length === 1
            ? String.fromCharCode(state.nextWorktopLabel.charCodeAt(0) + 1)
            : state.nextWorktopLabel[0] +
              String.fromCharCode(state.nextWorktopLabel.charCodeAt(1) + 1);
      }
      state.worktops.push(worktop);
    }
  }

  // Detect connections, walls, and exterior faces
  detectWorktopConnections();
  // detectWalls(); // Temporarily disable for focused logging
  detectContinuousExteriorFaces();

  // Update UI lists
  updateWorktopList();
  updateWorktopDetails();

  if (state.currentSegments.length === 0 && state.currentPoint) {
    // This case might not be hit anymore if redrawCanvas handles initial point drawing
    // drawPoint(state.currentPoint.x, state.currentPoint.y);
    // No, resetDrawingState calls redrawCanvas which will draw points if state.isDrawing is true,
    // but isDrawing is set to false before resetDrawingState is called in handleMouseUp.
    // If a single click should leave a point, that logic might need review or specific handling.
    // For now, focusing on multi-segment drawing.
  }

  resetDrawingState(); // This already calls redrawCanvas, which will show the final state
}

/**
 * Set up event listeners for the UI
 */
function setupEventListeners() {
  const canvas = getCanvas();

  // Canvas event listeners
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);

  // Button event listeners
  document.getElementById("clear").addEventListener("click", clearCanvas);
  document
    .getElementById("toggle-snap")
    .addEventListener("click", toggleGridSnap);

  // If debug measurements button exists, add event listener
  const debugButton = document.getElementById("debug-measurements");
  if (debugButton) {
    // Use the imported showMeasurementLogs
    debugButton.addEventListener("click", importedShowMeasurementLogs);
  }

  // Window resize event
  window.addEventListener("resize", () => {
    // Use the imported resizeCanvas
    importedResizeCanvas();
  });
}

// Export the UI functions
export {
  updateWorktopList,
  updateWorktopDetails,
  toggleGridSnap,
  clearCanvas,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  setupEventListeners,
};
