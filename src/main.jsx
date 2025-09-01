// main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import App from "./App.jsx";
import CompilerDojo from "./pages/CompilerDojo.jsx";
import ContactForm from "./pages/ContactForm.jsx";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/compiler-dojo", element: <CompilerDojo /> },
  { path: "/contact-form", element: <ContactForm /> },
  // opzionale: 404
  { path: "*", element: <div style={{ padding: 24 }}>Pagina non trovata</div> },
]);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
