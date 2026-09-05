# Swarm execution status — Evidence console + API contracts + PRIME v0.2

**Commander worktree:** `/workspace`  
**Commander branch:** `cursor/swarm-execution-status-54d8`  
**Commander commit:** branch tip of `cursor/swarm-execution-status-54d8` (this file)  
**Commander PR:** https://github.com/Broser-ai/EARTH/pull/12 (draft; coordination only; do not merge to `main`)  
**Published origin tip used as fallback base:** `8317e0620c926c541c23d1a4fb8d8dfc3e25098b` (`origin/main`, OIDC + TenantContext + Intake)  
**Updated:** 2026-09-05T10:49:00Z

This file is the coordination register. It does not claim live integrations, LLM/NanoChat/RAG, trained RL, blockchain/ZK, production auth, or CSRD/PPWR/DPP compliance.

---

## Requested base (not available on origin)

| Item | Requested | Found |
|------|-----------|--------|
| Branch | `feat/evidence-approvals-v0.1` | **Not on origin.** `git fetch` and GitHub refs have no such branch. |
| SHA | `bfe6feb9e5fc9459bb57479f4f53784310a8e8df` | **Not a git object** on this clone or on `origin`. Fetch of the SHA returned `not our ref`. |
| Evidence HTTP API | `apps/api/src/evidence/**`, migration `005_evidence_approvals.sql`, `docs/EVIDENCE_DOMAIN_V0_1.md` | **Not in `origin/main`.** Published API routes are `/health`, `/v1/info`, intake session start/get/audit/run-next only. |

A parent session described Evidence Domain + Durable Human Approval v0.1 as already Docker-tested on that unpublished SHA. That object was never pushed. Isolated workers cannot check it out.

**Fallback:** new worktrees were created from `origin/main` @ `8317e06`. Workers were instructed not to invent a production Evidence API and not to duplicate PRIME runtime.

**Path remap:** `../EARTH-*` from `/workspace` is `/EARTH-*`, which is not writable in this environment. Worker trees are `/tmp/EARTH-*` (same convention as earlier foundation worktrees).

---

## Worktree map

### 1. PRIME multi-session runtime

| Field | Value |
|-------|--------|
| Worktree | Not present on this VM. Intended: `/tmp/EARTH-prime-runtime` (parent session used `/tmp/EARTH-prime-multi-session-v0.2`) |
| Branch | `feat/prime-multi-session-v0.2` |
| Base SHA | Requested `bfe6feb9e5fc9459bb57479f4f53784310a8e8df` (unpublished) |
| Owner | Cursor PRIME Runtime Engineer |
| Allowed paths | `apps/api/src/prime/**`; `apps/api/migrations/**` PRIME migration only; `apps/api/test/**` PRIME tests only; `docs/PRIME_*.md` |
| Status | **ACTIVE elsewhere** — cloud agent `bc-7c8ed285-ee0c-572c-99d3-c0a4fcc2afa2` RUNNING. This commander does not touch the scope. |
| Current commit | Unknown on origin (branch not published) |
| Tests | Owned by that worker |
| Blockers | Unpublished evidence SHA; branch not on origin |
| Merge dependency | After API contract tests; before frontend Evidence Console. Integration branch not created yet. |

### 2. PRIME v0.2 review harness

| Field | Value |
|-------|--------|
| Worktree | Not present on this VM. Intended: `/tmp/EARTH-prime-review` |
| Branch | `review/prime-multi-session-v0.2` |
| Base SHA | Parent session cited `3db8ffe3e4d607ceaf8c0b9635db279763b5f549` (not verified on this clone) |
| Owner | VS Code Review Engineer |
| Allowed paths | `docs/PRIME_V0_2_*.md`; `scripts/prime-v0.2-*` |
| Status | **ACTIVE elsewhere** — cloud agent `bc-ef72d638-d987-52a1-84c1-a3abee66e347` RUNNING. This commander does not touch the scope. |
| Current commit | Unknown on origin (branch not published) |
| Tests | Review harness only; no PRIME production code |
| Blockers | Independent of frontend/contract workers; reviews PRIME after that worker has a final SHA |
| Merge dependency | Review only. Does not merge into the product integration branch as production code. |

### 3. Frontend Evidence Console

| Field | Value |
|-------|--------|
| Worktree | `/tmp/EARTH-frontend-evidence-console` |
| Branch | `feat/frontend-evidence-console-v0.1` |
| Base SHA | `8317e0620c926c541c23d1a4fb8d8dfc3e25098b` (fallback; requested `bfe6feb` absent) |
| Owner | Cursor Frontend Evidence Engineer |
| Allowed paths | `src/features/evidence/**`; `src/features/approvals/**`; `src/lib/api/**`; `src/test/evidence/**`; `docs/FRONTEND_EVIDENCE_CONSOLE_V0_1.md`; smallest route registration (`src/routing/catalog.ts` and `src/routing/pageMap.ts` if required) |
| Status | **IN PROGRESS** — isolated implementation session `bc-022a2ac3-8a04-5c78-8d12-bd085c4155d9` still RUNNING; docs commit not yet on the branch |
| Current commit | `8cf32ad` (3 of 4 requested commits; worker must not push) |
| Tests | Worker must run `npm run typecheck`, `lint`, `format:check`, `test`, `build`, `npm audit` |
| Blockers | Evidence/Approval HTTP API not in this base. Worker must not add backend, PRIME, auth, or dependencies. |
| Merge dependency | Last: after API contract tests and PRIME v0.2. No merge in this wave. |

### 4. API contract / security tests

| Field | Value |
|-------|--------|
| Worktree | `/tmp/EARTH-api-contract-tests` |
| Branch | `feat/api-contract-tests-v0.1` |
| Base SHA | `8317e0620c926c541c23d1a4fb8d8dfc3e25098b` (fallback; requested `bfe6feb` absent) |
| Owner | Cursor API Contract Test Engineer |
| Allowed paths | `apps/api/test/contracts/**`; `apps/api/test/helpers/**` (new helper modules only; do not edit `apps/api/test/helpers.ts`); `docs/API_CONTRACT_TESTS_V0_1.md`; `scripts/api-contract-*` |
| Status | **COMPLETE locally (not pushed)** — session `bc-c31828d6-dbff-5048-954b-7095c68852ff` |
| Current commit | `7376bee4779e648b7083988b108bebd5524de9e2` |
| Tests | `api:typecheck`, root `lint`, `format:check`, `npm audit` pass. `api:test` against Postgres **not green**: Docker not installed here (`BLOCKED_BY_DOCKER`). 21 Vitest tests passed without DB; 53 skipped after `createPool` throw. Assertions not weakened. |
| Blockers | Evidence/Claims/Approval routes 7–9 and 11–25 **BLOCKED** until unpublished `feat/evidence-approvals-v0.1` @ `bfe6feb` is published. Invariants 1–6, 10, 26–31 implemented. Docker/Postgres required to run the DB contract suite. |
| Merge dependency | First in the planned integration order. No merge in this wave. |

---

## Intentionally waiting (not started here)

| Work | Why waiting |
|------|-------------|
| PRIME v0.2 production runtime | Owned by worker A. Do not duplicate. |
| PRIME v0.2 review harness | Owned by worker B. Do not duplicate. |
| Integration branch `integration/earth-prime-evidence-console-v0.2` | Create only after VS Code review of (1) PRIME runtime, (2) API contract tests, (3) frontend console. |
| PostgreSQL RLS | Out of this wave (`docs/POSTGRES_RLS_ROLLOUT.md`). |
| Production OIDC configuration | Architecture exists; not production. |
| NanoChat, LLM, RAG, embeddings | Not configured. Do not add. |
| External ERP/recycler/Slack/Teams/tax/authority integrations | Not connected. Do not add. |
| Kafka, Redis, Temporal, BullMQ | Not in tree. Do not add. |
| Blockchain, ZK, DID credential system | Not in tree. Do not add. |
| CSRD/PPWR/Battery DPP engine | Not in tree. Do not add. |
| Marketplace execution, trained RL, autonomous real-world actions | Not in tree. Do not add. |

---

## Expected merge order (do not merge now)

1. VS Code reviews Cursor PRIME runtime (`feat/prime-multi-session-v0.2`).
2. VS Code reviews API contract tests against the Evidence/Approval base (when that SHA is published).
3. VS Code reviews frontend Evidence Console against the Evidence/Approval base.
4. Create `integration/earth-prime-evidence-console-v0.2` only after those reviews.
5. Merge into that integration branch, in order:
   1. API contract test suite
   2. PRIME multi-session runtime
   3. Frontend Evidence Console
6. Then run the full local gate (compose, migrate, typecheck, lint, format, SPA tests, API tests, builds, audit). Never merge to `main` in this swarm.

---

## Commander confirmation

No worker was instructed to duplicate PRIME runtime code, use external integrations, add LLM/NanoChat/RAG, use RL, add blockchain/ZK, or make unsupported compliance claims.
