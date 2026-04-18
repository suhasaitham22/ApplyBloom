import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(new URL(".", import.meta.url).pathname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/__tests__/**",
        "src/**/*.d.ts",
        "src/lib/contracts/**",
        "src/lib/queues/message-types.ts",
        "src/worker.ts",
      ],
      reporter: ["text", "text-summary"],
    },
  },
});
