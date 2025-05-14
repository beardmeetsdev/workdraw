# Workdraw App - Technical Documentation

This document explains how the Workdraw application works, detailing the drawing process, key functions, and important variables.

## Overview

Workdraw is a web-based application that allows users to draw connected worktop segments on a canvas. The app automatically detects the direction of drawing (horizontal or vertical) and creates worktop rectangles with a fixed width. Users can create complex shapes by changing direction while drawing, and the app handles corner connections automatically.

## Key State Variables

```javascript
const state = {
  mode: "smart", // Only 'smart' mode is currently used
  isDrawing: false, // Whether we're currently drawing
  isDragging: false, // Whether the mouse is down
  currentPoint: null, // Current point (start of the current line)
  originalClickPoint: null, // Original mouse click point before backfilling
  worktopWidth: 120, // Fixed width for worktop rectangles (600mm in real-world)
  worktops: [], // Store all completed worktop rectangles
  currentSegments: [], // Store line segments for the current drag operation
  snapToGrid: true, // Enable grid snapping by default
  gridSize: 20, // Grid size for snapping (20px = 100mm)
  detectedDirection: null, // 'horizontal' or 'vertical' for smart mode
  initialDirectionThreshold: 60, // Minimum pixel movement to detect initial direction
  directionChangeThreshold: 70, // Minimum pixel movement to detect a change in direction
  lastSignificantPoint: null, // Last point where direction changed
  nextWorktopLabel: "A", // Next letter to use for labeling worktops
  pixelsToMm: 5, // Conversion factor: 1 pixel = 5mm
  isFirstSegment: true, // Flag to track if this is the first segment in a drawing session
};
```

## Position Tracking Variables

The app uses several position-tracking variables to manage the drawing process:

1. **lastMousePosition**: `{ x, y }`

   - Tracks the most recent mouse position during drawing
   - Updated on every mouse move event
   - Used to calculate movement distances for direction detection
   - Helps determine when to change direction based on perpendicular movement

2. **currentPoint**: `{ x, y }`

   - The starting point of the current worktop segment
   - Set initially to the mouse down position
   - Serves as the anchor point for the current segment being drawn
   - Used as the reference point for direction detection calculations
   - Displayed as a red dot for visual debugging

3. **originalClickPoint**: `{ x, y }`

   - The exact point where the user first clicked to start drawing
   - Never modified during the drawing process
   - Used for visual debugging (displayed as a green dot)
   - Serves as a reference point for the entire drawing session
   - Helps with backfilling the first segment when direction is detected

4. **lastSignificantPoint**: `{ x, y }`
   - The last point where a direction change occurred (a corner point)
   - Initially set to the starting point
   - Updated each time the drawing direction changes
   - Used as the start point for new segments after a direction change
   - Critical for creating connected worktops at corners

These position variables work together to track the user's drawing intent and create appropriate worktop segments. When the user moves the mouse, the app uses these points to determine when to change direction and how to connect segments at corners.

### Visual Representation of Position Variables

```
Initial Click:
  originalClickPoint (green dot) = (x, y)
  currentPoint (red dot) = (x, y)
  lastSignificantPoint = (x, y)

After moving horizontally (direction detected):
  originalClickPoint = (x0, y0) [unchanged]
  currentPoint = (x0, y0) [unchanged]
  lastSignificantPoint = (x0, y0) [unchanged]
  lastMousePosition = (x1, y0) [current mouse position]

After turning a corner (vertical direction):
  originalClickPoint = (x0, y0) [unchanged]
  currentPoint = (x0, y0) [unchanged]
  lastSignificantPoint = (x1, y0) [updated to corner point]
  lastMousePosition = (x1, y1) [current mouse position]

After turning another corner (horizontal direction):
  originalClickPoint = (x0, y0) [unchanged]
  currentPoint = (x0, y0) [unchanged]
  lastSignificantPoint = (x1, y1) [updated to new corner point]
  lastMousePosition = (x2, y1) [current mouse position]
```

The app uses these coordinates to create connected worktop segments with proper corner handling. The `lastSignificantPoint` is particularly important as it marks each corner where segments connect.

### Direction Detection Thresholds

The app uses two important threshold values to determine when to detect direction changes:

1. **initialDirectionThreshold**: 60 pixels

   - Used when first starting to draw
   - The user must move at least 60 pixels in either direction before the app decides if the line is horizontal or vertical
   - This threshold gives the user enough space to establish a clear direction intent
   - Once this threshold is crossed, the app sets `state.detectedDirection` to either "horizontal" or "vertical"

2. **directionChangeThreshold**: 70 pixels
   - Used after the initial direction has been established
   - The user must move at least 70 pixels perpendicular to the current direction to trigger a direction change
   - This higher threshold prevents accidental direction changes from small mouse movements
   - When this threshold is crossed, the app creates a corner point and changes the drawing direction

These thresholds provide a balance between responsiveness and stability in the drawing experience. The slightly higher threshold for direction changes (70px vs 60px) helps prevent accidental corners while still allowing for intentional direction changes.

## Drawing Process

### 1. Mouse Down - Start Drawing

When the user presses the mouse button, the `handleMouseDown` function is triggered:

```javascript
function handleMouseDown(e) {
  state.isDragging = true;
  state.isDrawing = true;
  state.currentSegments = [];
  state.isFirstSegment = true; // Mark this as the first segment in a new drawing session

  const { x, y } = getMouseCoordinates(e);

  // Track the most recent mouse position during drawing
  state.lastMousePosition = { x, y };

  // The starting point of the current worktop segment
  state.currentPoint = { x, y };

  // The exact point where the user first clicked - never modified during drawing
  // Used for visual debugging (green dot) and as a reference point
  state.originalClickPoint = { x, y };

  // The last point where a direction change occurred (corner point)
  // Initially set to the starting point, then updated at each corner
  state.lastSignificantPoint = { x, y };

  state.detectedDirection = null; // Reset direction detection

  drawPoint(state.currentPoint.x, state.currentPoint.y);
  redrawCanvas();
}
```

This function:

- Sets the drawing state flags
- Captures the initial mouse coordinates
- Stores the original click point
- Resets the direction detection
- Draws a point marker at the click position
- Redraws the canvas

### 2. Mouse Move - Direction Detection and Drawing

As the user moves the mouse while holding the button down, the `handleMouseMove` function is called:

```javascript
function handleMouseMove(e) {
  if (!state.isDrawing || !state.isDragging) {
    return;
  }

  const { x, y } = getMouseCoordinates(e);
  state.lastMousePosition = { x, y };

  // If direction isn't set yet, detect initial direction
  if (!state.detectedDirection) {
    const dx = Math.abs(x - state.currentPoint.x);
    const dy = Math.abs(y - state.currentPoint.y);

    // Only detect direction if we've moved enough pixels (60px threshold)
    if (
      dx > state.initialDirectionThreshold ||
      dy > state.initialDirectionThreshold
    ) {
      if (dx > dy) {
        state.detectedDirection = "horizontal";
      } else {
        state.detectedDirection = "vertical";
      }
      state.isFirstSegment = false;
    }
  }
  // ... rest of the function
}
```

Key aspects of this function:

- The app waits until the user has moved at least 60 pixels (initialDirectionThreshold) before determining the drawing direction
- Direction is determined by comparing horizontal vs. vertical movement
- Once a direction is detected, the app starts drawing a worktop in that direction

### 3. Direction Change Detection

While drawing, the app continuously monitors for significant movement in the perpendicular direction:

```javascript
// If we already have a direction, check for direction changes
if (state.detectedDirection) {
  const currentDirection = state.detectedDirection;
  const lastPoint = state.lastSignificantPoint;

  // Check for direction change based on significant perpendicular movement
  if (
    currentDirection === "horizontal" &&
    dy > state.directionChangeThreshold
  ) {
    // We were moving horizontally but now have significant vertical movement

    // Create a new segment for the completed horizontal line
    const endX = x;
    const endY = lastPoint.y;

    // Add the previous segment
    state.currentSegments.push({
      start: { x: lastPoint.x, y: lastPoint.y },
      end: { x: endX, y: endY },
      direction: "horizontal",
      isPrevious: true,
    });

    // Update the last significant point to the corner
    state.lastSignificantPoint = { x: endX, y: endY };

    // Change direction to vertical
    state.detectedDirection = "vertical";
  } else if (
    currentDirection === "vertical" &&
    dx > state.directionChangeThreshold
  ) {
    // Similar logic for vertical to horizontal direction change
    // ...
  }
}
```

This section:

- Detects when the user has moved significantly (70px threshold) in the perpendicular direction
- Creates a new segment at the corner point
- Updates the last significant point to the corner
- Changes the detected direction
- The app automatically creates connected worktops at corners

### 4. Mouse Up - Complete Drawing

When the user releases the mouse button, the `handleMouseUp` function finalizes the drawing:

```javascript
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
    } else {
      endX = state.lastSignificantPoint.x;
      endY = y;
    }

    // Add the final segment
    state.currentSegments.push({
      start: {
        x: state.lastSignificantPoint.x,
        y: state.lastSignificantPoint.y,
      },
      end: { x: endX, y: endY },
      direction: state.detectedDirection,
      isCurrent: true,
      isFirstSegment: state.currentSegments.length === 0,
    });
  }

  // Convert all segments to worktops and add them to the worktops array
  for (const segment of state.currentSegments) {
    // Only add segments that have a minimum length
    const length = Math.sqrt(
      Math.pow(segment.end.x - segment.start.x, 2) +
        Math.pow(segment.end.y - segment.start.y, 2)
    );

    if (length > 10) {
      const worktop = createWorktopFromSegment(segment);
      worktop.label = state.nextWorktopLabel;
      state.worktops.push(worktop);

      // Increment the label for the next worktop
      state.nextWorktopLabel = String.fromCharCode(
        state.nextWorktopLabel.charCodeAt(0) + 1
      );
    }
  }

  // Reset for next drawing
  resetDrawingState();
}
```

This function:

- Adds the final segment based on the current direction
- Converts all segments to permanent worktop objects
- Assigns labels (A, B, C, etc.) to each worktop
- Updates the worktop list display
- Resets the drawing state for the next drawing operation

## Worktop Creation

The app creates worktop rectangles from line segments using the `createWorktopFromSegment` function:

```javascript
function createWorktopFromSegment(segment) {
  const { start, end, direction, isPrevious, isCurrent, isFirstSegment } =
    segment;
  const width = state.worktopWidth;
  const halfWidth = width / 2;

  // Create copies of start and end points that we can adjust
  let adjustedStart = { x: start.x, y: start.y };
  let adjustedEnd = { x: end.x, y: end.y };

  // Apply corner adjustments for clean connections
  if (isPrevious) {
    // For previous worktop, extend the end point by half the worktop width
    if (direction === "horizontal") {
      if (end.x > start.x) {
        adjustedEnd.x += halfWidth;
      } else {
        adjustedEnd.x -= halfWidth;
      }
    } else {
      if (end.y > start.y) {
        adjustedEnd.y += halfWidth;
      } else {
        adjustedEnd.y -= halfWidth;
      }
    }
  }

  // For current worktop (but not the first segment), shorten the start point
  if (isCurrent && !isFirstSegment) {
    if (direction === "horizontal") {
      if (end.x > start.x) {
        adjustedStart.x += halfWidth;
      } else {
        adjustedStart.x -= halfWidth;
      }
    } else {
      if (end.y > start.y) {
        adjustedStart.y += halfWidth;
      } else {
        adjustedStart.y -= halfWidth;
      }
    }
  }

  // Calculate rectangle dimensions based on direction
  let x, y, w, h;

  if (direction === "horizontal") {
    x = Math.min(adjustedStart.x, adjustedEnd.x);
    y = adjustedStart.y - width / 2;
    w = Math.abs(adjustedEnd.x - adjustedStart.x);
    h = width;
  } else {
    x = adjustedStart.x - width / 2;
    y = Math.min(adjustedStart.y, adjustedEnd.y);
    w = width;
    h = Math.abs(adjustedEnd.y - adjustedStart.y);
  }

  // Create and return the worktop object
  return {
    x,
    y,
    width: w,
    height: h,
    direction,
    start: { x: adjustedStart.x, y: adjustedStart.y },
    end: { x: adjustedEnd.x, y: adjustedEnd.y },
    originalStart: { x: start.x, y: start.y },
    originalEnd: { x: end.x, y: end.y },
    isPrevious: segment.isPrevious || false,
    isFirstSegment: segment.isFirstSegment || false,
  };
}
```

This function:

- Takes a line segment and creates a worktop rectangle with the appropriate dimensions
- Adjusts the start and end points to create clean corner connections
- Handles different adjustments for first segments vs. corner segments
- Creates a worktop object with all necessary properties

## Drawing Worktops

The `drawWorktop` function renders worktop rectangles on the canvas:

```javascript
function drawWorktop(worktop, isPreview = false) {
  // Fill the rectangle with a semi-transparent color
  ctx.fillStyle = isPreview
    ? "rgba(52, 152, 219, 0.3)"
    : "rgba(52, 152, 219, 0.5)";
  ctx.fillRect(worktop.x, worktop.y, worktop.width, worktop.height);

  // Draw the border - only draw the outer edges
  ctx.strokeStyle = "#3498db";
  ctx.lineWidth = 2;

  // Draw each edge individually to avoid showing join lines
  ctx.beginPath();

  // Different drawing logic for horizontal vs. vertical worktops
  if (worktop.direction === "horizontal") {
    // Always draw top and bottom edges
    ctx.moveTo(worktop.x, worktop.y);
    ctx.lineTo(worktop.x + worktop.width, worktop.y);

    ctx.moveTo(worktop.x, worktop.y + worktop.height);
    ctx.lineTo(worktop.x + worktop.width, worktop.y + worktop.height);

    // Left edge - only draw for the first segment
    if (worktop.isFirstSegment) {
      ctx.moveTo(worktop.x, worktop.y);
      ctx.lineTo(worktop.x, worktop.y + worktop.height);
    }

    // Right edge - only draw if this is the last segment
    if (!worktop.isPrevious) {
      ctx.moveTo(worktop.x + worktop.width, worktop.y);
      ctx.lineTo(worktop.x + worktop.width, worktop.y + worktop.height);
    }
  } else {
    // Similar logic for vertical worktops
    // ...
  }

  ctx.stroke();

  // Add label if not in preview mode
  if (!isPreview && worktop.label) {
    // Draw label and dimensions
    // ...
  }
}
```

This function:

- Fills the worktop rectangle with a semi-transparent color
- Draws the border, but only the outer edges to avoid showing join lines
- Adds labels and dimensions for completed worktops

## Grid and Snapping

The app includes a grid system with snapping functionality:

```javascript
function drawGrid() {
  const gridSize = state.gridSize;

  // Draw thin grid lines
  ctx.beginPath();
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 0.5;

  // Draw vertical and horizontal grid lines
  // ...

  // Draw thicker lines every 5 grid cells (500mm)
  ctx.beginPath();
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1;

  // Draw measurements on the grid
  ctx.font = "10px Arial";
  ctx.fillStyle = "#888";

  // Add measurements in mm
  for (let x = gridSize * 5; x <= canvas.width; x += gridSize * 5) {
    const mm = (x / gridSize) * 100;
    ctx.fillText(`${mm}mm`, x + 2, 2);
  }

  for (let y = gridSize * 5; y <= canvas.height; y += gridSize * 5) {
    const mm = (y / gridSize) * 100;
    ctx.fillText(`${mm}mm`, 2, y + 2);
  }
}

function snapToGrid(coord) {
  if (!state.snapToGrid) return coord;
  return Math.round(coord / state.gridSize) * state.gridSize;
}
```

These functions:

- Draw a grid with thin lines every 20px (100mm) and thicker lines every 100px (500mm)
- Add measurements to the grid in millimeters
- Provide snapping functionality that can be toggled on/off

## Worktop List Display

The app maintains a list of worktops with their dimensions:

```javascript
function updateWorktopList() {
  const worktopListElement = document.getElementById("worktop-list");
  worktopListElement.innerHTML = "";

  for (const worktop of state.worktops) {
    const listItem = document.createElement("div");
    listItem.className = "worktop-item";

    // Calculate dimensions in mm
    const widthMm =
      worktop.direction === "horizontal"
        ? Math.round(worktop.width / state.pixelsToMm)
        : Math.round(worktop.height / state.pixelsToMm);

    const depthMm = 600; // Fixed depth of 600mm

    listItem.textContent = `${worktop.label}. ${widthMm} x ${depthMm}mm`;
    worktopListElement.appendChild(listItem);
  }
}
```

This function:

- Updates the worktop list display with each worktop's label and dimensions
- Converts pixel measurements to millimeters using the pixelsToMm conversion factor

## Utility Functions

The app includes several utility functions:

```javascript
// Get mouse coordinates with optional grid snapping
function getMouseCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;

  if (state.snapToGrid) {
    x = snapToGrid(x);
    y = snapToGrid(y);
  }

  return { x, y };
}

// Reset the drawing state
function resetDrawingState() {
  state.isDrawing = false;
  state.isDragging = false;
  state.detectedDirection = null;
  state.currentPoint = null;
  state.originalClickPoint = null;
  state.lastDirection = null;
  state.currentSegments = [];
  state.lastSignificantPoint = null;
  state.lastMousePosition = null;

  redrawCanvas();
}

// Clear the canvas
function clearCanvas() {
  state.worktops = [];
  state.nextWorktopLabel = "A";
  resetDrawingState();

  const worktopListElement = document.getElementById("worktop-list");
  worktopListElement.innerHTML = "";
}
```

These functions:

- Handle mouse coordinate conversion with optional grid snapping
- Reset the drawing state between operations
- Clear the canvas and reset all state variables

## Conclusion

The Workdraw app provides an intuitive interface for drawing connected worktop segments. Key features include:

1. Automatic direction detection based on mouse movement
2. Automatic direction change detection for creating corners
3. Connected worktops with clean corner joins
4. Grid system with snapping and measurements
5. Worktop labeling and dimension display

The app uses a canvas-based drawing system with event listeners for mouse interactions and maintains state to track the current drawing operation and completed worktops.
