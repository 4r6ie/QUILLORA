import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** Load .env / .env.local without pulling in a dependency. */
export function loadEnv(file = ".env.local") {
  try {
    const text = readFileSync(join(root, file), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // No env file: rely on the real environment.
  }
}

export function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createClient(url = process.env.DIRECT_URL ?? process.env.DATABASE_URL) {
  if (!url) throw new Error("No database URL. Set DIRECT_URL or DATABASE_URL.");
  return new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
}

export async function withClient(fn, url) {
  const client = createClient(url);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export function log(...args) {
  console.log("[quillora]", ...args);
}
