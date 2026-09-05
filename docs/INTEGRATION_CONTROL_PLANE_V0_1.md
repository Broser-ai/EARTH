# Integration Control Plane v0.1

**Status:** implemented on the API as a **gated request ledger**. Not a live AI mesh.  
**Owner:** Michael. Providers stay `NOT_CONFIGURED` until a later adapter records a successful health check **and** a tenant policy explicitly enables them.  
**Base:** `origin/main` `8317e0620c926c541c23d1a4fb8d8dfc3e25098b` (`feat/evidence-approvals-v0.1` was not on origin at swarm start).

This increment adds server-side provider control. It does **not** connect Roboflow, Hugging Face, Tinker, Inkling, HeyGen, or LangGraph. It does **not** grant `CONNECTED`. A process environment credential is not a live provider.

Related: [PROVIDER_SECURITY_POLICY.md](./PROVIDER_SECURITY_POLICY.md), [INTEGRATION_SWARM_STATUS.md](./INTEGRATION_SWARM_STATUS.md).

---

## What exists

| Piece | What it is | What it is not |
|-------|------------|----------------|
| Migration `005_integration_control_plane.sql` | Catalog, tenant policies, operation ledger | Not RLS. Not a secret store. |
| `ProviderAdapter` | Server-side interface every later adapter must implement | Not a browser client. Not an LLM agent. |
| Policy gate | Deterministic allow/deny before any adapter work | Not a health check. Not CONNECTED. |
| HTTP routes | Tenant-scoped list/status/create/read/cancel | Not a webhook receiver. Not a provider proxy. |
| `DisabledAdapter` | Default for every provider key | Never performs HTTP. |

`GET /v1/info` still reports `externalApis: false`. Development envelopes remain `DEVELOPMENT_ONLY` when the development auth provider is active.

---

## Routes

All routes require TenantContext/RBAC. `GET /health` and `GET /v1/info` stay public.

| Method | Path | Who | Result |
|--------|------|-----|--------|
| GET | `/v1/integrations` | VIEWER+ | Catalog with `status: NOT_CONFIGURED`, `connected: false` |
| GET | `/v1/integrations/:providerKey/status` | VIEWER+ | One provider. Unknown key → 404 `PROVIDER_NOT_ALLOWLISTED` |
| POST | `/v1/integrations/:providerKey/operations` | OWNER, ESG_LEAD, OPERATIONS | Persist a gated operation. Default `NOT_CONFIGURED` / `BLOCKED` |
| GET | `/v1/integration-operations/:operationId` | VIEWER+ | Org-scoped read. Other tenant → 404 `OPERATION_NOT_FOUND` |
| POST | `/v1/integration-operations/:operationId/cancel` | OWNER, ESG_LEAD, OPERATIONS | Local cancel. No provider HTTP |

Body `organizationId`, `role`, `userId`, and `actorId` are ignored. Role comes from Postgres.

---

## Provider keys

Allow-list only:

`ROBOFLOW` · `HUGGINGFACE` · `TINKER` · `INKLING` · `HEYGEN` · `LANGGRAPH`

Statuses: `NOT_CONFIGURED`, `DISABLED`, `AVAILABLE`, `DEGRADED`, `ERROR`.  
**There is no `CONNECTED` status.** HTTP views always include `"connected": false` in v0.1.

Default operation types (future adapters; blocked until configured + healthy + policy):

| Provider | Allowed operation types |
|----------|-------------------------|
| ROBOFLOW | `MATERIAL_IMAGE_INFERENCE` |
| HUGGINGFACE | `MODEL_CATALOG_LOOKUP`, `APPROVED_INFERENCE_REQUEST` |
| TINKER | `TINKER_TRAINING_JOB_REQUEST` |
| INKLING | `INKLING_POLICY_ARTIFACT_REQUEST` |
| HEYGEN | `EXECUTIVE_VIDEO_DRAFT_REQUEST` |
| LANGGRAPH | `PRIME_WORKFLOW_PROJECTION` |

---

## Policy order

`evaluateIntegrationPolicy` is deterministic:

1. JSON schema / idempotency key / unsafe payload fields / size
2. Caller role
3. `RESTRICTED` → always `RESTRICTED_DATA_BLOCKED` (cannot be allow-listed)
4. Tenant policy must exist and `enabled=true`
5. Purpose and data classification must be on the tenant allow-lists
6. `CONFIDENTIAL` requires explicit outbound classification on the policy
7. Operation type must match the provider allow-list
8. Monthly request/cost limits
9. Server enable flag + credential presence (credential alone is `PROVIDER_DISABLED`)
10. Durable human approval before `QUEUED` (default `require_human_approval=true`)

v0.1 has no durable-approval table on this branch. `approvalVerified` is therefore always false. High-impact operations stay `REQUESTED` even if a later adapter reports health.

The HTTP create path **never** calls `executeOperation` against a live network. `DisabledAdapter.executeOperation` returns `NOT_CONFIGURED` and does not increment the outbound probe.

---

## Environment (server-side only)

Enable flags default **false**. Credential names are presence-probed; values are never returned, logged, or written to audit metadata.

| Provider | Enable flag | Credential names (presence only) |
|----------|-------------|----------------------------------|
| ROBOFLOW | `EARTH_INTEGRATION_ROBOFLOW_ENABLED` | `EARTH_INTEGRATION_ROBOFLOW_API_KEY`, `ROBOFLOW_API_KEY` |
| HUGGINGFACE | `EARTH_INTEGRATION_HUGGINGFACE_ENABLED` | `EARTH_INTEGRATION_HUGGINGFACE_TOKEN`, `HF_TOKEN`, `HUGGINGFACE_TOKEN` |
| TINKER | `EARTH_INTEGRATION_TINKER_ENABLED` | `EARTH_INTEGRATION_TINKER_API_KEY`, `TINKER_API_KEY` |
| INKLING | `EARTH_INTEGRATION_INKLING_ENABLED` | `EARTH_INTEGRATION_INKLING_WEIGHTS_URI`, `INKLING_WEIGHTS_URI` |
| HEYGEN | `EARTH_INTEGRATION_HEYGEN_ENABLED` | `EARTH_INTEGRATION_HEYGEN_API_KEY`, `HEYGEN_API_KEY` |
| LANGGRAPH | `EARTH_INTEGRATION_LANGGRAPH_ENABLED` | enable flag only (no vendor key) |

`VITE_*` variants of these names **refuse process start**.

---

## Adapter registration for later workers

Workers B–F must not edit `registry.ts`. Export `createAdapter()` from:

`apps/api/src/integrations/<provider>/index.ts`

The registry dynamically imports that module. If the file is absent, `DisabledAdapter` remains in place.

---

## What this increment does **not** do

- Call Roboflow, Hugging Face, Tinker, Inkling, HeyGen, or a hosted LangGraph
- Put secrets in `VITE_*`, the SPA, localStorage, fixtures, logs, or audit metadata
- Create VERIFIED claims, approve claims, or resume PRIME sessions
- Enable NanoChat, LLM/RAG, trained RL, blockchain/ZK, CSRD/PPWR/DPP, or Cirkel
- Treat a configured key as CONNECTED
