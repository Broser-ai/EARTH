# Branch and merge policy

**Michael named the integration branch.** Do not rename it to `cursor/*`.  
**Never merge to `main` in this swarm.** Only Michael accepts `main`.

---

## Protected lines

| Ref | Who may commit | Who may merge into it | Who may merge it to `main` |
|-----|----------------|------------------------|----------------------------|
| `main` | nobody in this swarm | nobody in this swarm | **Michael only**, outside this swarm |
| `integration/earth-foundation-v0` | **PRIME only** | **PRIME only** (from inspected `feat/*`) | nobody in this swarm |
| `feat/api-foundation` | API Foundation Specialist | — (do not merge to main or rewrite integration) | nobody |
| `feat/frontend-truth` | Frontend Truth Specialist | — | nobody |
| `feat/quality-baseline` | Quality Baseline Specialist | — | nobody |

Specialists **never** modify `integration/earth-foundation-v0` (no commit, amend, rebase-onto, force-push, or direct checkout-and-edit).

PRIME **never** implements product features on the integration branch. PRIME commits coordination docs and merge commits only.

---

## Allowed merge direction

```
feat/api-foundation      ──┐
feat/frontend-truth      ──┼── inspect ──► integration/earth-foundation-v0
feat/quality-baseline    ──┘                      │
                                                  ✕ never
                                                  ▼
                                                 main
```

A draft GitHub PR with **base** `main` and **head** `integration/earth-foundation-v0` may exist so Michael can see the branch. It must remain draft and unmerged.

---

## Inspect, then merge

PRIME merges a specialist branch **only into** `integration/earth-foundation-v0` and **only after** inspect (`docs/SWARM_EXECUTION.md`).

```bash
git fetch origin
git diff --name-only origin/integration/earth-foundation-v0...origin/<feat-branch>
# reject if any path is outside that specialist's allowlist
git merge --no-ff origin/<feat-branch>
```

Use `--no-ff` so the integration history shows which specialist wave landed.

Do not merge:

- Uninspected branches
- Branches whose tests/`tsc` fail
- Branches that add out-of-scope files
- Branches that introduce secrets or fake live-integration claims
- Anything into `main`

---

## Reject out-of-scope files

If the diff touches a path not in the specialist’s allowlist, **reject**. Ask the specialist to move the change to the owning branch or drop it. Do not “just merge the good parts” from a dirty tree.

Foundation allowlists:

- **API Foundation:** `apps/api/**`, `docker-compose.yml`, root scripts when necessary, `docs/API_FOUNDATION.md`
- **Frontend Truth:** `src/**` only for demo/truth labels and canonical demo data, `docs/FRONTEND_TRUTH.md`
- **Quality Baseline:** ESLint / Prettier / Vitest config, root test setup, `.gitignore`, `docs/QUALITY_BASELINE.md`, test files only

Also reject:

- `cirkel-system` imports or copies
- Auth, OIDC, LLM, RAG, NanoChat runtime, Meta Harness, RL, external vendor SDKs, blockchain, DPP implementation (blocked until foundation is green — `docs/SHARED_CONTRACTS.md`)
- Edits to PRIME coordination docs by specialists

---

## Tests must pass

A merge is illegal if the feat branch fails the gates that exist in that tree:

1. `npm install`
2. `npx tsc --noEmit`
3. `npm run lint` when the script exists
4. `npm test` when the script exists
5. `npm run build` when the script exists

After merge, PRIME re-runs the same gate on `integration/earth-foundation-v0`. Failure → revert the merge or send a fix to the specialist; do not leave a red integration tip.

---

## Conflict resolution (priority order)

When two in-scope changes conflict, keep the variant that best satisfies **this order**. Do not average them.

1. **Truthfulness** — honesty labels, no fake live integrations, no unsupported CSRD / EU AI Act / SBTi / ISO / KPMG / ZK / autonomous / live ERP / AI-provider claims
2. **Security** — no secrets, no open credential headers presented as auth, no `VITE_*` secrets
3. **Typed contracts** — shared unions and reason codes in `docs/SHARED_CONTRACTS.md` win over ad-hoc strings
4. **Smallest reversible implementation** — prefer the smaller diff that can be reverted with `git revert`

If a conflict would require inventing product behaviour, stop and return it to the owning specialist. PRIME does not implement features to “win” a merge.

---

## Force-push and history

- No force-push to `main` or to `integration/earth-foundation-v0`.
- Specialists may rebase their own unmerged `feat/*` onto the latest integration tip if PRIME has merged another specialist first.
- Do not delete `feat/*` branches or worktrees while siblings may still be using them.

---

## After foundation is green

“Green” means all three specialist branches have been inspected, merged into `integration/earth-foundation-v0`, and the post-merge gate passed.

Until then: no MATERIAL_OPPORTUNITY_INTAKE v0.1 runtime, no real DB-backed intake beyond API Foundation’s explicit scaffold, no auth, no PRIME control-plane productisation, no NanoChat, no Meta Harness, no RL, no external APIs, no blockchain, no DPP.

Michael decides if and when `integration/earth-foundation-v0` is accepted onto `main`. This swarm does not do that merge.
