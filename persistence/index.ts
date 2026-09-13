import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { SessionStore } from "./store";
import { openSQLite } from "./sqlite";
import { openPostgres } from "./postgres";

// Runtime selection: DATABASE_URL present -> Neon/Postgres production path.
// Absent -> file-backed SQLite dev/test path (data/ is gitignored).
// PRODUCTION REFUSAL: serverless/production runtimes without DATABASE_URL fail
// configuration instead of silently falling back to ephemeral SQLite, which
// would lose sessions on every deploy and fake persistence.
export function openStore(): SessionStore {
  const url = process.env.DATABASE_URL;
  if (url) return openPostgres(url);
  // Local-prod escape hatch ONLY: NODE_ENV=production also holds for local
  // `next start`, where SQLite remains the honest dev backend. On Vercel
  // (VERCEL=1) the hatch is ignored and missing DATABASE_URL fails closed.
  const localProdE2E = process.env.CLINCH_DEV_SQLITE === "1" && !process.env.VERCEL;
  if ((process.env.NODE_ENV === "production" || process.env.VERCEL) && !localProdE2E) {
    throw new Error("DATABASE_URL is not configured: refusing SQLite fallback in production (P15 production boundary).");
  }
  const file = process.env.SQLITE_PATH || "data/clinch-dev.db";
  mkdirSync(dirname(file), { recursive: true });
  return openSQLite(file);
}
export type { SessionStore, SessionRow, StepRow } from "./store";
