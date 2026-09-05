# Integration Control Plane v0.1

**Status:** local development prototype. Not production. Not a live provider gateway.  
**Code:** `apps/api/src/integrations/**`  
**Migration:** `apps/api/migrations/007_integration_control_plane.sql`

> Integration Control Plane v0.1 manages tenant-scoped, auditable provider
> operation intents and hard policy checks. It does not perform live provider
> calls, model inference, fine-tuning, video generation, LangGraph execution,
> LLM/RAG, reinforcement learning, external queue execution, blockchain/ZK,
> or regulatory decision-making.

## What this increment actually does

The control plane is the **single hard policy gateway** that future server-side
Roboflow, Hugging Face, Tinker, Inkling, HeyGen, and LangGraph adapters must
use. In v0.1 it:

- Seeds six providers as **`NOT_CONFIGURED`**.
- Stores tenant integration policies (default **disabled**, not seeded enabled).
- Accepts tenant-scoped operation **intents** over REST.
- Applies deterministic RBAC + data-classification + purpose checks.
- Persists operation rows as **`BLOCKED`** or **`NOT_CONFIGURED`**.
- Writes audit events without raw payloads, secrets, or provider bodies.
- Makes `executeOperation()` throw `INTEGRATION_OPERATION_NOT_IMPLEMENTED`.

It does **not** call providers, infer, fine-tune, generate video, run LangGraph,
talk to queues, or mutate claims / approvals / PRIME sessions.

## Provider lifecycle / status

| Status | Meaning in v0.1 |
|--------|-----------------|
| `NOT_CONFIGURED` | Default and current status for every provider. No outbound call. |
| `DISABLED` | Reserved. Not assigned by v0.1 runtime. |
| `AVAILABLE` | Reserved. **Never** returned in v0.1, including when an env var is set. |
| `DEGRADED` | Reserved. No health probe is performed. |
| `ERROR` | Reserved. No provider error can occur because no call is made. |

There is **no `CONNECTED` status**. An API key in process env is a probe only
(`apps/api/src/integrations/config.ts`). Presence is **not** `AVAILABLE`,
**not** `CONNECTED`, **not** live, **not** trained, **not** production-ready.

`GET /v1/integrations` and `GET /v1/integrations/:providerKey/status` skip live
health checks and write `INTEGRATION_HEALTH_CHECK_SKIPPED`.

## Policy and data classification

Checks run in this order:

1. Authenticated `TenantContext` (existing auth hook).
2. Role may request (`OWNER` / `ESG_LEAD` / `OPERATIONS`).
3. Provider is one of the six known keys.
4. Provider default status is recorded (`NOT_CONFIGURED` in v0.1).
5. Tenant policy exists.
6. Tenant policy is enabled.
7. `RESTRICTED` **always** blocks, even if the policy lists it.
8. Classification is in `allowed_data_classifications`.
9. Purpose is in `allowed_purposes`.
10. Idempotency key is present.
11. Monthly **request** quota is evaluated only when `monthly_request_limit` is set. Cost limits are **not** evaluated; v0.1 does not invent costs.
12. Forbidden side-effect operation types are blocked.
13. Because providers are not configured, a policy-passing request is stored as `NOT_CONFIGURED`, never `SUCCEEDED` / `RUNNING` / `QUEUED` execution.

`CONFIDENTIAL` is allowed only when the tenant policy explicitly lists it.
`PUBLIC` and `INTERNAL` follow the same allow-list. Policies are not enabled
by the migration.

## RBAC

| Role | List/status/read operation | Request operation | Cancel |
|------|----------------------------|-------------------|--------|
| `OWNER` | yes | yes | yes |
| `ESG_LEAD` | yes | yes | yes |
| `OPERATIONS` | yes | yes | no (`INTEGRATION_CANCELLATION_FORBIDDEN`) |
| `REVIEWER` | yes | no (`INTEGRATION_ROLE_REQUIRED`) | no |
| `VIEWER` | yes | no | no |

Role comes from Postgres via `TenantContext`, never from the request body or
`x-earth-user-role`. Tenant B cannot read or cancel tenant A operations
(`INTEGRATION_OPERATION_NOT_FOUND`).

## REST API

All routes are protected except the existing public `/health` and `/v1/info`.
Development responses include `mode: "DEVELOPMENT_ONLY"`.

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/v1/integrations` | Six providers, all `NOT_CONFIGURED`. |
| `GET` | `/v1/integrations/:providerKey/status` | No secrets, no live health. |
| `POST` | `/v1/integrations/:providerKey/operations` | Creates intent; never executes. |
| `GET` | `/v1/integration-operations/:operationId` | Org-scoped. |
| `POST` | `/v1/integration-operations/:operationId/cancel` | Owner/ESG_LEAD only. |

Route `providerKey` must match `body.providerKey` when the body includes one.
No endpoint returns env values, API keys, JWTs, prompts, documents, or image
bytes.

## Idempotency

`UNIQUE (organization_id, provider_key, idempotency_key)`. A second POST with
the same triple returns the original operation row. No second execution can
occur because execution does not exist.

## Timeout and retry

Optional `timeoutMs` (1–3,600,000) sets `expires_at` on the intent row. A later
GET or idempotent POST of a **`NOT_CONFIGURED`** row whose window has passed
marks it **`EXPIRED`** (`INTEGRATION_OPERATION_EXPIRED`) without calling a
provider. **`BLOCKED`** policy failures stay `BLOCKED`. Retries cannot succeed:
`executeOperation()` still throws `INTEGRATION_OPERATION_NOT_IMPLEMENTED`.

## Audit

| Event | When |
|-------|------|
| `INTEGRATION_REQUESTED` | Operation POST accepted for evaluation |
| `INTEGRATION_BLOCKED` | Policy/RBAC/classification/purpose/quota denial |
| `INTEGRATION_NOT_CONFIGURED` | Policy would permit an intent; provider is not configured |
| `INTEGRATION_QUEUED` | Reserved; v0.1 does not persist `QUEUED` because providers are not configured |
| `INTEGRATION_CANCELLED` | Successful cancel |
| `INTEGRATION_EXPIRED` | Overdue `NOT_CONFIGURED` intent closed without execution |
| `INTEGRATION_HEALTH_CHECK_SKIPPED` | List or status GET |

Each event includes tenant/org id, actor id, auth mode, correlation id, safe
provider key and operation type, and request digest. It does **not** include
raw payload, prompts, documents, images, JWTs, auth headers, or provider
bodies.

## Adapter contract

Future workers must implement `ProviderAdapter` in
`apps/api/src/integrations/types.ts` and go through
`IntegrationControlService`. `executeOperation()` in v0.1 throws and must not
be replaced with HTTP until a later increment that Michael accepts.

See [INTEGRATION_CONTROL_PLANE_HANDOFF.md](./INTEGRATION_CONTROL_PLANE_HANDOFF.md)
and [PROVIDER_SECURITY_POLICY.md](./PROVIDER_SECURITY_POLICY.md).

## Tests

Docker Postgres required.

```bash
docker compose up -d --wait
DATABASE_URL='postgres://earth:earth@localhost:5432/earth' npm run db:migrate
npm run api:test
```

Control-plane cases live in `apps/api/test/integrations/core/`.

## Non-goals (strict)

- Live Roboflow / Hugging Face / Tinker / Inkling / HeyGen / LangGraph calls
- Browser or `VITE_*` provider secrets
- NanoChat, LLM, RAG, embeddings
- Hosted or trained reinforcement learning
- Kafka, Redis, Temporal, BullMQ, or any external queue
- Blockchain, ZK, DID credentials
- CSRD / PPWR / DPP engines
- Marketplace execution, payments, signing, publishing
- Postgres RLS (still not enabled)
- Production OIDC (code exists; this increment does not configure a deployment)
- Autonomous external actions
- Claiming a provider is live, connected, trained, or production-ready
