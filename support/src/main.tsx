import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import SupportPortalApp from "./App";
import "./index.css";
import { AuthProvider } from "../../src/context/AuthContext";
import { ThemeProvider } from "../../src/context/ThemeContext";
import ErrorBoundary from "../../src/components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <SupportPortalApp />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
