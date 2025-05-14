/**
 * app.js
 * Main entry point for the Drawzone application
 * Uses Fabric.js for canvas manipulation
 */

// Application state
const state = {
  // Canvas settings
  gridSize: 20, // Grid size in pixels
  snapToGrid: true, // Grid snapping enabled by default
  worktopWidth: 120, // Width of worktops in pixels

  // Worktop data
  worktops: [], // Array to store worktop data
  nextLabel: "A", // Next label for worktops
  previousWorktop: null, // Reference to the previous worktop
  previousWorktopDirection: null, // Direction of the previous worktop
  previousTurnDirection: null, // Direction of the previous turn

  // Edge labels
  currentEdgeLabels: { top: null, bottom: null, left: null, right: null }, // Current worktop edge labels
  previousEdgeLabels: { top: null, bottom: null, left: null, right: null }, // Previous worktop edge labels

  // Drawing state
  isDrawing: false,
  currentLine: null,
  startPoint: null,
  initialDirectionThreshold: 60, // Pixels to move before detecting direction
  directionChangeThreshold: 70, // Pixels to move before detecting direction change
  detectedDirection: null, // 'N', 'S', 'E', or 'W' (compass directions)
  isFirstSegment: true, // Is this the first segment in a drawing sequence

  // UI elements
  previewWorktop: null, // Current preview worktop
  currentPointDot: null, // Dot showing current point
  startLine: null, // Line showing start point
  startDot: null, // Dot showing start point
  gridLines: [], // Grid lines
};

// Global canvas instance
let canvas;

/**
 * Initialize the Fabric.js canvas
 */
function initCanvas() {
  // Create canvas instance
  canvas = new fabric.Canvas("canvas", {
    selection: false, // Disable group selection
    preserveObjectStacking: true, // Maintain object stacking order
  });

  // Set canvas dimensions based on container
  resizeCanvas();

  // Create grid
  createGrid();

  // Set up canvas event listeners
  setupCanvasEvents();

  return canvas;
}

/**
 * Resize canvas to fit container
 */
function resizeCanvas() {
  const container = document.querySelector(".canvas-container");
  const width = container.clientWidth - 20; // Subtract padding
  const height = container.clientHeight - 20; // Subtract padding

  canvas.setWidth(width);
  canvas.setHeight(height);
  canvas.renderAll();
}

/**
 * Create grid on canvas
 */
function createGrid() {
  // Clear any existing grid
  if (state.gridLines) {
    state.gridLines.forEach((line) => canvas.remove(line));
  }

  state.gridLines = [];
  const width = canvas.getWidth();
  const height = canvas.getHeight();

  // Create vertical lines
  for (let i = 0; i <= width; i += state.gridSize) {
    const line = new fabric.Line([i, 0, i, height], {
      stroke: "#ddd",
      selectable: false,
      evented: false,
      strokeWidth: i % 100 === 0 ? 2 : 1, // Make every 5th line thicker
    });
    state.gridLines.push(line);
    canvas.add(line);
    line.sendToBack();
  }

  // Create horizontal lines
  for (let i = 0; i <= height; i += state.gridSize) {
    const line = new fabric.Line([0, i, width, i], {
      stroke: "#ddd",
      selectable: false,
      evented: false,
      strokeWidth: i % 100 === 0 ? 2 : 1, // Make every 5th line thicker
    });
    state.gridLines.push(line);
    canvas.add(line);
    line.sendToBack();
  }

  canvas.renderAll();
}

/**
 * Set up canvas event listeners for drawing
 */
function setupCanvasEvents() {
  // Mouse down event
  canvas.on("mouse:down", function (options) {
    handleMouseDown(options.pointer);
  });

  // Mouse move event
  canvas.on("mouse:move", function (options) {
    handleMouseMove(options.pointer);
  });

  // Mouse up event
  canvas.on("mouse:up", function (options) {
    handleMouseUp(options.pointer);
  });
}

/**
 * Handle mouse down event
 * @param {Object} pointer - Mouse coordinates
 */
function handleMouseDown(pointer) {
  // Start drawing
  state.isDrawing = true;

  // Snap to grid if enabled
  const point = snapToGrid(pointer);

  // Always use the clicked point as the start point
  // This allows creating disconnected worktops
  state.startPoint = { ...point };
  state.originalClickPoint = { ...point }; // Store original click point for reference

  // If we're starting a new drawing (not continuing from a previous one)
  // Reset the edge labels and set isFirstSegment flag
  if (!state.detectedDirection) {
    state.isFirstSegment = true;
    state.currentEdgeLabels = {
      top: null,
      bottom: null,
      left: null,
      right: null,
    };
    state.previousEdgeLabels = {
      top: null,
      bottom: null,
      left: null,
      right: null,
    };

    // Reset the previous worktop and direction
    state.previousWorktop = null;
    state.previousWorktopDirection = null;
    state.previousTurnDirection = null;
  }

  // Create a temporary line
  state.currentLine = new fabric.Line(
    [
      state.startPoint.x,
      state.startPoint.y,
      state.startPoint.x,
      state.startPoint.y,
    ],
    {
      stroke: "#3498db",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }
  );

  // Add line to canvas
  canvas.add(state.currentLine);
  canvas.renderAll();

  // Create visual indicator for start point (green dot)
  const startDot = new fabric.Circle({
    left: state.startPoint.x - 5,
    top: state.startPoint.y - 5,
    radius: 5,
    fill: "green",
    selectable: false,
    evented: false,
  });

  state.startDot = startDot;
  canvas.add(startDot);
}

/**
 * Handle mouse move event
 * @param {Object} pointer - Mouse coordinates
 */
function handleMouseMove(pointer) {
  if (!state.isDrawing) return;

  // Snap to grid if enabled
  const point = snapToGrid(pointer);

  // Store the current mouse position for reference
  state.lastMousePosition = point;

  // Calculate distance from start point
  const dx = Math.abs(point.x - state.startPoint.x);
  const dy = Math.abs(point.y - state.startPoint.y);
  const distance = Math.sqrt(dx * dx + dy * dy);

  // If we haven't detected a direction yet and we've moved enough
  if (!state.detectedDirection && distance >= state.initialDirectionThreshold) {
    // Determine compass direction (N, S, E, W) based on movement
    if (dx > dy) {
      // More horizontal movement
      state.detectedDirection = point.x > state.startPoint.x ? "E" : "W";
    } else {
      // More vertical movement
      state.detectedDirection = point.y > state.startPoint.y ? "S" : "N";
    }

    // Set last significant point to the start point
    state.lastSignificantPoint = { ...state.startPoint };

    // Remove the temporary line
    canvas.remove(state.currentLine);

    // Create a preview worktop
    createPreviewWorktop();

    // After detecting a direction, this is no longer the first segment of a new drawing
    // unless it's the very first worktop
    if (state.worktops.length > 0) {
      state.isFirstSegment = false;
    } else {
      // For the very first worktop (A), set edge labels based on compass direction
      // The inner edge should always face the inside of the shape being drawn
      if (state.detectedDirection === "E" || state.detectedDirection === "W") {
        // East or West (horizontal)
        state.currentEdgeLabels = {
          top: "outer", // Top is always outer for first horizontal worktop
          bottom: "inner", // Bottom is always inner for first horizontal worktop
          left: null,
          right: null,
        };
      } else if (state.detectedDirection === "S") {
        // South (top to bottom)
        state.currentEdgeLabels = {
          top: null,
          bottom: null,
          left: "inner", // Left is inner for South
          right: "outer", // Right is outer for South
        };
      } else {
        // North (bottom to top)
        state.currentEdgeLabels = {
          top: null,
          bottom: null,
          left: "outer", // Left is outer for North
          right: "inner", // Right is inner for North
        };
      }
      console.log(
        "First worktop default edge labels:",
        state.currentEdgeLabels
      );
    }
  }

  // If we have a direction, check for direction changes and update the preview
  if (state.detectedDirection) {
    // Check if we need to detect a direction change
    if (state.lastSignificantPoint) {
      // Calculate distance from last significant point
      const lastDx = Math.abs(point.x - state.lastSignificantPoint.x);
      const lastDy = Math.abs(point.y - state.lastSignificantPoint.y);

      // Check if we've moved significantly in the perpendicular direction
      if (
        ((state.detectedDirection === "E" || state.detectedDirection === "W") &&
          lastDy >= state.directionChangeThreshold) ||
        ((state.detectedDirection === "N" || state.detectedDirection === "S") &&
          lastDx >= state.directionChangeThreshold)
      ) {
        // Determine the new compass direction after the turn
        let newDirection;

        if (
          state.detectedDirection === "E" ||
          state.detectedDirection === "W"
        ) {
          // Currently moving horizontally, turning to vertical
          newDirection = point.y > state.lastSignificantPoint.y ? "S" : "N";
        } else {
          // Currently moving vertically, turning to horizontal
          newDirection = point.x > state.lastSignificantPoint.x ? "E" : "W";
        }

        // The turn direction is the new direction
        const turnDirection = newDirection;

        // Create an endpoint for the current worktop that extends to the turn point
        const currentEnd = { ...point };
        if (
          state.detectedDirection === "E" ||
          state.detectedDirection === "W"
        ) {
          currentEnd.y = state.lastSignificantPoint.y; // Keep y coordinate the same for horizontal lines
        } else {
          currentEnd.x = state.lastSignificantPoint.x; // Keep x coordinate the same for vertical lines
        }

        // Finalize the current worktop segment
        const currentWorktop = finalizeWorktop(
          state.lastSignificantPoint,
          currentEnd,
          state.detectedDirection,
          turnDirection
        );

        // Create a starting point for the new worktop that connects to the end of the previous one
        const newStart = { ...currentEnd };

        // Update the last significant point to the new start point
        state.lastSignificantPoint = { ...newStart };

        // Store the turn information for the next worktop
        state.previousTurnDirection = turnDirection;
        state.previousWorktopDirection = state.detectedDirection;
        state.previousWorktop = currentWorktop;

        // Set inner/outer edges for both the previous and current worktop
        setInnerOuterEdges(
          turnDirection, // New direction is the turn direction
          state.detectedDirection,
          turnDirection
        );

        // Apply the edge labels to the previous worktop
        if (state.previousWorktop && state.previousEdgeLabels) {
          console.log(
            "Updating previous worktop edge labels:",
            state.previousEdgeLabels
          );

          // IMPORTANT: Force a complete redraw of the canvas
          // First, store all the worktops
          const allWorktops = [...state.worktops];

          // Store references to preview elements
          const previewWorktop = state.previewWorktop;
          const currentPointDot = state.currentPointDot;
          const startLine = state.startLine;

          // Clear the canvas of all objects except grid and preview elements
          const objects = canvas.getObjects();
          objects.forEach((obj) => {
            if (
              !state.gridLines.includes(obj) &&
              obj !== previewWorktop &&
              obj !== currentPointDot &&
              obj !== startLine
            ) {
              canvas.remove(obj);
            }
          });

          // Update the edge labels in the worktops array
          for (let i = 0; i < allWorktops.length; i++) {
            if (allWorktops[i].id === state.previousWorktop.id) {
              allWorktops[i].edgeLabels = { ...state.previousEdgeLabels };
              // Store the turn information
              allWorktops[i].turnInfo = {
                from: state.previousWorktopDirection || state.detectedDirection,
                to: turnDirection,
                turn: turnDirection,
              };
              console.log("Updated worktop in array:", allWorktops[i]);
              break;
            }
          }

          // Also update the reference to the previous worktop
          state.previousWorktop.edgeLabels = { ...state.previousEdgeLabels };
          state.previousWorktop.turnInfo = {
            from: state.previousWorktopDirection || state.detectedDirection,
            to: turnDirection,
            turn: turnDirection,
          };

          // Redraw all worktops with their current edge labels
          allWorktops.forEach((worktop) => {
            // Recreate the polygon
            const points = worktop.corners;
            const finalWorktop = new fabric.Polygon(points, {
              fill: "rgba(52, 152, 219, 0.5)",
              stroke: "#3498db",
              strokeWidth: 3,
              selectable: false,
              evented: false,
              perPixelTargetFind: true,
            });

            // Add to canvas
            canvas.add(finalWorktop);

            // Add corner coordinate labels
            points.forEach((point, index) => {
              const cornerNames = ["TL", "TR", "BR", "BL"];
              const cornerLabel = new fabric.Text(
                `${cornerNames[index]}: (${Math.round(point.x)},${Math.round(
                  point.y
                )})`,
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

            // Add edge labels
            const direction = worktop.direction;
            const edgeLabelsData = worktop.edgeLabels;

            // Get turn information if available
            let turnInfo = "";
            if (worktop.turnInfo) {
              turnInfo = ` [Turn: ${worktop.turnInfo.from}->${worktop.turnInfo.to}]`;
            }

            if (direction === "E" || direction === "W") {
              // For horizontal worktops (East or West)
              if (edgeLabelsData.top) {
                const topEdgeLabel = new fabric.Text(
                  `${
                    edgeLabelsData.top === "inner" ? "Inner" : "Outer"
                  } (TOP) [${direction}]${turnInfo}`,
                  {
                    left: (points[0].x + points[1].x) / 2,
                    top: Math.min(points[0].y, points[1].y) - 15,
                    fontSize: 10,
                    fill: edgeLabelsData.top === "inner" ? "blue" : "red",
                    backgroundColor: "rgba(255,255,255,0.7)",
                    selectable: false,
                    evented: false,
                  }
                );
                canvas.add(topEdgeLabel);
              }

              if (edgeLabelsData.bottom) {
                const bottomEdgeLabel = new fabric.Text(
                  `${
                    edgeLabelsData.bottom === "inner" ? "Inner" : "Outer"
                  } (BOTTOM) [${direction}]${turnInfo}`,
                  {
                    left: (points[2].x + points[3].x) / 2,
                    top: Math.max(points[2].y, points[3].y) + 5,
                    fontSize: 10,
                    fill: edgeLabelsData.bottom === "inner" ? "blue" : "red",
                    backgroundColor: "rgba(255,255,255,0.7)",
                    selectable: false,
                    evented: false,
                  }
                );
                canvas.add(bottomEdgeLabel);
              }
            } else {
              // For vertical worktops (North or South)
              if (edgeLabelsData.left) {
                const leftEdgeLabel = new fabric.Text(
                  `${
                    edgeLabelsData.left === "inner" ? "Inner" : "Outer"
                  } (LEFT) [${direction}]${turnInfo}`,
                  {
                    left: Math.min(points[0].x, points[3].x) - 30,
                    top: (points[0].y + points[3].y) / 2,
                    fontSize: 10,
                    fill: edgeLabelsData.left === "inner" ? "blue" : "red",
                    backgroundColor: "rgba(255,255,255,0.7)",
                    selectable: false,
                    evented: false,
                  }
                );
                canvas.add(leftEdgeLabel);
              }

              if (edgeLabelsData.right) {
                const rightEdgeLabel = new fabric.Text(
                  `${
                    edgeLabelsData.right === "inner" ? "Inner" : "Outer"
                  } (RIGHT) [${direction}]${turnInfo}`,
                  {
                    left: Math.max(points[1].x, points[2].x) + 5,
                    top: (points[1].y + points[2].y) / 2,
                    fontSize: 10,
                    fill: edgeLabelsData.right === "inner" ? "blue" : "red",
                    backgroundColor: "rgba(255,255,255,0.7)",
                    selectable: false,
                    evented: false,
                  }
                );
                canvas.add(rightEdgeLabel);
              }
            }
          });

          // Update the state.worktops array
          state.worktops = allWorktops;

          // Log the updated worktop for debugging
          console.log("Updated previous worktop:", state.previousWorktop);
        }

        // Log the current edge labels for debugging
        console.log("Current edge labels after turn:", state.currentEdgeLabels);

        // Change the direction to the new compass direction (turn direction)
        state.detectedDirection = turnDirection;

        // Make sure the current edge labels are applied to the state
        console.log(
          "Setting current edge labels for new direction:",
          state.currentEdgeLabels
        );

        // Create a new preview worktop for the new direction
        createPreviewWorktop();
      }
    }

    // Update the preview worktop
    updatePreviewWorktop(point);
  } else {
    // Just update the line if we haven't detected a direction yet
    state.currentLine.set({
      x2: point.x,
      y2: point.y,
    });
  }

  canvas.renderAll();
}

/**
 * Create a preview worktop based on the detected direction
 */
function createPreviewWorktop() {
  // Remove any existing preview
  if (state.previewWorktop) {
    canvas.remove(state.previewWorktop);
  }

  // Create initial points for the polygon (will be updated later)
  const initialPoints = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  // Create a new polygon for the preview worktop
  state.previewWorktop = new fabric.Polygon(initialPoints, {
    fill: "rgba(52, 152, 219, 0.5)", // More opaque fill
    stroke: "#3498db",
    strokeWidth: 3, // Thicker stroke
    selectable: false,
    evented: false,
    perPixelTargetFind: true,
    left: 0,
    top: 0,
  });

  // Add to canvas
  canvas.add(state.previewWorktop);
  state.previewWorktop.bringToFront();

  // Create a red dot to mark the current point
  if (state.currentPointDot) {
    canvas.remove(state.currentPointDot);
  }

  state.currentPointDot = new fabric.Circle({
    left: state.lastSignificantPoint.x - 5,
    top: state.lastSignificantPoint.y - 5,
    radius: 5,
    fill: "red",
    selectable: false,
    evented: false,
  });

  canvas.add(state.currentPointDot);

  // Create start line at the bottom
  if (state.startLine) {
    canvas.remove(state.startLine);
  }

  state.startLine = new fabric.Line([], {
    stroke: "#3498db",
    strokeWidth: 2,
    selectable: false,
    evented: false,
  });

  canvas.add(state.startLine);
}

/**
 * Update the preview worktop based on current mouse position
 * @param {Object} point - Current mouse position
 */
function updatePreviewWorktop(point) {
  if (!state.previewWorktop || !state.detectedDirection) {
    return;
  }

  const start = state.lastSignificantPoint;
  const halfWidth = state.worktopWidth / 2;
  let end = { ...point };

  // Snap the end point to the detected direction
  if (state.detectedDirection === "E" || state.detectedDirection === "W") {
    end.y = start.y; // Keep y coordinate the same for horizontal lines
  } else {
    end.x = start.x; // Keep x coordinate the same for vertical lines
  }

  // Calculate the four corners of the worktop
  let points = [];

  if (state.detectedDirection === "E" || state.detectedDirection === "W") {
    // For horizontal worktops (East or West)
    points = [
      { x: start.x, y: start.y - halfWidth }, // Top-left
      { x: end.x, y: end.y - halfWidth }, // Top-right
      { x: end.x, y: end.y + halfWidth }, // Bottom-right
      { x: start.x, y: start.y + halfWidth }, // Bottom-left
    ];

    // Update start line at the bottom
    state.startLine.set({
      x1: start.x,
      y1: start.y + halfWidth,
      x2: start.x,
      y2: start.y + halfWidth + 20, // 20px down
    });
  } else {
    // For vertical worktops (North or South)
    points = [
      { x: start.x - halfWidth, y: start.y }, // Top-left
      { x: start.x + halfWidth, y: start.y }, // Top-right
      { x: end.x + halfWidth, y: end.y }, // Bottom-right
      { x: end.x - halfWidth, y: end.y }, // Bottom-left
    ];

    // Update start line at the bottom (left side for vertical)
    state.startLine.set({
      x1: start.x - halfWidth,
      y1: start.y,
      x2: start.x - halfWidth - 20, // 20px to the left
      y2: start.y,
    });
  }

  // Remove the old polygon
  canvas.remove(state.previewWorktop);

  // Create a new polygon with the calculated points
  state.previewWorktop = new fabric.Polygon(points, {
    fill: "rgba(52, 152, 219, 0.5)", // More opaque fill
    stroke: "#3498db",
    strokeWidth: 3, // Thicker stroke
    selectable: false,
    evented: false,
    perPixelTargetFind: true,
  });

  // Add the new polygon to the canvas
  canvas.add(state.previewWorktop);
  state.previewWorktop.bringToFront();

  // Update the current point dot
  state.currentPointDot.set({
    left: end.x - 5,
    top: end.y - 5,
  });

  // Render the canvas
  canvas.renderAll();
}

/**
 * Handle mouse up event
 * @param {Object} pointer - Mouse coordinates
 */
function handleMouseUp(pointer) {
  if (!state.isDrawing) return;

  // End drawing
  state.isDrawing = false;

  // Snap to grid if enabled
  const point = snapToGrid(pointer);

  if (state.detectedDirection) {
    // If we have a direction, update the preview one last time
    updatePreviewWorktop(point);

    // For the final worktop on mouse up, we need to determine if we're continuing from a turn
    // If we are, we should use the current edge labels that were set during the turn
    // Edge labels for the first segment were already set in handleMouseMove when direction was detected

    // Log the current edge labels before finalizing
    console.log(
      "Edge labels before finalizing worktop:",
      state.currentEdgeLabels
    );

    // For the last worktop (on mouse up), we need to determine the appropriate edge labels
    // based on the previous worktop and the current direction
    if (state.previousWorktop && !state.isFirstSegment) {
      // This is the last worktop in a sequence (D in A-B-C-D)
      // We need to call setInnerOuterEdges to properly set its edge labels
      console.log("Setting edge labels for last worktop in sequence");

      // The key insight: for the last worktop, we need to continue the pattern
      // from the previous worktops, ensuring inner edges face the inside of the shape
      setInnerOuterEdges(
        state.detectedDirection, // Current direction
        state.previousWorktopDirection, // Previous direction
        state.detectedDirection // Use current direction as "turn" direction
      );

      console.log(
        "Edge labels after setting for last worktop:",
        state.currentEdgeLabels
      );
    }

    // Finalize the worktop (save it and keep it on the canvas)
    const worktop = finalizeWorktop(
      state.lastSignificantPoint,
      point,
      state.detectedDirection,
      state.detectedDirection // Use current direction as turn direction
    );

    // Log the worktop data for debugging
    console.log("Finalized worktop:", worktop);

    // Store the current direction as previous for the next worktop
    state.previousWorktopDirection = state.detectedDirection;

    // Store the current worktop as previous for the next worktop
    state.previousWorktop = worktop;

    // Reset direction detection for next drawing
    state.detectedDirection = null;
    state.lastSignificantPoint = null;
    state.previousTurnDirection = null;

    // Keep the edge labels for the next worktop if double-clicking to end
    // This allows creating disconnected worktops with the same edge labels
  } else {
    // If we haven't detected a direction yet, just update the line
    state.currentLine.set({
      x2: point.x,
      y2: point.y,
    });

    // Remove the line since we didn't create a worktop
    canvas.remove(state.currentLine);
    canvas.remove(state.startDot);
  }

  canvas.renderAll();
}

/**
 * Finalize a worktop by saving it and keeping it on the canvas
 * @param {Object} start - Start point of the worktop centerline
 * @param {Object} end - End point of the worktop centerline
 * @param {string} direction - Direction of the worktop ('N', 'S', 'E', 'W')
 * @param {string} turnDirection - Direction of the turn (if any): 'N', 'S', 'E', 'W'
 * @returns {Object} The created worktop data
 */
function finalizeWorktop(start, end, direction, turnDirection = null) {
  const halfWidth = state.worktopWidth / 2;

  // Snap the end point to the detected direction
  let finalEnd = { ...end };
  if (direction === "E" || direction === "W") {
    finalEnd.y = start.y; // Keep y coordinate the same for horizontal lines
  } else {
    finalEnd.x = start.x; // Keep x coordinate the same for vertical lines
  }

  // Create copies of start and end points that we can adjust for corners
  let adjustedStart = { ...start };
  let adjustedEnd = { ...finalEnd };

  // Check if this is the first segment
  const isFirstSegment = state.worktops.length === 0 || state.isFirstSegment;

  // We don't need to adjust the start or end points
  // Instead, we'll modify the corner points directly to create diagonal corners at turns

  // First, calculate the basic rectangle corners
  let points = [];
  if (direction === "E" || direction === "W") {
    // For horizontal worktops (East or West)
    if (direction === "E") {
      // Drawing East (left to right)
      points = [
        { x: start.x, y: start.y - halfWidth }, // Top-left
        { x: finalEnd.x, y: finalEnd.y - halfWidth }, // Top-right
        { x: finalEnd.x, y: finalEnd.y + halfWidth }, // Bottom-right
        { x: start.x, y: start.y + halfWidth }, // Bottom-left
      ];
    } else {
      // Drawing West (right to left)
      points = [
        { x: finalEnd.x, y: finalEnd.y - halfWidth }, // Top-left
        { x: start.x, y: start.y - halfWidth }, // Top-right
        { x: start.x, y: start.y + halfWidth }, // Bottom-right
        { x: finalEnd.x, y: finalEnd.y + halfWidth }, // Bottom-left
      ];
    }
  } else {
    // For vertical worktops (North or South)
    if (direction === "S") {
      // Drawing South (top to bottom)
      points = [
        { x: start.x - halfWidth, y: start.y }, // Top-left
        { x: start.x + halfWidth, y: start.y }, // Top-right
        { x: finalEnd.x + halfWidth, y: finalEnd.y }, // Bottom-right
        { x: finalEnd.x - halfWidth, y: finalEnd.y }, // Bottom-left
      ];
    } else {
      // Drawing North (bottom to top)
      points = [
        { x: finalEnd.x - halfWidth, y: finalEnd.y }, // Top-left
        { x: finalEnd.x + halfWidth, y: finalEnd.y }, // Top-right
        { x: start.x + halfWidth, y: start.y }, // Bottom-right
        { x: start.x - halfWidth, y: start.y }, // Bottom-left
      ];
    }
  }

  // No corner adjustments - just showing the basic rectangle corners with labels

  // Points have already been calculated and adjusted above

  // The moving direction is already encoded in the compass direction
  let movingDirection = direction; // N, S, E, W

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
  console.log("Creating worktop with edge labels:", {
    ...state.currentEdgeLabels,
  });

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
    console.log("Default edge labels set:", edgeLabels);
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
    turnDirection: turnDirection,
    edgeLabels: edgeLabels, // Store the edge labels with the worktop
  };

  // Add to worktops array
  state.worktops.push(worktopData);

  // Log the worktop data for debugging
  console.log(
    `Worktop ${worktopData.label} edge labels:`,
    worktopData.edgeLabels
  );

  // Update next label (A, B, C, etc.)
  state.nextLabel = String.fromCharCode(state.nextLabel.charCodeAt(0) + 1);

  // Add to worktop list in UI
  const worktopList = document.getElementById("worktop-list");
  const listItem = document.createElement("div");
  listItem.textContent = `Worktop ${worktopData.label}: ${direction}${
    turnDirection ? ` (${turnDirection})` : ""
  }`;
  worktopList.appendChild(listItem);

  // Update directions panel
  updateDirectionsPanel(worktopData);

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

/**
 * Set inner and outer edges based on compass direction and turn
 * @param {string} currentDirection - Direction of the current worktop ('N', 'S', 'E', 'W')
 * @param {string} previousDirection - Direction of the previous worktop ('N', 'S', 'E', 'W')
 * @param {string} turnDirection - Direction of the turn: 'N', 'S', 'E', 'W'
 */
function setInnerOuterEdges(
  currentDirection,
  previousDirection,
  turnDirection
) {
  // The moving directions are already encoded in the compass directions
  // N = up, S = down, E = right, W = left

  // Log the detailed information for debugging
  console.log("Previous worktop:", state.previousWorktop);
  console.log("Last significant point:", state.lastSignificantPoint);
  console.log("Previous direction:", previousDirection);
  console.log("Current direction:", currentDirection);
  console.log("Turn direction:", turnDirection);

  // Apply the rules based on the compass directions
  console.log(
    "Checking rule for:",
    previousDirection,
    "turning to",
    currentDirection
  );

  // Simplified rules using compass directions
  if (previousDirection === "N") {
    // Coming from North (bottom to top)
    if (currentDirection === "E") {
      // North to East (turn right)
      state.previousEdgeLabels = {
        top: null,
        bottom: null,
        left: "outer", // Left is outer for North
        right: "inner", // Right is inner for North
      };
      state.currentEdgeLabels = {
        top: "outer",
        bottom: "inner",
        left: null,
        right: null,
      };
      console.log("RULE APPLIED: N to E (bottom to top, then right)");
    } else if (currentDirection === "W") {
      // North to West (turn left)
      state.previousEdgeLabels = {
        top: null,
        bottom: null,
        left: "inner", // Left is inner for North
        right: "outer", // Right is outer for North
      };
      state.currentEdgeLabels = {
        top: "outer",
        bottom: "inner",
        left: null,
        right: null,
      };
      console.log("RULE APPLIED: N to W (bottom to top, then left)");
    }
  } else if (previousDirection === "S") {
    // Coming from South (top to bottom)
    if (currentDirection === "E") {
      // South to East (turn left)
      state.previousEdgeLabels = {
        top: null,
        bottom: null,
        left: "outer",
        right: "inner",
      };
      state.currentEdgeLabels = {
        top: "inner",
        bottom: "outer",
        left: null,
        right: null,
      };
      console.log("RULE APPLIED: S to E (top to bottom, then right)");
    } else if (currentDirection === "W") {
      // South to West (turn left)
      state.previousEdgeLabels = {
        top: null,
        bottom: null,
        left: "inner",
        right: "outer",
      };
      state.currentEdgeLabels = {
        top: "inner",
        bottom: "outer",
        left: null,
        right: null,
      };
      console.log("RULE APPLIED: S to W (top to bottom, then left)");
    }
  } else if (previousDirection === "E") {
    // Coming from East (left to right)
    if (currentDirection === "N") {
      // East to North (turn left)
      state.previousEdgeLabels = {
        top: "inner",
        bottom: "outer",
        left: null,
        right: null,
      };
      state.currentEdgeLabels = {
        top: null,
        bottom: null,
        left: "inner", // Left is inner for North (swapped from outer)
        right: "outer", // Right is outer for North (swapped from inner)
      };
      console.log("RULE APPLIED: E to N (left to right, then up)");
    } else if (currentDirection === "S") {
      // East to South (turn right)
      state.previousEdgeLabels = {
        top: "outer",
        bottom: "inner",
        left: null,
        right: null,
      };
      state.currentEdgeLabels = {
        top: null,
        bottom: null,
        left: "inner",
        right: "outer",
      };
      console.log("RULE APPLIED: E to S (left to right, then down)");
    }
  } else if (previousDirection === "W") {
    // Coming from West (right to left)
    if (currentDirection === "N") {
      // West to North (turn right)
      state.previousEdgeLabels = {
        top: "inner",
        bottom: "outer",
        left: null,
        right: null,
      };
      state.currentEdgeLabels = {
        top: null,
        bottom: null,
        left: "outer", // Left is outer for North
        right: "inner", // Right is inner for North
      };
      console.log("RULE APPLIED: W to N (right to left, then up)");
    } else if (currentDirection === "S") {
      // West to South (turn left)
      state.previousEdgeLabels = {
        top: "outer",
        bottom: "inner",
        left: null,
        right: null,
      };
      state.currentEdgeLabels = {
        top: null,
        bottom: null,
        left: "outer",
        right: "inner",
      };
      console.log("RULE APPLIED: W to S (right to left, then down)");
    }
  } else {
    console.log(
      "WARNING: No matching rule for",
      previousDirection,
      "turning to",
      currentDirection
    );
  }

  console.log("Previous edge labels:", state.previousEdgeLabels);
  console.log("Current edge labels:", state.currentEdgeLabels);
}

/**
 * Update the directions panel with worktop directions and edge labels
 * @param {Object} newWorktop - The newly added worktop (optional)
 */
function updateDirectionsPanel(newWorktop = null) {
  const directionsPanel = document.getElementById("directions-list");
  directionsPanel.innerHTML = ""; // Clear existing content

  // Create a list of worktop directions and edge labels
  state.worktops.forEach((worktop) => {
    const directionItem = document.createElement("div");
    directionItem.style.marginBottom = "8px";

    // The direction is already a compass direction (N, S, E, W)
    const compassDirection = worktop.direction;

    // Basic direction info with compass direction
    let infoText = `${worktop.label} worktop direction = ${compassDirection}`;

    // For the first worktop, use the current edge labels if it's the newly added worktop
    const edgeLabels =
      worktop.edgeLabels ||
      (newWorktop && worktop.id === newWorktop.id
        ? state.currentEdgeLabels
        : null);

    // Add edge labels info
    if (compassDirection === "E" || compassDirection === "W") {
      // East or West (horizontal)
      if (edgeLabels && edgeLabels.top) {
        infoText += `<br>Top = ${edgeLabels.top}`;
      }
      if (edgeLabels && edgeLabels.bottom) {
        infoText += `<br>Bottom = ${edgeLabels.bottom}`;
      }
    } else {
      // North or South (vertical)
      if (edgeLabels && edgeLabels.left) {
        infoText += `<br>Left = ${edgeLabels.left}`;
      }
      if (edgeLabels && edgeLabels.right) {
        infoText += `<br>Right = ${edgeLabels.right}`;
      }
    }

    directionItem.innerHTML = infoText;
    directionsPanel.appendChild(directionItem);
  });
}

/**
 * Set up UI event listeners
 */
function setupUIEvents() {
  // Toggle grid snap
  document.getElementById("toggle-snap").addEventListener("click", function () {
    state.snapToGrid = !state.snapToGrid;
    this.textContent = `Grid Snap: ${state.snapToGrid ? "ON" : "OFF"}`;
    this.classList.toggle("active", state.snapToGrid);
  });

  // Clear canvas
  document.getElementById("clear").addEventListener("click", function () {
    // Remove all objects except grid
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      if (!state.gridLines.includes(obj)) {
        canvas.remove(obj);
      }
    });

    // Reset state
    state.worktops = [];
    state.nextLabel = "A";
    state.isFirstSegment = true;
    state.previousWorktop = null;
    state.previousWorktopDirection = null;
    state.previousTurnDirection = null;
    state.previewWorktop = null;
    state.currentPointDot = null;
    state.startLine = null;
    state.startDot = null;
    state.lastSignificantPoint = null;
    state.detectedDirection = null;

    // Reset edge labels
    state.currentEdgeLabels = {
      top: null,
      bottom: null,
      left: null,
      right: null,
    };
    state.previousEdgeLabels = {
      top: null,
      bottom: null,
      left: null,
      right: null,
    };

    // Clear worktop list
    document.getElementById("worktop-list").innerHTML = "";

    // Clear directions panel
    document.getElementById("directions-list").innerHTML = "";

    canvas.renderAll();
  });

  // Window resize
  window.addEventListener("resize", function () {
    resizeCanvas();
    createGrid();
  });
}

/**
 * Snap point to grid
 * @param {Object} point - Point with x and y coordinates
 * @returns {Object} - Snapped point
 */
function snapToGrid(point) {
  if (!state.snapToGrid) return point;

  return {
    x: Math.round(point.x / state.gridSize) * state.gridSize,
    y: Math.round(point.y / state.gridSize) * state.gridSize,
  };
}

/**
 * Redraw the edge labels for a worktop
 * @param {Object} worktop - The worktop to redraw edge labels for
 */
function redrawWorktopEdgeLabels(worktop) {
  // First, find and remove any existing edge labels for this worktop
  const objects = canvas.getObjects();
  const edgeLabels = objects.filter(
    (obj) =>
      obj.type === "text" &&
      (obj.text === "Inner" || obj.text === "Outer") &&
      obj.left >= worktop.corners[0].x - 50 &&
      obj.left <= worktop.corners[2].x + 50 &&
      obj.top >= worktop.corners[0].y - 50 &&
      obj.top <= worktop.corners[2].y + 50
  );

  // Remove the existing edge labels
  edgeLabels.forEach((label) => {
    canvas.remove(label);
  });

  // Get the points and direction from the worktop
  const points = worktop.corners;
  const direction = worktop.direction;
  const edgeLabelsData = worktop.edgeLabels;

  // Add new edge labels based on the updated edge labels data
  if (direction === "E" || direction === "W") {
    // For horizontal worktops (East or West)
    // Top edge
    if (edgeLabelsData.top) {
      const topEdgeLabel = new fabric.Text(
        edgeLabelsData.top === "inner" ? "Inner" : "Outer",
        {
          left: (points[0].x + points[1].x) / 2,
          top: Math.min(points[0].y, points[1].y) - 15,
          fontSize: 10,
          fill: edgeLabelsData.top === "inner" ? "blue" : "red",
          backgroundColor: "rgba(255,255,255,0.7)",
          selectable: false,
          evented: false,
        }
      );
      canvas.add(topEdgeLabel);
    }

    // Bottom edge
    if (edgeLabelsData.bottom) {
      const bottomEdgeLabel = new fabric.Text(
        edgeLabelsData.bottom === "inner" ? "Inner" : "Outer",
        {
          left: (points[2].x + points[3].x) / 2,
          top: Math.max(points[2].y, points[3].y) + 5,
          fontSize: 10,
          fill: edgeLabelsData.bottom === "inner" ? "blue" : "red",
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
    if (edgeLabelsData.left) {
      const leftEdgeLabel = new fabric.Text(
        edgeLabelsData.left === "inner" ? "Inner" : "Outer",
        {
          // Always use the left side of the polygon (points[0] and points[3])
          left: Math.min(points[0].x, points[3].x) - 30,
          top: (points[0].y + points[3].y) / 2,
          fontSize: 10,
          fill: edgeLabelsData.left === "inner" ? "blue" : "red",
          backgroundColor: "rgba(255,255,255,0.7)",
          selectable: false,
          evented: false,
        }
      );
      canvas.add(leftEdgeLabel);
    }

    // Right edge
    if (edgeLabelsData.right) {
      const rightEdgeLabel = new fabric.Text(
        edgeLabelsData.right === "inner" ? "Inner" : "Outer",
        {
          // Always use the right side of the polygon (points[1] and points[2])
          left: Math.max(points[1].x, points[2].x) + 5,
          top: (points[1].y + points[2].y) / 2,
          fontSize: 10,
          fill: edgeLabelsData.right === "inner" ? "blue" : "red",
          backgroundColor: "rgba(255,255,255,0.7)",
          selectable: false,
          evented: false,
        }
      );
      canvas.add(rightEdgeLabel);
    }
  }

  // Render the canvas to show the updated labels
  canvas.renderAll();
}

/**
 * Initialize the application
 */
function init() {
  // Initialize canvas
  initCanvas();

  // Set up UI event listeners
  setupUIEvents();

  console.log("Drawzone application initialized");
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
