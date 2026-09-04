# EARTH — AlphaXiv / Aurelle status (honest snapshot)

**To:** Michael (EARTH owner) — paste-ready for the AlphaXiv / Aurelle research thread  
**Repo:** [github.com/Broser-ai/EARTH](https://github.com/Broser-ai/EARTH)  
**Inspected tip at write-time:** `origin/main` `55eadf97931862481f718bc9e43e203c05ad1955`  
**This file is the living snapshot.** Older memos on the same tree (`docs/EARTH-AURELLE-COVERAGE-AUDIT.md`, `docs/TECHNICAL_AUDIT.md`, `docs/SWARM_STATUS.md`, parts of `docs/FRONTEND_TRUTH.md` and `docs/SHARED_CONTRACTS.md`) describe earlier SHAs. Do not cite those as “what main is today.”

**One-line truth:** EARTH on `main` is a **development prototype**: a NASA-shell Vite SPA (port **5180**) plus a local Fastify/Postgres intake slice (port **3001**) plus an **in-tab** TypeScript sovereign kernel (COMPASS floors, LangGraph FSM, session-rl). It is **not** a deployed science result, not Cirkel, and not CSRD / EU AI Act / ZK / live-ERP software. OIDC provider support exists on the Security Foundation branch but is not configured for a deployment; PostgreSQL RLS is not implemented.

---

## 0. Punch line for the thread

The long Aurelle/AlphaXiv chat mapped circular-economy papers onto a product that **does not exist as described**. What exists on `main` is:

1. A dark mission-control **SPA mock** (most screens are DEMO fixtures).
2. One real **server workflow**: Material Opportunity Intake v0.1 (Postgres + deterministic stubs).
3. An **in-browser kernel** inspired by COMPASS / e-liability / hash-chains — heuristics and in-memory structures, not paper replications.

Cite this file + the SHA. Do not cite SPA KPIs, COMPASS scores, or “SHA-256 ledger” rows as empirical results.

---

## 1. What EARTH is on `main` TODAY

| Layer                                               | What it is                                                                                                                                                                      | Port / bind                                                              | What it is not                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Vite 6 + React 19 + TypeScript SPA (`src/`)         | Command-bar mission grid, History URL router, `DEVELOPMENT` / `DEMO` badges. Tenant label: “Hornbach Germany” (fictional DEMO).                                                 | **5180** `0.0.0.0`, `strictPort`. Proxies `/v1` and `/health` → `:3001`. | Not a live ESG/ERP/audit product. No OIDC.                      |
| Fastify API (`apps/api`, package `earth-api` 0.1.0) | `GET /health`, `GET /v1/info`, Material Opportunity Intake v0.1. Binds `0.0.0.0:$PORT`. TenantContext + DEVELOPMENT `AuthProvider` (not OIDC).                                  | **3001** default                                                         | Not production. Identity = DEVELOPMENT headers, not auth.       |
| PostgreSQL                                          | Compose **only** `postgres:16-alpine` (db/user/password `earth`, **5432**). Migrations + DEVELOPMENT seed org/user.                                                             | 5432                                                                     | No Kafka, Redis, Neo4j, chain node.                             |
| In-tab sovereign kernel (`src/sovereign/`)          | `EarthRuntime` in the browser tab: EarthBus, CompassGate, H/S swarm, LangGraph web FSM, Prime + SessionRlPolicy, SHA-256 hash-chain, in-memory e-liability seed, adapter stubs. | Same tab as SPA                                                          | Lost on refresh. Not the Postgres control plane. Not hosted RL. |
| Shared contracts (`packages/earth-contracts`)       | Frozen literals: `DEVELOPMENT_ONLY`, honesty labels, intake enums. Canonical DEMO GHG line items.                                                                               | —                                                                        | Types/literals + DEMO spine only.                               |

**Two different things named PRIME — do not conflate:**

| Name                        | Where                  | What it does                                                                                                                       |
| --------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **PrimeAgent** (SPA kernel) | `src/sovereign/prime/` | In-tab policy: default **session-rl** softmax bandit over a hardcoded mission catalog, LangGraph-driven.                           |
| **PRIME policy v0.1** (API) | `apps/api/src/prime/`  | Deterministic **task planner** for `MATERIAL_OPPORTUNITY_INTAKE` only. `GET /v1/info` sets `reinforcementLearning: false`. No LLM. |

**DNA (verified):** no `Sidebar.tsx`; top `CommandBar` only; accent `#60A5FA`; ground `#060B18`; no `cirkel-system` import. `CLAUDE.md` still forbids Cirkel imports.

**Compose / extras:** no GitHub Actions CI found on this tree. Tests: Vitest (SPA kernel + smoke + API). Root `npm run typecheck` is SPA `tsc --noEmit`; API has `npm run api:typecheck`.

---

## 2. AlphaXiv / Aurelle paper-claims vs code

Papers and laws in the chat are **real** unless noted. The mapping onto EARTH is the claim that must stay honest.

### COMPASS — arXiv:2603.11277 (Dessureault et al.)

| Paper                                                                                                                                                                      | EARTH `main`                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator + four pillars (Sovereignty, Carbon/Eco, Compliance, Ethics); RAG; LLM-as-judge; BERTScore on explanations. Paper itself: **no HITL**, weak action-selection. | **TypeScript `CompassGate`** (`src/sovereign/compass/CompassGate.ts`): four deterministic floor agents + min-floor synthesizer (deny if any score &lt; floor; flag pillar spread &gt; 0.40). Verdict digest = **SHA-256** over canonical scores. Unit tests in `CompassGate.test.ts`. |
| Python COMPASS (`compass/base.py`) from the chat dump                                                                                                                      | **Not in this repo.** Truncated chat-Python is not EARTH.                                                                                                                                                                                                                             |
| RAG / EUR-Lex / LLM-as-judge                                                                                                                                               | **Absent.** No OpenAI/Anthropic SDK, no vector store, no EUR-Lex client.                                                                                                                                                                                                              |

Floors in code: sovereignty 0.5, eco 0.4, compliance 0.5, ethics 0.4. Eco uses payload `energyKwh × pue × cif × wue` (defaults PUE 1.2, CIF 0.3, WUE 1) plus `kgCO2e`. Compliance checks a numeric `eudrDeforestationIndex` and a boolean `missingFria`. Ethics uses `laborFairness` / `biasRisk` / `supplierAuditAgeDays`. These are **heuristics on the proposed-action payload**, not measurements.

WarGame (`/mission/wargame`) runs scripted missions `mission-eudr-block` / `mission-de-alternate` against this gate. That is a **demo of the TS floors**, not a COMPASS-paper evaluation.

### How Hungry is AI — arXiv:2505.09598 / inference GHG — arXiv:2606.10660

| Paper                                                                      | EARTH `main`                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PUE × CIF × WUE on inference energy; purchased inference as Scope 3 Cat. 1 | **EcoAgent heuristic only.** Same formula appears in evidence strings (`inference_kg=… (E×PUE×CIF×WUE)`). Defaults, not datacenter telemetry. No model-metering, no region CIF feed, no Scope 3 Cat. 1 posting of EARTH’s own inference. |
| “We measured 30 models”                                                    | **Not in this repo.**                                                                                                                                                                                                                    |

### e-liability (Kaplan/Ramanna; HBR / E-ledgers)

| Method                                                                                        | EARTH `main`                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transferable carbon liability along a chain; **not** GHG Protocol; **not** a database product | **In-memory `ELiabilityGraph`**. Seed `seedHornbachSpine` posts 12 DEMO rows from `packages/earth-contracts` (`DEMO_GHG_LINE_ITEMS`) that **tonne-round** to **scope1+scope2+scope3** (split **2,847 / 4,123 / 7,877**). Views: carbon / “CSRD E1-6” / audit. **No Neo4j.** Refresh wipes the graph.                      |
| One number everywhere                                                                         | **Yes, as DEMO.** SPA carbon pages and the kernel seed import the same contracts module. Totals are derived (s1+s2+s3). Marked DEMO / INPUT_UNVERIFIED / synthetic; unsuitable for reporting/tax/audit/customer/investor use. Specialist `carbon.post` is still a **noop** (`{ ok: true }`) and does not write the graph. |

### Kafka / event bus

| Chat claim                          | EARTH `main`                                                                                                                                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kafka-class event bus, delta re-opt | **`EarthBus`**: typed in-memory `emit` / `on` / `history`. Lost on refresh. Compose has **no Kafka**. `ARCHITECTURE-REVERSE-LOGISTICS.md` still talks Kafka/RabbitMQ/Redis as if they were the system — **design memo, not inventory**. |

### DID / hash-chain vs ZK-STARK

| Chat claim                                 | EARTH `main`                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W3C DID + ZK-STARK / NIST-PQC-L5 / 99.998% | **`issueDid('operator')` → `did:earth:operator`** with **empty JWK** (`x: ''`, `y: ''`). **`HashChainLedger`**: SHA-256 (`crypto.subtle.digest`) over canonical JSON `{ payload, prevHash }`. `prove` / `verify` / `disclose` (subset-reveal, **`inclusionProof: null`**). Aegis page (`/mission/aegis`) is honest: “not a ZK-STARK prover”. |
| Selective disclosure that holds in court   | Interface only. No Merkle / BBS+ / SD-JWT.                                                                                                                                                                                                                                                                                                   |
| Durable, signed audit log                  | Unsigned, in-tab, ephemeral. API audit events for **intake only** live in Postgres (`audit_events`) and are a different store.                                                                                                                                                                                                               |

### Prime Agent RL / LangGraph / SessionRlPolicy vs hosted RL

| Chat claim                        | EARTH `main`                                                                                                                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted RL / Inkling-trained Prime | **`SessionRlPolicy`**: in-tab softmax bandit; logits in `localStorage` key `earth.prime.session-rl.v1`. Label `trained=session-rl`. **Not** hosted RL, not a STARK, not Inkling weights.                                    |
| `UntrainedRlPolicy`               | Throws if selected — refuses to invent a policy.                                                                                                                                                                            |
| LangGraph                         | `@langchain/langgraph/web` **StateGraph** in the browser: `prime → h_agent → compass → (vision) → s_agent → ledger → tinker → inkling`. Recursion limit 64. FSM over the in-tab kernel — **not** an LLM graph, not durable. |
| API RL                            | `INTEGRATION_FLAGS.reinforcementLearning = false`.                                                                                                                                                                          |

### Tinker / Inkling / Roboflow adapters

| Adapter                                     | On `main`                                                                                                                                                                                       | Honest status                                                                                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Roboflow**                                | `StubRoboflowClient` (deterministic box, confidence **0.42**). `HttpRoboflowClient` exists for server-side injection; **SPA must not bundle keys**. HUD: stub unless a live client is injected. | Not a camera. Not Cirkel CV. Workspace snapshot in comments (PraxisOS foot projects, 0 trained models) is **setup intel**, not a product claim. |
| **Tinker** (Thinking Machines Lab LoRA API) | `StubTinkerClient` / `CredentialedTinkerClient` records job **intent**. Status `stubbed` or `queued`. **No Python ServiceClient run in-kernel.**                                                | Do not claim fine-tunes completed.                                                                                                              |
| **Inkling**                                 | `InklingPolicy` **throws** without weights. Fixture weights in tests are labelled “not live inference”. Default lesson attaches; acting policy is session-rl unless weights exist.              | Not Project Bonsai. HuggingFace MCP `needsAuth` is environment trivia, not EARTH runtime.                                                       |

Secrets: `.env.example` lists empty `ROBOFLOW_API_KEY` / `TINKER_API_KEY` / `INKLING_WEIGHTS_URI`. **Never `VITE_*` secrets** (bundled). `.env` is gitignored.

### Cirkel — NOT this repo

`CLAUDE.md`: EARTH is standalone; **never import `cirkel-system`**. Grep of `src/` is clean. Absent here: camera capture, QR/NFC **decoder**, municipality portal, wallet / CP-tokens, chatbot, IndexedDB, PWA, MitID/NemID. Weight-scanning and DPP QR art are **DEMO UI**. Cirkel MetaHarness / consumer app live elsewhere.

### Sweep.net / Resourcify — competitors, not copied

| Competitor                        | Chat misuse                       | EARTH `main`                                                                                                                                                |
| --------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resourcify** (“800+ recyclers”) | Treating their network as EARTH’s | `RecyclerNetwork.tsx`: **14 mock rows** (REC-01…REC-14). Intake task `FIND_CANDIDATE_ROUTES` returns empty `candidates` + `RECYCLER_NETWORK_NOT_CONNECTED`. |
| **Sweep** (CSRD-in-weeks wizard)  | Cloning multi-framework mill      | CSRD page is a **DEMO ESRS layout** (94% “DEMO COMPLETE”). No ESEF/XBRL export. Omnibus-narrowed CSRD is **policy context**, not implemented scoping logic. |

### Material Opportunity Intake v0.1 — the real server workflow

This is the only **durable** product slice. Document: `docs/FIRST_PROCESS_MATERIAL_OPPORTUNITY.md`.

- Workflow `MATERIAL_OPPORTUNITY_INTAKE` `0.1`, policy `prime-v0.1`, ≤ 5 tasks.
- Persists: orgs, users, material batches, sessions, tasks, audit events.
- DEVELOPMENT headers: `x-earth-org-id`, `x-earth-user-id`, `x-earth-user-role` behind `AuthProvider.getActor` → `AuthenticatedActor` + `TenantContext` (lookup in Postgres — **not OIDC**). Role is `users.role`; the role header cannot escalate.
- Seed UUIDs (labelled DEVELOPMENT): org `11111111-1111-1111-1111-111111111111`, user `22222222-2222-2222-2222-222222222222` role `OWNER`.
- Task stubs: `VALIDATE_BATCH`, `CHECK_EVIDENCE` (no document bytes), `CALCULATE_BASELINE` (echoes user CO₂e as `INPUT_UNVERIFIED`), `FIND_CANDIDATE_ROUTES` (empty), `NANOCHAT_EXTRACT` always `NOT_CONFIGURED` if created. **No LLM call.**
- SPA page `/intake` POSTs via Vite proxy. Envelope `"mode": "DEVELOPMENT_ONLY"`.

The in-tab kernel **does not** write these tables. The API **does not** run LangGraph or CompassGate.

### Battery DPP, CSRD Omnibus, PPWR — UI/docs vs implementation

| Instrument                                                     | Reality of the instrument                              | EARTH `main`                                                                                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Battery DPP — Reg. (EU) **2023/1542** Art. 77, **18 Feb 2027** | Real legal deadline (EV / LMT / industrial &gt;2 kWh)  | `ProductPassports.tsx`: generic DEMO passports (Bosch GSR, BASF paint, …). Decorative QR. **No Annex XIII schema, no GS1 Digital Link, no EU registry.** `GET /v1/info` `digitalProductPassport: false`. |
| CSRD Omnibus I — Directive (EU) **2026/470**                   | Real scope cut (~&gt;1000 employees **and** &gt;€450m) | DEMO CSRD page + `DEMO_COMPLIANCE.csrdPct = 94`. No applicability engine, no filed ESRS. KPMG names on screen are **fictional** (page says so).                                                          |
| PPWR — (EU) **2025/40**, apply **12 Aug 2026**                 | Real regulation                                        | **Not implemented.** Mentioned in older planning docs only.                                                                                                                                              |
| DK CO₂-afgift                                                  | Real tax path                                          | **Not implemented.** No SKAT adapter. Must never auto-submit.                                                                                                                                            |
| EU AI Act / FRIA                                               | Real law                                               | `missingFria` is a **payload boolean** on CompassGate. No FRIA store, no Art. 12 logging, no notified-body process. **Do not claim AI Act conformance.**                                                 |

### Other chat mappings (keep short)

| Claim                                                           | Verdict                                                                                                                             |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Digital Rock Physics arXiv:2606.05798 as “EARTH mineral module” | **Wrong mapping.** Geoscience paper, not this product.                                                                              |
| ROBOCYCLE arXiv:2607.03616                                      | Real lab robot paper. **Not EARTH.**                                                                                                |
| Chem-X / Universal Material ID                                  | Research / industry direction. EARTH has DEMO passport IDs like `DPP-00847`, not a global ID network.                               |
| VCG marketplace                                                 | SPA has DEMO Vickrey lot UI (`B2BMarketplace`). **No auction engine.** Vickrey UI ≠ VCG mechanism ≠ CORDIS “Value Chain Generator”. |
| NemID                                                           | Dead since 31 Oct 2023. Not in repo. MitID = Cirkel-only if ever.                                                                   |
| Chronos “10M twin agents”                                       | `ChronosOracle.tsx` copy. **Fiction.** No simulation of 10M agents.                                                                 |
| HyperMatrix FHE / global SDE                                    | `HyperMatrix.tsx`: **1 Hz** ticker + `Math.random` walk. Fiction.                                                                   |
| `types.ts` MOCK Q2 **22,740** tCO₂e                             | Unused alternate universe. Carbon pages do not import it.                                                                           |

---

## 3. Feature matrix

Legend:

- **A** — implemented as described (prototype-honest)
- **B** — partial (heuristic / stub / in-memory / UI-wired)
- **C** — absent
- **D** — misleading if oversold (looks like the real thing)

| Capability                                   | Grade                                         | Evidence                                                                                              |
| -------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Vite SPA + NASA command bar, port 5180       | **A**                                         | `vite.config.ts`, `src/App.tsx`, no Sidebar                                                           |
| Fastify health/info + intake v0.1 + Postgres | **A**                                         | `apps/api`, `docker-compose.yml`                                                                      |
| DEVELOPMENT identity headers                 | **A** (as prototype) / **D** if called “auth” | `apps/api/src/auth/` — `DevelopmentAuthProvider.getActor`; not OIDC                                   |
| Material intake SPA client                   | **A**                                         | `/intake`, Zod client, proxy                                                                          |
| EarthBus in-memory events                    | **B**                                         | Typed bus; not Kafka; not durable                                                                     |
| CompassGate 4 floors + digest                | **B**                                         | Real TS + tests; not paper COMPASS / not RAG                                                          |
| LangGraph web FSM                            | **B**                                         | In-tab orchestration only                                                                             |
| Session-rl Prime                             | **B**                                         | Softmax bandit + localStorage                                                                         |
| Hosted / Inkling / Tinker RL                 | **C**                                         | Stubs; API flag false                                                                                 |
| SHA-256 hash-chain + empty-JWK DID           | **B**                                         | Web Crypto; unsigned; ephemeral                                                                       |
| ZK-STARK / post-quantum proofs               | **C**                                         | Aegis copy now denies STARK                                                                           |
| E-liability in-memory graph                  | **B**                                         | Seed from shared DEMO_GHG_LINE_ITEMS; not Neo4j; `carbon.post` noop                                   |
| Single GHG spine across SPA + kernel         | **A** (DEMO only)                             | Kernel e-liability split 2847/4123/7877; totals derived; see `docs/CANONICAL_DATA_SPINE.md`           |
| HITL approvals                               | **B** / **D**                                 | In-tab `Set`; forgeable; no `actor_id` server record                                                  |
| Capability tree                              | **B**                                         | `can()` = “id exists”, not RBAC                                                                       |
| Roboflow / Tinker / Inkling adapters         | **B**                                         | Stubs + attach points; default stub                                                                   |
| Recycler network                             | **C** / **D**                                 | 14 mock rows; API `recyclerNetwork: false`                                                            |
| CSRD / GRI / EUDR / SBTi / ISO / KPMG        | **D**                                         | DEMO pages; some labels honesty-fixed                                                                 |
| Battery DPP / ESPR registry                  | **C** / **D**                                 | Decorative passports                                                                                  |
| SAP / DATEV / Slack / NetSuite / M365        | **C**                                         | Integrations page: `connected: false`, `demo: true`                                                   |
| Kafka / Neo4j / Redis / chain                | **C**                                         | Compose postgres only                                                                                 |
| Cirkel camera/CV/wallet/PWA                  | **C**                                         | Forbidden + absent                                                                                    |
| LLM / NanoChat / RAG                         | **C**                                         | `nanoChat: false`; extract `NOT_CONFIGURED`                                                           |
| Production tenancy / OIDC                    | **C**                                         | `TenantContext` + DEVELOPMENT provider only; no OIDC. See `docs/TENANT_CONTEXT_AND_AUTH_MIGRATION.md` |
| CI (GitHub Actions)                          | **C**                                         | Not in tree                                                                                           |
| Chronos 10M twins / HyperMatrix FHE          | **D**                                         | Routed DEMO pages with fiction copy                                                                   |

Specialist runners that **do** work: `vision.infer` (stub box). All of `ops.intake`, `ops.route`, `carbon.post`, `compliance.gate`, `identity.anchor`, `ledger.append` return `{ ok: true }` without mutating the e-liability graph (ledger append for **trajectories** happens in the LangGraph `ledger` node, not the S-agent stub).

---

## 4. How to run + demo curl

Needs Docker for Postgres. No vendor keys required.

```bash
git clone https://github.com/Broser-ai/EARTH.git
cd EARTH
git checkout main   # record SHA
npm install
docker compose up -d
npm run db:migrate
npm run api:dev     # Fastify 0.0.0.0:3001
# other terminal:
npm run dev         # Vite 0.0.0.0:5180
```

Checks:

```bash
curl -s http://localhost:3001/health
curl -s http://localhost:3001/v1/info
npm run api:test
npm run test
npm run typecheck
npm run api:typecheck
```

`GET /v1/info` honest flags (this tree): `postgres` true, `materialOpportunityIntake` true, `primeRuntime` true (intake policy only), **`authentication` false**, **`nanoChat` false**, **`recyclerNetwork` false**, **`reinforcementLearning` false**, **`blockchain` false**, **`digitalProductPassport` false**.

### Demo: start a material opportunity

After `npm run api:dev`:

```bash
curl -X POST http://localhost:3001/v1/material-opportunities/start \
  -H "Content-Type: application/json" \
  -H "x-earth-org-id: 11111111-1111-1111-1111-111111111111" \
  -H "x-earth-user-id: 22222222-2222-2222-2222-222222222222" \
  -H "x-earth-user-role: OWNER" \
  -d '{
    "idempotencyKey": "demo-hdpe-2026-001",
    "materialBatch": {
      "externalReference": "BATCH-2026-001",
      "materialClass": "HDPE_OFFCUTS",
      "quantityKg": 15200,
      "facilityName": "Demo Factory Aarhus",
      "availableFrom": "2026-09-03T12:00:00.000Z"
    },
    "baseline": {
      "disposalCostDkk": 38400,
      "co2eKg": 4800
    },
    "evidence": {
      "documentIds": [],
      "extractionRequested": false
    },
    "dataClassification": "CONFIDENTIAL"
  }'
```

Those org/user UUIDs are a **DEVELOPMENT seed**, not production identities. Repeat `POST /v1/sessions/:sessionId/run-next` to drain stub tasks. Empty `documentIds` → `EVIDENCE_MISSING` / `WAITING_FOR_DEPENDENCY`.

SPA: open **OPERATIONS → Material intake** (`/intake`).

Kernel demo (in-tab, not the API): **MISSION → Command center / Dev swarm / Aegis / War game / Prime policy**. Refresh resets the kernel.

---

## 5. Explicitly prohibited claims

Do **not** say, imply, or let a screenshot imply:

- CSRD-ready, filed ESRS, ESEF/XBRL, assurance, KPMG engagement, SBTi validation, ISO 14064 certification
- EU AI Act / FRIA / Autonom “compliant”
- ZK-STARK, post-quantum proofs, NIST-PQC, FHE, tamper-proof chain-of-custody
- Autonomous agents with real-world side effects
- Live ERP / SAP / DATEV / Slack / NetSuite / M365 / recycler network
- Hosted RL, trained Inkling, completed Tinker LoRA, live Roboflow production vision
- Kafka / Neo4j / Redis / blockchain as running infrastructure
- Live SKAT / CO₂-afgift submit (must never auto-submit)
- Battery DPP / ESPR registry integration
- “We implemented COMPASS (the paper)” or “we replicated How Hungry is AI telemetry”
- Cirkel features (camera, MitID, wallet) as EARTH
- Resourcify’s 800 recyclers or Sweep’s CSRD mill as EARTH
- Production authentication or multi-tenant security

**House line (keep using it):**  
_EARTH is currently a development prototype. No external ESG, regulatory, recycler, ERP, tax, blockchain, or AI-provider integration is active._

---

## 6. What a researcher should NOT cite as deployed science

| Tempting artefact                                      | Why it is not a result                                                                                                                                                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CompassGate scores / WarGame “COMPASS BLOCK”           | Hardcoded floors on synthetic payloads. No BERTScore, no RAG corpus, no human eval.                                                                                                  |
| EcoAgent `E×PUE×CIF×WUE`                               | Default constants, not measured PUE/CIF/WUE.                                                                                                                                         |
| 14,847 tCO₂e                                           | DEMO seed. One scope split (2,847 / 4,123 / 7,877) derived from shared line items. Not Hornbach (or any tenant) inventory. Unsuitable for reporting/tax/audit/customer/investor use. |
| Hash-chain digests on Aegis                            | Ephemeral SHA-256 commitments in the tab. Not a published ledger, not ZK.                                                                                                            |
| Session-rl probabilities / trajectory rewards          | Bandit over a 6-item mission catalog. Not a trained policy.                                                                                                                          |
| LangGraph node ticks in the HUD                        | In-browser FSM logs. Not a production orchestrator.                                                                                                                                  |
| Stub Roboflow `confidence: 0.42`                       | Deterministic fake box.                                                                                                                                                              |
| CSRD 94%, EUDR index, GRI pack                         | Scenario chrome.                                                                                                                                                                     |
| Product passport QR / “verified” status                | Mock rows.                                                                                                                                                                           |
| Chronos 10M agents, HyperMatrix SDE                    | Copy + `Math.random`.                                                                                                                                                                |
| Intake baseline `co2eKg: 4800`                         | User-supplied `INPUT_UNVERIFIED`. Echoed, not calculated from factors.                                                                                                               |
| Papers 2603.11277 / 2505.09598 / 2606.10660 themselves | Cite the papers as papers. Do not cite EARTH as an implementation of their evaluations.                                                                                              |

**Fair to cite (with SHA):** this repository as a **prototype mapping** of those ideas into TypeScript heuristics + one Postgres intake workflow; the honesty flags on `/v1/info`; the explicit non-goals (no Cirkel import, no Kafka on day one, no STARK sticker).

---

## 7. Stale docs on the same tree (do not mix SHAs)

| File                                                | Problem if cited as “today”                                                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/EARTH-AURELLE-COVERAGE-AUDIT.md` (2026-09-01) | Written when main was SPA-only (no kernel, no API, Sidebar present). Historical coverage of the **chat**, not current main.                         |
| `docs/TECHNICAL_AUDIT.md`                           | Snapshot of `main` @ `7490bda` + unmerged PRs #1–#3. Those PRs **are merged** (`d12f79c` … `ae1e7f3`).                                              |
| `docs/SWARM_STATUS.md`                              | Integration-branch register; says foundation must not land on main — it subsequently did.                                                           |
| `docs/FRONTEND_TRUTH.md`                            | Still says Aegis hashes are `Math.random` and that there is no test runner. **False on current main:** Aegis uses `HashChainLedger`; Vitest exists. |
| `docs/SHARED_CONTRACTS.md`                          | Freeze language (“intake not implemented”) is obsolete; intake **is** on main.                                                                      |
| `TODO.md`                                           | Some P0/P1 items still true (auth, HITL-off-client, dual GHG spine); others stale (Sidebar, “merge PR #1”).                                         |
| `ARCHITECTURE-REVERSE-LOGISTICS.md`                 | Fiction-grade Kafka/SAP/auctions memo.                                                                                                              |

---

## 8. Chat-ready summary (short)

Copy below into AlphaXiv; keep this file for the long version.

> EARTH (`github.com/Broser-ai/EARTH`, `main`) is a **development prototype**, not deployed science. Today: Vite SPA :5180 (NASA command bar, DEMO ESG screens) + Fastify/Postgres :3001 (**Material Opportunity Intake v0.1**, deterministic stubs, DEVELOPMENT headers behind TenantContext — not auth) + an **in-tab** TS kernel (CompassGate floors, LangGraph FSM, session-rl bandit, SHA-256 hash-chain, in-memory e-liability seed).  
> COMPASS 2603.11277 → **not** the paper’s RAG/LLM-as-judge system; four hardcoded TS floors. How Hungry is AI → EcoAgent **heuristic** (E×PUE×CIF×WUE defaults), no telemetry. e-liability → in-memory graph, **not** Neo4j; SPA carbon pages and the kernel share one DEMO GHG spine (2847/4123/7877, totals derived). Kafka → `EarthBus` in RAM. ZK-STARK → **absent** (SHA-256 only, empty JWK DID). RL → session-rl in the tab; API `reinforcementLearning: false`. Tinker/Inkling/Roboflow → **stubs**. Cirkel is **not this repo**. Sweep/Resourcify are competitors (14 mock recyclers, not 800). Battery DPP / CSRD Omnibus / PPWR are **UI/docs**, not implementations.  
> Do not cite CSRD, EU AI Act, ZK, autonomy, or live ERP. Cite this file + SHA. Demo: `docs/ALPHAXIV_STATUS.md` §4 curl.
