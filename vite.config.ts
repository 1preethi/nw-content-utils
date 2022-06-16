import { defineConfig } from "vite";
import path from "path";

import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsxFactory: "h",
    jsxFragment: "Fragment",
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/lib.ts"),
      name: "Lib",
      fileName: (format) => `lib.ts`,
    },
    rollupOptions: {
      external: ["react", "react-dom"],
    },
  },
});
