import { mkdirSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ quiet: true });
mkdirSync("data", { recursive: true });

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:data/app.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
