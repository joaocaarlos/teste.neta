import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { initSentry } from "./lib/sentry";
import { ErrorBoundary } from "./features/error/ErrorBoundary";

// Sentry só roda se VITE_SENTRY_DSN estiver setada (no-op em dev)
initSentry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
