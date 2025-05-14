/**
 * Set inner and outer edges based on compass direction and turn
 * @param {string} currentDirection - Direction of the current worktop ('N', 'S', 'E', 'W')
 * @param {string} previousDirection - Direction of the previous worktop ('N', 'S', 'E', 'W')
 * @param {string} turnDirection - Direction of the turn: 'N', 'S', 'E', 'W'
 */
export function setInnerOuterEdges(
  currentDirection,
  previousDirection,
  turnDirection
) {
  // Get state from global scope
  const state = window.state;
  
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
