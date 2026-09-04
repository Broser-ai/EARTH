# Swarm status

**Integration branch:** `integration/earth-foundation-v0`  
**Base (published):** `origin/main` @ `7490bdac3f5385d4b99597e31f9ab5ec54de82a8` (SPA only)  
**PRIME:** coordination docs only; no product implementation on this branch  
**Updated:** 2026-09-04T07:30:00Z

Foundation integration is **not green**. Do not start intake workflow, auth, NanoChat, Meta Harness, RL, external APIs, blockchain, or DPP.

---

## Published tree (do not overclaim)

`origin/main` contains a React/Vite SPA. There is no real backend, auth, LLM, RAG, blockchain, or RL in the published tree. SPA screens that mention compliance or vendors are mock UI.

---

## Active sessions (RUNNING)

| Branch | Role | Allowed scope | Depends on | Status | Last known SHA | Worktree |
|--------|------|---------------|------------|--------|----------------|----------|
| `feat/api-foundation` | API Foundation Specialist | `apps/api/**`, `docker-compose.yml`, root scripts when necessary, `docs/API_FOUNDATION.md` | none | **RUNNING** | `7490bda` (branch exists; no specialist commits yet vs main) | `/tmp/earth-api-foundation` |
| `feat/frontend-truth` | Frontend Truth Specialist | `src/**` only for demo/truth labels and canonical demo data, `docs/FRONTEND_TRUTH.md` | none | **RUNNING** | `7490bda` (branch exists; no specialist commits yet vs main) | `/tmp/earth-frontend-truth` |
| `feat/quality-baseline` | Quality Baseline Specialist | ESLint / Prettier / Vitest config, root test setup, `.gitignore`, `docs/QUALITY_BASELINE.md`, test files only | none | **RUNNING** | `7490bda` (branch exists; no specialist commits yet vs main) | `/tmp/earth-quality-baseline` |

All three specialists may run in parallel (no dependencies).

---

## Integration branch

| Item | Value |
|------|--------|
| Branch | `integration/earth-foundation-v0` |
| Tip at last PRIME commit | `770d120a96ca5a8cecbc61e2ed7fc12d59a196ef` (five coordination docs) |
| Merged specialist branches | none |
| Post-merge gate | not run (nothing merged) |
| Merge to `main` | **forbidden** in this swarm |

PRIME worktree: `/tmp/earth-integration-foundation`  
`/workspace` was left on its existing branch so intake uncommitted/committed work is not discarded.

---

## Wait state

PRIME is **waiting** on the three specialist branches. PRIME will not implement their scopes and will not merge them until inspect passes (`docs/SWARM_EXECUTION.md`, `docs/BRANCH_AND_MERGE_POLICY.md`).

Keep this file current as sessions move `RUNNING` → `INSPECT` → `MERGED` / `BLOCKED` / `REJECTED`.
