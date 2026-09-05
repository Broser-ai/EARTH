# Integration swarm status

**Commander:** EARTH Integration Swarm  
**Integration plane branch:** `feat/integration-control-plane-v0.1`  
**Requested evidence base:** `feat/evidence-approvals-v0.1` — **not present on origin** at swarm start  
**Actual base:** `origin/main` `8317e0620c926c541c23d1a4fb8d8dfc3e25098b` (TenantContext / OIDC / Material Opportunity Intake)  
**Do not merge automatically.** Do not touch `feat/prime-multi-session-v0.2` or `review/prime-multi-session-v0.2`.  
**Updated:** 2026-09-05

No worker may modify frontend code, PRIME runtime files (`apps/api/src/prime/**`), auth, evidence, approval, or existing migrations except Worker A's additive `005_integration_control_plane.sql`.

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

Worker A also wired `apps/api/src/app.ts` and `apps/api/src/info.ts` so the generic routes exist. Later workers must not edit those files; adapters self-register via `createAdapter()` export.

---

## Worker register

### Worker A — Integration Control Plane

| Field | Value |
|-------|-------|
| Branch | `feat/integration-control-plane-v0.1` |
| Base SHA | `8317e0620c926c541c23d1a4fb8d8dfc3e25098b` |
| Status | **COMPLETE** (three atomic commits; not merged) |
| Latest commit | *docs commit is tip after this file lands* |
| Tests | `npm run api:test` 82 passed · `npm run api:typecheck` passed |
| Blockers | Evidence/approval domain docs were not on this base; approval gate is conservative (`approvalVerified=false`) |
| Merge dependencies | none (first) |

### Workers B–G

Waiting for Worker A final SHA. Must branch from that SHA, not from `main`.

| Worker | Status | Merge after |
|--------|--------|-------------|
| G Security contracts | WAITING | A |
| B Roboflow | WAITING | A, then G preferred |
| C Hugging Face | WAITING | A, then G preferred |
| D Tinker + Inkling | WAITING | A, then G preferred |
| E HeyGen | WAITING | A, then G preferred |
| F LangGraph | WAITING | A, then G preferred |

Expected merge order (human inspect, not automatic):

1. Integration Control Plane  
2. Integration Security Contract Tests  
3. Roboflow adapter  
4. Hugging Face adapter  
5. Tinker + Inkling adapters  
6. HeyGen adapter  
7. LangGraph PRIME bridge  

---

## Honesty

No browser API keys, external provider calls, NanoChat/LLM/RAG, trained RL, autonomous external action, blockchain/ZK, CSRD/PPWR/DPP capability, or unsupported compliance claim is enabled by this swarm setup.
