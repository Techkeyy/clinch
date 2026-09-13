// Session store contract. Two adapters: sqlite (local dev/test, node:sqlite,
// file-backed) and postgres (Neon production via Drizzle). Same behavior contract.
export interface SessionRow {
  id: string;
  ownerVerifier: string;
  intent: unknown;
  state: Record<string, unknown>;
  status: string;
  read: string;
  logicVersion: string;
  idempotencyKey: string;
  stateVersion: number;
  brief: unknown;
  createdAt: string;
  updatedAt: string;
}
export interface StepRow {
  id: string;
  sessionId: string;
  ord: number;
  kind: string;
  family: string | null;
  requestSummary: string | null;
  resultSummary: unknown;
  provenance: unknown;
  startedAt: string;
  finishedAt: string | null;
}
export interface SessionStore {
  readonly kind: "sqlite" | "postgres";
  createSession(row: Omit<SessionRow, "createdAt" | "updatedAt">): Promise<SessionRow>;
  getSession(id: string): Promise<SessionRow | null>;
  findByIdempotencyKey(key: string): Promise<SessionRow | null>;
  /** Compare-and-set: applies update only if stateVersion matches. Returns null on conflict. */
  compareAndSet(id: string, expectedVersion: number, patch: Partial<SessionRow>): Promise<SessionRow | null>;
  appendStep(step: Omit<StepRow, "id" | "startedAt" | "finishedAt"> & { id?: string }): Promise<StepRow>;
  getSteps(sessionId: string): Promise<StepRow[]>;
  deleteSession(id: string): Promise<boolean>;
  /** Rate counters: {count, windowStartMs} per key, for abuse control. */
  rateHit(key: string, windowMs: number, limit: number): Promise<{ allowed: boolean; count: number }>;
  /** Opportunistic cleanup: delete expired sessions (cascade steps) + stale buckets. */
  pruneExpired(nowMs: number): Promise<{ sessions: number; buckets: number }>;
  close(): Promise<void>;
}
