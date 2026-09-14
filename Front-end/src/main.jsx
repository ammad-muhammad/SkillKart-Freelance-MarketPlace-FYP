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