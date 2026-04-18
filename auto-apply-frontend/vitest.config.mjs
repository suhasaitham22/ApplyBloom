import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    preserveSymlinks: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: "v8",
      include: [
        "src/lib/**/*.ts",
        "src/features/*/lib/**/*.ts",
        "src/features/*/components/**/*.tsx",
        "src/middleware.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/__tests__/**",
        "src/**/*.d.ts",
        "src/lib/api-types.ts",
        "src/lib/supabase/browser.ts",
        "src/lib/supabase/server.ts",
        "src/lib/supabase/demo.ts",
        "src/lib/query/**",
        "src/features/studio/components/studio-shell.tsx",
        "src/features/studio/components/studio-shell-stub.tsx",
        "src/features/auth/components/callback-hash-handler.tsx",
        "src/features/auth/components/global-hash-auth-handler.tsx",
      ],
      thresholds: {
        lines: 80,
        functions: 70,
        branches: 70,
        statements: 80,
      },
      reporter: ["text", "text-summary"],
    },
  },
});
