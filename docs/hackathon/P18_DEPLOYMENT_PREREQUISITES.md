# CLINCH P18 Deployment Prerequisites

Date: 2026-09-13
Status: INTEGRATION PROVEN

The previously missing local and hosting prerequisites were provisioned and verified without recording any secret values.

## Verified configuration presence

| Requirement | Local presence | Production presence | Result |
| --- | --- | --- | --- |
| Neon/Postgres `DATABASE_URL` | Present in `.env.local` | Encrypted Vercel Production entry | Verified against real Neon |
| Bitget-sponsored `BITGET_QWEN_API_KEY` | Present in `.env.local` | Encrypted Vercel Production entry | Gateway and adapter verified |
| `QWEN_BASE_URL` | Present | Encrypted Vercel Production entry | Pinned to `https://hackathon.bitgetops.com/v1` |
| `QWEN_MODEL` | Present | Encrypted Vercel Production entry | Pinned to `qwen3.8-max` |
| `SESSION_PEPPER` | Present in `.env.local` | Encrypted Vercel Production entry | Owner cookie/isolation verified |
| Vercel project | Linked | `techkeyys-projects/clinch` | Production deployment verified |
| Git remote | None configured | Not required | Deployment completed without Git remote |

## Neon verification

`npm run db:push` applied the existing Drizzle schema to the real configured Neon database. The Postgres adapter contract passed session creation, research-step persistence, cross-request reads, idempotency, compare-and-set/version conflict, recent-session reads, delete, owner isolation, and expiry/retention cleanup. No SQLite result was used as evidence for this gate.

## Qwen verification

The Bitget-sponsored gateway accepted the configured credential and model. Chat Completions was selected after probing both candidate wire formats because it returned the complete CLINCH intent contract under structured output. Clear, ambiguous, unusual, and provider-failure behavior passed; the production adapter has no alternate model/provider fallback.

## Deployment verification

The current application is deployed at [https://clinch-nine.vercel.app](https://clinch-nine.vercel.app). A fresh public browser verified HTTPS, secure HttpOnly SameSite owner cookies, security headers, real Qwen intent, real Bitget baseline/research, streamed Hinge/STOP/brief behavior, Neon-backed refresh, recent history, deletion, and stranger isolation. P19 clean-user desktop and mobile checks passed. P20 owner UAT remains pending.

See [P18_PRODUCTION_VERIFICATION.md](P18_PRODUCTION_VERIFICATION.md) for the complete non-secret evidence record.