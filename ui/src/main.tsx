import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AskUserQuestionsApp } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element.");

createRoot(root).render(
  <StrictMode>
    <AskUserQuestionsApp />
  </StrictMode>,
);
