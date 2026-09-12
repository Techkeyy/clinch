// Typed Bitget failures. NO_DATA (absent) and negative evidence are distinct
// types everywhere; see domain/types.ts NoData vs NegativeEvidence.
export type BitgetErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED"
  | "NO_DATA"
  | "STALE"
  | "UPSTREAM_FAILURE"
  | "MALFORMED_RESPONSE";

export class BitgetError extends Error {
  readonly code: BitgetErrorCode;
  readonly endpointFamily: string;
  readonly status?: number;
  constructor(code: BitgetErrorCode, endpointFamily: string, message: string, status?: number) {
    super(message);
    this.name = "BitgetError";
    this.code = code;
    this.endpointFamily = endpointFamily;
    this.status = status;
  }
}

/** Map exchange/API failure signatures to typed errors (P4 taxonomy). */
export function classifyUpstream(endpointFamily: string, code: string, message: string, status?: number): BitgetError {
  if (code === "40034") return new BitgetError("INVALID_INPUT", endpointFamily, `Unknown symbol or category: ${message}`, status);
  if (code === "40020") return new BitgetError("INVALID_INPUT", endpointFamily, `Bad request parameter: ${message}`, status);
  if (code === "25100") return new BitgetError("UNSUPPORTED", endpointFamily, `Pair not listed in this category: ${message}`, status);
  if (code === "40404") return new BitgetError("UNSUPPORTED", endpointFamily, `Unknown route: ${message}`, status);
  return new BitgetError("UPSTREAM_FAILURE", endpointFamily, `${code}: ${message}`, status);
}
