/**
 * app.js
 * Main entry point for the Drawzone application
 * Uses Fabric.js for canvas manipulation
 */

// Import the init function
import { init } from "./functions/init.js";

// Application state - make it global so all modules can access it
window.state = {
  // Canvas settings
  gridSize: 20, // Grid size in pixels
  snapToGrid: true, // Grid snapping enabled by default
  worktopWidth: 120, // Width of worktops in pixels

  // Worktop data
  worktops: [], // Array to store worktop data
  nextLabel: "A", // Next label for worktops
  previousWorktop: null, // Reference to the previous worktop
  previousWorktopDirection: null, // Direction of the previous worktop
  previousTurnDirection: null, // Direction of the previous turn

  // Edge labels
  currentEdgeLabels: { top: null, bottom: null, left: null, right: null }, // Current worktop edge labels
  previousEdgeLabels: { top: null, bottom: null, left: null, right: null }, // Previous worktop edge labels

  // Drawing state
  isDrawing: false,
  currentLine: null,
  startPoint: null,
  initialDirectionThreshold: 60, // Pixels to move before detecting direction
  directionChangeThreshold: 70, // Pixels to move before detecting direction change
  detectedDirection: null, // 'N', 'S', 'E', or 'W' (compass directions)
  isFirstSegment: true, // Is this the first segment in a drawing sequence

  // UI elements
  previewWorktop: null, // Current preview worktop
  currentPointDot: null, // Dot showing current point
  startLine: null, // Line showing start point
  startDot: null, // Dot showing start point
  gridLines: [], // Grid lines
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
