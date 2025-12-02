import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./assets/app.css";
import AppProvider from "./components/AppProvider.tsx";
import { Toaster } from "sonner";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster richColors closeButton position="top-right" />
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
