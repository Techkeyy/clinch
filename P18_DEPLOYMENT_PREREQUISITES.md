# CLINCH P18 Deployment Prerequisites

Date: 2026-09-13
Status: BLOCKED pending owner-provisioned production infrastructure

## Safe presence check

This check inspected only variable names and hosting-file presence. No secret values were read into the report or displayed.

| Requirement | Present in current process | Name present in local `.env` | Result |
| --- | --- | --- | --- |
| Neon/Postgres `DATABASE_URL` | No | No | Missing |
| DashScope `DASHSCOPE_API_KEY` | No | No | Missing |
| Anonymous ownership `SESSION_PEPPER` | No | Yes | Must be provisioned in deployment host |
| Optional `QWEN_BASE_URL` | No | No | Default exists; configure only if owner uses a non-default region |
| Optional `QWEN_MODEL` | No | No | Default exists; configure only if owner selects another model |
| Hosting project/config | No `vercel.json`, `.vercel`, Dockerfile, or compose file | Not applicable | Hosting target not selected |
| Git remote | None configured | Not applicable | No remote deployment source configured |

## Why work stops here

The application correctly refuses a production SQLite fallback when `DATABASE_URL` is absent. Deploying without a real Postgres connection, ownership pepper, and model credential would either fail closed or make the promised production persistence/model path unverifiable. No deployment command or external mutation was attempted.

## Owner action required

1. Provision a Neon/Postgres database and set `DATABASE_URL` in the chosen hosting provider.
2. Set a strong production-only `SESSION_PEPPER` in that provider. Do not reuse or commit the local value.
3. Set `DASHSCOPE_API_KEY`. Keep the default Qwen endpoint/model unless the owner intentionally chooses a different region/model, in which case set `QWEN_BASE_URL` and `QWEN_MODEL` too.
4. Choose a hosting provider and connect the repository or provide the provider project details. No git remote or hosting project is configured in this workspace.
5. Apply the Drizzle schema to the provisioned database through the owner-controlled deployment workflow, deploy over HTTPS, and return the public URL for P18 verification.

After those prerequisites exist, the next run can verify production refusal and persistence with the real deployment, then continue to P19 clean-user E2E. Until then, P18 remains BLOCKED and the product remains local BUILDING, not RELEASE READY.