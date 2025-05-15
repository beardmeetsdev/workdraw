import { snapToGrid } from "./snapToGrid.js";
import { createPreviewWorktop } from "./createPreviewWorktop.js";
import { updatePreviewWorktop } from "./updatePreviewWorktop.js";
import { finalizeWorktop } from "./finalizeWorktop.js";
import { setInnerOuterEdges } from "./setInnerOuterEdges.js";
import { updateDirectionsPanel } from "./updateDirectionsPanel.js";

/**
 * Handle mouse move event
 * @param {Object} pointer - Mouse coordinates
 * @param {Object} canvas - Fabric.js canvas instance
 */
export function handleMouseMove(pointer, canvas) {
  // Get state from global scope
  const state = window.state;

  if (!state.isDrawing) return;

  // Snap to grid if enabled
  const point = snapToGrid(pointer, state);

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
    createPreviewWorktop(canvas);

    // After detecting a direction, check if this is part of an existing structure
    // If we have a previous worktop, this is not the first segment
    if (state.previousWorktop) {
      state.isFirstSegment = false;
    } else {
      // This is the first segment of a new structure
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
        // When finalizing at a turn, this becomes the previous worktop
        // so we set isPrevious=true to extend its end point
        const currentWorktop = finalizeWorktop(
          state.lastSignificantPoint,
          currentEnd,
          state.detectedDirection,
          turnDirection,
          canvas
        );

        // Create a starting point for the new worktop that connects to the end of the previous one
        const newStart = { ...currentEnd };

        // Apply adjustment to the new start point based on the turn direction
        // This is crucial for proper corner connections
        const halfWidth = state.worktopWidth / 2;

        // Adjust the start point based on the new direction (turnDirection)
        if (turnDirection === "E") {
          newStart.x += halfWidth; // Adjust to the right for East direction
        } else if (turnDirection === "W") {
          newStart.x -= halfWidth; // Adjust to the left for West direction
        } else if (turnDirection === "S") {
          newStart.y += halfWidth; // Adjust downward for South direction
        } else if (turnDirection === "N") {
          newStart.y -= halfWidth; // Adjust upward for North direction
        }

        // Update the last significant point to the adjusted new start point
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
          // IMPORTANT: Force a complete redraw of the canvas
          // First, store all the worktops
          const allWorktops = [...state.worktops];

          // Store references to preview elements
          const previewWorktop = state.previewWorktop;
          const currentPointDot = state.currentPointDot;
          const startLine = state.startLine;

          // Clear the canvas of all objects except grid, preview elements, and permanent measurements
          const objects = canvas.getObjects();
          objects.forEach((obj) => {
            if (
              !state.gridLines.includes(obj) &&
              obj !== previewWorktop &&
              obj !== currentPointDot &&
              obj !== startLine &&
              !(obj.permanentMeasurement === true) // Don't remove permanent measurements
            ) {
              canvas.remove(obj);
            }
          });

          // Permanent measurements are preserved by the condition above

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

            // Store the new fabric object reference
            worktop.fabricObject = finalWorktop;

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
        }

        // Change the direction to the new compass direction (turn direction)
        state.detectedDirection = turnDirection;

        // Create a new preview worktop for the new direction
        createPreviewWorktop(canvas);

        // Display the measurement object in the debug console if available
        if (currentWorktop && currentWorktop.measurementObject) {
          updateDirectionsPanel(currentWorktop.measurementObject);
        }
      }
    }

    // Update the preview worktop
    updatePreviewWorktop(point, canvas);
  } else {
    // Just update the line if we haven't detected a direction yet
    state.currentLine.set({
      x2: point.x,
      y2: point.y,
    });
  }

  canvas.renderAll();
}
