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

  // Apply the rules based on the compass directions

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
    }
  }
}
