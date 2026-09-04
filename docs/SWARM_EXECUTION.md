# Swarm execution — PRIME

**Owner:** PRIME (engineering orchestrator).  
**Integration branch:** `integration/earth-foundation-v0`  
**Published truth:** `origin/main` is a Vite SPA only. No backend, auth, LLM, RAG, blockchain, or RL exists in the published tree.

This document is how PRIME coordinates specialist worktrees for the foundation wave. PRIME does not implement product features on this branch. Specialists never commit here.

---

## Repository truth (do not overclaim)

On published `main` today:

- React 19 + Vite 6 + TypeScript SPA (`src/`, port 5180)
- Mock UI copy. Screens that mention CSRD, recyclers, ERP, assurance, or similar are **not** live integrations
- No `apps/api`, no database, no auth, no LLM/RAG, no blockchain, no RL

Do **not** claim: CSRD, EU AI Act, SBTi, ISO, KPMG, ZK, autonomous operation, live ERP, or an AI-provider. EARTH is a standalone prototype. It is not Cirkel and must not import `cirkel-system`.

---

## Roles

| Role | Commits where | Does |
|------|---------------|------|
| PRIME | `integration/earth-foundation-v0` only | Coordination docs, inspect, merge-into-integration, post-merge gates |
| Specialist | own `feat/*` branch in a worktree | Implement **only** the allowed scope below |
| Michael | `main` (explicit accept) | The only person who may merge to `main` |

Specialists **never** merge to `main`. Specialists **never** commit on, push to, or reset `integration/earth-foundation-v0`.

---

## Worktree orchestration

1. PRIME fetches `origin` and keeps `integration/earth-foundation-v0` current with itself (not with `main` merges).
2. Each specialist works in a **dedicated worktree** on a `feat/*` branch created from the integration tip (or from `origin/main` when the integration tip still equals main).
3. PRIME does **not** delete sibling worktrees or `feat/*` branches. Other agents may still be creating them.
4. Specialists push their `feat/*` branch. PRIME inspects, then merges **into** `integration/earth-foundation-v0` only.
5. After each accepted merge, PRIME runs the post-merge gate (below) on the integration worktree.

Known worktree layout for this wave (do not delete):

| Branch | Worktree (if present) |
|--------|------------------------|
| `feat/api-foundation` | `/tmp/earth-api-foundation` |
| `feat/frontend-truth` | `/tmp/earth-frontend-truth` |
| `feat/quality-baseline` | `/tmp/earth-quality-baseline` |
| `integration/earth-foundation-v0` | `/tmp/earth-integration-foundation` (PRIME) |

`/workspace` may be on another branch (for example intake experiments). PRIME must not discard that work. Prefer a worktree over checking out over a dirty tree.

---

## Allowed scopes (foundation wave)

Only these paths. Anything else is out of scope and is rejected at inspect.

| Branch | Specialist | Allowed paths | Depends on |
|--------|------------|---------------|------------|
| `feat/api-foundation` | API Foundation | `apps/api/**`, `docker-compose.yml`, root scripts **when necessary**, `docs/API_FOUNDATION.md` | none |
| `feat/frontend-truth` | Frontend Truth | `src/**` **only** for demo/truth labels and canonical demo data, `docs/FRONTEND_TRUTH.md` | none |
| `feat/quality-baseline` | Quality Baseline | ESLint / Prettier / Vitest config, root test setup, `.gitignore`, `docs/QUALITY_BASELINE.md`, **test files only** | none |

Rules for specialists:

- Stay inside the allowlist. Do not “helpfully” edit sibling scopes.
- Do not start MATERIAL_OPPORTUNITY_INTAKE persistence, auth, NanoChat, Meta Harness, RL, external APIs, blockchain, or DPP in this wave. See `docs/SHARED_CONTRACTS.md`.
- Do not import from `cirkel-system`.
- Do not commit secrets, `.env` with credentials, or `VITE_*` secrets.
- Label every non-live surface: `NOT_CONFIGURED`, `NOT_CONNECTED`, `DEMO`, `ESTIMATED`, or `INPUT_UNVERIFIED` as defined in `docs/DEFINITION_OF_DONE.md`.

---

## No direct-to-main

```
feat/*  --inspect-->  integration/earth-foundation-v0  --Michael accept-->  main
```

- `git push origin main` is forbidden for PRIME and for specialists.
- Merging `integration/earth-foundation-v0` into `main` is forbidden in this swarm.
- Opening a **draft** PR of integration → `main` is allowed so Michael can see the branch. It must stay draft and unmerged.

---

## Inspect-before-merge

PRIME merges a specialist branch into `integration/earth-foundation-v0` only after a passing inspect. Inspect is a review, not a rubber stamp.

### Diff allowlist

```bash
git fetch origin
git log --oneline origin/integration/earth-foundation-v0..origin/<feat-branch>
git diff --name-only origin/integration/earth-foundation-v0...origin/<feat-branch>
```

Reject the merge if any path is outside that specialist’s allowed scope.

### Content inspect

- Working TypeScript; no `cirkel-system` imports
- No secrets, tokens, or live credentials
- No fake live-integration copy (CSRD / EU AI Act / SBTi / ISO / KPMG / ZK / autonomous / live ERP / AI-provider)
- Demo and stub surfaces carry the required labels
- Specialist wrote their required `docs/*.md`
- Commits are atomic and do not mix unrelated concerns
- Tests exist for new behaviour (Quality Baseline owns the runner; others add tests in their allowlist)

### Gate on the feat branch (before merge)

Run what the tree actually has. Do not invent scripts.

```bash
npm install
npx tsc --noEmit
# after quality-baseline lands:
npm run lint
npm test
npm run build
```

If a script does not exist yet, skip it and record that in `docs/SWARM_STATUS.md`. Missing `lint` / `test` is expected until Quality Baseline is merged. `tsc --noEmit` and `npm run build` must pass once those scripts exist.

---

## Merge into integration (never into main)

```bash
git checkout integration/earth-foundation-v0
git pull origin integration/earth-foundation-v0
git merge --no-ff origin/<feat-branch>
```

On conflict, apply `docs/BRANCH_AND_MERGE_POLICY.md` (truthfulness, security, typed contracts, smallest reversible impl). Do not resolve by restoring overclaims or by deleting another specialist’s in-scope files.

Push **only** `integration/earth-foundation-v0`. Do not push `main`.

---

## Post-merge gate

After every merge into the integration branch, in the integration worktree:

```bash
npm install
npx tsc --noEmit
npm run lint          # when present
npm test              # when present
npm run build         # tsc --noEmit && vite build when present
```

Record command + result (pass/fail, summary) in `docs/SWARM_STATUS.md`. A failed gate means the merge is not done: revert or fix on a specialist branch, do not paper over it on integration.

---

## Status file

`docs/SWARM_STATUS.md` is the live register. PRIME updates it when a session starts, blocks, finishes, or is rejected. Specialists do not edit it.

---

## Out of this wave

Do **not** begin until this foundation integration is green (inspect + post-merge gate on all three specialist branches):

- Database / Postgres persistence beyond what API Foundation’s allowlist explicitly delivers as a **stub scaffold**
- Authentication / OIDC
- PRIME runtime as a live control plane
- NanoChat, Meta Harness, RL
- External APIs, blockchain, Digital Product Passports
- MATERIAL_OPPORTUNITY_INTAKE v0.1 implementation (contracts only: `docs/SHARED_CONTRACTS.md`)
