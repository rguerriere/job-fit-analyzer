import { mkdirSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Locally this is a file in data/ (which Git ignores). Online it can point at a
// hosted libSQL database such as Turso by setting DATABASE_URL and DATABASE_AUTH_TOKEN.
export const DATABASE_URL = process.env.DATABASE_URL || "file:data/app.db";

if (DATABASE_URL.startsWith("file:")) {
  mkdirSync("data", { recursive: true });
}

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { libsqlClient?: Client };
const client =
  globalForDb.libsqlClient ??
  createClient({ url: DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
if (process.env.NODE_ENV !== "production") globalForDb.libsqlClient = client;

export const db = drizzle(client, { schema });
