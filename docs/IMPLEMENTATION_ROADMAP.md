# EARTH implementation roadmap

**Constraint:** technical scope only — no calendar durations.  
**Governance:** nothing ships without Michael’s accept (`CLAUDE.md`).  
**Hard rule:** **never auto-submit to SKAT** (or any tax/authority gateway). Human submit only, after HITL.

This branch is **docs + `.gitignore` + non-secret `.env.example`**. Foundation **code** (env validation, error boundary, structured log interface) is **Phase 2**, after the kernel merge, so it does not fight PR stacks.

Unmerged ≠ shipped. Merge order is a Michael decision; the recommendation is recorded, not executed.

---

## Merge recommendation (not done by this PR)

1. Merge **PR #1** `cursor/sovereign-agent-swarm-a2a5` to `main` (kernel + vitest + NASA bar).
2. Rebase **PR #2** `cursor/native-url-showcase-a2a5` on the new `main` (URL chrome).
3. **Do not** merge PR #3 onto PR #1’s tip without an explicit rebase: LangGraph + `SessionRlPolicy` **conflicts** with current PR #1.
4. Treat aurelle coverage doc as historical; this dossier supersedes it as the audit record.
5. Then start Phase 2 foundation code on a **new** branch from post-kernel `main`.

---

## Phase 0 — Honesty freeze (this dossier)

**Scope:** stop the product from lying in git history going forward.

| Deliverable | Files / artefacts |
|-------------|-------------------|
| Audit record | `docs/TECHNICAL_AUDIT.md` |
| Target | `docs/TARGET_ARCHITECTURE.md` |
| Threat model | `docs/SECURITY_THREAT_MODEL.md` |
| Domain | `docs/DOMAIN_MODEL.md` |
| This roadmap | `docs/IMPLEMENTATION_ROADMAP.md` |
| Commands | `docs/AUDIT_COMMANDS.md` |
| Backlog | `TODO.md` |
| Ignore build junk | `.gitignore` |
| Secret hygiene note | `.env.example` (no values, forbids `VITE_*` keys) |

**APIs / events / migrations:** none.  
**Tests:** none (docs).  
**Acceptance:**

- [ ] Michael accepts that `main` is a mock SPA and that CSRD/KPMG/SBTi/DATEV/ISO/ZK-STARK strings are copy.
- [ ] Cirkel remains out of this repo.
- [ ] No SKAT auto-submit in any later phase.

---

## Phase 1 — Kernel land (PR #1, existing code)

**Scope:** make evaluate-before-execute + single carbon spine **the** runtime in git `main`, still in-browser.

**Files (already on PR #1, do not rewrite here):**  
`src/sovereign/**`, `vitest.config.ts`, NASA `CommandBar`, mission pages. Relabel Aegis as SHA-256 (already done on PR #1).

**Migrations:** none.  
**APIs:** none.  
**Events:** in-memory `EarthBus` types (`runtime.booted`, `compass.verdict`, `hitl.*`, `ledger.appended`).  
**Tests:** existing vitest on PR #1.  
**Acceptance:**

- [ ] `npm test` and `tsc --noEmit` green on merged `main`.
- [ ] Sidebar gone (DNA).
- [ ] Aegis UI does not claim ZK-STARK.
- [ ] HUD does not claim hosted RL or live Roboflow unless adapters are actually attached.
- [ ] ESG **pages still conflict** until Phase 3 — do not advertise them as the spine.

---

## Phase 2 — Foundation code (after kernel merge)

**Scope:** smallest production-shaped client/server **interfaces** without standing up Kafka.

| Work | Files (proposed) |
|------|------------------|
| Fail build / boot if `VITE_*` secrets present | `src/sovereign/config/env.ts` (extend) + vitest |
| React error boundary | `src/components/ErrorBoundary.tsx`, wrap `App` |
| Structured log interface | `src/sovereign/log/logger.ts` (`debug/info/warn/error`, no secret fields) |
| `.env.example` remains non-secret | already added |
| Optional ESLint | only if Michael wants it; **not found** today |

**Migrations:** none.  
**APIs:** none.  
**Events:** log lines, not domain events.  
**Tests:** env rejection; boundary renders fallback; logger redacts keys named `*KEY*`.  
**Acceptance:**

- [ ] Setting `VITE_ROBOFLOW_API_KEY` fails typecheck or a dedicated test.
- [ ] Uncaught render errors do not white-screen without a halt-style message.
- [ ] Logs never include secret values.

---

## Phase 3 — Single ESG spine in the client (still no SKAT)

**Scope:** one number system. Pages read the e-liability graph (or a fixture module), not three hardcoded tables.

**Files:** `src/pages/CarbonAccounting.tsx`, `EmissionsScope.tsx`, `CSRDDisclosure.tsx`, `AuditTrail.tsx`; delete or quarantine unused `src/types.ts` mocks; `src/sovereign/eliability/*`; wire `carbon.post` **to actually `graph.post`**.

**Migrations:** none (still in-memory).  
**APIs:** none.  
**Events:** `carbon.posted` with payload digest.  
**Tests:** seed total 14,847; posting a measured line changes all three views equally; estimated high-impact still COMPASS-gated.  
**Acceptance:**

- [ ] Carbon, Scope, CSRD E1-6, Audit **quote the same totals**.
- [ ] UI copy “94% / KPMG / SBTi validated / DATEV connected” removed or labelled **DEMO**.
- [ ] Factor **version** field exists on the post even if the catalog is a stub.

---

## Phase 4 — Control plane + Postgres (auth, tenant, HITL)

**Scope:** SPA becomes a client. Bind HTTP `0.0.0.0:$PORT`. Ephemeral disk → Postgres.

**Files (new service, not this Vite app rewritten in place):** e.g. `server/` or a sibling deploy — Michael picks the runtime (Node/Go). This repo today has no backend folder.

**Migrations (initial):**

```
tenants
users, roles, grants
actions, compass_verdicts
hitl_approvals
emissions_posts
factor_versions
evidence_blobs (metadata; bytes in object store)
events (append-only)
outbox (empty consumer — Kafka later)
```

**APIs (HTTPS):**

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/session` | IdP callback |
| GET | `/tenants/:id/carbon` | RLS |
| POST | `/actions` | propose |
| POST | `/actions/:id/hitl` | **human only** |
| POST | `/actions/:id/execute` | server-side after COMPASS+HITL |
| GET | `/audit` | attributed log |

**Events:** persist the Phase 1 bus types with `tenant_id` + `actor_id`.  
**Tests:** 401 without session; cross-tenant 403; HITL forgery rejected.  
**Acceptance:**

- [ ] S1–S3 in the threat model closed for the execute path.
- [ ] Refreshing the browser does not wipe approvals or posts.
- [ ] Capability checks are **grants**, not a static tree `can()`.

---

## Phase 5 — COMPASS policy packs + orchestrators

**Scope:** Eco / Compliance / Ethics / Sovereignty as **server** evaluators with `policy_pack_version`. Hierarchical H-agent coordinates; specialists keep scoped credentials.

**Files:** port `CompassGate.ts` off the client; policy JSON/YAML **versioned** in git + DB.  
**Migrations:** `policy_packs`, `pillar_opinions`.  
**APIs:** `GET /policy-packs/current`, `POST /compass/evaluate` (idempotent, no execute).  
**Events:** `compass.verdict` persisted before execute.  
**Tests:** floor fail ⇒ specialist **not** called (contract test with fake clock).  
**Acceptance:**

- [ ] EUR-Lex/RAG still **absent** (honest).
- [ ] LLM (if added) has **no** mutate/money/authority tools.
- [ ] High/critical risk always HITL even when scores pass.

---

## Phase 6 — Evidence, export, money-adjacent (still no auto SKAT)

**Scope:** 7-tuple evidence ([DOMAIN_MODEL.md](./DOMAIN_MODEL.md)); auditor export (CSV/JSON **not** claimed as ESEF); DK CO₂-afgift **calculator**.

**Files:** export job; factor catalog importer; SKAT **worksheet** UI.  
**Migrations:** evidence tuple columns; `tax_worksheets` (draft/submitted_by_human).  
**APIs:** `POST /exports/csrd-e1-6` (download); `POST /tax/skat/worksheet` (create draft); `POST /tax/skat/submit` **disabled / requires dual HITL and is off by default**.  
**Events:** `evidence.attached`, `export.generated`, `skat.worksheet.drafted` — **never** `skat.submitted` from a cron.  
**Tests:** export hashes match spine; submit endpoint 403 unless feature flag **and** two HITL records.  
**Acceptance:**

- [ ] No job auto-posts to SKAT.
- [ ] CSRD export is labelled “evidence pack, not an assured filing.”
- [ ] Offsets cannot silently net the spine.

---

## Phase 7 — Adapters later (Kafka, vision, Cirkel-out)

**Scope:** only after Phases 4–6 are boring.

| Adapter | Rule |
|---------|------|
| Kafka | Consume **outbox**; same event schema |
| Roboflow | Server proxy; no query-string API keys; observations ≠ legal identity |
| Tinker/Inkling | Offline train; promote weights via HITL |
| ERP (SAP etc.) | Pull intake; never trust UI “connected: true” |
| Slack/Teams | HITL **notify**, not approve-by-emoji unless explicitly designed |
| Cirkel | **Separate system**; API contract if ever, no source import |
| LangGraph | If used, **server-side** FSM; do not merge conflicting PR #3 onto kernel tip without rebase |

**Acceptance:**

- [ ] Browser bundle still has no adapter secrets.
- [ ] Vision cannot mint an e-liability post without Eco + HITL when estimated/high.
- [ ] Cirkel camera/QR decoder/NFC/wallet/PWA still **not found** in this repo.

---

## Test pyramid (from Phase 1 onward)

| Layer | What |
|-------|------|
| Unit | COMPASS floors, graph totals, hash verify, env secret rejection |
| Contract | Propose → verdict → (HITL) → execute; specialist not called on block |
| HTTP | Authn/z, RLS, SKAT submit off |
| UI | Honest labels (DEMO vs live); NASA bar; no ZK-STARK claim |
| Security | Cases in `SECURITY_THREAT_MODEL.md` §11 |

---

## Explicitly out of order

- ZK-STARK verifier.
- Hosted RL product.
- 12-framework Sweep-style CSRD wizard.
- Kafka/Neo4j as Phase 1 toys.
- Any `cirkel-system` import.
