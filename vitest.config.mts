import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // E2E lives in /e2e and is run by Playwright, not Vitest.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Phase 0 ships only smoke tests; the spec's ≥90% target on lib/ and
      // features/*/schema.ts is enforced from Phase 1 onward (see CLAUDE.md).
      include: ["src/lib/**", "src/features/**/schema.ts"],
    },
  },
});
