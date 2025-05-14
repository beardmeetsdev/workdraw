/**
 * Update the directions panel with worktop directions and edge labels
 * @param {Object} newWorktop - The newly added worktop (optional)
 */
export function updateDirectionsPanel(newWorktop = null) {
  // Get state from global scope
  const state = window.state;
  
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

    // Add adjusted corner coordinates
    if (worktop.adjustedStart && worktop.adjustedEnd) {
      infoText += `<br><br>Adjusted Start: (${Math.round(
        worktop.adjustedStart.x
      )}, ${Math.round(worktop.adjustedStart.y)})`;
      infoText += `<br>Adjusted End: (${Math.round(
        worktop.adjustedEnd.x
      )}, ${Math.round(worktop.adjustedEnd.y)})`;
      infoText += `<br>Half Worktop Width: ${state.worktopWidth / 2}px (300mm)`;
      
      // Show if start or end was adjusted
      const startDiffX = Math.abs(worktop.start.x - worktop.adjustedStart.x);
      const startDiffY = Math.abs(worktop.start.y - worktop.adjustedStart.y);
      const endDiffX = Math.abs(worktop.end.x - worktop.adjustedEnd.x);
      const endDiffY = Math.abs(worktop.end.y - worktop.adjustedEnd.y);
      
      if (startDiffX > 0 || startDiffY > 0) {
        infoText += `<br><span style="color:blue">Start point adjusted by (${Math.round(
          startDiffX
        )}, ${Math.round(startDiffY)})</span>`;
      }
      
      if (endDiffX > 0 || endDiffY > 0) {
        infoText += `<br><span style="color:red">End point adjusted by (${Math.round(
          endDiffX
        )}, ${Math.round(endDiffY)})</span>`;
      }
    }

    directionItem.innerHTML = infoText;
    directionsPanel.appendChild(directionItem);
  });
}
