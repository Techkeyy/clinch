import { BitgetError, classifyUpstream } from "./errors";

// Minimal typed GET client. Normal DNS/TLS only: no IP overrides, no cert
// bypasses. Dev machines with filtered DNS use a documented test-only
// workaround OUTSIDE this module (see tests/live-bitget.test.ts).
const DEFAULT_TIMEOUT_MS = 12_000;

export type FetchImpl = typeof fetch;

export async function bitgetGet<T>(url: string, endpointFamily: string, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl: FetchImpl = fetch): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new BitgetError("UPSTREAM_FAILURE", endpointFamily, `Upstream timeout after ${timeoutMs}ms`);
    }
    throw new BitgetError("UPSTREAM_FAILURE", endpointFamily, `Network failure: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    throw new BitgetError("MALFORMED_RESPONSE", endpointFamily, `Non-JSON response (HTTP ${res.status})`, res.status);
  }
  const rec = body as { code?: unknown; msg?: unknown; data?: unknown };
  if (typeof rec.code !== "string" || rec.code !== "00000") {
    throw classifyUpstream(endpointFamily, String(rec.code ?? "UNKNOWN"), String(rec.msg ?? "unknown error"), res.status);
  }
  return rec.data as T;
}
