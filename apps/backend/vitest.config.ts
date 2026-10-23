import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Tests run against the local database (Turbo starts and migrates it first). Existing env vars win.
const rootEnv = new URL("../../.env", import.meta.url);
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({});
