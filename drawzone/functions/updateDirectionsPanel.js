/**
 * Update the debug console panel
 * @param {Object} measurementObject - Optional measurement object to display in the debug console
 */
export function updateDirectionsPanel(measurementObject = null) {
  const directionsPanel = document.getElementById("directions-list");
  directionsPanel.innerHTML = ""; // Clear existing content

  // If a measurement object is provided, display its details in the debug console
  if (measurementObject) {
    const measurementInfo = document.createElement("div");
    measurementInfo.style.fontFamily = "monospace";
    measurementInfo.style.fontSize = "12px";
    measurementInfo.style.marginBottom = "10px";

    // Create a heading
    const heading = document.createElement("h4");
    heading.textContent = "Measurement Object";
    heading.style.margin = "0 0 10px 0";
    heading.style.color = "#2c3e50";
    measurementInfo.appendChild(heading);

    // Format the measurement object properties
    let infoText = "";

    // Basic properties
    infoText += `<strong>Text:</strong> ${measurementObject.text || "N/A"}<br>`;
    infoText += `<strong>Position:</strong> (${Math.round(
      measurementObject.left || 0
    )}, ${Math.round(measurementObject.top || 0)})<br>`;
    infoText += `<strong>Angle:</strong> ${measurementObject.angle || 0}°<br>`;
    infoText += `<strong>Permanent:</strong> ${
      measurementObject.permanentMeasurement ? "Yes" : "No"
    }<br>`;

    // Add more properties
    if (measurementObject.width && measurementObject.height) {
      infoText += `<strong>Size:</strong> ${Math.round(
        measurementObject.width
      )} × ${Math.round(measurementObject.height)}<br>`;
    }

    // Add origin information
    infoText += `<strong>Origin:</strong> ${
      measurementObject.originX || "center"
    }, ${measurementObject.originY || "center"}<br>`;

    // Add style information
    infoText += `<strong>Font Size:</strong> ${
      measurementObject.fontSize || "default"
    }<br>`;
    infoText += `<strong>Fill Color:</strong> ${
      measurementObject.fill || "default"
    }<br>`;

    // Add measurement-specific properties
    infoText += `<strong>Is Measurement:</strong> ${
      measurementObject.measurementText ? "Yes" : "No"
    }<br>`;

    // Add the actual measurement value (parse from text)
    const measurementValue = measurementObject.text
      ? measurementObject.text.replace("mm", "")
      : "N/A";
    infoText += `<strong>Value:</strong> ${measurementValue}mm<br>`;

    // Add direction information if available from the parent worktop
    const worktop = state.worktops.find(
      (w) => w.measurementObject === measurementObject
    );
    if (worktop) {
      infoText += `<br><strong>Worktop:</strong> ${worktop.label}<br>`;
      infoText += `<strong>Direction:</strong> ${worktop.direction}<br>`;
      infoText += `<strong>Is First Segment:</strong> ${
        worktop.isFirstSegment ? "Yes" : "No"
      }<br>`;

      // Add adjusted start/end points
      if (worktop.adjustedStart && worktop.adjustedEnd) {
        infoText += `<strong>Adjusted Start:</strong> (${Math.round(
          worktop.adjustedStart.x
        )}, ${Math.round(worktop.adjustedStart.y)})<br>`;
        infoText += `<strong>Adjusted End:</strong> (${Math.round(
          worktop.adjustedEnd.x
        )}, ${Math.round(worktop.adjustedEnd.y)})<br>`;
      }
    }

    measurementInfo.innerHTML += infoText;
    directionsPanel.appendChild(measurementInfo);
  }
}
