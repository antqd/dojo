import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/ and https://tailwindcss.com/docs/guides/vite
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
