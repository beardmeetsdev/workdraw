# Workdraw Application Rebuild - Ticket Details

**Core Technology Choice**: Fabric.js
**Guiding Principles**:

1.  A **Worktop**'s fundamental data is its ordered array of four corner coordinates.
2.  Each **Worktop** is finalized (its data stored, Fabric object created) immediately after its defining **Line** is completed by the user (either at mouse-up or upon a "turn" event).
3.  The live preview is _only_ for the currently active **Line** being drawn and the **Worktop** that will be derived from it.
4.  The finalized geometry of any **Worktop** must match the visual state implied by its last previewed **Line**.
5.  Visuals, dimensions, and connections are derived from the fundamental corner data of **Worktops**.
6.  Minimize global state; derive contextual information locally where possible.
7.  **Worktops** are visualized as rectangles with a fixed width (120px/600mm) centered on the drawn line.
8.  Live measurements are displayed for each **Worktop** edge during preview and after finalization.
9.  Corner coordinates are calculated based on drawing direction, with specific rules for each direction to ensure accurate measurements.

---

**1. MAIN TICKET: Initial Setup & Single Worktop Drawing**
**Deliverable**: User can draw a single, snapped rectangular **Worktop**, which is finalized on mouse-up and displayed as a Fabric.js object. Its fundamental corner data is stored.

- 1.1 Research Canvas Libraries & Approaches. Decision: Fabric.js.

  - Objective: Select the most appropriate canvas library for the application.
  - Steps: Research available libraries, evaluate features, performance, and community support.
  - Decision criteria: Ease of use, feature set, performance, and compatibility.

- 1.2 Decide on Core Drawing Technology. Decision: Fabric.js.

  - Objective: Finalize the core technology for the drawing functionality.
  - Steps: Compare top candidates, test basic functionality, evaluate documentation.
  - Decision criteria: Support for polygons, event handling, and object manipulation.

- 1.3 Create `drawzone/index.html` with a canvas element and include Fabric.js library.

  - Objective: Set up the basic HTML structure for the application.
  - Steps: Create HTML file, add canvas element, include Fabric.js via CDN.
  - Include basic page structure with header, main content area, and footer.

- 1.4 Create `drawzone/style.css` with basic styles for the page and canvas container.

  - Objective: Style the application for usability and visual appeal.
  - Steps: Create CSS file, style the canvas container, header, and controls.
  - Ensure responsive layout that works well on different screen sizes.

- 1.5 Create `drawzone/app.js` to initialize the Fabric.js canvas instance.

  - Objective: Set up the JavaScript entry point for the application.
  - Steps: Create app.js file, initialize Fabric.js canvas, set basic canvas properties.
  - Establish application state management structure.

- 1.6 Implement a function in `app.js` to draw a static grid on the Fabric canvas background.

  - Objective: Create a grid to help users align worktops.
  - Steps: Create grid lines as non-interactive Fabric.js objects, make every 5th line thicker.
  - Ensure grid can be toggled on/off and scales with canvas size.

- 1.7 Ensure the Fabric canvas is responsive or has fixed, appropriate dimensions.

  - Objective: Make sure the canvas displays correctly on different devices.
  - Steps: Set canvas dimensions based on container size, handle window resize events.
  - Implement proper scaling of canvas content when dimensions change.

- 1.8 Implement mouse controls for drawing a preview of a single straight Line.

  - Objective: Allow users to draw lines on the canvas using mouse interactions.
  - Steps: Set up mouse event handlers (down, move, up), create temporary line object.
  - Update line coordinates during mouse movement, handle grid snapping.

- 1.9 Implement smart direction detection (horizontal/vertical snapping) for the preview Line.
  - Objective: Automatically detect and snap to horizontal or vertical direction.
  - Steps: Calculate movement distance, determine primary direction, snap preview to that direction.
  - Show rectangle preview with fixed width centered on the line, plus start line at bottom.
- 1.10 Implement common Worktop Finalization Logic using centerline.

  - Objective: Create a function to convert a centerline into a finalized worktop.
  - Steps:
    - Create `finalizeLineIntoWorktop(centerlineStart, centerlineEnd, lineDirection)` function.
    - Calculate corner coordinates by offsetting from centerline by half the worktop width (60px).
    - Apply specific corner calculation rules based on drawing direction:
      - For horizontal lines: offset y-coordinates by ±60px from the centerline
      - For vertical lines: offset x-coordinates by ±60px from the centerline
      - For diagonal corners (at turns): calculate appropriate offsets based on both directions
    - Store worktop data (id, label, corners) in state.worktopsData.
    - Create and add a fabric.Polygon to the canvas using the corner coordinates.
    - Assign a unique ID and label to the worktop.
    - Return the finalized worktop data for use in subsequent operations.

- 1.11 Implement "Turn Detection" within mouse:move.

  - Objective: Detect when the user wants to create a corner by changing drawing direction.
  - Steps:
    - Monitor mouse movement perpendicular to the current drawing direction.
    - When perpendicular movement exceeds the threshold (70px), detect a "turn".
    - Finalize the current worktop up to the turn point using the Finalization Logic.
    - Set the turn point as the starting point for a new preview line.
    - Track the previous direction to establish the context for the new segment.
    - Update the visual preview to show the new segment starting from the turn point.

- 1.12 Implement mouseup event handler.

  - Objective: Finalize the worktop when the user releases the mouse button.
  - Steps:
    - Check if a preview line/worktop is active when mouse button is released.
    - Finalize the current worktop using the Finalization Logic.
    - Reset the drawing state (isDrawing = false, clear temporary objects).
    - Update the worktop list display with the new worktop.
    - Prepare the state for the next drawing operation.

- 1.13 Test: Ensure the finalized Polygon for each Worktop matches the visual state of its preview Line.

  - Objective: Verify that the finalized worktop accurately represents what the user saw in preview.
  - Steps:
    - Test single worktop creation via mouse up.
    - Test worktop creation via turn detection.
    - Verify corner coordinates match the expected values based on centerline.
    - Confirm visual appearance matches the preview state.
    - Test with different drawing directions and scenarios.

---

**2. MAIN TICKET: Multi-Segment Connected Worktop Drawing**
**Deliverable**: Users can draw multiple connected **Worktops** (L, U-shapes). Each **Worktop** is finalized upon completion of its defining **Line**, forming clean visual joins with previously finalized **Worktops**.

- 2.1 Context for Next Line: Use previous Worktop's endPoint and direction for the next preview Line.

  - Objective: Establish continuity between consecutive worktop segments.
  - Steps:
    - When a worktop is finalized, store its endPoint and direction.
    - Use this endPoint as the starting point for the next preview line.
    - Pass the previous direction as context for the next segment.
    - Ensure smooth transition between segments during drawing.

- 2.2 Visual Join for Active Preview: Preview Polygon for Worktop B must show proper join with Worktop A.

  - Objective: Show accurate visual representation of connected worktops during preview.
  - Steps:
    - Implement "shorten current worktop's start" principle for clean corners.
    - Calculate join adjustments based on the directions of both worktops.
    - Adjust the preview polygon's points to show the proper visual join.
    - Potentially adjust the previous worktop's visual representation.
    - Research optimal Fabric.js techniques for these visual adjustments.

- 2.3 Finalizing Connected Worktops: Create B's Polygon with visual join adjustments relative to A.

  - Objective: Create properly connected worktops when finalizing segments.
  - Steps:
    - Enhance the Worktop Finalization Logic to handle connections.
    - Incorporate visual join adjustments when creating the new worktop's polygon.
    - Adjust the previous worktop's polygon if needed for proper connection.
    - Maintain accurate corner data for both worktops.
    - Ensure the visual representation matches the preview state.

- 2.4 Test: Ensure each finalized Worktop matches its preview state, including visual joins.

  - Objective: Verify that connected worktops are created correctly.
  - Steps:
    - Test L-shaped connections (horizontal to vertical and vice versa).
    - Test U-shaped connections with multiple turns.
    - Verify corner coordinates at connection points.
    - Confirm visual appearance matches the preview state.
    - Test with different drawing directions and scenarios.

---

**3. MAIN TICKET: UI Controls & Basic Interactivity**
**Deliverable**: Essential UI elements for managing the drawing and **Worktop** data.

- 3.1 Create UI panel in index.html for controls and lists.

  - Objective: Create a user interface for controlling the application.
  - Steps:
    - Add a panel in the HTML for controls and information display.
    - Structure the panel with appropriate sections for different controls.
    - Style the panel to be visually appealing and user-friendly.
    - Ensure the panel doesn't interfere with the drawing area.

- 3.2 Implement "Clear Canvas" button to reset the canvas and state.

  - Objective: Allow users to start over with a clean canvas.
  - Steps:
    - Add a Clear Canvas button to the UI panel.
    - Implement function to remove all fabric.Polygon objects from canvas.
    - Reset state.worktopsData and all drawing context variables.
    - Reset the worktop label counter to start from "A" again.
    - Clear the worktop list display.

- 3.3 Implement Worktop List Display.

  - Objective: Show users a list of all worktops they've created.
  - Steps:
    - Create a container for the worktop list in the UI panel.
    - Implement function to dynamically display worktops using their labels.
    - Create getWorktopDisplayDimensions function to calculate dimensions.
    - Display each worktop's label and dimensions in the list.
    - Update the list whenever a new worktop is created or modified.

- 3.4 Implement Grid Snapping toggle button.

  - Objective: Allow users to enable/disable grid snapping.
  - Steps:
    - Add a Grid Snapping toggle button to the UI panel.
    - Implement toggle functionality to switch between on and off states.
    - Update the state.snapToGrid flag based on button state.
    - Integrate snapping logic into mouse coordinate calculations.
    - Provide visual feedback on the button to show current state.

---

**4. MAIN TICKET: Measurement Display System**
**Deliverable**: Accurate and clear measurements for individual **Worktops** and combined exterior faces are displayed on the canvas.

- 4.1 Individual Worktop Edge Measurements with live display during preview and after finalization.

  - Objective: Show accurate measurements for each worktop edge.
  - Steps:
    - Derive edge lengths from worktop corner coordinates.
    - Create fabric.Text objects to display measurements.
    - Position text appropriately around each worktop edge.
    - Implement live measurement display during preview mode.
    - Update measurements in real-time as the user draws.
    - Ensure measurements are accurate and readable.
    - Convert pixel measurements to millimeters using the conversion factor.

- 4.2 Continuous Exterior Face Logic.

  - Objective: Identify sequences of connected, collinear exterior edges.
  - Steps:
    - Create detectContinuousExteriorFaces function that takes worktopsData array.
    - Analyze worktop corners to identify exterior edges.
    - Detect when multiple exterior edges form a continuous face.
    - Identify sequences of connected, collinear edges.
    - Calculate the overall length of each continuous face.
    - Return an array of "face" objects with start/end points, length, direction, and constituent worktop labels.

- 4.3 Display Combined Exterior Measurements.

  - Objective: Show combined measurements for continuous exterior faces.
  - Steps:
    - Call detectContinuousExteriorFaces after any change to worktopsData.
    - Create fabric.Text objects for each combined face measurement.
    - Position text appropriately for each continuous face.
    - Hide individual edge measurements that are part of a combined face.
    - Update combined measurements when worktops are modified.
    - Ensure combined measurements are visually distinct from individual measurements.

---

**5. MAIN TICKET: Advanced Feature - Interactive Resizing**
**Deliverable**: Users can modify **Worktop** dimensions via their measurements; connected **Worktops** adjust.

- 5.1 Make displayed measurement fabric.Text objects interactive (detect clicks).

  - Objective: Allow users to interact with measurement text objects.
  - Steps:
    - Make fabric.Text objects selectable and clickable.
    - Add event listeners for click events on measurement text.
    - Highlight the measurement when hovered to indicate interactivity.
    - Store reference to the associated worktop and edge with each measurement.
    - Ensure only measurements are interactive, not other text elements.

- 5.2 On measurement click, prompt user for a new dimension.

  - Objective: Allow users to input new dimensions for worktops.
  - Steps:
    - Create a modal dialog or input form for dimension entry.
    - Display the current dimension as the default value.
    - Validate user input to ensure it's a valid number.
    - Convert the input from millimeters to pixels using the conversion factor.
    - Provide clear instructions and feedback to the user.

- 5.3 Single Worktop Resizing.

  - Objective: Resize a single worktop based on user input.
  - Steps:
    - Determine which edge was clicked and its orientation.
    - Identify an anchor point/edge (opposite to the clicked edge).
    - Recalculate the worktop's corner coordinates based on the new dimension.
    - Update the worktop's data in state.worktopsData.
    - Update the fabric.Polygon on the canvas with the new points.
    - Ensure the worktop maintains its orientation and position relative to the anchor.

- 5.4 Connected Worktop Adjustment (Propagation).

  - Objective: Maintain connections when resizing connected worktops.
  - Steps:
    - Identify adjacent worktops by comparing corner coordinates.
    - For each connected worktop, recalculate its corners to maintain connectivity.
    - Preserve the depth and orientation of connected worktops.
    - Update all affected fabric.Polygon objects on the canvas.
    - Handle complex scenarios with multiple connected worktops.
    - Ensure the entire structure maintains its integrity.

- 5.5 After resizing, re-run measurement detection and update all measurement displays.

  - Objective: Update all measurements after resizing operations.
  - Steps:
    - Re-run the continuous exterior face detection.
    - Update all individual edge measurements.
    - Update all combined exterior measurements.
    - Reposition measurement text objects appropriately.
    - Hide/show individual measurements based on combined face detection.
    - Ensure all measurements reflect the new dimensions accurately.

---

**6. MAIN TICKET: Advanced Feature - Splitting Worktops**
**Deliverable**: Users can select a **Worktop** and define a split **Line** to divide it into two new **Worktops**.

- 6.1 UI for selecting a fabric.Polygon (a Worktop) on the canvas.

  - Objective: Allow users to select a worktop for splitting.
  - Steps:
    - Make fabric.Polygon objects selectable.
    - Add event listeners for selection events.
    - Provide visual feedback when a worktop is selected.
    - Store reference to the selected worktop.
    - Implement a way to deselect worktops.
    - Ensure only one worktop can be selected at a time.

- 6.2 UI for user to define a split Line across the selected Worktop.

  - Objective: Allow users to specify where to split the selected worktop.
  - Steps:
    - Create a mode for drawing split lines.
    - Restrict split line drawing to within the selected worktop.
    - Provide visual feedback during split line drawing.
    - Validate that the split line fully crosses the worktop.
    - Ensure the split line creates valid resulting pieces.
    - Allow users to cancel or confirm the split operation.

- 6.3 Implement function calculateSplitWorktopCorners.

  - Objective: Calculate corner coordinates for the two resulting worktop pieces.
  - Steps:
    - Create function that takes original corners and split line coordinates.
    - Calculate intersection points of split line with worktop edges.
    - Determine how to divide the original corners into two sets.
    - Add intersection points to create two complete sets of corners.
    - Ensure both resulting corner sets form valid polygons.
    - Return two new corner arrays for the resulting worktop pieces.

- 6.4 Update state.worktopsData: Remove original Worktop, add data for the two new pieces.

  - Objective: Update the application state to reflect the split operation.
  - Steps:
    - Remove the original worktop's data from state.worktopsData.
    - Create data objects for the two new worktop pieces.
    - Assign new unique IDs and labels to the new pieces.
    - Preserve any relevant metadata from the original worktop.
    - Update any references to the original worktop in other data structures.
    - Maintain the integrity of the overall data model.

- 6.5 Update Fabric Canvas: Remove original Polygon, create and add two new Polygons.

  - Objective: Update the visual representation of the split worktop.
  - Steps:
    - Remove the original fabric.Polygon from the canvas.
    - Create two new fabric.Polygon objects using the calculated corners.
    - Apply appropriate styling to the new polygons.
    - Add the new polygons to the canvas.
    - Ensure the new polygons have the same properties as other worktops.
    - Render the canvas to show the changes.

- 6.6 Re-evaluate and update connections and measurements for the new and surrounding Worktops.

  - Objective: Maintain proper connections and measurements after splitting.
  - Steps:
    - Identify worktops connected to the original worktop.
    - Update connection data to reference the new worktops.
    - Re-run exterior face detection for the affected area.
    - Update all individual and combined measurements.
    - Ensure visual consistency of all connections.
    - Verify that the overall structure maintains its integrity.

---

**7. MAIN TICKET: Application Polish & Finalization**
**Deliverable**: A robust, tested, and user-friendly application.

- 7.1 Comprehensive testing of all drawing modes, connections, measurements, resizing, and splitting.

  - Objective: Ensure all features work correctly and reliably.
  - Steps:
    - Create test cases for all major features and edge cases.
    - Test drawing in different directions and with different patterns.
    - Verify connections between worktops in various configurations.
    - Test measurement accuracy for individual and combined measurements.
    - Validate resizing operations and their propagation effects.
    - Test splitting worktops in different scenarios.
    - Document any issues or inconsistencies found.

- 7.2 Address and fix any identified bugs or visual inconsistencies.

  - Objective: Resolve all issues to create a polished application.
  - Steps:
    - Prioritize bugs based on severity and impact.
    - Fix visual inconsistencies in rendering and UI elements.
    - Address edge cases and unexpected behavior.
    - Improve error handling and user feedback.
    - Verify fixes with targeted testing.
    - Ensure consistent behavior across different scenarios.

- 7.3 Performance review and optimization.

  - Objective: Ensure the application runs smoothly even with complex worktop arrangements.
  - Steps:
    - Identify performance bottlenecks in rendering and calculations.
    - Optimize canvas rendering and object management.
    - Improve data structure efficiency for large numbers of worktops.
    - Reduce unnecessary recalculations and redraws.
    - Test performance with large and complex worktop arrangements.
    - Implement caching strategies where appropriate.

- 7.4 Code cleanup, add comments, and finalize any internal documentation.

  - Objective: Create maintainable, well-documented code.
  - Steps:
    - Refactor code for clarity and consistency.
    - Remove redundant or unused code.
    - Add comprehensive comments explaining complex logic.
    - Document functions, parameters, and return values.
    - Create internal documentation for the application architecture.
    - Ensure consistent coding style throughout the codebase.

- 7.5 Review and refine overall UI/UX.

  - Objective: Create an intuitive and user-friendly interface.
  - Steps:
    - Review all UI elements for consistency and clarity.
    - Improve visual feedback for user actions.
    - Refine layout and spacing for better usability.
    - Add tooltips or help text for complex features.
    - Ensure accessibility considerations are addressed.
    - Gather feedback and make final adjustments.
