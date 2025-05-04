document.addEventListener("DOMContentLoaded", function () {
  // Get the canvas element and its context
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  // Variables for worktop editing
  let editingWorktopIndex = -1;
  const modal = document.getElementById("edit-modal");
  const closeButton = document.querySelector(".close-button");
  const saveButton = document.getElementById("save-dimensions");
  const cancelButton = document.getElementById("cancel-edit");
  const lengthInput = document.getElementById("worktop-length");
  const widthInput = document.getElementById("worktop-width");

  // Application state
  const state = {
    mode: "smart", // Only 'smart' is used now
    isDrawing: false, // Whether we're currently drawing
    isDragging: false, // Whether the mouse is down
    currentPoint: null, // Current point (start of the current line)
    originalClickPoint: null, // Store the original mouse click point before backfilling
    worktopWidth: 120, // Fixed width for worktop rectangles (in pixels) (600mm in real-world terms)
    worktops: [], // Store all completed worktop rectangles (legacy - will be replaced by shapes)
    shapes: [], // Store completed worktop shapes (each shape can contain multiple segments)
    currentShape: null, // The shape currently being drawn
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
    divisionMode: false, // Whether we're in division mode (placing join lines)
  };

  // Create a shape object from segments
  function createShapeFromSegments(segments) {
    // Create a new shape object
    const shape = {
      id: Date.now(), // Unique ID for the shape
      segments: [], // Array of segments that make up the shape
      joinPoints: [], // Array of points where the shape will be divided into worktops
      worktops: [], // Array of worktops after division
    };

    // Process each segment to create worktop rectangles
    for (const segment of segments) {
      // Create a worktop from the segment with corner adjustments
      const worktopSegment = createWorktopFromSegment(segment);

      // Add the segment to the shape
      shape.segments.push(worktopSegment);
    }

    return shape;
  }

  // Update the worktop list in the UI
  function updateWorktopList() {
    const worktopListElement = document.getElementById("worktop-list");
    worktopListElement.innerHTML = ""; // Clear the list

    // If we have shapes, show them instead of individual worktops
    if (state.shapes.length > 0) {
      for (let i = 0; i < state.shapes.length; i++) {
        const shape = state.shapes[i];
        const p = document.createElement("p");

        // Calculate total length of the shape
        let totalLength = 0;
        for (const segment of shape.segments) {
          if (segment.direction === "horizontal") {
            totalLength += Math.round(segment.width * state.pixelsToMm);
          } else {
            totalLength += Math.round(segment.height * state.pixelsToMm);
          }
        }

        p.textContent = `Shape ${i + 1}: ${totalLength}mm total length`;
        p.dataset.shapeId = shape.id;
        worktopListElement.appendChild(p);
      }

      // Add a button to enter division mode
      const divButton = document.createElement("button");
      divButton.textContent = "Divide Shapes";
      divButton.id = "divide-shapes";
      divButton.addEventListener("click", toggleDivisionMode);
      worktopListElement.appendChild(divButton);

      return;
    }

    // Legacy: Add each worktop to the list
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

  // Toggle division mode
  function toggleDivisionMode() {
    state.divisionMode = !state.divisionMode;

    // Update the toolbar button
    const toolbarButton = document.getElementById("toggle-division");
    if (state.divisionMode) {
      toolbarButton.textContent = "Exit Division Mode";
      toolbarButton.classList.add("active");
    } else {
      toolbarButton.textContent = "Division Mode";
      toolbarButton.classList.remove("active");
    }

    // Also update the button in the worktop list if it exists
    const listButton = document.getElementById("divide-shapes");
    if (listButton) {
      if (state.divisionMode) {
        listButton.textContent = "Exit Division Mode";
        listButton.classList.add("active");
      } else {
        listButton.textContent = "Divide Shapes";
        listButton.classList.remove("active");
      }
    }

    redrawCanvas();
  }

  // Show or hide the division mode button based on whether there are shapes
  function updateDivisionModeButton() {
    const button = document.getElementById("toggle-division");
    if (state.shapes.length > 0) {
      button.style.display = "inline-block";
    } else {
      button.style.display = "none";
      state.divisionMode = false;
    }
  }

  // Redraw the entire canvas
  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid();

    // Draw all completed shapes
    for (const shape of state.shapes) {
      drawShape(shape);
    }

    // Legacy: Draw all completed worktops if no shapes
    if (state.shapes.length === 0) {
      for (const worktop of state.worktops) {
        drawWorktop(worktop);
      }
    }

    // Update the worktop list
    updateWorktopList();

    // Update the division mode button visibility
    updateDivisionModeButton();

    // Draw current segments as preview shape
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

      // Create preview segments array including current segments and the active segment
      let allPreviewSegments = [...previewSegments];

      // Add the current segment being drawn if applicable
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

        // Add to the preview segments
        allPreviewSegments.push(previewSegment);
      }

      // If we have any segments to preview, create and draw a preview shape
      if (allPreviewSegments.length > 0) {
        // Create worktop segments from the preview segments
        const worktopSegments = allPreviewSegments.map((segment) =>
          createWorktopFromSegment(segment)
        );

        // Draw the preview shape
        drawPreviewShape(worktopSegments);
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
    };

    // Only assign a label if this is a final worktop (not a preview)
    // We'll handle label assignment separately in handleMouseUp

    return worktop;
  }

  // Draw a preview shape (collection of connected worktop segments)
  function drawPreviewShape(segments) {
    // First, fill all segments with a semi-transparent color
    ctx.fillStyle = "rgba(52, 152, 219, 0.3)";

    // Draw each segment in the shape (fill only)
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
    }

    // Now draw only the outer border of the entire shape
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 2;

    // We need to determine which edges are external edges
    // For each segment, check if each edge is an external edge
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      // Check top edge
      let isTopExternal = true;
      for (let j = 0; j < segments.length; j++) {
        if (i !== j) {
          const otherSegment = segments[j];
          if (
            segment.y === otherSegment.y + otherSegment.height && // Segment is below other segment
            segment.x < otherSegment.x + otherSegment.width && // Segments overlap horizontally
            segment.x + segment.width > otherSegment.x
          ) {
            isTopExternal = false;
            break;
          }
        }
      }

      // Draw top edge if external
      if (isTopExternal) {
        ctx.beginPath();
        ctx.moveTo(segment.x, segment.y);
        ctx.lineTo(segment.x + segment.width, segment.y);
        ctx.stroke();
      }

      // Check right edge
      let isRightExternal = true;
      for (let j = 0; j < segments.length; j++) {
        if (i !== j) {
          const otherSegment = segments[j];
          if (
            segment.x + segment.width === otherSegment.x && // Segment is to the left of other segment
            segment.y < otherSegment.y + otherSegment.height && // Segments overlap vertically
            segment.y + segment.height > otherSegment.y
          ) {
            isRightExternal = false;
            break;
          }
        }
      }

      // Draw right edge if external
      if (isRightExternal) {
        ctx.beginPath();
        ctx.moveTo(segment.x + segment.width, segment.y);
        ctx.lineTo(segment.x + segment.width, segment.y + segment.height);
        ctx.stroke();
      }

      // Check bottom edge
      let isBottomExternal = true;
      for (let j = 0; j < segments.length; j++) {
        if (i !== j) {
          const otherSegment = segments[j];
          if (
            segment.y + segment.height === otherSegment.y && // Segment is above other segment
            segment.x < otherSegment.x + otherSegment.width && // Segments overlap horizontally
            segment.x + segment.width > otherSegment.x
          ) {
            isBottomExternal = false;
            break;
          }
        }
      }

      // Draw bottom edge if external
      if (isBottomExternal) {
        ctx.beginPath();
        ctx.moveTo(segment.x + segment.width, segment.y + segment.height);
        ctx.lineTo(segment.x, segment.y + segment.height);
        ctx.stroke();
      }

      // Check left edge
      let isLeftExternal = true;
      for (let j = 0; j < segments.length; j++) {
        if (i !== j) {
          const otherSegment = segments[j];
          if (
            segment.x === otherSegment.x + otherSegment.width && // Segment is to the right of other segment
            segment.y < otherSegment.y + otherSegment.height && // Segments overlap vertically
            segment.y + segment.height > otherSegment.y
          ) {
            isLeftExternal = false;
            break;
          }
        }
      }

      // Draw left edge if external
      if (isLeftExternal) {
        ctx.beginPath();
        ctx.moveTo(segment.x, segment.y + segment.height);
        ctx.lineTo(segment.x, segment.y);
        ctx.stroke();
      }
    }
  }

  // Draw a shape (collection of connected worktop segments)
  function drawShape(shape) {
    // First, fill all segments with the same color
    ctx.fillStyle = "rgba(52, 152, 219, 0.5)";

    // Draw each segment in the shape (fill only)
    for (let i = 0; i < shape.segments.length; i++) {
      const segment = shape.segments[i];
      ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
    }

    // Now draw only the outer border of the entire shape
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 2;

    // We need to determine which edges are external edges
    // For each segment, check if each edge is an external edge
    for (let i = 0; i < shape.segments.length; i++) {
      const segment = shape.segments[i];

      // Check top edge
      let isTopExternal = true;
      for (let j = 0; j < shape.segments.length; j++) {
        if (i !== j) {
          const otherSegment = shape.segments[j];
          if (
            segment.y === otherSegment.y + otherSegment.height && // Segment is below other segment
            segment.x < otherSegment.x + otherSegment.width && // Segments overlap horizontally
            segment.x + segment.width > otherSegment.x
          ) {
            isTopExternal = false;
            break;
          }
        }
      }

      // Draw top edge if external
      if (isTopExternal) {
        ctx.beginPath();
        ctx.moveTo(segment.x, segment.y);
        ctx.lineTo(segment.x + segment.width, segment.y);
        ctx.stroke();
      }

      // Check right edge
      let isRightExternal = true;
      for (let j = 0; j < shape.segments.length; j++) {
        if (i !== j) {
          const otherSegment = shape.segments[j];
          if (
            segment.x + segment.width === otherSegment.x && // Segment is to the left of other segment
            segment.y < otherSegment.y + otherSegment.height && // Segments overlap vertically
            segment.y + segment.height > otherSegment.y
          ) {
            isRightExternal = false;
            break;
          }
        }
      }

      // Draw right edge if external
      if (isRightExternal) {
        ctx.beginPath();
        ctx.moveTo(segment.x + segment.width, segment.y);
        ctx.lineTo(segment.x + segment.width, segment.y + segment.height);
        ctx.stroke();
      }

      // Check bottom edge
      let isBottomExternal = true;
      for (let j = 0; j < shape.segments.length; j++) {
        if (i !== j) {
          const otherSegment = shape.segments[j];
          if (
            segment.y + segment.height === otherSegment.y && // Segment is above other segment
            segment.x < otherSegment.x + otherSegment.width && // Segments overlap horizontally
            segment.x + segment.width > otherSegment.x
          ) {
            isBottomExternal = false;
            break;
          }
        }
      }

      // Draw bottom edge if external
      if (isBottomExternal) {
        ctx.beginPath();
        ctx.moveTo(segment.x + segment.width, segment.y + segment.height);
        ctx.lineTo(segment.x, segment.y + segment.height);
        ctx.stroke();
      }

      // Check left edge
      let isLeftExternal = true;
      for (let j = 0; j < shape.segments.length; j++) {
        if (i !== j) {
          const otherSegment = shape.segments[j];
          if (
            segment.x === otherSegment.x + otherSegment.width && // Segment is to the right of other segment
            segment.y < otherSegment.y + otherSegment.height && // Segments overlap vertically
            segment.y + segment.height > otherSegment.y
          ) {
            isLeftExternal = false;
            break;
          }
        }
      }

      // Draw left edge if external
      if (isLeftExternal) {
        ctx.beginPath();
        ctx.moveTo(segment.x, segment.y + segment.height);
        ctx.lineTo(segment.x, segment.y);
        ctx.stroke();
      }
    }

    // Draw join points and lines if in division mode
    if (state.divisionMode) {
      // First draw potential join line when hovering (if we have mouse position)
      if (state.lastMousePosition && !state.isDrawing) {
        const { x, y } = state.lastMousePosition;

        // Check if mouse is over any segment
        for (const segment of shape.segments) {
          if (
            x >= segment.x &&
            x <= segment.x + segment.width &&
            y >= segment.y &&
            y <= segment.y + segment.height
          ) {
            // Draw a dashed line to indicate potential join
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = "rgba(231, 76, 60, 0.7)";
            ctx.lineWidth = 2;

            if (segment.direction === "horizontal") {
              // For horizontal segments, draw vertical join line
              ctx.moveTo(x, segment.y);
              ctx.lineTo(x, segment.y + segment.height);
            } else {
              // For vertical segments, draw horizontal join line
              ctx.moveTo(segment.x, y);
              ctx.lineTo(segment.x + segment.width, y);
            }

            ctx.stroke();
            ctx.setLineDash([]); // Reset dash pattern
            break;
          }
        }
      }

      // Draw existing join points and lines
      for (const joinPoint of shape.joinPoints) {
        // Find which segment this join point is on
        for (const segment of shape.segments) {
          if (
            joinPoint.x >= segment.x &&
            joinPoint.x <= segment.x + segment.width &&
            joinPoint.y >= segment.y &&
            joinPoint.y <= segment.y + segment.height
          ) {
            // Draw the join line
            ctx.beginPath();
            ctx.strokeStyle = "#c0392b";
            ctx.lineWidth = 2;

            if (segment.direction === "horizontal") {
              // For horizontal segments, draw vertical join line
              ctx.moveTo(joinPoint.x, segment.y);
              ctx.lineTo(joinPoint.x, segment.y + segment.height);
            } else {
              // For vertical segments, draw horizontal join line
              ctx.moveTo(segment.x, joinPoint.y);
              ctx.lineTo(segment.x + segment.width, joinPoint.y);
            }

            ctx.stroke();
            break;
          }
        }

        // Draw the join point
        ctx.beginPath();
        ctx.arc(joinPoint.x, joinPoint.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(231, 76, 60, 0.7)"; // Red dot for join points
        ctx.fill();
        ctx.strokeStyle = "#c0392b";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw measurements for the entire shape
    if (shape.segments.length > 0) {
      // Find the topmost segment for placing the measurement
      let topSegment = shape.segments[0];
      for (const segment of shape.segments) {
        if (segment.y < topSegment.y) {
          topSegment = segment;
        }
      }

      // Calculate total length of the shape
      let totalLength = 0;
      for (const segment of shape.segments) {
        if (segment.direction === "horizontal") {
          totalLength += Math.round(segment.width * state.pixelsToMm);
        } else {
          totalLength += Math.round(segment.height * state.pixelsToMm);
        }
      }

      // Draw the total length at the top of the shape
      ctx.font = "14px Arial";
      ctx.fillStyle = "#2980b9";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      // Add a background for better visibility
      const textWidth = ctx.measureText(`Total: ${totalLength}mm`).width;
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillRect(
        topSegment.x + topSegment.width / 2 - textWidth / 2 - 5,
        topSegment.y - 25,
        textWidth + 10,
        20
      );

      ctx.fillStyle = "#2980b9";
      ctx.fillText(
        `Total: ${totalLength}mm`,
        topSegment.x + topSegment.width / 2,
        topSegment.y - 10
      );
    }
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

    // Only make measurements clickable for final worktops (not previews)
    if (!isPreview) {
      ctx.fillStyle = "#2980b9"; // Blue color for clickable measurements
    } else {
      ctx.fillStyle = "rgba(44, 62, 80, 0.6)"; // Lighter color for preview
    }

    if (worktop.direction === "horizontal") {
      // For horizontal worktops, show length on the top edge
      const lengthMm = Math.round(worktop.width * state.pixelsToMm);

      // Draw measurement on top edge
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      // Add a background for the measurement text to make it more visible
      if (!isPreview) {
        const textWidth = ctx.measureText(`${lengthMm}mm`).width;
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fillRect(
          worktop.x + worktop.width / 2 - textWidth / 2 - 3,
          worktop.y - 20,
          textWidth + 6,
          15
        );
        ctx.fillStyle = "#2980b9"; // Blue color for clickable measurements
      }

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

      // Add a background for the measurement text to make it more visible
      if (!isPreview) {
        const textWidth = ctx.measureText(`${lengthMm}mm`).width;
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fillRect(-textWidth / 2 - 3, -15, textWidth + 6, 15);
        ctx.fillStyle = "#2980b9"; // Blue color for clickable measurements
      }

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
  document
    .getElementById("toggle-division")
    .addEventListener("click", toggleDivisionMode);

  // Canvas event listeners
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("click", handleCanvasClick);

  // Worktop list click event
  document
    .getElementById("worktop-list")
    .addEventListener("click", handleWorktopListClick);

  // Modal event listeners
  closeButton.addEventListener("click", closeModal);
  saveButton.addEventListener("click", saveWorktopDimensions);
  cancelButton.addEventListener("click", closeModal);

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

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
    const { x, y } = getMouseCoordinates(e);

    // Always update the last mouse position
    state.lastMousePosition = { x, y };

    // If in division mode, redraw to show hover effect
    if (state.divisionMode && !state.isDrawing) {
      redrawCanvas();
    }

    // If we're not in drawing mode or not dragging, return
    if (!state.isDrawing || !state.isDragging) {
      return;
    }

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

    // Check if we have any valid segments
    let hasValidSegments = false;
    for (const segment of state.currentSegments) {
      const length = Math.sqrt(
        Math.pow(segment.end.x - segment.start.x, 2) +
          Math.pow(segment.end.y - segment.start.y, 2)
      );

      if (length > 10) {
        hasValidSegments = true;
        break;
      }
    }

    if (hasValidSegments) {
      // Create a shape from all the segments
      const shape = createShapeFromSegments(state.currentSegments);

      // Add the shape to the collection
      state.shapes.push(shape);

      // Update the division mode button visibility
      updateDivisionModeButton();
    }

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
    state.shapes = [];
    state.nextWorktopLabel = "A"; // Reset the label counter
    state.divisionMode = false;
    resetDrawingState();

    // Clear the worktop list
    const worktopListElement = document.getElementById("worktop-list");
    worktopListElement.innerHTML = "";

    // Update the division mode button visibility
    updateDivisionModeButton();
  }

  // Handle clicks on the canvas to detect worktop measurements or add join points
  function handleCanvasClick(e) {
    if (state.isDrawing) return; // Don't handle clicks during drawing

    const { x, y } = getMouseCoordinates(e);

    // If in division mode, handle adding join points
    if (state.divisionMode) {
      // Check if we clicked on a shape
      for (let i = 0; i < state.shapes.length; i++) {
        const shape = state.shapes[i];

        // Check if click is on any segment of the shape
        for (const segment of shape.segments) {
          if (
            x >= segment.x &&
            x <= segment.x + segment.width &&
            y >= segment.y &&
            y <= segment.y + segment.height
          ) {
            // Add a join point at the click location
            shape.joinPoints.push({ x, y });

            // Redraw the canvas to show the new join point
            redrawCanvas();
            return;
          }
        }
      }
      return;
    }

    // Legacy: Check if we clicked on a worktop measurement
    for (let i = 0; i < state.worktops.length; i++) {
      const worktop = state.worktops[i];

      // Check if click is near the length measurement
      if (isClickNearLengthMeasurement(x, y, worktop)) {
        openEditModal(i);
        return;
      }
    }

    // Check if we clicked on a shape measurement
    for (let i = 0; i < state.shapes.length; i++) {
      const shape = state.shapes[i];

      // For now, just check if we clicked near the top of the first segment
      if (shape.segments.length > 0) {
        const segment = shape.segments[0];

        // Check if click is near the top measurement
        if (
          x >= segment.x &&
          x <= segment.x + segment.width &&
          y >= segment.y - 30 &&
          y <= segment.y - 5
        ) {
          // In the future, we could open a modal to edit the entire shape
          alert("Shape editing will be implemented in a future update.");
          return;
        }
      }
    }
  }

  // Check if a click is near a worktop's length measurement
  function isClickNearLengthMeasurement(x, y, worktop) {
    // For horizontal worktops, check if click is above the worktop
    if (worktop.direction === "horizontal") {
      return (
        x >= worktop.x &&
        x <= worktop.x + worktop.width &&
        y >= worktop.y - 25 &&
        y <= worktop.y
      );
    } else {
      // For vertical worktops, check if click is to the left of the worktop
      return (
        y >= worktop.y &&
        y <= worktop.y + worktop.height &&
        x >= worktop.x - 25 &&
        x <= worktop.x
      );
    }
  }

  // Handle clicks on the worktop list
  function handleWorktopListClick(e) {
    if (e.target.tagName === "P") {
      // Extract the worktop label from the text (e.g., "A: 1200 x 600mm")
      const label = e.target.textContent.split(":")[0];

      // Find the worktop with this label
      const worktopIndex = state.worktops.findIndex((w) => w.label === label);

      if (worktopIndex !== -1) {
        openEditModal(worktopIndex);
      }
    }
  }

  // Open the edit modal for a specific worktop
  function openEditModal(worktopIndex) {
    editingWorktopIndex = worktopIndex;
    const worktop = state.worktops[worktopIndex];

    // Calculate dimensions in millimeters
    let length;
    if (worktop.direction === "horizontal") {
      length = Math.round(worktop.width * state.pixelsToMm);
    } else {
      length = Math.round(worktop.height * state.pixelsToMm);
    }

    // Set the input values
    lengthInput.value = length;
    widthInput.value = 600; // Fixed width for now

    // Show the modal
    modal.classList.add("show");
  }

  // Close the edit modal
  function closeModal() {
    modal.classList.remove("show");
    editingWorktopIndex = -1;
  }

  // Save the worktop dimensions
  function saveWorktopDimensions() {
    if (editingWorktopIndex === -1) return;

    const worktop = state.worktops[editingWorktopIndex];
    const newLength = parseInt(lengthInput.value);
    const newWidth = parseInt(widthInput.value);

    // Validate inputs
    if (isNaN(newLength) || newLength < 100) {
      alert("Please enter a valid length (minimum 100mm)");
      return;
    }

    if (isNaN(newWidth) || newWidth < 100) {
      alert("Please enter a valid width (minimum 100mm)");
      return;
    }

    // Convert mm to pixels
    const newLengthPx = newLength / state.pixelsToMm;
    const newWidthPx = newWidth / state.pixelsToMm;

    // Update the worktop dimensions
    if (worktop.direction === "horizontal") {
      // For horizontal worktops, update width (which is the length)
      const oldWidth = worktop.width;
      worktop.width = newLengthPx;

      // If this is not the first worktop, we need to update the next worktop's position
      if (editingWorktopIndex < state.worktops.length - 1) {
        const nextWorktop = state.worktops[editingWorktopIndex + 1];
        if (
          nextWorktop.direction === "vertical" &&
          Math.abs(nextWorktop.x - (worktop.x + oldWidth)) < 5
        ) {
          // This is a connected worktop, update its position
          nextWorktop.x = worktop.x + worktop.width;
        }
      }

      // Update the worktop height (width in real-world terms)
      worktop.height = newWidthPx;
      // Center the worktop on the original line
      worktop.y = worktop.start.y - newWidthPx / 2;
    } else {
      // For vertical worktops, update height (which is the length)
      const oldHeight = worktop.height;
      worktop.height = newLengthPx;

      // If this is not the first worktop, we need to update the next worktop's position
      if (editingWorktopIndex < state.worktops.length - 1) {
        const nextWorktop = state.worktops[editingWorktopIndex + 1];
        if (
          nextWorktop.direction === "horizontal" &&
          Math.abs(nextWorktop.y - (worktop.y + oldHeight)) < 5
        ) {
          // This is a connected worktop, update its position
          nextWorktop.y = worktop.y + worktop.height;
        }
      }

      // Update the worktop width (width in real-world terms)
      worktop.width = newWidthPx;
      // Center the worktop on the original line
      worktop.x = worktop.start.x - newWidthPx / 2;
    }

    // Close the modal
    closeModal();

    // Redraw the canvas
    redrawCanvas();
  }

  // Set initial mode to smart
  state.mode = "smart";
});
