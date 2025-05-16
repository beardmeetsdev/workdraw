/**
 * Adjust worktop corners for clean connections at turns
 * @param {Object} start - Start point of the worktop centerline
 * @param {Object} end - End point of the worktop centerline
 * @param {string} direction - Direction of the worktop ('N', 'S', 'E', 'W')
 * @param {boolean} isPrevious - Whether this is the previous worktop (to extend end)
 * @param {boolean} isCurrent - Whether this is the current worktop (to shorten start)
 * @param {boolean} isFirstSegment - Whether this is the first segment in a drawing sequence
 * @returns {Object} Object containing adjusted start and end points
 */
export function adjustWorktopCorners(
  start,
  end,
  direction,
  isPrevious,
  isCurrent,
  isFirstSegment
) {
  // Get state from global scope
  const state = window.state;

  const halfWidth = state.worktopWidth / 2;

  // Create copies of start and end points that we can adjust
  let adjustedStart = { ...start };
  let adjustedEnd = { ...end };

  // Apply corner adjustments
  if (isPrevious) {
    // For previous worktop, extend the end point by half the worktop width
    if (direction === "E") {
      adjustedEnd.x += halfWidth; // Extend to the right
    } else if (direction === "W") {
      adjustedEnd.x -= halfWidth; // Extend to the left
    } else if (direction === "S") {
      adjustedEnd.y += halfWidth; // Extend downward
    } else if (direction === "N") {
      adjustedEnd.y -= halfWidth; // Extend upward
    }
  }

  // For the first segment in a drawing session, don't shorten the start point
  // This ensures the worktop starts from the initial click point
  // Also, don't adjust the start point if it has already been adjusted after a turn
  if (isCurrent && !isFirstSegment && !state.startPointAlreadyAdjusted) {
    // For current worktop (but not the first segment), shorten the start point by half the worktop width
    if (direction === "E") {
      adjustedStart.x += halfWidth; // Shorten from the left
    } else if (direction === "W") {
      adjustedStart.x -= halfWidth; // Shorten from the right
    } else if (direction === "S") {
      adjustedStart.y += halfWidth; // Shorten from the top
    } else if (direction === "N") {
      adjustedStart.y -= halfWidth; // Shorten from the bottom
    }
  }

  return {
    adjustedStart,
    adjustedEnd,
  };
}
