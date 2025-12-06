import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure root element exists
const rootElement = document.getElementById("root");

if (!rootElement) {
  const error = "Root element not found. Make sure there's a <div id='root'></div> in your HTML.";
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; color: red;">
      <h1>Error: Root Element Not Found</h1>
      <p>${error}</p>
    </div>
  `;
  throw new Error(error);
}

// Create root and render app
const root = createRoot(rootElement);

try {
  root.render(<App />);
} catch (error) {
  console.error("Failed to render app:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; color: red;">
      <h1>Error Loading Application</h1>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; margin-top: 10px;">
        ${error instanceof Error ? error.stack : String(error)}
      </pre>
      <p style="margin-top: 20px; color: #666;">Check the browser console (F12) for more details.</p>
    </div>
  `;
}
