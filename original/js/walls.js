/**
 * walls.js
 * Handles wall detection and measurement display
 * A wall is defined as a sequence of worktops that form a straight line
 */

import { state } from "./state.js";
import { getContext } from "./canvas.js";
import { logMeasurement } from "./utils.js";

/**
 * Detect walls (sequences of worktops that form straight lines)
 * This function analyzes the worktops array and identifies walls
 */
function detectWalls() {
  console.log("detectWalls called with", state.worktops.length, "worktops");

  // Clear existing wall measurements
  state.wallMeasurements = [];

  // Reset the wall flags on all worktops
  for (const worktop of state.worktops) {
    worktop.inWall = false;
    worktop.wallEdges = {
      left: false,
      right: false,
      top: false,
      bottom: false,
    };
  }

  // Skip if there are fewer than 2 worktops
  if (state.worktops.length < 2) {
    console.log("Not enough worktops to detect walls");
    return;
  }

  // Create a copy of worktops for processing
  const worktops = [...state.worktops];

  // Track which worktops have been processed
  const processedWorktops = new Set();

  // Process each worktop
  for (let i = 0; i < worktops.length; i++) {
    // Skip if this worktop has already been processed
    if (processedWorktops.has(i)) continue;

    const startWorktop = worktops[i];
    const direction = startWorktop.direction;

    // Find all connected worktops in the same direction
    const wallWorktops = [i]; // Indices of worktops in this wall
    const connectedEdges = new Set(); // Edges that are part of this wall

    // Add the initial worktop's edges
    if (direction === "horizontal") {
      connectedEdges.add(`${i}-left`);
      connectedEdges.add(`${i}-right`);
    } else {
      connectedEdges.add(`${i}-top`);
      connectedEdges.add(`${i}-bottom`);
    }

    // Find connected worktops in the same direction
    let foundConnected = true;
    while (foundConnected) {
      foundConnected = false;

      // Check each worktop in the wall
      for (const worktopIndex of wallWorktops) {
        const worktop = worktops[worktopIndex];

        // Check each edge of this worktop
        const edges =
          direction === "horizontal" ? ["left", "right"] : ["top", "bottom"];

        for (const edge of edges) {
          // Skip if this edge is already known to be connected
          if (connectedEdges.has(`${worktopIndex}-${edge}`)) continue;

          // Check if this edge is connected to another worktop
          if (worktop.edges[edge].connectedTo) {
            // Find the index of the connected worktop
            const connectedWorktop = worktop.edges[edge].connectedTo;
            const connectedIndex = worktops.findIndex(
              (w) => w === connectedWorktop
            );

            // Skip if already processed or not found
            if (connectedIndex === -1 || processedWorktops.has(connectedIndex))
              continue;

            // Check if the connected worktop has the same direction
            if (connectedWorktop.direction === direction) {
              // Add to the wall
              wallWorktops.push(connectedIndex);
              foundConnected = true;

              // Add the connected edge
              const connectedEdge = worktop.edges[edge].connectedEdge;
              connectedEdges.add(`${connectedIndex}-${connectedEdge}`);

              // Add the opposite edges of the connected worktop
              if (direction === "horizontal") {
                connectedEdges.add(`${connectedIndex}-left`);
                connectedEdges.add(`${connectedIndex}-right`);
              } else {
                connectedEdges.add(`${connectedIndex}-top`);
                connectedEdges.add(`${connectedIndex}-bottom`);
              }
            }
          }
        }
      }
    }

    // If we found a wall (2+ worktops), create a wall measurement
    if (wallWorktops.length >= 2) {
      console.log(
        "Found wall with",
        wallWorktops.length,
        "worktops in direction:",
        direction
      );

      // Mark all worktops in this wall as processed
      for (const index of wallWorktops) {
        processedWorktops.add(index);
      }

      // Create the wall measurement
      createWallMeasurement(
        wallWorktops.map((index) => worktops[index]),
        direction,
        connectedEdges
      );
    }
  }
}

/**
 * Create a wall measurement object
 * @param {Array} worktops - Array of worktops that form the wall
 * @param {string} direction - Direction of the wall ('horizontal' or 'vertical')
 * @param {Set} connectedEdges - Set of edges that are part of this wall
 *
 * Note: The total length calculation now adds the worktop width (600mm/120px)
 * to all worktops after the first one to account for the full wall length.
 */
function createWallMeasurement(worktops, direction, connectedEdges) {
  // Sort worktops by position
  worktops.sort((a, b) => {
    if (direction === "horizontal") {
      return a.x - b.x;
    } else {
      return a.y - b.y;
    }
  });

  // Calculate the total length
  let totalLength = 0;

  // Process each worktop
  worktops.forEach((worktop, index) => {
    // Get the base length of this worktop
    const baseLength =
      direction === "horizontal" ? worktop.width : worktop.height;

    // Add the base length to the total
    totalLength += baseLength;

    // For all worktops after the first one, add the worktop width (600mm/120px)
    // to account for the full wall length
    if (index > 0) {
      totalLength += state.worktopWidth;
    }
  });

  // Calculate start and end coordinates
  const firstWorktop = worktops[0];
  const lastWorktop = worktops[worktops.length - 1];

  let startX, startY, endX, endY;

  if (direction === "horizontal") {
    startX = firstWorktop.x;
    startY = firstWorktop.y + firstWorktop.height / 2; // Middle of the worktop
    endX = lastWorktop.x + lastWorktop.width;
    endY = lastWorktop.y + lastWorktop.height / 2; // Middle of the worktop
  } else {
    startX = firstWorktop.x + firstWorktop.width / 2; // Middle of the worktop
    startY = firstWorktop.y;
    endX = lastWorktop.x + lastWorktop.width / 2; // Middle of the worktop
    endY = lastWorktop.y + lastWorktop.height;
  }

  // Create the wall measurement object
  const wallMeasurement = {
    direction,
    startX,
    startY,
    endX,
    endY,
    length: totalLength,
    worktops: worktops.map((w) => w.label).join("+"),
    worktopRefs: worktops,
    connectedEdges: Array.from(connectedEdges),
  };

  // Mark all worktops in this wall
  for (const worktop of worktops) {
    // Mark the worktop as part of a wall
    worktop.inWall = true;

    // Mark the appropriate edges as part of the wall
    if (direction === "horizontal") {
      // For horizontal walls, mark the left and right edges
      worktop.wallEdges.left = true;
      worktop.wallEdges.right = true;
    } else {
      // For vertical walls, mark the top and bottom edges
      worktop.wallEdges.top = true;
      worktop.wallEdges.bottom = true;
    }
  }

  // Add to the state
  state.wallMeasurements.push(wallMeasurement);
}

/**
 * Draw wall measurements on the canvas
 */
function drawWallMeasurements() {
  console.log(
    "drawWallMeasurements called with",
    state.wallMeasurements.length,
    "wall measurements"
  );

  const ctx = getContext();
  if (!ctx) return;

  // Set styling for wall measurements - make them more prominent
  ctx.font = "bold 16px Arial";
  ctx.fillStyle = "#e74c3c"; // Red color to distinguish from regular measurements

  // Draw each wall measurement
  for (const wall of state.wallMeasurements) {
    console.log("Drawing wall measurement:", wall);
    // Convert to mm - this now includes the worktop width (600mm) for all worktops after the first one
    const lengthMm = Math.round(wall.length * state.pixelsToMm);

    // Position the text based on the wall direction
    if (wall.direction === "horizontal") {
      // For horizontal walls, position above the wall
      const textX = (wall.startX + wall.endX) / 2;
      const textY = wall.startY - 25; // Position further above the wall

      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${lengthMm}mm`, textX, textY);

      // Log the measurement for debugging
      logMeasurement(
        wall.worktops,
        "wall-horizontal",
        "wall",
        wall.startX,
        wall.startY,
        wall.endX,
        wall.endY,
        wall.length,
        lengthMm,
        "wall-measurement"
      );
    } else {
      // For vertical walls, position to the left of the wall
      const textX = wall.startX - 25; // Position further to the left of the wall
      const textY = (wall.startY + wall.endY) / 2;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(-Math.PI / 2); // Rotate 90 degrees counter-clockwise
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${lengthMm}mm`, 0, 0);
      ctx.restore();

      // Log the measurement for debugging
      logMeasurement(
        wall.worktops,
        "wall-vertical",
        "wall",
        wall.startX,
        wall.startY,
        wall.endX,
        wall.endY,
        wall.length,
        lengthMm,
        "wall-measurement"
      );
    }
  }
}

// Export the wall functions
export { detectWalls, drawWallMeasurements };
