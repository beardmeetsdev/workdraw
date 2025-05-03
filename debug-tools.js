// Debug tools for the worktop drawing application
document.addEventListener("DOMContentLoaded", function() {
  // Create a debug panel
  const debugPanel = document.createElement('div');
  debugPanel.id = 'debug-panel';
  debugPanel.style.position = 'fixed';
  debugPanel.style.top = '10px';
  debugPanel.style.right = '10px';
  debugPanel.style.width = '300px';
  debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  debugPanel.style.color = '#00FF00';
  debugPanel.style.padding = '10px';
  debugPanel.style.borderRadius = '5px';
  debugPanel.style.zIndex = '1000';
  debugPanel.style.fontFamily = 'monospace';
  debugPanel.style.fontSize = '12px';
  debugPanel.style.maxHeight = '80vh';
  debugPanel.style.overflowY = 'auto';
  
  // Add a title
  const title = document.createElement('h3');
  title.textContent = 'Debug Panel';
  title.style.margin = '0 0 10px 0';
  title.style.borderBottom = '1px solid #00FF00';
  title.style.paddingBottom = '5px';
  debugPanel.appendChild(title);
  
  // Add a coordinates display
  const coordsDisplay = document.createElement('div');
  coordsDisplay.id = 'coords-display';
  coordsDisplay.innerHTML = '<p>Mouse: (-, -)</p><p>Initial Click: (-, -)</p><p>Worktop Start: (-, -)</p>';
  debugPanel.appendChild(coordsDisplay);
  
  // Add a log section
  const logSection = document.createElement('div');
  logSection.innerHTML = '<h4 style="margin: 10px 0 5px 0;">Log</h4>';
  
  const logDisplay = document.createElement('div');
  logDisplay.id = 'log-display';
  logDisplay.style.maxHeight = '200px';
  logDisplay.style.overflowY = 'auto';
  logDisplay.style.border = '1px solid #333';
  logDisplay.style.padding = '5px';
  logDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  logSection.appendChild(logDisplay);
  
  debugPanel.appendChild(logSection);
  
  // Add a clear log button
  const clearLogButton = document.createElement('button');
  clearLogButton.textContent = 'Clear Log';
  clearLogButton.style.marginTop = '5px';
  clearLogButton.style.padding = '3px 8px';
  clearLogButton.style.backgroundColor = '#333';
  clearLogButton.style.color = '#FFF';
  clearLogButton.style.border = 'none';
  clearLogButton.style.borderRadius = '3px';
  clearLogButton.style.cursor = 'pointer';
  clearLogButton.onclick = function() {
    document.getElementById('log-display').innerHTML = '';
  };
  debugPanel.appendChild(clearLogButton);
  
  // Add a toggle button
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Hide Debug Panel';
  toggleButton.style.position = 'fixed';
  toggleButton.style.top = '10px';
  toggleButton.style.left = '10px';
  toggleButton.style.padding = '5px 10px';
  toggleButton.style.backgroundColor = '#333';
  toggleButton.style.color = '#FFF';
  toggleButton.style.border = 'none';
  toggleButton.style.borderRadius = '3px';
  toggleButton.style.zIndex = '1000';
  toggleButton.style.cursor = 'pointer';
  
  toggleButton.onclick = function() {
    const panel = document.getElementById('debug-panel');
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      this.textContent = 'Hide Debug Panel';
    } else {
      panel.style.display = 'none';
      this.textContent = 'Show Debug Panel';
    }
  };
  
  // Add to the document
  document.body.appendChild(debugPanel);
  document.body.appendChild(toggleButton);
  
  // Override console.log
  const originalConsoleLog = console.log;
  console.log = function() {
    // Call the original console.log
    originalConsoleLog.apply(console, arguments);
    
    // Add to our log display
    const logDisplay = document.getElementById('log-display');
    if (logDisplay) {
      const logEntry = document.createElement('div');
      
      // Convert arguments to string
      const args = Array.from(arguments).map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      });
      
      logEntry.textContent = args.join(' ');
      logEntry.style.borderBottom = '1px solid #333';
      logEntry.style.paddingBottom = '3px';
      logEntry.style.marginBottom = '3px';
      
      // Add special styling for certain log types
      if (args.some(arg => arg.includes('Initial click'))) {
        logEntry.style.color = '#00FF00';
      } else if (args.some(arg => arg.includes('Worktop Start'))) {
        logEntry.style.color = '#FF6347';
      }
      
      logDisplay.appendChild(logEntry);
      logDisplay.scrollTop = logDisplay.scrollHeight;
    }
    
    // Update coordinates display if this is a coordinate log
    updateCoordsDisplay(arguments);
  };
  
  // Function to update the coordinates display
  function updateCoordsDisplay(logArgs) {
    const coordsDisplay = document.getElementById('coords-display');
    if (!coordsDisplay) return;
    
    const logStr = Array.from(logArgs).join(' ');
    
    // Check for mouse coordinates
    if (logStr.includes('Mouse:')) {
      try {
        const match = logStr.match(/Mouse:\s*\((\d+),\s*(\d+)\)/);
        if (match) {
          const x = match[1];
          const y = match[2];
          coordsDisplay.querySelector('p:nth-child(1)').textContent = `Mouse: (${x}, ${y})`;
        }
      } catch (e) {}
    }
    
    // Check for initial click
    if (logStr.includes('Initial click:')) {
      try {
        const match = logStr.match(/Initial click:\s*(\d+)\s*(\d+)/);
        if (match) {
          const x = match[1];
          const y = match[2];
          coordsDisplay.querySelector('p:nth-child(2)').textContent = `Initial Click: (${x}, ${y})`;
        }
      } catch (e) {}
    }
    
    // Check for worktop start
    if (logStr.includes('Adjusted start:')) {
      try {
        const match = logStr.match(/Adjusted start:\s*(\d+)\s*(\d+)/);
        if (match) {
          const x = match[1];
          const y = match[2];
          coordsDisplay.querySelector('p:nth-child(3)').textContent = `Worktop Start: (${x}, ${y})`;
        }
      } catch (e) {}
    }
  }
  
  // Track mouse movement on the canvas
  const canvas = document.getElementById('canvas');
  if (canvas) {
    canvas.addEventListener('mousemove', function(e) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      
      const coordsDisplay = document.getElementById('coords-display');
      if (coordsDisplay) {
        coordsDisplay.querySelector('p:nth-child(1)').textContent = `Mouse: (${x}, ${y})`;
      }
    });
  }
});
