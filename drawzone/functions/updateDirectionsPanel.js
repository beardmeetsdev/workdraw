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
  heading.textContent = "Worktop Information";
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

      // Worktop label and basic info
      infoText += `<strong>Worktop: ${worktop.label}</strong><br>`;

      // Length information (from measurement object)
      if (worktop.measurementObject && worktop.measurementObject.text) {
        const lengthText = worktop.measurementObject.text.replace("mm", "");
        infoText += `<strong>Text (length):</strong> ${lengthText}mm<br>`;
      } else {
        infoText += `<strong>Text (length):</strong> N/A<br>`;
      }

      // Edge labels information
      infoText += `<strong>Edge Labels:</strong><br>`;
      if (worktop.edgeLabels) {
        infoText += `&nbsp;&nbsp;Top: ${worktop.edgeLabels.top || "N/A"}<br>`;
        infoText += `&nbsp;&nbsp;Bottom: ${
          worktop.edgeLabels.bottom || "N/A"
        }<br>`;
        infoText += `&nbsp;&nbsp;Left: ${worktop.edgeLabels.left || "N/A"}<br>`;
        infoText += `&nbsp;&nbsp;Right: ${
          worktop.edgeLabels.right || "N/A"
        }<br>`;
      } else {
        infoText += `&nbsp;&nbsp;No edge labels available<br>`;
      }

      // Direction and first segment info
      infoText += `<strong>Direction:</strong> ${
        worktop.direction || "N/A"
      }<br>`;
      infoText += `<strong>Is First Segment:</strong> ${
        worktop.isFirstSegment ? "Yes" : "No"
      }<br>`;

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
