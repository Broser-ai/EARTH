# Swarm status

**Integration branch:** `integration/earth-foundation-v0`  
**Base (published):** `origin/main` @ `7490bdac3f5385d4b99597e31f9ab5ec54de82a8` (SPA only)  
**PRIME:** coordination docs only; no product implementation on this branch  
**Updated:** 2026-09-04T07:42:00Z

Foundation integration is **not green**. Do not start intake workflow, auth, NanoChat, Meta Harness, RL, external APIs, blockchain, or DPP.

---

## Published tree (do not overclaim)

`origin/main` contains a React/Vite SPA. There is no real backend, auth, LLM, RAG, blockchain, or RL in the published tree. SPA screens that mention compliance or vendors are mock UI.

---

## Active sessions (RUNNING — pushed, not merged)

All three specialists have origin commits. PRIME has **not** merged them into `integration/earth-foundation-v0`. Inspect is deferred; this session does not merge.

| Branch | Role | Allowed scope | Depends on | Status | Last known SHA | Worktree |
|--------|------|---------------|------------|--------|----------------|----------|
| `feat/api-foundation` | API Foundation Specialist | `apps/api/**`, `docker-compose.yml`, root scripts when necessary, `docs/API_FOUNDATION.md` | none | **RUNNING** (pushed; **not merged**) | `229a36dd4884a73bb2775060edf7d416647b78df` | `/tmp/earth-api-foundation` |
| `feat/frontend-truth` | Frontend Truth Specialist | `src/**` only for demo/truth labels and canonical demo data, `docs/FRONTEND_TRUTH.md` | none | **RUNNING** (pushed; **not merged**) | `3a3257d433fb0075401591f76f680d3b347096f0` | `/tmp/earth-frontend-truth` |
| `feat/quality-baseline` | Quality Baseline Specialist | ESLint / Prettier / Vitest config, root test setup, `.gitignore`, `docs/QUALITY_BASELINE.md`, test files only | none | **RUNNING** (pushed; **not merged**) | `4476bb94f0e3bfbfe9e5c114457e29ffa9cc2779` | `/tmp/earth-quality-baseline` |

### `feat/api-foundation` origin (not merged)

- `0d8a272` feat(api): scaffold Fastify DEVELOPMENT_ONLY health and info routes
- `aa49bf6` test(api): cover health, info, and 404 envelopes without a database
- `229a36d` docs: describe the API foundation wave and root scripts

### `feat/frontend-truth` origin (not merged)

- `3a3257d` Label the SPA as DEVELOPMENT/DEMO, not live ESG.

### `feat/quality-baseline` origin (not merged)

- `3384325` Add ESLint, Prettier, and Vitest quality baseline.
- `4476bb9` Align SPA smoke assertions with origin/main command bar.

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

Draft PR: ManagePullRequest is not available in this environment. Compare URL for Michael:

https://github.com/Broser-ai/EARTH/compare/main...integration/earth-foundation-v0

---

## Wait state

All three specialist **branches exist and have origin commits**. PRIME did not implement their scopes and did not merge them. Next PRIME session: inspect per `docs/SWARM_EXECUTION.md` and `docs/BRANCH_AND_MERGE_POLICY.md`, then merge **only** into `integration/earth-foundation-v0` if inspect passes. Never merge to `main`.

Keep this file current as sessions move `RUNNING` → `INSPECT` → `MERGED` / `BLOCKED` / `REJECTED`.
