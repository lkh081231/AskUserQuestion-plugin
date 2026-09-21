import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: "ui",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: "../dist/ui",
    emptyOutDir: true,
  },
});
