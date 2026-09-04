# Swarm status

**Integration branch:** `integration/earth-foundation-v0`  
**Base (published):** `origin/main` @ `7490bdac3f5385d4b99597e31f9ab5ec54de82a8` (SPA only)  
**PRIME:** coordination docs only; no product implementation on this branch  
**Updated:** 2026-09-04T07:35:00Z

Foundation integration is **not green**. Do not start intake workflow, auth, NanoChat, Meta Harness, RL, external APIs, blockchain, or DPP.

---

## Published tree (do not overclaim)

`origin/main` contains a React/Vite SPA. There is no real backend, auth, LLM, RAG, blockchain, or RL in the published tree. SPA screens that mention compliance or vendors are mock UI.

---

## Active sessions (RUNNING)

| Branch | Role | Allowed scope | Depends on | Status | Last known SHA | Worktree |
|--------|------|---------------|------------|--------|----------------|----------|
| `feat/api-foundation` | API Foundation Specialist | `apps/api/**`, `docker-compose.yml`, root scripts when necessary, `docs/API_FOUNDATION.md` | none | **RUNNING** (pushed; **not merged**) | `229a36dd4884a73bb2775060edf7d416647b78df` | `/tmp/earth-api-foundation` |
| `feat/frontend-truth` | Frontend Truth Specialist | `src/**` only for demo/truth labels and canonical demo data, `docs/FRONTEND_TRUTH.md` | none | **RUNNING** | `7490bda` (no origin commits vs main yet; local WIP) | `/tmp/earth-frontend-truth` |
| `feat/quality-baseline` | Quality Baseline Specialist | ESLint / Prettier / Vitest config, root test setup, `.gitignore`, `docs/QUALITY_BASELINE.md`, test files only | none | **RUNNING** | `7490bda` (no origin commits vs main yet; local WIP) | `/tmp/earth-quality-baseline` |

All three specialists may run in parallel (no dependencies).

### `feat/api-foundation` origin (awaiting inspect — not merged)

- `0d8a272` feat(api): scaffold Fastify DEVELOPMENT_ONLY health and info routes
- `aa49bf6` test(api): cover health, info, and 404 envelopes without a database
- `229a36d` docs: describe the API foundation wave and root scripts

PRIME has **not** inspected for merge yet. Waiting for the other two specialists to push. No merge to integration or to `main`.

---

## Integration branch

| Item | Value |
|------|--------|
| Branch | `integration/earth-foundation-v0` |
| Coordination docs commit | `770d120a96ca5a8cecbc61e2ed7fc12d59a196ef` |
| Merged specialist branches | none |
| Post-merge gate | not run (nothing merged) |
| Merge to `main` | **forbidden** in this swarm |

PRIME worktree: `/tmp/earth-integration-foundation`  
`/workspace` was left on its existing branch so intake uncommitted/committed work is not discarded.

---

## Wait state

PRIME is **waiting** on `feat/frontend-truth` and `feat/quality-baseline` origin commits. `feat/api-foundation` has pushed but is **not merged**. PRIME will not implement specialist scopes and will not merge until inspect passes (`docs/SWARM_EXECUTION.md`, `docs/BRANCH_AND_MERGE_POLICY.md`).

Keep this file current as sessions move `RUNNING` → `INSPECT` → `MERGED` / `BLOCKED` / `REJECTED`.
