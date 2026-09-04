# Definition of done

A specialist branch is **done** only when every item below is true. “Looks fine in the UI” is not done. Claiming a live integration that does not exist is a fail.

Published `main` is a Vite SPA prototype. Nothing in this repository is a license to trade, file with an authority, or call an external network.

---

## 1. Working code

- TypeScript compiles: `npx tsc --noEmit` (required before anything is declared finished — see `CLAUDE.md`).
- The changed surface runs locally with the commands documented in the specialist’s `docs/*.md`.
- No imports from `cirkel-system`. EARTH is standalone.
- No secrets in git: no API keys, tokens, private `.env`, `VITE_*` secrets, or copied credentials.
- New HTTP servers bind `0.0.0.0:$PORT` (Render constraint) if an API scaffold is added.

---

## 2. Tests

- New behaviour has tests in the specialist’s allowlist (Quality Baseline owns runner/config; others add tests only where their scope permits).
- Tests pass on the feat branch before PRIME inspects.
- Tests must not perform real network I/O to vendors, LLMs, recyclers, ERP, tax, or chain nodes.
- If the quality runner is not merged yet, the specialist still writes tests so they execute once Vitest lands.

---

## 3. No fake live-integration

The SPA on `main` is mock UI. Foundation work must not pretend otherwise.

**Forbidden claims** (copy, README, comments, JSON, labels-as-truth):

- CSRD, EU AI Act, SBTi, ISO (as a certified/live program)
- KPMG (or any assurer) as connected
- ZK / zero-knowledge as implemented
- Autonomous agents acting in the world
- Live ERP, live recycler booking, live tax/SKAT filing
- AI-provider (OpenAI, Anthropic, etc.) as wired

If a screen still shows those words as **demo chrome**, it must be labelled `DEMO` (or stronger: `NOT_CONNECTED` / `NOT_CONFIGURED`).

---

## 4. Required honesty labels

Every value, control, or module that is not a verified live integration must carry one of these labels. Do not invent synonyms that sound more live (`connected`, `assured`, `verified`, `autonomous`) unless they are literally true.

| Label | Meaning | Typical use |
|-------|---------|-------------|
| `NOT_CONFIGURED` | The slot exists; no adapter / provider / key is configured. | Future NanoChat, LLM, RAG, identity provider |
| `NOT_CONNECTED` | An external system is not connected. | Recycler network, ERP, Slack, SKAT, chain node |
| `DEMO` | Fixture / mock data in the SPA. Not a customer tenant. | Canonical demo tables, KPI cards, fake vendors |
| `ESTIMATED` | Computed or projected; not measured. | Forecasts, “proj.” periods, modelled cost |
| `INPUT_UNVERIFIED` | User- or operator-supplied; not attested evidence. | Submitted disposal cost, submitted CO₂e |

Rules:

- User-typed baselines are `INPUT_UNVERIFIED`, never inventory.
- Empty connector lists are `NOT_CONNECTED`, never “0 recyclers online”.
- Missing adapters are `NOT_CONFIGURED`, never “model abstained after review”.
- SPA numbers without a live meter are `DEMO` or `ESTIMATED`.

---

## 5. Documentation

Each specialist ships the named doc in their allowlist:

| Branch | Required doc |
|--------|----------------|
| `feat/api-foundation` | `docs/API_FOUNDATION.md` |
| `feat/frontend-truth` | `docs/FRONTEND_TRUTH.md` |
| `feat/quality-baseline` | `docs/QUALITY_BASELINE.md` |

The doc must include:

- What was implemented vs what is stubbed
- Commands to install, run, typecheck, lint, test, and build (only those that exist)
- Explicit non-claims (no live ESG/regulatory/AI-provider)

PRIME docs on the integration branch (`SWARM_EXECUTION`, `DEFINITION_OF_DONE`, `BRANCH_AND_MERGE_POLICY`, `SWARM_STATUS`, `SHARED_CONTRACTS`) are owned by PRIME only.

---

## 6. Atomic commits

- One concern per commit.
- Message describes the change, not the swarm role.
- Do not mix formatter-only churn with behaviour.
- Do not commit `node_modules`, build output, or secrets.

---

## 7. Commands and test results (required in the hand-off)

The specialist’s doc or PR body must paste the commands run and their results. Minimum, as the tree allows:

```bash
npm install
npx tsc --noEmit
npm run lint      # when present
npm test          # when present
npm run build     # when present
```

State pass/fail. A red gate is not done.

---

## Done checklist (copy into inspect)

- [ ] In-scope files only
- [ ] `tsc --noEmit` passes
- [ ] Tests added and passing (or queued on Vitest landing, with files present)
- [ ] No secrets
- [ ] No fake live-integration claims
- [ ] Honesty labels on demo / stub / unverified surfaces
- [ ] Named specialist doc updated
- [ ] Atomic commits
- [ ] Commands + results recorded
- [ ] No MATERIAL_OPPORTUNITY_INTAKE runtime, auth, NanoChat, RL, chain, or DPP implementation in this wave
