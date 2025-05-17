/**
 * Update the debug console panel to show information for all worktops
 * @param {Object} measurementObject - Optional measurement object to display in the debug console (not used in new implementation)
 */
export function updateDirectionsPanel(measurementObject = null) {
  // Get state from global scope
  const state = window.state;

  const directionsPanel = document.getElementById("directions-list");
  directionsPanel.innerHTML = ""; // Clear existing content

  // Create a heading for the debug console
  const heading = document.createElement("h4");
  heading.textContent = "Debug Log";
  heading.style.margin = "0 0 15px 0";
  heading.style.color = "#2c3e50";
  heading.style.textAlign = "center";
  directionsPanel.appendChild(heading);

  // Display information for all worktops
  if (state.worktops && state.worktops.length > 0) {
    // Sort worktops by label to ensure they're in order (A, B, C, etc.)
    const sortedWorktops = [...state.worktops].sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    // Create a container for all worktop info
    const worktopsContainer = document.createElement("div");
    worktopsContainer.style.fontFamily = "monospace";
    worktopsContainer.style.fontSize = "12px";

    // Process each worktop
    sortedWorktops.forEach((worktop) => {
      // Create a container for this worktop
      const worktopInfo = document.createElement("div");
      worktopInfo.style.marginBottom = "20px";
      worktopInfo.style.padding = "10px";
      worktopInfo.style.backgroundColor = "#f8f9fa";
      worktopInfo.style.borderRadius = "5px";
      worktopInfo.style.border = "1px solid #ddd";

      // Format the worktop information
      let infoText = "";

      // Worktop label
      infoText += `<strong>Worktop: ${worktop.label}</strong><br>`;

      // Count connection points
      let connectionPointCount = 0;
      if (worktop.connections) {
        ["left", "right", "top", "bottom"].forEach((edge) => {
          if (
            worktop.connections[edge] &&
            worktop.connections[edge].connectedTo
          ) {
            connectionPointCount++;
          }
        });
      }

      // Each connection has 2 connection points (one on each worktop)
      // So divide by 2 to get the actual number of connections
      let connectionCount = Math.ceil(connectionPointCount / 2);

      // For the last segment, subtract 1 from the connection count
      // This is a workaround for the issue where the last segment always shows 2 connections
      if (worktop.isLastSegment && connectionCount > 1) {
        connectionCount -= 1;
      }

      // Show connection count and segment status
      infoText += `Connections: ${connectionCount}, Last Segment: ${
        worktop.isLastSegment ? "Yes" : "No"
      }<br><br>`;

      // Check if we have the necessary data to calculate measurements
      if (worktop.adjustedStart && worktop.adjustedEnd) {
        // Calculate and display edge measurements
        if (worktop.direction === "E" || worktop.direction === "W") {
          // For horizontal worktops (East or West)
          // Calculate length in pixels
          const lengthPx = Math.abs(
            worktop.adjustedEnd.x - worktop.adjustedStart.x
          );

          // Convert to millimeters (1 pixel = 5mm)
          let outerLengthMm = Math.round(lengthPx * 5);

          // Add 600mm if not the first segment (for outer edges)
          if (!worktop.isFirstSegment) {
            outerLengthMm += 600; // Add 600mm (worktop width)
          }

          // Calculate inner length based on number of connections
          // Each connection reduces the inner length by 600mm
          // If there are no connections, default to 600mm less than outer
          const reductionAmount =
            connectionCount > 0 ? connectionCount * 600 : 600;
          const innerLengthMm = Math.max(0, outerLengthMm - reductionAmount);

          // Get edge types
          const topType =
            worktop.edgeLabels && worktop.edgeLabels.top
              ? worktop.edgeLabels.top
              : "N/A";
          const bottomType =
            worktop.edgeLabels && worktop.edgeLabels.bottom
              ? worktop.edgeLabels.bottom
              : "N/A";

          // Display the correct length based on edge type
          const topLength = topType === "inner" ? innerLengthMm : outerLengthMm;
          const bottomLength =
            bottomType === "inner" ? innerLengthMm : outerLengthMm;

          infoText += `Top length (${topType}): ${topLength}mm<br>`;
          infoText += `Bottom length (${bottomType}): ${bottomLength}mm<br>`;
        } else {
          // For vertical worktops (North or South)
          // Calculate length in pixels
          const lengthPx = Math.abs(
            worktop.adjustedEnd.y - worktop.adjustedStart.y
          );

          // Convert to millimeters (1 pixel = 5mm)
          let outerLengthMm = Math.round(lengthPx * 5);

          // Add 600mm if not the first segment (for outer edges)
          if (!worktop.isFirstSegment) {
            outerLengthMm += 600; // Add 600mm (worktop width)
          }

          // Calculate inner length based on number of connections
          // Each connection reduces the inner length by 600mm
          // If there are no connections, default to 600mm less than outer
          const reductionAmount =
            connectionCount > 0 ? connectionCount * 600 : 600;
          const innerLengthMm = Math.max(0, outerLengthMm - reductionAmount);

          // Get edge types
          const leftType =
            worktop.edgeLabels && worktop.edgeLabels.left
              ? worktop.edgeLabels.left
              : "N/A";
          const rightType =
            worktop.edgeLabels && worktop.edgeLabels.right
              ? worktop.edgeLabels.right
              : "N/A";

          // Display the correct length based on edge type
          const leftLength =
            leftType === "inner" ? innerLengthMm : outerLengthMm;
          const rightLength =
            rightType === "inner" ? innerLengthMm : outerLengthMm;

          infoText += `Left length (${leftType}): ${leftLength}mm<br>`;
          infoText += `Right length (${rightType}): ${rightLength}mm<br>`;
        }
      } else {
        infoText += `No measurement information available<br>`;
      }

      // Add the info to the worktop container
      worktopInfo.innerHTML = infoText;
      worktopsContainer.appendChild(worktopInfo);
    });

    // Add all worktop info to the directions panel
    directionsPanel.appendChild(worktopsContainer);

    // Add a note at the bottom
    const note = document.createElement("div");
    note.style.fontSize = "10px";
    note.style.color = "#666";
    note.style.marginTop = "10px";
    note.style.textAlign = "center";
    note.textContent = "All sizes in mm";
    directionsPanel.appendChild(note);
  } else {
    // No worktops to display
    const noWorktops = document.createElement("p");
    noWorktops.textContent = "No worktops created yet.";
    noWorktops.style.textAlign = "center";
    noWorktops.style.color = "#666";
    directionsPanel.appendChild(noWorktops);
  }
}
