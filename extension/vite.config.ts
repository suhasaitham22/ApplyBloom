import { defineConfig } from "vite";
import { resolve } from "path";

// Builds extension to dist/ — each entry is standalone (MV3 content scripts
// can't share modules). Background is an ES module service worker.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background.ts"),
        "content-scripts/greenhouse": resolve(__dirname, "src/content-scripts/greenhouse.ts"),
        "content-scripts/lever": resolve(__dirname, "src/content-scripts/lever.ts"),
        "content-scripts/ashby": resolve(__dirname, "src/content-scripts/ashby.ts"),
        "popup/popup": resolve(__dirname, "src/popup/popup.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        format: "esm",
      },
    },
  },
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
