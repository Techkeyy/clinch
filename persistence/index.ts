import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { SessionStore } from "./store";
import { openSQLite } from "./sqlite";
import { openPostgres } from "./postgres";

// Runtime selection: DATABASE_URL present -> Neon/Postgres production path.
// Absent -> file-backed SQLite dev/test path (data/ is gitignored).
// Both implement the same SessionStore contract.
export function openStore(): SessionStore {
  const url = process.env.DATABASE_URL;
  if (url) return openPostgres(url);
  const file = process.env.SQLITE_PATH || "data/clinch-dev.db";
  mkdirSync(dirname(file), { recursive: true });
  return openSQLite(file);
}
export type { SessionStore, SessionRow, StepRow } from "./store";
