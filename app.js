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
    worktopWidth: 120, // Fixed width for worktop rectangles (in pixels) (600mm in real-world terms)
    worktops: [], // Store all completed worktop rectangles
    currentSegments: [], // Store line segments for the current drag operation
    snapToGrid: true, // Enable grid snapping by default
    gridSize: 50, // Grid size for snapping
    detectedDirection: null, // 'horizontal' or 'vertical' for smart mode
    initialDirectionThreshold: 60, // Minimum pixel movement to detect initial direction
    directionChangeThreshold: 70, // Minimum pixel movement to detect a change in direction
    lastDirection: null, // Store the direction of the last line for alternating
    lastSignificantPoint: null, // Last point where direction changed
    nextWorktopLabel: "A", // Next letter to use for labeling worktops
    pixelsToMm: 5, // Conversion factor: 1 pixel = 5mm (120px = 600mm)
  };

  // Redraw the entire canvas
  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid();

    // Draw all completed worktops
    for (const worktop of state.worktops) {
      drawWorktop(worktop);
    }

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

        let previewEndX, previewEndY;

        if (state.detectedDirection === "horizontal") {
          previewEndX = mousePos.x;
          previewEndY = lastPoint.y;
        } else {
          previewEndX = lastPoint.x;
          previewEndY = mousePos.y;
        }

        // Create a preview segment
        const previewSegment = {
          start: { x: lastPoint.x, y: lastPoint.y },
          end: { x: previewEndX, y: previewEndY },
          direction: state.detectedDirection,
          isCurrent: true, // Mark as current for corner adjustment
        };

        // Draw it as a worktop
        const previewWorktop = createWorktopFromSegment(previewSegment);
        drawWorktop(previewWorktop, true);
      }
    }

    // Draw points at significant locations
    if (state.currentPoint && state.isDrawing) {
      drawPoint(state.currentPoint.x, state.currentPoint.y); // Starting point
    }

    if (state.lastSignificantPoint && state.isDrawing) {
      drawPoint(state.lastSignificantPoint.x, state.lastSignificantPoint.y); // Current corner
    }

    // Draw end points of all segments
    for (const segment of state.currentSegments) {
      // Draw the original points, not the adjusted ones
      drawPoint(segment.end.x, segment.end.y);
    }
  }

  // Create a worktop rectangle from a line segment
  function createWorktopFromSegment(segment) {
    const { start, end, direction, isPrevious, isCurrent } = segment;
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

    if (isCurrent) {
      // For current worktop, shorten the start point by half the worktop width
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
    };

    // Only assign a label if this is a final worktop (not a preview)
    // We'll handle label assignment separately in handleMouseUp

    return worktop;
  }

  // Draw a worktop rectangle
  function drawWorktop(worktop, isPreview = false) {
    // Fill the rectangle with a semi-transparent color
    ctx.fillStyle = isPreview
      ? "rgba(52, 152, 219, 0.3)"
      : "rgba(52, 152, 219, 0.5)";
    ctx.fillRect(worktop.x, worktop.y, worktop.width, worktop.height);

    // Draw the border
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 2;
    ctx.strokeRect(worktop.x, worktop.y, worktop.width, worktop.height);

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

    if (worktop.direction === "horizontal") {
      // For horizontal worktops, show length on the top edge
      const lengthMm = Math.round(worktop.width * state.pixelsToMm);

      // Draw measurement on top edge
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        `${lengthMm}mm`,
        worktop.x + worktop.width / 2,
        worktop.y - 5
      );

      // Draw the fixed width (600mm) on the right edge
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
      const lengthMm = Math.round(worktop.height * state.pixelsToMm);

      // Draw measurement on left edge
      ctx.save();
      ctx.translate(worktop.x - 5, worktop.y + worktop.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${lengthMm}mm`, 0, 0);
      ctx.restore();

      // Draw the fixed width (600mm) on the top edge
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("600mm", worktop.x + worktop.width / 2, worktop.y - 5);
    }
  }

  // Make canvas responsive to its container
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

  // Resize canvas when window size changes
  window.addEventListener("resize", resizeCanvas);

  // Button event listeners
  document.getElementById("clear").addEventListener("click", clearCanvas);
  document
    .getElementById("toggle-snap")
    .addEventListener("click", toggleGridSnap);

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

    const { x, y } = getMouseCoordinates(e);

    // Store the mouse position
    state.lastMousePosition = { x, y };

    // Set the starting point
    state.currentPoint = { x, y };
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
        if (dx > dy) {
          state.detectedDirection = "horizontal";
        } else {
          state.detectedDirection = "vertical";
        }
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

        // Add the completed segment (Previous worktop)
        state.currentSegments.push({
          start: { x: lastPoint.x, y: lastPoint.y },
          end: { x: endX, y: endY },
          direction: "horizontal",
          isPrevious: true, // Mark as previous for corner adjustment
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

        // Add the completed segment (Previous worktop)
        state.currentSegments.push({
          start: { x: lastPoint.x, y: lastPoint.y },
          end: { x: endX, y: endY },
          direction: "vertical",
          isPrevious: true, // Mark as previous for corner adjustment
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
      state.currentSegments.push({
        start: {
          x: state.lastSignificantPoint.x,
          y: state.lastSignificantPoint.y,
        },
        end: { x: endX, y: endY },
        direction: state.detectedDirection,
        isCurrent: true, // Mark as current for corner adjustment
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

    // If we didn't create any segments (just a click), create a point
    if (state.currentSegments.length === 0 && state.currentPoint) {
      // Draw a point
      drawPoint(state.currentPoint.x, state.currentPoint.y);
    }

    // Reset for next drawing
    state.currentPoint = null;
    state.lastSignificantPoint = null;
    state.detectedDirection = null;
    state.currentSegments = [];
    state.lastMousePosition = null;

    // Redraw to show final result
    redrawCanvas();
  }

  // Draw a point marker
  function drawPoint(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#3498db";
    ctx.fill();
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

    // Draw thicker lines every 5 grid cells
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

    ctx.stroke();
  }

  // Clear the canvas
  function clearCanvas() {
    state.worktops = [];
    state.nextWorktopLabel = "A"; // Reset the label counter
    resetDrawingState();
  }

  // Set initial mode to smart
  state.mode = "smart";
});
