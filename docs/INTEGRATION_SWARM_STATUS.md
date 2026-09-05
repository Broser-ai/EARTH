# Integration swarm status

**Commander:** EARTH Integration Swarm  
**Integration plane branch:** `feat/integration-control-plane-v0.1`  
**Requested evidence base:** `feat/evidence-approvals-v0.1` — **not present on origin** at swarm start  
**Actual base:** `origin/main` `8317e0620c926c541c23d1a4fb8d8dfc3e25098b` (TenantContext / OIDC / Material Opportunity Intake)  
**Control-plane SHA (Worker A tip):** `2aaf06fcfcae971b0700c5e40f0f9d642dceaf00`  
**Do not merge automatically.** Do not touch `feat/prime-multi-session-v0.2` or `review/prime-multi-session-v0.2`.  
**Updated:** 2026-09-05

No worker modified frontend code, PRIME runtime files (`apps/api/src/prime/**`), auth, evidence, approval, or existing migrations except Worker A's additive `005_integration_control_plane.sql`. Path diffs were inspected after each worker push.

---

## Collision-prevention boundaries

| Worker | Branch | Exclusive paths |
|--------|--------|-----------------|
| A Control Plane | `feat/integration-control-plane-v0.1` | `apps/api/src/integrations/{core/**,types.ts,config.ts,registry.ts,policy.ts,audit.ts}`, `apps/api/migrations/005_integration_control_plane.sql`, `apps/api/test/integrations/core/**`, `docs/INTEGRATION_CONTROL_PLANE_V0_1.md`, `docs/PROVIDER_SECURITY_POLICY.md` |
| B Roboflow | `feat/roboflow-server-adapter-v0.1` | `apps/api/src/integrations/roboflow/**`, `apps/api/test/integrations/roboflow/**`, `docs/ROBOFLOW_ADAPTER_V0_1.md` |
| C Hugging Face | `feat/huggingface-server-adapter-v0.1` | `apps/api/src/integrations/huggingface/**`, `apps/api/test/integrations/huggingface/**`, `docs/HUGGINGFACE_ADAPTER_V0_1.md` |
| D Tinker + Inkling | `feat/tinker-inkling-adapters-v0.1` | `apps/api/src/integrations/{tinker,inkling}/**`, `apps/api/test/integrations/{tinker,inkling}/**`, `docs/TINKER_INKLING_ADAPTERS_V0_1.md` |
| E HeyGen | `feat/heygen-server-adapter-v0.1` | `apps/api/src/integrations/heygen/**`, `apps/api/test/integrations/heygen/**`, `docs/HEYGEN_ADAPTER_V0_1.md` |
| F LangGraph | `feat/langgraph-prime-bridge-v0.1` | `apps/api/src/integrations/langgraph/**`, `apps/api/test/integrations/langgraph/**`, `docs/LANGGRAPH_PRIME_BRIDGE_V0_1.md` |
| G Security contracts | `feat/integration-security-contracts-v0.1` | `apps/api/test/integrations/contracts/**`, `apps/api/test/helpers/integration-*`, `scripts/integration-security-*`, `docs/INTEGRATION_SECURITY_CONTRACTS_V0_1.md` |

Worker A also wired `apps/api/src/app.ts` and `apps/api/src/info.ts` so the generic routes exist. Later workers did not edit those files; adapters self-register via `createAdapter()` export.

---

## Worker register

### Worker A — Integration Control Plane

| Field | Value |
|-------|-------|
| Branch | `feat/integration-control-plane-v0.1` |
| Worktree | `/workspace` (cloud checkout; `../EARTH-integration-control-plane` is not writable on this VM) |
| Base SHA | `8317e0620c926c541c23d1a4fb8d8dfc3e25098b` |
| Status | **COMPLETE** (not merged) |
| Latest commit | `2aaf06fcfcae971b0700c5e40f0f9d642dceaf00` |
| PR | https://github.com/Broser-ai/EARTH/pull/13 |
| Tests | `npm run api:test` 82 passed · `npm run api:typecheck` passed |
| Blockers | Evidence/approval domain was not on this base; `approvalVerified` stays false |
| Merge dependencies | none (first) |

### Worker G — Integration Security Contract Tests

| Field | Value |
|-------|-------|
| Branch | `feat/integration-security-contracts-v0.1` |
| Worktree | `/tmp/EARTH-integration-contracts` |
| Base SHA | `2aaf06fcfcae971b0700c5e40f0f9d642dceaf00` |
| Status | **COMPLETE** (not merged) |
| Latest commit | `60e6fddb1013d37216485faa4cc795b80e5ea41d` |
| PR | https://github.com/Broser-ai/EARTH/pull/15 |
| Tests | 153 passed · scan script PASS · `api:typecheck` passed |
| Blockers | Adapter folders empty on this SHA; provider-specific rules use mocks until B–F merge |
| Merge dependencies | A |

### Worker B — Roboflow

| Field | Value |
|-------|-------|
| Branch | `feat/roboflow-server-adapter-v0.1` |
| Worktree | `/tmp/EARTH-roboflow-adapter` |
| Base SHA | `2aaf06fcfcae971b0700c5e40f0f9d642dceaf00` |
| Status | **COMPLETE** (not merged) |
| Latest commit | `588eab1573a3505fa8c40eab834aaafab1aa9e98` |
| PR | https://github.com/Broser-ai/EARTH/pull/16 |
| Tests | 93 passed (11 Roboflow) · `tsc --noEmit` passed |
| Blockers | HTTP create does not yet call `adapter.createOperation` (control-plane v0.1) |
| Merge dependencies | A, then G preferred |

### Worker C — Hugging Face

| Field | Value |
|-------|-------|
| Branch | `feat/huggingface-server-adapter-v0.1` |
| Worktree | `/tmp/EARTH-huggingface-adapter` |
| Base SHA | `2aaf06fcfcae971b0700c5e40f0f9d642dceaf00` |
| Status | **COMPLETE** (not merged) |
| Latest commit | `f0b2db8d7ba6f4613a12ba0a5ae3a0754377e6cc` |
| PR | https://github.com/Broser-ai/EARTH/pull/18 |
| Tests | 98 passed (16 Hugging Face) · `tsc --noEmit` passed |
| Blockers | Default allow-list empty (intentional) |
| Merge dependencies | A, then G preferred |

### Worker D — Tinker + Inkling

| Field | Value |
|-------|-------|
| Branch | `feat/tinker-inkling-adapters-v0.1` |
| Worktree | `/tmp/EARTH-tinker-inkling-adapter` |
| Base SHA | `2aaf06fcfcae971b0700c5e40f0f9d642dceaf00` |
| Status | **COMPLETE** (not merged) |
| Latest commit | `a51827ccd82e4e2de2a745bfc543a51834ede5a7` |
| PR | https://github.com/Broser-ai/EARTH/pull/14 |
| Tests | 108 passed (26 Tinker/Inkling) · `tsc --noEmit` passed |
| Blockers | Extra Tinker approval gate is adapter-direct until HTTP wires `validateRequest` |
| Merge dependencies | A, then G preferred |

### Worker E — HeyGen

| Field | Value |
|-------|-------|
| Branch | `feat/heygen-server-adapter-v0.1` |
| Worktree | `/tmp/EARTH-heygen-adapter` |
| Base SHA | `2aaf06fcfcae971b0700c5e40f0f9d642dceaf00` |
| Status | **COMPLETE** (not merged) |
| Latest commit | `7251a3555d5a261b49e186337099219f04368866` |
| PR | https://github.com/Broser-ai/EARTH/pull/17 |
| Tests | 93 passed (11 HeyGen) · `tsc --noEmit` passed |
| Blockers | No durable approval table on this base; execute never calls transport in production |
| Merge dependencies | A, then G preferred |

### Worker F — LangGraph PRIME bridge

| Field | Value |
|-------|-------|
| Branch | `feat/langgraph-prime-bridge-v0.1` |
| Worktree | `/tmp/EARTH-langgraph-bridge` |
| Base SHA | `2aaf06fcfcae971b0700c5e40f0f9d642dceaf00` |
| Status | **COMPLETE** (not merged) |
| Latest commit | `74cfab479bcac7fac614a854664ecd1c9b1ef8d4` |
| PR | https://github.com/Broser-ai/EARTH/pull/19 |
| Tests | 100 passed (18 LangGraph) · `tsc --noEmit` passed |
| Blockers | Visualization proven with injected reader, not a live execute route |
| Merge dependencies | A, then G preferred |

---

## Expected merge order (human inspect, not automatic)

1. Integration Control Plane — PR #13  
2. Integration Security Contract Tests — PR #15  
3. Roboflow adapter — PR #16  
4. Hugging Face adapter — PR #18  
5. Tinker + Inkling adapters — PR #14  
6. HeyGen adapter — PR #17  
7. LangGraph PRIME bridge — PR #19  

After all are reviewed, an integration branch should run:

```
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

This swarm did **not** merge. Docker was not available on the commander VM; API tests used local PostgreSQL 16.

---

## Honesty

No browser API keys, external provider calls, NanoChat/LLM/RAG, trained RL, autonomous external action, blockchain/ZK, CSRD/PPWR/DPP capability, or unsupported compliance claim is enabled by this swarm setup.
