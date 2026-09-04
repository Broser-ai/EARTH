# EARTH target architecture

**Status:** design for production-safe sequencing. **Not implemented** on `main`. Kernel sketches on PR #1 are in-browser prototypes of *some* of these ideas (evaluate-before-execute, four COMPASS pillars, e-liability graph), not this architecture.

**Owner:** Michael. Nothing here is a license to ship, file, or auto-submit to SKAT.

**Non-goals:** Cirkel consumer app, camera/NFC/wallet/PWA, hosted RL-as-product, ZK-STARK in v1, Kafka/Neo4j on day one.

Companion: [TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md) · [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) · [SECURITY_THREAT_MODEL.md](./SECURITY_THREAT_MODEL.md) · [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)

---

## 1. One-sentence target

A **sovereign command SPA** talks only to an **EARTH control plane** that runs **hierarchical orchestrators** (Eco, Compliance, Ethics, Sovereignty) through a **COMPASS harness**: every mutating, monetary, or authority action is evaluated, attributed, and — when high-impact — **HITL-approved** before a specialist or adapter may execute. **LLMs never hold those API credentials.**

---

## 2. Topology (target vs now)

```
                    [ Operators / auditors ]     [ Cirkel — OUT OF REPO ]
                              │
                              ▼
                    [ EARTH SPA  :5180 ]
                              │  HTTPS + session
                              ▼
                    [ Control plane  0.0.0.0:$PORT ]
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   [ COMPASS harness ] [ HITL service ] [ Identity / tenancy ]
          │
          ▼
   [ Orchestrators: Eco | Compliance | Ethics | Sovereignty ]
          │
          ▼
   [ Specialists with scoped credentials ]
          │
     ┌────┴────┐
     ▼         ▼
 [ Postgres ] [ Object store for evidence ]
     │
     └── later: Kafka outbox  (not now)
```

**Now:** the SPA *is* the runtime. **Then:** the SPA is a renderer. The control plane binds `0.0.0.0:$PORT` (Render constraint). Disk is ephemeral — durable state is Postgres + object storage.

Kafka and a graph database are **later**, after the outbox and the e-liability relational model are boring. Do not stand up a broker to decorate a mock.

---

## 3. Shared slices A–K

These eleven slices apply to **every** orchestrator. They are the production-safe reading of Phase 6.

### A — Authority boundary

- Browser: render, propose, display verdicts. Never the source of truth for approvals, carbon posts, money, or identity.
- Control plane: the only process that may mutate domain tables or call money/authority adapters.
- Adapters (Roboflow, Tinker, Inkling, ERP, SKAT): **outbound only** from the control plane, with per-adapter credentials that never enter `VITE_*`.

### B — Identity and tenancy

- Every row carries `tenant_id`. RLS in Postgres. No shared “Hornbach demo” graph in production.
- Actors are users (IdP) and service principals (adapters), not `did:earth:operator` issued in `createEarthRuntime.ts`.
- DID / hash-chain are **commitment layers** on top of the relational record, not a substitute for authn.

### C — Event envelope (in-process now, Kafka later)

Canonical event (see also [DOMAIN_MODEL.md](./DOMAIN_MODEL.md)):

`id, tenant_id, type, source, actor_id, action_id, occurred_at, payload_digest, correlation_id`

v1: persist in Postgres, publish in-process. v2: same rows via transactional outbox → Kafka. **Do not dual-write ad hoc.**

### D — COMPASS harness (evaluate-before-execute)

Port the PR #1 idea, not the browser process:

1. Specialist or orchestrator **proposes** an `Action` (capability, risk, payload).
2. Harness runs **deterministic** pillar evaluators (Eco, Compliance, Ethics, Sovereignty).
3. Aggregate: any score `< floor` → **block**. `risk ∈ {high, critical}` → **HITL** even if floors pass (as `CompassGate.ts` already sketches).
4. Persist `CompassVerdict` (scores, floors, conflicts, digest) **before** execute.
5. Execute only through the specialist’s scoped client.

EUR-Lex / RAG is **not** v1. Hardcoded floors are honest if labelled as policy packs with a `policy_pack_version`. LLM-as-judge is **later** and still cannot execute.

### E — Eco orchestrator

Owns: activity data, factor tables (**versioned**), e-liability posts, inference energy (PUE × CIF × WUE as **Scope 3 Cat. 1** when EARTH itself infers), DK CO₂-afgift **calculation** (never auto-submit).

Must refuse: posting without a factor version; mixing location- and market-based Scope 2 without a method flag; treating offsets as inventory reductions unless an explicit, reversible ledger event says so.

### F — Compliance orchestrator

Owns: regulation packs (CSRD Omnibus-narrowed E1-6 spine first; Battery DPP shape; PPWR/EUDR as **gates**, not 12-framework SEO). Evidence export to an auditor — **not** a “94% complete” dashboard.

Must refuse: labelling a screen “CSRD filed”; generating an assurance statement; talking to SKAT/Erhvervsstyrelsen without a human submit path.

### G — Ethics orchestrator

Owns: supplier audit age, labor-fairness inputs, bias-risk on automated classification, prohibition on using personal data from Cirkel.

Must refuse: silent override of a failed ethics floor; using vision embeddings to identify persons.

### H — Sovereignty orchestrator

Owns: jurisdiction allow-list, data residency, secret presence (not secret values) in the HUD, kill-switch / halt (PR #1 `EarthRuntime.halt` is the UI metaphor).

Must refuse: executing in a jurisdiction not on the tenant allow-list; attaching live Roboflow from the browser.

### I — LLM and specialist isolation

| May | Must not |
|-----|----------|
| Draft narratives, summarize evidence, propose actions | Call `carbon.post`, payments, SKAT, HITL approve, role change, factor publish |
| Read **redacted** tools (search, retrieve factor catalog) | Receive adapter API keys |
| Run in a worker with **no** mutate IAM | Be the COMPASS voter of record |

Prime “RL” in v1 remains a **deterministic policy** plus optional **offline** training (Tinker/Inkling **server-side**). Browser `SessionRlPolicy` / LangGraph FSM are experiments, not the control plane.

### J — Persistence

| Store | Use |
|-------|-----|
| Postgres | Tenants, users, materials, batches, emissions, verdicts, approvals, outbox |
| Object storage | Factor files, DPP payloads, evidence blobs (hash in DB) |
| In-memory | SPA cache only |
| Kafka | Later, from outbox |
| Neo4j | Not required; e-liability is a DAG that Postgres can express |

### K — HITL and human authority APIs

- Approvals are server records: `action_id, tenant_id, actor_id, decision, reason, signed_at`.
- Client may **request**; only the HITL service **commits**.
- High-impact catalog (initial): carbon post, factor publish, money movement, role grant, SKAT/regulatory submit, live vision model switch.
- Forgery of `hitl.approved` on an in-memory bus (today’s PR #1) is a **non-goal of production**.

---

## 4. Mapping from PR #1 prototypes

| Prototype (unmerged) | Production fate |
|----------------------|-----------------|
| `EarthBus` | Becomes an append-only `events` table + later outbox |
| `CompassGate` four classes | Same pillars, versioned policy packs, persisted verdicts |
| `SAgent` / `HAgent` | Orchestrator workers with scoped IAM; keep evaluate-before-execute |
| `CapabilityTree.can()` | Replace with actor RBAC + capability grants per tenant |
| `ELiabilityGraph` + seed 14847 | Replace seed with tenant data; keep the **single spine** idea |
| `HashChainLedger` | Optional commitment on top of DB rows; add signatures |
| `HttpRoboflowClient` query-string key | Backend-only, header/secret manager, never `VITE_*` |
| `UntrainedRlPolicy` throw | Keep the honesty: untrained ≠ autonomous |
| LangGraph in the browser (PR #3) | Do not promote to production orchestrator |

---

## 5. Visual / product identity (unchanged)

`CLAUDE.md` still governs the SPA: no Cirkel sidebar DNA, accent `#60A5FA`, ground `#060B18`, JetBrains Mono for data, Inter for nav, port 5180. The control plane has no requirement to be “NASA”; the **operator UI** does.

---

## 6. Explicit refusals

- No import from `cirkel-system`.
- No claim of CSRD / EU AI Act / SBTi / ISO without an independent assurance process (out of scope of this repo’s code).
- No auto-submit to SKAT.
- No ZK-STARK as a v1 milestone (SHA-256 + signature is the honest commitment).
- No LLM with `carbon.post` or payment tools.
