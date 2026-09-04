# EARTH backlog

GitHub-issue style. Priority: **P0** before any “product” claim, **P1** integrity, **P2** architecture, **P3** hygiene.  
Owner: Michael. This file is the dossier snapshot; it does not auto-open GitHub issues.

Related: [docs/TECHNICAL_AUDIT.md](docs/TECHNICAL_AUDIT.md) · [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md)

---

## P0 — Do not ship lies

### #P0-1 Relabel or quarantine fake ZK-STARK
- **Tree:** `main`
- **File:** `src/pages/AegisProtocol.tsx` (`Math.random` hashes, `NIST-PQC-L5`)
- **Accept:** page unrouted **or** copy matches SHA-256 (as PR #1 already does)

### #P0-2 One GHG spine
- **Files:** `src/pages/CarbonAccounting.tsx` (2847/4123/7877), `src/pages/EmissionsScope.tsx` (2140/4210/8497), unused `src/types.ts` Q2 22740
- **Accept:** one total, one breakdown; views derived

### #P0-3 Strip assurance copy
- **Files:** `CSRDDisclosure.tsx` (94%, KPMG), `CarbonAccounting.tsx` (SBTi, ISO 14064, KPMG), `ReductionTargets.tsx` (SBTi), `IntegrationsSettings.tsx` (DATEV/Slack/SAP connected), `ComplianceDashboard.tsx` (94% CSRD)
- **Accept:** DEMO label or removal; no implied audit

### #P0-4 No auth / no tenant
- **Accept:** no production deploy of mutate paths until Phase 4 control plane exists
- **See:** `docs/SECURITY_THREAT_MODEL.md` S1–S2

### #P0-5 Never auto-submit SKAT
- **Accept:** no cron, no default-on submit; dual HITL if ever enabled
- **See:** roadmap Phase 6

---

## P1 — Kernel honesty and security

### #P1-1 Merge strategy
- [ ] PR #1 kernel → `main` (Michael)
- [ ] Rebase PR #2 URL chrome
- [ ] Rebase or close PR #3 (LangGraph **conflicts** with PR #1 tip)
- **Accept:** written decision; no silent merge of #3

### #P1-2 HITL off the client
- **PR #1 files:** `src/sovereign/runtime/EarthRuntime.ts` `approveHitl`, `SAgent.ts`
- **Accept:** approvals are server records with `actor_id`

### #P1-3 Forbid `VITE_*` secrets
- **PR #1 files:** `src/vite-env.d.ts`, `src/sovereign/config/env.ts`
- **Accept:** build fails if Vite secret keys are set; Roboflow key not in query string (`client.ts`)

### #P1-4 `carbon.post` writes the graph
- **File:** `src/sovereign/swarm/createDefaultSwarm.ts` (`{ ok: true }` noop)
- **Accept:** specialist posts `ELiabilityGraph` / future DB row

### #P1-5 Capability tree → RBAC
- **File:** `src/sovereign/swarm/capabilities.ts`
- **Accept:** actor grants, not “id exists”

### #P1-6 Signed, durable ledger
- **Files:** `HashChainLedger.ts`, `did.ts` (empty JWK)
- **Accept:** keys from KMS; chain survives refresh

### #P1-7 Sidebar DNA
- **Files:** `src/App.tsx`, `src/components/Sidebar.tsx` on `main`
- **Accept:** NASA bar only (`CLAUDE.md`); dead ids `return-replace`, `auctions`, `emissions-overview`, `scope-123` gone

### #P1-8 Tests on `main`
- **Accept:** `vitest` (or equal) in default branch after kernel merge; `tsc --noEmit` in CI once CI exists

---

## P2 — Product architecture

### #P2-1 Control plane
- Postgres + `0.0.0.0:$PORT`; SPA as client
- **See:** [docs/TARGET_ARCHITECTURE.md](docs/TARGET_ARCHITECTURE.md) A–K

### #P2-2 Evidence 7-tuple
- **See:** [docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md) §7
- **Accept:** factor version + `evidence_digest` on every post

### #P2-3 COMPASS policy packs
- Hardcoded floors OK if versioned; EUR-Lex RAG **not** required for v1
- **Accept:** persisted verdicts; LLM cannot execute

### #P2-4 Orchestrators Eco / Compliance / Ethics / Sovereignty
- Hierarchical H-agent; specialists scoped
- **Accept:** mutate/money/authority APIs unreachable from LLM tools

### #P2-5 Session-rl / LangGraph
- Do not advertise as hosted RL
- **Accept:** PR #3 either rebased as experiment or closed

### #P2-6 Cirkel stays out
- Camera, QR decoder, NFC, municipality, wallet, chatbot, IndexedDB, PWA = out of repo
- **Accept:** no `cirkel-system` import (`CLAUDE.md`)

### #P2-7 Kafka later
- Outbox first; no broker as decoration

---

## P3 — Hygiene

### #P3-1 `.gitignore` / `.env.example`
- **This PR:** added on `main` lineage. Keep `tsc_out.txt` untracked; stop committing it.

### #P3-2 Unused `src/types.ts`
- Wire or delete `MOCK_*` so Q2 22740 cannot drift

### #P3-3 Orphan overclaim pages
- `ChronosOracle.tsx` (10M twins), `HyperMatrix.tsx` (`Math.random`), `WarGame.tsx` — route only with honest copy

### #P3-4 Lint / CI / README
- **Not found** on `main`. Add only after kernel merge if Michael wants them

### #P3-5 Foundation code after kernel
- Env validation, error boundary, structured logger — **not** in this docs PR
- **See:** roadmap Phase 2

### #P3-6 `npm audit` in CI
- Currently 0 vulns; keep as a gate, not a threat model

---

## Open questions (do not implement guesses)

Tracked for Michael in the PR body §11: IdP, first tenant, SKAT human process, Omnibus applicability, Battery DPP v1 scope, whether PR #3 is wanted at all.
