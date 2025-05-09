/**
 * app.js
 * Entry point for the Workdraw application
 * This file imports the modular components from the js/ folder
 */

// Import the main module
import { initApp } from "./js/main.js";

// Initialize the application when the DOM is ready
document.addEventListener("DOMContentLoaded", initApp);

// Legacy code below - to be removed once modular version is fully tested
document.addEventListener("DOMContentLoaded", function () {
  // Get the canvas element and its context
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  // Application state
  const state = {
    mode: "smart", // Only 'smart' is used now
    isDrawing: false, // Whether we're currently drawing
    isDragging: false, // Whether the mouse is down
    currentPoint: null, // Current point (start of the current line)
    originalClickPoint: null, // Store the original mouse click point before backfilling
    worktopWidth: 120, // Fixed width for worktop rectangles (in pixels) (600mm in real-world terms)
    worktops: [], // Store all completed worktop rectangles
    currentSegments: [], // Store line segments for the current drag operation
    snapToGrid: true, // Enable grid snapping by default
    gridSize: 20, // Grid size for snapping (20px = 100mm with 5mm per pixel)
    detectedDirection: null, // 'horizontal' or 'vertical' for smart mode
    initialDirectionThreshold: 60, // Minimum pixel movement to detect initial direction
    directionChangeThreshold: 70, // Minimum pixel movement to detect a change in direction
    lastDirection: null, // Store the direction of the last line for alternating
    lastSignificantPoint: null, // Last point where direction changed
    nextWorktopLabel: "A", // Next letter to use for labeling worktops
    pixelsToMm: 5, // Conversion factor: 1 pixel = 5mm (120px = 600mm, 20px grid = 100mm)
    isFirstSegment: true, // Flag to track if this is the first segment in a drawing session
    connectionPoints: [], // Array to store connection points with labels
  };

  // Update the worktop list in the UI
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

  // Redraw the entire canvas
  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid();

    // Draw all completed worktops
    for (const worktop of state.worktops) {
      drawWorktop(worktop);
    }

    // Update the worktop list
    updateWorktopList();

    // Draw current segments as preview worktops
    if (state.isDrawing) {
      // Create a copy of segments for preview with proper corner adjustments
      const previewSegments = [...state.currentSegments];

      // Mark segments for corner adjustments
      if (previewSegments.length > 0) {
        // Mark all but the last segment as previous
        for (let i = 0; i < previewSegments.length - 1; i++) {
          previewSegments[i].isPrevious = true;
        }

        // Mark the last segment as current
        if (previewSegments.length > 0) {
          previewSegments[previewSegments.length - 1].isCurrent = true;
        }
      }

      // Draw all completed segments in the current drawing session
      for (const segment of previewSegments) {
        const worktopSegment = createWorktopFromSegment(segment);
        drawWorktop(worktopSegment, true); // true = preview mode
      }

      // Draw preview for the current segment being drawn
      if (state.lastSignificantPoint && state.detectedDirection) {
        // Calculate preview end point based on current mouse position and direction
        const lastPoint = state.lastSignificantPoint;
        const mousePos = state.lastMousePosition || lastPoint;
        const initialPoint = state.currentPoint; // The initial click point

        let previewEndX, previewEndY;

        if (state.detectedDirection === "horizontal") {
          previewEndX = mousePos.x;
          previewEndY = lastPoint.y;
        } else {
          previewEndX = lastPoint.x;
          previewEndY = mousePos.y;
        }

        // Create a preview segment
        let previewSegment;

        // Check if this would be the first segment
        const isFirstSegmentBeingCreated = state.currentSegments.length === 0;

        // For the first segment in a drawing session, use the initial click point
        // instead of waiting for the direction threshold
        if (isFirstSegmentBeingCreated) {
          previewSegment = {
            start: { x: initialPoint.x, y: initialPoint.y },
            end: { x: previewEndX, y: previewEndY },
            direction: state.detectedDirection,
            isCurrent: true, // Mark as current for corner adjustment
            isFirstSegment: true, // Special flag for the first segment
          };
        } else {
          previewSegment = {
            start: { x: lastPoint.x, y: lastPoint.y },
            end: { x: previewEndX, y: previewEndY },
            direction: state.detectedDirection,
            isCurrent: true, // Mark as current for corner adjustment
            isFirstSegment: false, // Not the first segment
          };
        }

        // Draw it as a worktop
        const previewWorktop = createWorktopFromSegment(previewSegment);

        drawWorktop(previewWorktop, true);
      }
    }

    // Draw points at significant locations
    if (state.originalClickPoint && state.isDrawing) {
      // Draw the original click point in green
      drawPoint(
        state.originalClickPoint.x,
        state.originalClickPoint.y,
        "#00FF00"
      ); // Original click point (green)
    }

    if (state.currentPoint && state.isDrawing) {
      // Draw the current point (which may be backfilled) in red
      drawPoint(state.currentPoint.x, state.currentPoint.y, "#FF0000"); // Starting point (red)
    }

    if (state.lastSignificantPoint && state.isDrawing) {
      drawPoint(state.lastSignificantPoint.x, state.lastSignificantPoint.y); // Current corner
    }

    // Draw end points of all segments
    for (const segment of state.currentSegments) {
      // Draw the original points, not the adjusted ones
      drawPoint(segment.end.x, segment.end.y);
    }

    // Draw connection points with labels
    if (state.connectionPoints && state.connectionPoints.length > 0) {
      for (const point of state.connectionPoints) {
        // Draw a circle for the connection point
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(231, 76, 60, 0.7)"; // Red with some transparency
        ctx.fill();

        // Draw the label
        ctx.font = "bold 12px Arial";
        ctx.fillStyle = "#fff"; // White text
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(point.label, point.x, point.y);
      }
    }

    // Outline measurements display has been removed
  }

  // Create a worktop rectangle from a line segment
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

    // Only assign a label if this is a final worktop (not a preview)
    // We'll handle label assignment separately in handleMouseUp

    return worktop;
  }

  // Debug logs for measurements
  let measurementLogs = [];

  // Function to log measurement data
  function logMeasurement(
    worktopLabel,
    edge,
    type,
    x1,
    y1,
    x2,
    y2,
    lengthPx,
    lengthMm,
    condition = ""
  ) {
    measurementLogs.push({
      worktop: worktopLabel || "Preview",
      edge,
      type,
      coords: { x1, y1, x2, y2 },
      lengthPx,
      lengthMm,
      condition,
    });
  }

  // Function to show all measurement logs
  function showMeasurementLogs() {
    // Format the logs as a readable text file
    let logText = "=== MEASUREMENT LOGS ===\n\n";

    // Add a header row
    logText +=
      "Worktop\tEdge\tType\tX1\tY1\tX2\tY2\tLength(px)\tLength(mm)\tDetails\n";

    // Add each log entry
    measurementLogs.forEach((log) => {
      logText += `${log.worktop}\t${log.edge}\t${log.type}\t${Math.round(
        log.coords.x1
      )}\t${Math.round(log.coords.y1)}\t${Math.round(
        log.coords.x2
      )}\t${Math.round(log.coords.y2)}\t${Math.round(log.lengthPx)}\t${
        log.lengthMm
      }\t${log.condition}\n`;
    });

    // Create a blob with the text content
    const blob = new Blob([logText], { type: "text/plain" });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "measurement_logs.txt";

    // Trigger the download
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);

    // Also log to console for debugging
    console.clear();
    console.log("=== MEASUREMENT LOGS ===");
    console.table(measurementLogs);

    // Clear logs after showing
    measurementLogs = [];
  }

  // Draw a worktop rectangle
  function drawWorktop(worktop, isPreview = false) {
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
              originalLengthPx = Math.abs(
                originalCoords.x2 - originalCoords.x1
              );
              adjustedLengthPx = Math.abs(
                adjustedCoords.x2 - adjustedCoords.x1
              );
            } else {
              originalLengthPx = Math.abs(
                originalCoords.y2 - originalCoords.y1
              );
              adjustedLengthPx = Math.abs(
                adjustedCoords.y2 - adjustedCoords.y1
              );
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

  // Make canvas responsive to its container, but only on window resize
  function resizeCanvas() {
    const container = document.querySelector(".canvas-container");
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Set canvas dimensions to match container
    canvas.width = containerWidth - 20; // Subtract padding
    canvas.height = containerHeight - 20;

    // Redraw everything after resize
    redrawCanvas();
  }

  // Initial resize
  resizeCanvas();

  // Only resize canvas when window size changes, not when content changes
  window.addEventListener("resize", resizeCanvas);

  // Button event listeners
  document.getElementById("clear").addEventListener("click", clearCanvas);
  document
    .getElementById("toggle-snap")
    .addEventListener("click", toggleGridSnap);
  document
    .getElementById("debug-measurements")
    .addEventListener("click", showMeasurementLogs);

  // Canvas event listeners
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);

  // Reset the drawing state
  function resetDrawingState() {
    state.isDrawing = false;
    state.isDragging = false;
    state.detectedDirection = null;
    state.currentPoint = null;
    state.originalClickPoint = null; // Reset the original click point
    state.lastDirection = null;
    state.currentSegments = [];
    state.lastSignificantPoint = null;
    state.lastMousePosition = null;

    redrawCanvas();
  }

  // Toggle grid snapping
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
      drawPoint(state.currentPoint.x, state.currentPoint.y);
    }
  }

  // Snap coordinate to grid
  function snapToGrid(coord) {
    if (!state.snapToGrid) return coord;
    return Math.round(coord / state.gridSize) * state.gridSize;
  }

  // Get mouse coordinates relative to canvas
  function getMouseCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let x = Math.round(e.clientX - rect.left);
    let y = Math.round(e.clientY - rect.top);

    // Apply grid snapping if enabled
    if (state.snapToGrid) {
      x = snapToGrid(x);
      y = snapToGrid(y);
    }

    return { x, y };
  }

  // Handle mouse down - start drawing
  function handleMouseDown(e) {
    // Reset the current drawing state
    state.isDragging = true;
    state.isDrawing = true;
    state.currentSegments = [];
    state.isFirstSegment = true; // Mark this as the first segment in a new drawing session

    // Get coordinates
    const { x, y } = getMouseCoordinates(e);

    // Store the mouse position
    state.lastMousePosition = { x, y };

    // Set the starting point
    state.currentPoint = { x, y };
    state.originalClickPoint = { x, y }; // Store the original click point
    state.lastSignificantPoint = { x, y };

    // Reset direction detection for this new drawing
    state.detectedDirection = null;

    // Draw a point marker
    drawPoint(state.currentPoint.x, state.currentPoint.y);

    // Redraw canvas
    redrawCanvas();
  }

  // Handle mouse move - update the preview
  function handleMouseMove(e) {
    // If we're not in drawing mode or not dragging, return
    if (!state.isDrawing || !state.isDragging) {
      return;
    }

    const { x, y } = getMouseCoordinates(e);

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
        const endX = x;
        const endY = lastPoint.y;

        // Extend the previous worktop's end point by half the worktop width
        // For horizontal worktops, we don't need to adjust the X coordinate
        // since we're extending in the horizontal direction

        // Check if this is the first segment being created
        const isFirstSegmentBeingCreated = state.currentSegments.length === 0;

        // Add the completed segment (Previous worktop)
        state.currentSegments.push({
          start: { x: lastPoint.x, y: lastPoint.y },
          end: { x: endX, y: endY },
          direction: "horizontal",
          isPrevious: true, // Mark as previous for corner adjustment
          isFirstSegment: isFirstSegmentBeingCreated, // Explicitly set based on segment count
        });

        // Update the last significant point to the corner
        state.lastSignificantPoint = { x: endX, y: endY };

        // Change direction to vertical
        state.detectedDirection = "vertical";
      } else if (
        currentDirection === "vertical" &&
        dx > state.directionChangeThreshold
      ) {
        // We were moving vertically but now have significant horizontal movement

        // Create a new segment for the completed vertical line (Previous worktop)
        const endX = lastPoint.x;
        const endY = y;

        // Extend the previous worktop's end point by half the worktop width
        // For vertical worktops, we don't need to adjust the Y coordinate
        // since we're extending in the vertical direction

        // Check if this is the first segment being created
        const isFirstSegmentBeingCreated = state.currentSegments.length === 0;

        // Add the completed segment (Previous worktop)
        state.currentSegments.push({
          start: { x: lastPoint.x, y: lastPoint.y },
          end: { x: endX, y: endY },
          direction: "vertical",
          isPrevious: true, // Mark as previous for corner adjustment
          isFirstSegment: isFirstSegmentBeingCreated, // Explicitly set based on segment count
        });

        // Update the last significant point to the corner
        state.lastSignificantPoint = { x: endX, y: endY };

        // Change direction to horizontal
        state.detectedDirection = "horizontal";
      }
    }

    // Redraw canvas with all segments and preview
    redrawCanvas();
  }

  // Handle mouse up - complete the drawing
  function handleMouseUp(e) {
    if (!state.isDrawing || !state.isDragging) return;

    state.isDragging = false;
    state.isDrawing = false;

    const { x, y } = getMouseCoordinates(e);

    // Add the final segment if we have a direction
    if (state.detectedDirection) {
      // Calculate end point based on detected direction
      let endX, endY;

      if (state.detectedDirection === "horizontal") {
        endX = x;
        endY = state.lastSignificantPoint.y;
      } else if (state.detectedDirection === "vertical") {
        endX = state.lastSignificantPoint.x;
        endY = y;
      } else {
        // If no direction was detected, default to horizontal
        endX = x;
        endY = state.lastSignificantPoint.y;
        state.detectedDirection = "horizontal";
      }

      // Add the final segment (Current worktop)

      // Check if this is the first segment being created
      const isFirstSegmentBeingCreated = state.currentSegments.length === 0;

      state.currentSegments.push({
        start: {
          x: state.lastSignificantPoint.x,
          y: state.lastSignificantPoint.y,
        },
        end: { x: endX, y: endY },
        direction: state.detectedDirection,
        isCurrent: true, // Mark as current for corner adjustment
        isFirstSegment: isFirstSegmentBeingCreated, // Explicitly set based on segment count
      });
    }

    // Process segments to apply corner adjustments
    // First, mark the last segment as current and any previous segments as previous
    if (state.currentSegments.length > 0) {
      // Mark the last segment as current if not already marked
      if (!state.currentSegments[state.currentSegments.length - 1].isCurrent) {
        state.currentSegments[
          state.currentSegments.length - 1
        ].isCurrent = true;
      }

      // Mark all other segments as previous if not already marked
      for (let i = 0; i < state.currentSegments.length - 1; i++) {
        if (!state.currentSegments[i].isPrevious) {
          state.currentSegments[i].isPrevious = true;
        }
      }
    }

    // Convert all segments to worktops and add them to the worktops array
    for (const segment of state.currentSegments) {
      // Only add segments that have a minimum length
      const length = Math.sqrt(
        Math.pow(segment.end.x - segment.start.x, 2) +
          Math.pow(segment.end.y - segment.start.y, 2)
      );

      if (length > 10) {
        // Create a worktop from the segment with corner adjustments
        // Keep the isPrevious and isCurrent flags for proper corner handling
        const worktop = createWorktopFromSegment(segment);

        // Assign the next available letter as the label
        worktop.label = state.nextWorktopLabel;

        // Increment the label for the next worktop
        // If we reach 'Z', wrap around to 'AA', 'AB', etc.
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

        // Add it to the collection
        state.worktops.push(worktop);
      }
    }

    // Detect connections between worktops and adjust edge coordinates
    detectWorktopConnections();

    // If we didn't create any segments (just a click), create a point
    if (state.currentSegments.length === 0 && state.currentPoint) {
      // Draw a point
      drawPoint(state.currentPoint.x, state.currentPoint.y);
    }

    // Reset for next drawing
    state.currentPoint = null;
    state.originalClickPoint = null; // Reset the original click point
    state.lastSignificantPoint = null;
    state.detectedDirection = null;
    state.currentSegments = [];
    state.lastMousePosition = null;

    // Redraw to show final result
    redrawCanvas();
  }

  // Draw a point marker
  function drawPoint(x, y, color = "#3498db") {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Create edge object with coordinates and properties
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

  // Get corner coordinates for a worktop
  function getCornerCoordinates(worktop) {
    return {
      TL: { x: worktop.x, y: worktop.y }, // Top-Left
      TR: { x: worktop.x + worktop.width, y: worktop.y }, // Top-Right
      BL: { x: worktop.x, y: worktop.y + worktop.height }, // Bottom-Left
      BR: { x: worktop.x + worktop.width, y: worktop.y + worktop.height }, // Bottom-Right
    };
  }

  // Draw grid
  function drawGrid() {
    const gridSize = state.gridSize;

    ctx.beginPath();
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }

    // Horizontal lines
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }

    ctx.stroke();

    // Draw thicker lines every 5 grid cells (500mm or 0.5m)
    ctx.beginPath();
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= canvas.width; x += gridSize * 5) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }

    // Horizontal lines
    for (let y = 0; y <= canvas.height; y += gridSize * 5) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }

    // Add measurements to the grid (every 500mm)
    ctx.font = "10px Arial";
    ctx.fillStyle = "#888";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Add horizontal measurements (along the top)
    for (let x = gridSize * 5; x <= canvas.width; x += gridSize * 5) {
      const mm = (x / gridSize) * 100; // Convert to mm
      ctx.fillText(`${mm}mm`, x + 2, 2);
    }

    // Add vertical measurements (along the left side)
    for (let y = gridSize * 5; y <= canvas.height; y += gridSize * 5) {
      const mm = (y / gridSize) * 100; // Convert to mm
      ctx.fillText(`${mm}mm`, 2, y + 2);
    }

    ctx.stroke();
  }

  // Clear the canvas
  function clearCanvas() {
    state.worktops = [];
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
  }

  // Set initial mode to smart
  state.mode = "smart";

  // Function to update the worktop details panel
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
          const originalLengthMm = Math.round(
            originalLength * state.pixelsToMm
          );
          const adjustedLengthMm = Math.round(
            adjustedLength * state.pixelsToMm
          );

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

  // Function to adjust edge coordinates based on connections
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

  // Function to detect and record connections between worktops
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

  // Function to check if two edges are connected
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

  // Call updateWorktopDetails whenever the worktop list is updated
  const originalUpdateWorktopList = updateWorktopList;
  updateWorktopList = function () {
    // Save current canvas dimensions
    const currentWidth = canvas.width;
    const currentHeight = canvas.height;

    // Detect connections between worktops
    detectWorktopConnections();

    // Update the worktop list
    originalUpdateWorktopList.apply(this, arguments);

    // Update worktop details
    updateWorktopDetails();

    // Restore canvas dimensions if they were changed
    if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
      canvas.width = currentWidth;
      canvas.height = currentHeight;
      redrawCanvas();
    }
  };
});
