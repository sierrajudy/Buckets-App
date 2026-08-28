import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Without this, vitest also picks up the *.test.js files tsc emits
    // into dist/ on every `npm run build`, running each test twice.
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
