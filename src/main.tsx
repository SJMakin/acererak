import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

// Add basic global styles for dark theme
const style = document.createElement('style');
style.textContent = `
  :root {
    /* Dark theme colors */
    --background-color: #1a202c;
    --background-secondary: #2d3748;
    --background-tertiary: #1e1e1e;
    --border-color: #4a5568;
    --border-subtle: #2d3748;
    --text-color: #e2e8f0;
    --text-muted: #a0aec0;
    --text-bright: #f7fafc;
    --accent-color: #805ad5;
    --accent-hover: #6b46c1;
    --success-color: #48bb78;
    --warning-color: #ed8936;
    --error-color: #f56565;
    
    /* Chat component colors (aliases) */
    --surface-color: #1a1a2e;
    --surface-dark: #0d0d1a;
    --border-hover-color: #3a3a6e;
    --text-primary: #e0e0e0;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
  }

  /* Ensure markdown content is readable */
  .markdown-content {
    color: var(--text-color);
  }
  .markdown-content h1, .markdown-content h2, .markdown-content h3 {
    color: var(--text-bright);
    margin-top: 1em;
    margin-bottom: 0.5em;
  }
  .markdown-content p {
    margin-bottom: 0.75em;
  }
  .markdown-content ul, .markdown-content ol {
    margin-left: 1.5em;
    margin-bottom: 0.75em;
  }
  .markdown-content code {
    background-color: var(--background-secondary);
    padding: 0.2em 0.4em;
    border-radius: 4px;
  }
`;
document.head.appendChild(style);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
