# EARTH technical audit

**To:** Michael (owner)  
**Repo:** `github.com/Broser-ai/EARTH` (`/workspace`)  
**This branch:** `cursor/technical-audit-dossier-a2a5` off `main` @ `7490bda`  
**Date:** 2026-09-03  
**Method:** Four parallel audits were completed first. This dossier **does not re-audit from scratch**. It consolidates verified conclusions and cites paths.

**Honesty rules:** UI screens ≠ product. Unmerged PRs ≠ shipped. Copy that names CSRD / KPMG / SBTi / DATEV / ISO / EU AI Act is **not** evidence of those capabilities. This document is not legal advice and does not claim compliance.

Companion docs: [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md) · [SECURITY_THREAT_MODEL.md](./SECURITY_THREAT_MODEL.md) · [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) · [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) · [AUDIT_COMMANDS.md](./AUDIT_COMMANDS.md) · [`TODO.md`](../TODO.md)

---

## 0. Executive snapshot

- EARTH is a **Vite SPA only**. There is no backend, database, Docker, CI, README (on `main`), Kafka, GraphQL, or WebSockets.
- `CLAUDE.md` forbids importing `cirkel-system`. A Cirkel **consumer app is not found** in this repo.
- `main` is a mock UI with a leftover `Sidebar` and a fake ZK-STARK (`Math.random` hex) in `src/pages/AegisProtocol.tsx`. **Zero tests.**
- The in-browser kernel (EarthBus, S/H agents, COMPASS TS floors, Prime + untrained RL, SHA-256 ledger, e-liability seed 14,847) lives on **unmerged PR #1**.
- Do **not** claim autonomous agents, EU AI Act conformance, or CSRD-ready reporting.

---

## 1. Inventory table

| Item | `main` @ `7490bda` | PR #1 `cursor/sovereign-agent-swarm-a2a5` | PR #2 `cursor/native-url-showcase-a2a5` | PR #3 `cursor/langgraph-prime-rl-e058` | `cursor/aurelle-coverage-audit-7a51` |
|------|---------------------|-------------------------------------------|-----------------------------------------|----------------------------------------|--------------------------------------|
| Merge status | Shipped-looking default | **Unmerged** (base: `main`) | **Unmerged**, stacked on PR #1 | **Unmerged**, stacked on **older** PR #1 — **conflicts with PR #1 tip** | **Unmerged**, docs only |
| Runtime | React 19 + Vite 6 + TS SPA, port 5180 | Same + in-memory kernel | Same + History router / UPLINK chrome | Same + LangGraph web FSM + `SessionRlPolicy` `localStorage` | Same as `main` |
| Backend / DB / Docker / CI | Not found | Not found | Not found | Not found | Not found |
| README | Not found | Not found | Not found | Not found | Coverage memo only |
| Tests | None | vitest (kernel) | vitest (kernel + routing) | vitest (incl. session-rl / graph) | None |
| Nav | `CommandBar` + **`Sidebar` (185px)** — DNA violation | NASA bar; Sidebar removed | NASA bar + UPLINK station | NASA bar | Same as `main` |
| Auth / tenancy | Mock Users & Billing pages | `did:earth:operator` in memory | Same as PR #1 | Same as PR #1 lineage | Mock pages |
| Carbon numbers | Conflicting hardcoded scopes | Seed spine 14,847 tCO₂e + pages still disagree | ESG pages **unchanged** | ESG pages unchanged vs its base | Same as `main` |
| Ledger | Fake ZK-STARK | SHA-256 hash-chain, unsigned, ephemeral | Same as PR #1 | Same lineage | Fake ZK-STARK |
| LLM / RAG / embeddings | Not found | Not found | Not found | Not found (LangGraph ≠ LLM) | Not found |
| Cirkel import | Not found | Not found | Not found | Not found | Not found |

**Branch rule:** treat only `main` as the published tree. Everything else is a proposal.

---

## 2. Topology (what actually runs)

```
Browser
  └── Vite 6 SPA  (package.json: "dev": "vite --port 5180 --host")
        ├── src/main.tsx
        ├── src/App.tsx          in-memory page switcher (no URL router on main)
        ├── src/components/*     CommandBar, Sidebar, tables
        └── src/pages/*          hardcoded mock arrays
```

**Not present in the shipped tree:** HTTP API server, Postgres, Redis, Kafka, GraphQL, WebSockets, service workers / PWA, IndexedDB, Docker, GitHub Actions, Render/Vercel config, object storage.

`ARCHITECTURE-REVERSE-LOGISTICS.md` describes Kafka/RabbitMQ, Redis bid engine, SAP/Oracle webhooks, Vickrey/Dutch auctions as if they were the system. That file is a **design memo**, not an inventory of code.

On **PR #1 (unmerged)** the topology grows **inside the browser tab**:

```
Browser tab
  └── EarthRuntime  (src/sovereign/runtime/)
        ├── EarthBus          in-memory event log
        ├── CompassGate       four TS floor agents
        ├── SwarmCoordinator  H-Agent → S-Agents
        ├── PrimeAgent        UntrainedRlPolicy + DeterministicFallback
        ├── ELiabilityGraph   seedHornbachSpine → 14,847 tCO₂e
        ├── HashChainLedger   SHA-256, unsigned
        └── stubs             Roboflow / Tinker / Inkling
```

Still no server. Refresh loses HITL approvals, ledger, bus history, and the e-liability graph.

---

## 3. Feature matrices

Legend: **Shipped** = on `main`. **PR** = unmerged code. **UI-copy** = labels/numbers on a screen with no backing system. **Not found** = absent in this repo.

### 3.1 Cirkel (must stay out of this repo)

| Capability | Status | Closest EARTH artefact | Citation |
|------------|--------|------------------------|----------|
| Camera capture | Not found | — | — |
| QR / barcode **decoder** | Not found | Decorative DPP QR iconography; mock scan tickets | `src/pages/ProductPassports.tsx`, `src/pages/WeightScanning.tsx` |
| NFC | Not found | — | — |
| Municipality portal | Not found | — | — |
| Wallet / CP-tokens | Not found | Mock ledger rows in `src/types.ts` (`MOCK_LEDGER_ENTRIES`) — **unused** | `src/types.ts` |
| Chatbot | Not found | — | — |
| IndexedDB | Not found | — | — |
| PWA / service worker | Not found | — | — |
| MitID / NemID | Not found | — | — |
| Consumer app | **Not found** | `CLAUDE.md` forbids `cirkel-system` import | `CLAUDE.md` lines 1–4, 29 |
| Weight & scanning **UI** | Shipped mock | `/ops/scan` on PR #2 catalog; on `main` page id `weight-scanning` | `src/pages/WeightScanning.tsx` |
| Vision infer | PR stub | `StubRoboflowClient.infer` returns a fake box (`confidence: 0.42`) | PR #1 `src/sovereign/vision/roboflow/client.ts` |

**Decision (confirmed):** Cirkel stays out of this repo. Camera/CV/wallet/PWA are not EARTH v1.

### 3.2 ESG / carbon / compliance (screens ≠ product)

| Capability | Status | Evidence |
|------------|--------|----------|
| GHG totals as product data | **Conflicting mocks** | Carbon page spine **2847 / 4123 / 7877** (`src/pages/CarbonAccounting.tsx` `SCOPES`) vs Emissions page **2140 / 4210 / 8497** (`src/pages/EmissionsScope.tsx` `SCOPE_TOTALS`). Same headline total **14,847**. |
| Unused alternate totals | Dead types | `src/types.ts` `MOCK_EMISSIONS_DATA` Q2 **22,740** tCO₂e — **no page imports `types.ts`** |
| E-liability graph | PR only | `src/sovereign/eliability/seed.ts` `HORNBACH_POSTS` sums to 14,847; `ELiabilityGraph.post` is in-memory |
| `carbon.post` specialist | PR **noop** | `createDefaultSwarm.ts` runner returns `{ ok: true }` for `carbon.post` (and ops/compliance/identity/ledger) |
| Emission **factor versioning** | Not found | Factors are string literals on the Emissions page (`'0.202 kgCO2/kWh'`) |
| Evidence **7-tuple** | Mostly absent | Posts have kg / method / scope / label / `csrdCode` — missing factor version, artefact digest, actor, period (see [DOMAIN_MODEL.md](./DOMAIN_MODEL.md)) |
| CSRD **export** (ESEF/XBRL, tagged ESRS) | Not found | `CSRDDisclosure.tsx` shows **94% COMPLETE** as copy |
| CSRD / KPMG / SBTi / DATEV / ISO | **Copy** | `CSRDDisclosure.tsx` 94% + “Auditor: KPMG AG”; `CarbonAccounting.tsx` “SBTi Near-term 2030”, “ISO 14064-1 Certified”, “Last audit: Mar 2026 (KPMG)”; `ReductionTargets.tsx` SBTi pathway; `IntegrationsSettings.tsx` DATEV `connected: true`; `RecyclerNetwork.tsx` ISO 14001 badges |
| Slack / Teams integration | Not found (UI-copy) | `IntegrationsSettings.tsx` Slack row `connected: true`, `#earth-alerts` — no Slack SDK, no webhook sender |
| Tenant model (real) | Not found | `BillingSettings` / `UsersRoles` are mock tables. `MOCK_TENANTS` in `types.ts` is unused |
| SAP / NetSuite / M365 SSO | UI-copy | `IntegrationsSettings.tsx` `connected: true` without clients |
| SKAT / DK CO₂-afgift live submit | Not found | Must **never** auto-submit (roadmap constraint) |

### 3.3 Agents / COMPASS / RL

| Capability | Status | Evidence |
|------------|--------|----------|
| LLM / RAG / embeddings | **Not found** | No OpenAI/Anthropic SDK, no vector store |
| COMPASS | PR: **hardcoded floors**, not EUR-Lex | `src/sovereign/compass/CompassGate.ts` — floors 0.4–0.5; EUDR index `> 0.05`; labor/bias heuristics |
| S-Agent / H-Agent / swarm | PR in-browser | `src/sovereign/agents/SAgent.ts`, `HAgent.ts`, `swarm/SwarmCoordinator.ts` |
| Specialists | **Mostly no-op** | `createDefaultSwarm.ts` `runnerFor` — only `vision.infer` does work (stub) |
| HITL | PR **in-memory, forgeable** | `EarthRuntime.approveHitl` mutates `ctx.hitlApprovals` Set; `App.tsx` counts bus events. No authn of the approver |
| Prime RL | PR untrained | `UntrainedRlPolicy` **throws** if selected; `DeterministicFallbackPolicy` is what runs |
| Session-rl | PR #3 only | `SessionRlPolicy` + `localStorage` key `earth.prime.session-rl.v1` — **not hosted RL** |
| LangGraph | PR #3 only | `@langchain/langgraph` web FSM; **conflicts** with PR #1 tip |
| Autonom / EU AI Act “compliant” | **Do not claim** | No FRIA store, no notified-body process, no logging suitable for Art. 12 |
| Roboflow / Tinker / Inkling | PR stubs | Live HTTP attach exists as types; `VITE_*` secret types would leak keys to the bundle (`src/vite-env.d.ts` on PR #1) |

---

## 4. Twenty code issues

Severity: **P0** ship-blocker if treated as product · **P1** integrity/security · **P2** architecture debt · **P3** hygiene.

| # | Sev | Tree | Issue | Path |
|---|-----|------|-------|------|
| 1 | P0 | `main` | Fake ZK-STARK: `fakeHash` is `Math.random()` hex; UI claims “Post-Quantum ZK-STARKs” / `NIST-PQC-L5` | `src/pages/AegisProtocol.tsx` (~L20, L311–355, L510) |
| 2 | P0 | `main` | Two GHG spines disagree (2847/4123/7877 vs 2140/4210/8497) while both total 14847 | `CarbonAccounting.tsx`, `EmissionsScope.tsx` |
| 3 | P0 | `main` | CSRD 94% / KPMG / SBTi / ISO 14064 presented as facts | `CSRDDisclosure.tsx`, `CarbonAccounting.tsx`, `ReductionTargets.tsx` |
| 4 | P0 | all | **No authentication.** Any browser session is the operator | Entire SPA |
| 5 | P0 | all | **No tenancy.** Mock tenants are unused types | `src/types.ts` `MOCK_TENANTS`; `UsersRoles.tsx` |
| 6 | P1 | `main` | `CLAUDE.md` DNA: “Ingen sidebar”; `App.tsx` still mounts `<Sidebar />` (185px) | `src/App.tsx` L4, L118; `src/components/Sidebar.tsx` |
| 7 | P1 | `main` | Dead sidebar ids fall through to Overview: `return-replace`, `auctions`, `emissions-overview`, `scope-123` | `Sidebar.tsx` vs `PAGE_COMPONENTS` in `App.tsx` |
| 8 | P1 | `main` | Six orphan pages not in the router (overclaim UIs) | `AegisProtocol`, `ChronosOracle`, `CommandCenter`, `DevSwarm`, `HyperMatrix`, `WarGame` |
| 9 | P1 | `main` | `src/types.ts` is unused; Q2 emissions 22740 never shown | `src/types.ts` `MOCK_EMISSIONS_DATA` |
| 10 | P1 | `main` | Zero tests; no `.gitignore` (until this dossier); `tsc_out.txt` committed | `package.json`; repo root |
| 11 | P1 | PR #1 | HITL is a client-side `Set` — forgeable, non-durable, no actor binding | `EarthRuntime.ts` `approveHitl`; `SAgent.ts` L93–107 |
| 12 | P1 | PR #1 | Capability tree is a static id index, **not actor RBAC** | `src/sovereign/swarm/capabilities.ts` `can()` |
| 13 | P1 | PR #1 | Hash-chain is ephemeral and **unsigned** (Web Crypto SHA-256 of JSON) | `src/sovereign/identity/HashChainLedger.ts` |
| 14 | P1 | PR #1 | DID has empty JWK (`x: ''`, `y: ''`) — interface only | `src/sovereign/identity/did.ts` |
| 15 | P1 | PR #1 | `carbon.post` (and most specialists) return `{ ok: true }` without writing the graph | `src/sovereign/swarm/createDefaultSwarm.ts` L45–55 |
| 16 | P1 | PR #1 | `VITE_ROBOFLOW_API_KEY` / `VITE_TINKER_API_KEY` typed on `ImportMetaEnv` — **would leak to the bundle** if set | `src/vite-env.d.ts`, `src/sovereign/config/env.ts` |
| 17 | P1 | PR #1 | Live Roboflow client puts `api_key` on the **query string** | `src/sovereign/vision/roboflow/client.ts` `HttpRoboflowClient` |
| 18 | P2 | PR #1 | COMPASS is numeric floors, not a regulation corpus | `CompassGate.ts` `SovereigntyAgent` / `EcoAgent` / `ComplianceAgent` / `EthicsAgent` |
| 19 | P2 | PR #3 | Session-rl persists logits in `localStorage`; HUD `trained: true` is easy to misread as hosted RL | `src/sovereign/prime/SessionRlPolicy.ts` |
| 20 | P2 | PR #3 vs #1 | LangGraph PR **conflicts** with current PR #1 tip — cannot merge both linearly | `git merge-tree` / `package.json` (`@langchain/*`) |

Related UI-copy (not separate root causes): Slack “connected”, DATEV “monthly export”, SAP “847 records”, ChronosOracle “10M digital twin agents” (`ChronosOracle.tsx`), HyperMatrix `Math.random` price walk (`HyperMatrix.tsx`).

`npm audit` reported **0** vulnerabilities at scan time. No secrets were found in the repo (`.env.example` empty / absent on `main`). That does **not** cancel issues 4–5 or 16–17.

---

## 5. Layers A / B / C / D

### A — `main` (what a visitor actually has)

Mock commercial SaaS chrome. 25 wired pages, 6 orphans, leftover sidebar, fake cryptography, conflicting ESG numbers, unused `types.ts`, no tests, no persistence, no auth.

### B — PR #1 kernel (proposal, not shipped)

Honest-ish in-browser kernel: evaluate-before-execute (`SAgent` → `CompassGate`), mission catalog, SHA-256 commitments (not STARKs), e-liability seed, vitest. Specialists mostly no-op. Secrets typed as `VITE_*`. NASA command bar replaces Sidebar (aligns with `CLAUDE.md`).

### C — stacked experiments

| PR | Intent | Risk |
|----|--------|------|
| #2 native URL showcase | History router, `/uplink`, command-bar station | ESG pages unchanged; stacked on #1 — merge **after** #1 |
| #3 LangGraph + session-rl | Web FSM + localStorage bandit | **Conflicts** with PR #1 tip. LangGraph in the browser is not a production orchestrator. Do not merge across the conflict without a rebase decision from Michael |
| aurelle-coverage-audit | Docs vs Aurelle/AlphaXiv transcript | Docs only; does not change product truth |

### D — production target (not implemented)

Hierarchical orchestrators (Eco / Compliance / Ethics / Sovereignty) behind a COMPASS harness; LLMs **never** call mutate / money / authority APIs; HITL for high-impact actions with durable, attributed approvals; Postgres + (later) Kafka; Cirkel remains a separate system. Specified in [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md). Sequencing in [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md).

---

## 6. Commands

See [AUDIT_COMMANDS.md](./AUDIT_COMMANDS.md). Short form for `main`:

```bash
npm install
npm run dev          # vite --port 5180 --host
npx tsc --noEmit
npm run build
npm audit            # dependency CVEs; 0 at last scan
# lint: not configured
# test: not configured on main; vitest on kernel PRs
```

---

## 7. What this dossier does *not* claim

- EARTH is not CSRD-compliant, SBTi-validated, ISO-certified, KPMG-audited, or DATEV-connected.
- EARTH is not an EU AI Act high-risk system filing and is not “autonomous.”
- EARTH is not a ZK-STARK prover and not a hosted RL platform.
- Kafka, Neo4j, SAP, Slack, and SKAT are not in this codebase.
- No legal conclusion is offered about Omnibus / ESRS / Battery Regulation applicability to any tenant.
