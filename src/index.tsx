
import React from 'react';
import ReactDOM from 'react-dom/client';
import './globals.css'; // Import global CSS
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { logError } from './lib/logger'; // Import logger
import 'leaflet/dist/leaflet.css'; // Import leaflet CSS

const rootElement = document.getElementById('root');
if (!rootElement) {
  // This is a hard failure, the app can't even start.
  const errorMsg = "Could not find root element to mount to";
  logError(errorMsg);
  throw new Error(errorMsg);
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch((error) =>
          logError("Service worker registration failed", error as Error)
        );
    });
  }
} catch (error) {
  logError('Failed during initial React render', error);
}
