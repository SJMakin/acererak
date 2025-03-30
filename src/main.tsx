import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'reactflow/dist/style.css';
import { initDebugUtils, setDebugMode, DebugMode } from './services/debugUtils';

// Initialize debug utilities for console access
initDebugUtils();

// Enable markdown debug mode by default for character sheet debugging
setDebugMode(DebugMode.MARKDOWN, true);
// To enable other debug modes, use the browser console:
// window.debugUtils.enableDebug('character-updates') or window.debugUtils.enableDebug('all')

// Add some basic global styles
const style = document.createElement('style');
style.textContent = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background-color: #f7fafc;
    color: #2d3748;
  }

  button:hover {
    background-color: #2d3748 !important;
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
