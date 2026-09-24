import { defineConfig } from "vitest/config";
import path from "node:path";
import fs from "node:fs";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "tests/support/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    testTimeout: 20_000,
    coverage: { provider: "v8", include: ["lib/domain/**"] },
  },
});
