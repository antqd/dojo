// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

// Pagine
import App from "./App.jsx"; // landing page
import CompilerDojo from "./pages/CompilerDojo.jsx";
import ContactForm from "./pages/ContactForm.jsx";
import FormParterManager from "./pages/FormParterManager.jsx";
import CompilerAdesione from "./pages/CompilerAdesione.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/compiler-dojo" element={<CompilerDojo />} />
        <Route path="/contact-form" element={<ContactForm />} />
        <Route path="/form-partner-manager" element={<FormParterManager />} />
        <Route path="/compileradesione" element={<CompilerAdesione />} />
        {/* 404 fallback */}
        <Route
          path="*"
          element={<div style={{ padding: 24 }}>Pagina non trovata</div>}
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
