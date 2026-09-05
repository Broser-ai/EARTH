# Integration Control Plane v0.1 — handoff

**Branch:** `feat/integration-control-plane-v0.1`  
**Worktree:** `/home/ubuntu/worktrees/EARTH-integration-control-plane`  
**Canonical base:** `origin/integration/earth-canonical-foundation-v1` `bfe6feb9e5fc9459bb57479f4f53784310a8e8df`

> Integration Control Plane v0.1 manages tenant-scoped, auditable provider
> operation intents and hard policy checks. It does not perform live provider
> calls, model inference, fine-tuning, video generation, LangGraph execution,
> LLM/RAG, reinforcement learning, external queue execution, blockchain/ZK,
> or regulatory decision-making.

## Ancestry

Rebased onto the verified canonical foundation:

- `origin/integration/earth-canonical-foundation-v1` @ `bfe6feb9e5fc9459bb57479f4f53784310a8e8df`
- tenant fixture repair `1e00cc3` is in ancestry
- Evidence/Claims and durable approvals are present (`005_evidence_approvals.sql`)
- Integration Control Plane migration is **`006_integration_control_plane.sql`** (005 is occupied)

Do not use `origin/main` as the base.

## What you must use

| Piece | Path |
|-------|------|
| Types / `ProviderAdapter` | `apps/api/src/integrations/types.ts` |
| Env probe (presence only) | `apps/api/src/integrations/config.ts` |
| Registry | `apps/api/src/integrations/registry.ts` |
| Hard policy | `apps/api/src/integrations/policy.ts` |
| Audit writer | `apps/api/src/integrations/audit.ts` |
| REST | `apps/api/src/integrations/routes.ts` |
| Service | `apps/api/src/integrations/core/service.ts` |
| v0.1 adapter | `apps/api/src/integrations/core/adapter.ts` |
| Schema | `apps/api/migrations/006_integration_control_plane.sql` |

Do **not** start from `src/sovereign/vision/roboflow/**` or other browser
kernel stubs. Those are prototype-only.

## Handoff by adapter

### Roboflow

- Provider key: `ROBOFLOW`
- Status today: `NOT_CONFIGURED` (even if `ROBOFLOW_API_KEY` is set)
- Allowed purposes must be listed on a **tenant** policy before an intent can
  be stored as `NOT_CONFIGURED` rather than `BLOCKED`
- Images and detection payloads are `payloadReference` only — digest, do not
  log pixels. `RESTRICTED` batches cannot leave the tenant.
- Detection output must not create `VERIFIED` claims or skip HITL.

### Hugging Face

- Provider key: `HUGGINGFACE`
- Do not call Hub inference, datasets, or training APIs in this increment
- Env probe names: `HUGGINGFACE_API_KEY` / `HF_TOKEN` (presence only)
- Model-card lookup is a **purpose string**, not a live fetch

### Tinker / Inkling

- Keys: `TINKER`, `INKLING`
- Fine-tune / weights URIs are not execution. `TINKER_API_KEY` and
  `INKLING_WEIGHTS_URI` do not change status off `NOT_CONFIGURED`
- No hosted RL, no session-rl promotion, no PRIME resume from adapter output

### HeyGen

- Key: `HEYGEN`
- No video generation, lipsync, or avatar HTTP
- Scripts and source media stay out of audit metadata

### LangGraph

- Key: `LANGGRAPH`
- No graph execution, no LangSmith, no LLM nodes
- In-tab `@langchain/langgraph/web` in the SPA is **not** this control plane

## Required worker sequence (later increment)

1. Load `TenantContext` from the request (existing auth hook).
2. `registry.get(providerKey).validateRequest(context, request)`.
3. If `state === 'BLOCKED'` stop. Persist already happens via the REST/service API.
4. `createOperation` — v0.1 stores `NOT_CONFIGURED`.
5. Do **not** call `executeOperation()` until Michael accepts a later increment
   that implements it behind the same policy gate.
6. Cancel only as `OWNER` / `ESG_LEAD`.
7. Write no additional logs containing payloads or secrets.

## Test commands

```bash
docker compose up -d --wait
DATABASE_URL='postgres://earth:earth@localhost:5432/earth' npm run db:migrate
npm run typecheck
npm run api:typecheck
npm run lint
npm run format:check
npm run test
npm run api:test
npm run build
npm run api:build
npm audit
```

Secret / claim scan: see `docs/CURSOR_REVIEW_CHECKLIST.md`.

## Remaining limitations

- Providers never leave `NOT_CONFIGURED`
- No live provider HTTP; `executeOperation()` throws `NOT_IMPLEMENTED`
- No production OIDC, no Postgres RLS
- Monthly cost limits are stored but not evaluated (no invented costs)
- Human-approval `QUEUED` is not a persisted v0.1 success path because
  configuration fails closed first
- Provider-specific adapters are not started in this increment
