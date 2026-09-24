import { defineConfig } from "@playwright/test";
import fs from "node:fs";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

export const E2E_ADMIN_EMAIL = "e2e-admin@example.test";

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3100",
    permissions: ["microphone"],
    launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  },
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100/admin/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "anon-placeholder",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      ADMIN_EMAILS: E2E_ADMIN_EMAIL,
      NEXT_PUBLIC_TRANSCRIPTION_PROVIDER: "mock",
    },
  },
});
