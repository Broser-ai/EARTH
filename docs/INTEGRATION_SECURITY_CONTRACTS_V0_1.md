# Integration security contracts v0.1

**Status:** black-box contract tests + production-src scan. Not a penetration test, certification, or live provider mesh.  
**Branch:** `feat/integration-security-contracts-v0.1`  
**Control plane:** `2aaf06fcfcae971b0700c5e40f0f9d642dceaf00`

Related: [INTEGRATION_CONTROL_PLANE_V0_1.md](./INTEGRATION_CONTROL_PLANE_V0_1.md), [PROVIDER_SECURITY_POLICY.md](./PROVIDER_SECURITY_POLICY.md).

This increment does **not** connect Roboflow, Hugging Face, Tinker, Inkling, HeyGen, or LangGraph. It does **not** grant `CONNECTED`. Adapter folders may still be empty; mocks in `apps/api/test/helpers/integration-mocks.ts` still prove the adapter contract.

---

## What is covered

Providers under test: `ROBOFLOW` · `HUGGINGFACE` · `TINKER` · `INKLING` · `HEYGEN` · `LANGGRAPH`

| Contract | How it is asserted |
|----------|--------------------|
| Disabled / default → `NOT_CONFIGURED` | `GET /v1/integrations` and `GET /v1/integrations/:providerKey/status` |
| No key / config in API responses | JSON must not contain `VITE_`, `Bearer`, or fixture secrets |
| Environment key alone ≠ `CONNECTED` | Dedicated file recreates the app with credential env vars and `ENABLED=false` |
| `RESTRICTED` blocked | `POST .../operations` → `BLOCKED` / `RESTRICTED_DATA_BLOCKED` |
| Tenant without policy blocked | `TENANT_POLICY_MISSING` |
| Tenant B cannot read tenant A | `GET /v1/integration-operations/:id` → `404 OPERATION_NOT_FOUND` |
| Idempotent operations | Duplicate `idempotencyKey` → `200` + same id |
| Cancellation RBAC | `VIEWER` cancel → `403 ROLE_FORBIDDEN`; `OWNER` cancel → `CANCELLED` |
| Request / block / cancel audit | `INTEGRATION_REQUESTED`, `INTEGRATION_BLOCKED`, `INTEGRATION_CANCELLED` |
| No provider HTTP in default/test mode | `providerOutboundProbe.calls === 0` and stubbed `globalThis.fetch` |
| No `VERIFIED` claims | No `claims` / `evidence` tables on this SHA; responses must not contain `"VERIFIED"` |
| Cannot approve claims or resume PRIME | Creating operations does not change `execution_sessions.state`; `POST /v1/sessions/:id/run-next` is a different route |
| No browser-supplied identity | Top-level `apiKey` / `token` → `400 UNSAFE_PAYLOAD_FIELD`, not persisted |
| No unsafe prompt / webhook / callback URL | `payload.prompt`, `webhookUrl`, `callbackUrl` → `UNSAFE_PAYLOAD_FIELD` |

---

## Adapter-specific mocks

Used when `apps/api/src/integrations/<provider>/` is absent. `loadContractAdapter()` prefers a real `createAdapter()` export when present.

| Provider | Mock contract |
|----------|----------------|
| Roboflow | Confidence below `0.85` → `ABSTAINED` / `REQUIRES_HUMAN_REVIEW`; still `INPUT_UNVERIFIED` |
| Hugging Face | `modelId` must be on `earth-internal/material-classifier`; `https://` and unknown ids are rejected |
| Tinker / Inkling | Job intent only; `trained=false` `completed=false` |
| HeyGen | Blocks `RESTRICTED` and PII-like keys; `autoPublish=false` `published=false` `DRAFT` |
| LangGraph | Projection `read()` only; `writes === 0` (cannot mutate PRIME) |

`executeOperation` on every mock refuses unless `enabled`, `credentialPresent`, and injected `healthOk` are all true. Default transport is `null` (no network). `connected` is always `false`.

---

## Scan

`scripts/integration-security-scan.mjs` walks `apps/api/src/integrations` (production src only) and fails on:

- `VITE_` except the process-start forbid guard in `config.ts`
- `localStorage`
- `connected: true`

Run:

```bash
node scripts/integration-security-scan.mjs
```

---

## What this increment does **not** do

- Call a real provider HTTP API
- Put secrets in `VITE_*`, the SPA, `localStorage`, committed `.env`, or audit metadata
- Create `VERIFIED` claims, approve claims, or resume PRIME
- Treat a configured environment credential as `CONNECTED`
- Modify production `apps/api/src/**`
