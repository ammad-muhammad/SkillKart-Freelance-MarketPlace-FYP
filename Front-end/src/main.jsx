import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { BrowserRouter } from "react-router-dom";
import { isMobileApp } from "./utils/platform";
import "./styles/variables.css";
import "./styles/responsive.css";
import "./styles/native-app.css";

if (isMobileApp()) {
  document.documentElement.classList.add("is-native-app");

  // CSS `vh`/`dvh` units are unreliable on real Android WebView — they can
  // report a taller box than what's actually visible on-screen (system bars
  // aren't always excluded the way desktop-browser testing suggests), which
  // silently breaks anything relying on 100vh/100dvh for a fixed, centered
  // full-screen layout (see native-app.css's .auth-page rules — vertically
  // centering inside a box taller than the real viewport pushes content
  // toward the top with dead space below, exactly the reported symptom).
  // `window.innerHeight` is what's actually reliable here: it's a plain JS
  // number, not a CSS unit interpretation that can vary. Publish it as a
  // custom property CSS can consume instead of trusting vh/dvh directly.
  const setAppViewportHeight = () => {
    document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);
  };
  setAppViewportHeight();
  window.addEventListener('resize', setAppViewportHeight);
  window.addEventListener('orientationchange', setAppViewportHeight);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AuthProvider>
  </BrowserRouter>
);