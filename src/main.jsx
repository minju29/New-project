import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "pretendard/dist/web/static/pretendard-dynamic-subset.css";
import "@ADS/ui/styles.css";
import "@ADS/data-grid/styles.css";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
