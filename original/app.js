/**
 * app.js
 * Entry point for the Workdraw application
 * This file imports the modular components from the js/ folder
 */

// Import the main module
import { initApp } from "./js/main.js";

// Initialize the application when the DOM is ready
document.addEventListener("DOMContentLoaded", initApp);
