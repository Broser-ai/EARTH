# EARTH coverage-audit: Aurelle/AlphaXiv-transkript vs backbone-first

**Til:** Michael (EARTH owner)
**Fra:** Cursor cloud-agent (readonly repo + paper-spotcheck)
**Dato:** 2026-09-01
**Repo:** `github.com/Broser-ai/EARTH` (`/workspace`)
**Spørgsmål:** Er alt i Aurelle/AlphaXiv-transkriptet dækket i EARTH’s **backbone-first** plan — inkl. forbedringer transkriptet aldrig sagde?

---

## 0. Svar først

**Nej.** Transkriptet er ikke dækket. Det beskriver et produkt, der ikke findes.

Tre lag af gap, i prioriteret rækkefølge:

1. **EARTH i dag er et mock-SPA** — ~25 wired sider, 6 orphans, ingen kernel. Ingen event bus, ingen COMPASS, ingen ledger, ingen e-liability, ingen fetch/DB/WebSocket. Aegis “ZK-STARK” er `Math.random()`-hex.
2. **Transkriptet selv er ufuldstændigt og overclaimet** — Python-COMPASS (`compass/base.py`, Eco/Compliance/Ethics) er chat-genereret, klipper midt i `EthicsAgent._bias_fairness_check`, har **ingen SovereigntyAgent-kode**, **ingen Decision Synthesiser-kode**, **ingen tests**. Cirkel-harness er TypeScript i andre repos/Drive — ikke den Python. ZK-STARK, Kafka/Neo4j, Resourcify’s 800 recyclers som “jeres”, NemID, Digital Rock Physics som “jeres mineralmodul” er fiction eller forkert mapping.
3. **Transkriptet mangler de forbedringer, der faktisk gør EARTH bedre end COMPASS-paperet og konkurrenterne** — HITL via CommandBar/Slack, ærlig ZK prove/verify, PUE×CIF×WUE + egen inference som Scope 3 Cat.1, Omnibus-indsnævret CSRD (ikke Sweep-wizard), Battery DPP 18. feb 2027 som første rigtige pas, ét mock-data-spine, NASA-shell uden sidebar, backbone-first sequencing.

**Beslutningen er allerede truffet og den er rigtig:** byg EARTH-kernen først. Pick *needs* fra Sweep/Resourcify/Cirkel som adapters bagefter — aldrig kloner, aldrig `import` fra cirkel-system.

---

## 1. Hvad EARTH faktisk er (verificeret i repo)

| Claim | Evidens |
|---|---|
| React 19 + Vite 6 + TS SPA, port 5180 | `package.json` scripts `vite --port 5180 --host`; `vite.config.ts` `server.port: 5180` |
| Ingen fetch / localStorage / WebSocket / DB / Kafka i app-kode | `src/` har ingen af disse (kun `Math.random` i orphans) |
| Alle wired sider er mock | Hver page har hardcoded arrays; `src/types.ts` MOCK_* er **ikke importeret** af nogen page |
| ~25 wired pages | `PAGE_COMPONENTS` i `App.tsx`: 25 keys |
| 6 orphans ikke i router | `AegisProtocol`, `ChronosOracle`, `CommandCenter`, `DevSwarm`, `HyperMatrix`, `WarGame` — filer findes, **ingen import i `App.tsx`** |
| CLAUDE.md: EARTH ≠ Cirkel | Ingen sidebar (top command bar); accent `#60A5FA`; ground `#060B18`; **ALDRIG import cirkel-system**; `tsc --noEmit` før færdig |
| **CLAUDE.md overtrædes allerede** | `App.tsx` renderer **stadig** `<Sidebar />` (185px). DNA siger “Ingen sidebar”. |
| Ingen tests | Ingen `*.test.ts` / `*.spec.ts` / `*.py` i repo |
| Ingen Python COMPASS | Transkriptets `compass/` findes ikke i EARTH |
| Ingen cirkel-import | Grep i `src/` er rent |

**Wired (25):** Overview, PickupOrders, ContainerFleet, RecyclerNetwork, RoutePlanner, WeightScanning, ReverseLogistics, TakeBackPrograms, B2BMarketplace, MaterialExchange, ProductPassports, CarbonAccounting, EmissionsScope, ReductionTargets, OffsetCredits, ComplianceDashboard, CSRDDisclosure, GRIReporting, EUDRTracking, AuditTrail, Reports, LocationsSettings, UsersRoles, IntegrationsSettings, BillingSettings.

**Orphans (6):** CommandCenter, AegisProtocol, WarGame, DevSwarm, ChronosOracle, HyperMatrix — UI-demos med overclaims (10M twin agents, 120Hz SDE, FHE 4096 ops/s, ZK-STARK NIST-PQC-L5).

**Døde sidebar-links** (klik → `Overview` fallback, fordi `PAGE_COMPONENTS[id]` mangler):

| Sidebar-id | Status |
|---|---|
| `return-replace` | Død. Ingen page. |
| `auctions` | Død. Vickrey/Dutch ligger i `B2BMarketplace`, ikke egen route. |
| `emissions-overview` | Død. Rigtig page er `carbon-accounting`. |
| `scope-123` | Død. Rigtig page er `emissions-scope`. |

Wired men **ikke** i sidebar: `carbon-accounting`, `compliance-dashboard`, `reports`. Command bar har sektioner; sidebar er et Cirkel-levn.

`ARCHITECTURE-REVERSE-LOGISTICS.md` beskriver Kafka/RabbitMQ, Redis bid engine, SAP/Oracle webhooks, Vickrey/Dutch auctions som **system**. Det er et design-memo, ikke kode. Behandl det som fiction indtil kernen eksisterer.

---

## 2. Coverage-matrix

Legend:

- **V1** = In EARTH backbone v1 (må implementeres i TypeScript i EARTH, ærligt scope)
- **Later** = efter spine virker
- **Cirkel-only** = kamera/CV/MitID/CP-tokens — ikke EARTH
- **Research** = inspiration, ikke eksisterende produkt
- **Fiction** = overclaim / forkert ejerskab / “allerede korrekt”
- **Missing** = transkriptet klippede eller navngav uden kode

### 2.1 De 12 CE-papers / research-spor

Transkriptets præcise 12-titel-liste lå ikke i repoet. Nedenfor er de spor, der matcher de navngivne moduler, **spot-checket**. Manglende arXiv-ID i chatten = antag hallucination indtil du kan pege på PDF’en.

| # | Claim / paper | Status i virkeligheden | EARTH-cut |
|---|---|---|---|
| 1 | **COMPASS** arXiv:**2603.11277** (Dessureault et al., 2026) | **REAL.** Orchestrator + 4 sub-agents (Sovereignty, Carbon, Compliance, Ethics), RAG, LLM-as-judge. Paperets egne begrænsninger: **ingen human-in-the-loop**, underudviklet action-selection. | **V1** som *idé*: evaluate-before-execute i TS, **deterministiske regler først**. LLM-as-judge = Later. Python-port = ude. |
| 2 | **How Hungry is AI?** arXiv:**2505.09598** (Jegham et al., 2025) | **REAL.** PUE × CIF × WUE på inference. | **V1** EcoAgent-formel (se §4). Ikke “vi har allerede målt 30 modeller”. |
| 3 | **Accounting for AI Inference…** arXiv:**2606.10660** | **REAL 2026-ID.** Scope 3 Cat.1 (Purchased goods & services) for købt inference. | **V1** interface: EARTH’s egen inference-post som Cat.1. Absolutte tons er små; audit-pligten er det, der tæller. |
| 4 | **Digital Rock Physics / “mineralmodul”** arXiv:**2606.05798** | **REAL paper, FORKERT mapping.** Geoscience/µCT/pore-scale for malm og tailings. “Digital Ore Passport” er policy-agenda, ikke et EARTH-modul. | **Research.** Ikke “jeres mineral-engine”. |
| 5 | **ROBOCYCLE** arXiv:**2607.03616** | **REAL.** Dual-arm robot, Tokyo PET-sortering, RGB-D + RF-DETR. Lab-hardware. | **Research / Cirkel-adjacent.** Ikke EARTH v1–v2. |
| 6 | **Kaplan/Ramanna e-liability** (HBR 2021; E-ledgers working paper) | **REAL metode.** Ikke en standard, ikke en database. WRI: E-ledgers ≠ GHG Protocol. | **V1** som *graf-model* (én tal-rygrad). Neo4j = Later/ude. |
| 7 | **Battery DPP** Reg. (EU) **2023/1542** Art. 77 | **REAL lov.** Obligatorisk **18. februar 2027** for EV / LMT / industrielle batterier >2 kWh. GS1 Digital Link QR, ikke PDF. | **V1-passport-shape:** ét Battery-DPP-objekt + W3C DID-interface. Fuld Annex XIII = Later. |
| 8 | **ESPR / DPP-registry** (EU) **2024/1781** | **REAL.** Registry operational ~juli 2026; product-group delegated acts kommer løbende. | **Later** som adapter til EU-registry. V1 = eget DID + hash-chain. |
| 9 | **Chem-X Digital Material ID** (industrirapport, ikke arXiv) | **REAL retning** (opaque ID, GS1-principper, DMP/DPP-link). Ikke et shipped produkt. | **V1** som `MaterialId` type (opaque string + DID). Universal Material ID som globalt netværk = **Research**. |
| 10 | **CSRD Omnibus I** Directive (EU) **2026/470** (i kraft 18. mar 2026) | **REAL.** Scope skåret ~80%: >1000 ansatte **og** >€450m omsætning. Listed SMEs ude. | **V1 compliance:** smal evidens-rygrad, ikke 12-frameworks wizard. Sweep’s CSRD-mølle er konkurrent, ikke blueprint. |
| 11 | **PPWR** (EU) **2025/40** — apply **12. aug 2026** | **REAL.** PFAS/tungmetaller, DoC, EPR, recyclability Art. 6. | **V1 regulation-focus** sammen med DK CO₂-afgift — ikke GRI+EUDR+CBAM+LkSG som produkt. |
| 12 | **VCG** | **Tvetydigt i chats.** (a) Vickrey–Clarke–Groves auktionsteori; (b) EU CORDIS “Value Chain Generator” 101188906 (anden ting). EARTH UI har **Vickrey** (second-price) mock i `B2BMarketplace`. | **Later.** V1 har ingen rigtig auction engine. Forveksle ikke Vickrey-UI med VCG-mekanisme. |

Øvrige spor, transkriptet typisk blander ind:

| Spor | Status | EARTH-cut |
|---|---|---|
| Hyperspectral sorting | Research / Cirkel-adjacent (hardware) | **Cirkel-only / Later** |
| Federated learning på waste-CV | Research; kræver data-partnere | **Later**, aldrig v1 |
| EUR-Lex live RAG | COMPASS-paper-mønster; hallucination-risk uden curation | **Later.** V1 = bundled regulation snapshots + datoer |
| SKAT API / CO₂-afgift live | DK CO₂-afgift er **REAL** (indfasning 2025→2030). Live SKAT-integration er ikke i EARTH. | **Later** adapter. V1 = sats-tabel + e-liability hook |
| ZK-STARK “allerede korrekt” | **Fiction.** StarkWare-class proofs kører ikke i en Vite SPA. Aegis: `fakeHash = Math.random` hex, UI-tekst “NIST-PQC-L5”, “99.998% verification”. | **V1:** SHA-256 (Web Crypto) commitment + prove/verify API. STARK verifier wasm = Later, ærligt scoped |
| Kafka / Neo4j “live” | **Fiction** i EARTH. Arkitektur-md lyver. | In-memory bus v1; broker/graph DB = Later |
| Resourcify 800 recyclers som “jeres” | **Fiction / competitor intel.** Resourcify.com markedsfører “800+ active recyclers”. EARTH `RecyclerNetwork` har **14** mock rows. Sidebar-count “14” matcher mocken. | **Later** som *need* (netværksdækning), ikke clone af 9-state DE order machine |
| Sweep CSRD-in-weeks | **Competitor.** ESG SaaS, double materiality wizard, multi-framework mapping. Omnibus har skåret markedet. | **Ikke produktet.** Adapter: evidens-eksport til revisor, ikke SEO-mølle |
| NemID | **Deprecated 31. okt 2023.** MitID er eneste DK eID. | **Cirkel-only** (hvis overhovedet). EARTH v1: DID, ikke MitID |
| Cirkel camera/CV rebuild | Cirkel-harness (MetaHarness, S/H agents, SwarmCoordinator) = **TypeScript i andre repos/Drive** | **Cirkel-only.** EARTH må **ikke** importere det. Event-driven re-opt som *idé* = Later, rewrite |

### 2.2 Fem fokusområder (CE → produkt)

| Fokus | Transkript-ambition | Backbone-cut |
|---|---|---|
| 1. Identitet / DPP / Universal Material ID | Globalt materiale-ID + pas | **V1:** `MaterialId` + Battery-DPP shape + DID interface. Universelt netværk = Later |
| 2. Reverse logistics / take-back | OEM loop + B2B loop som i arkitektur-md | **Later** som adapter. V1: event-typer (`IntakeRecorded`, `RoutedOem`, `RoutedB2b`) uden Kafka |
| 3. Recovery-tech (CV, hyperspectral, robots) | Cirkel rebuild + ROBOCYCLE | **Cirkel-only / Research** |
| 4. Carbon / e-liability | Ét tal der driver ops + CSRD + audit | **V1 kernel** |
| 5. Markets / compliance mill | VCG + 12 frameworks | **V1:** compliance som evidens på grafen. Markets = Later. 12 frameworks = nej |

### 2.3 5-lags Cirkel→Sovereign spine

| Lag | Transkript | EARTH i dag | Backbone v1 |
|---|---|---|---|
| L1 Event bus | Kafka-klasse, delta re-opt (ikke polling) | Ingen. Orphans pusher fake logs med `Math.random` | **V1 in-memory** `EarthBus.emit/on` + typed events. Kafka = Later |
| L2 Hierarchical capability tree | PDA-agenttræ, ikke flat tools | Ingen. CommandCenter viser 6 “subsystems” som KPI-kort | **V1:** `CapabilityNode` tree (se sketch). Cirkel MetaHarness = **ikke import** |
| L3 COMPASS evaluate-before-execute | 4 agents + synthesizer, Python | WarGame/DevSwarm **skriver** “COMPASS BLOCK” / score 0.94 som teater | **V1 TS** deterministisk. Python dump = ude |
| L4 DID + hash-chain + selective disclosure | W3C DID, ZK pipeline | WarGame-tekst “W3C DID credential anchored”. Aegis fake hashes. AuditTrail påstår “SHA-256 hash verification” uden at hashe | **V1:** DID document interface + SHA-256 chain. Selective disclosure **interface** (reveal subset). ZK-STARK = Later |
| L5 E-liability graph | KG, Neo4j, ét tal | Tre uenige carbon-spines (se §4) | **V1 in-memory graph.** Neo4j = Later |

### 2.4 COMPASS 4 pillars + synthesizer + SovereigntyAgent

| Modul | Transkript | EARTH | Cut |
|---|---|---|---|
| Orchestrator | Python base class | Findes ikke | **V1 TS** |
| EcoAgent / Carbon | PUE-idé i paper; transkript-Python ufuldstændig | Carbon-pages er GHG-mock, ikke agent | **V1** (forbedret, §4) |
| ComplianceAgent | RAG + EUR-Lex | CSRD 94%-wizard-UI (Sweep-smag) | **V1** evidens-artefakter + FRIA-gate. Live RAG = Later |
| EthicsAgent | **TRUNCATED** midt i `_bias_fairness_check` | DevSwarm scenario “ethical score 0.31” er string | **V1 — færdiggør.** Transkriptet gjorde det ikke |
| SovereigntyAgent | **Navngivet i diagrams, ingen kode i dump** | CommandCenter “Guru Orchestrator” 9R/planetary boundaries = teater | **V1 — implementér.** Paper har den; chatten droppede den |
| Decision Synthesiser | **Ingen kode** | WarGame viser ét tal 0.94 | **V1** weighted min-threshold + conflict log |
| Tests | **Ingen** | **Ingen** | **V1** golden-file tests på evaluate() |
| HITL | Paper: **explicitly absent** | CommandBar er nav, ikke approve-path | **V1 forbedring** (transkriptet sagde det ikke) |

### 2.5 Resten af “light years ahead”-blueprintet

| Modul | Cut |
|---|---|
| Hierarchical PDA agent tree | **V1** som capability tree. “PDA” som Cirkel-internt navn = lad ligge; kald det `CapabilityTree` |
| Federated learning | **Later / Research** |
| VCG marketplace | **Later** (Vickrey-UI mock findes; mekanisme findes ikke) |
| Cirkel CV rebuild | **Cirkel-only** |
| Event-driven re-opt (delta, ikke polling) | **Later idea**, rewrite — **ikke** import `cirkel/sweep/` |
| CP tokens | **Cirkel-only** |
| Camera / edge | **Cirkel-only** |
| MitID / NemID | NemID = fiction. MitID = **Cirkel-only** hvis nogensinde. EARTH = DID |
| 10M Chronos twins / 120Hz HyperMatrix | **Fiction** |

---

## 3. Paper / claim hygiene

### Verificeret rigtigt

- **2603.11277 COMPASS** — eksisterer (v2 på arXiv). Fire søjler matcher transkriptet. Paperet sælger “real-time mediation”; evalueringen er BERTScore på forklaringer, **ikke** et deployed system. Table 1 i paperet markerer COMPASS som fuldt understøttet på alle akser — det er forfatternes positioning, ikke et produkt.
- **2505.09598 How Hungry is AI** — eksisterer. Formlen I *energi × PUE × CIF* (+ WUE) er den rigtige EcoAgent-kerne.
- **2606.10660** — 2026-ID er ægte (ikke alle 2026-IDs er det).
- **2606.05798 DRP** — ægte paper, **forkert produkt-claim**.
- **2607.03616 ROBOCYCLE** — ægte lab-paper.
- Battery DPP **18 Feb 2027** — ægte deadline (Art. 77, 2023/1542).
- DK CO₂-afgift 2025→2030 — ægte (Grøn skattereform / CO2AL).
- PPWR apply **12 Aug 2026** — ægte (2025/40).
- CSRD Omnibus I — ægte indsnævring.
- NemID lukket **31 Oct 2023** — ægte. Ethvert transkript der siger NemID som integration er forældet.

### Hallucination / forkert mapping — flag

| Claim | Dom |
|---|---|
| “ZK-STARK already correct / NIST-PQC-L5 / 99.998%” i Aegis | **Fiction.** `fakeHash()` = `Math.floor(Math.random()*16).toString(16)` × 64. Ingen felt, ingen verifier, ingen STARK AIR. En Vite SPA **kan** ærligt gøre: `crypto.subtle.digest('SHA-256')` commitments + verify(preimage, digest). En rigtig STARK (FRI, Merkle, algebraic IOP) er et separat rust/wasm-projekt, ikke et React-kort. |
| Digital Rock Physics = “jeres mineralmodul” | **Wrong mapping.** µCT + pore-scale physics. EARTH er ikke et synkrotron-endstation. |
| Resourcify 800 recyclers = EARTH netværk | **Competitor metric.** EARTH har 14 mock. |
| Kafka / Neo4j live | **Fiction.** |
| COMPASS Python i EARTH | **Findes ikke.** Chat-dump, truncated. |
| SovereigntyAgent implemented | **Missing.** |
| Decision Synthesiser implemented | **Missing.** Paperet siger selv action-selection er future work. |
| 12 frameworks som produkt | **Overbuild**, og Omnibus har skåret CSRD-markedet. Sweep lever af wizard’en; EARTH skal ikke. |
| VCG = Vickrey lot-UI | **Category error.** Vickrey second-price ≠ VCG combinatorial. CORDIS “Value Chain Generator” er en tredje ting. |
| Chronos 10.0M twin agents, 91.2% accuracy | **Fiction** (orphan KPI). |
| AuditTrail “SHA-256 hash verification” | **Overclaim.** Der hashes intet. Rækker er hardcoded. |
| `types.ts` som datamodel | **Død kode.** Andet page-id-skema end `App.tsx`. Emissions Q2 = 22.740 tCO₂e vs pages’ 14.847. |

### STARK vs det, en SPA kan

| | Rigtig STARK | EARTH v1 ærlig |
|---|---|---|
| Soundness | Algebraic IOP + FRI, hash-based, transparent | SHA-256 commitment: `H(payload ‖ nonce)` |
| Verify | Verifier tjekker proof, ikke data | `verify(payload, digest)` via Web Crypto |
| Post-quantum marketing | STARK er hash-based (ja, den del er sand *for STARK*) | **Sig ikke STARK.** Sig “hash-chain commitment, SHA-256, Web Crypto” |
| Selective disclosure | Trænger typisk Merkle eller mermaid-proof | Interface: `disclose(fields: Key[])` → ny digest over subset + inclusion proof **senere** |

---

## 4. Backbone-first cut (Michael’s beslutning)

Intet Sweep/Resourcify/Cirkel-feature-picking før kernen nedenfor **kører i TypeScript i EARTH**, wired til NASA-shell, `tsc --noEmit` grøn.

### Minimum EARTH kernel

1. **Event bus (in-memory first)**  
   Typed events. Ingen Kafka. Ingen polling-loop som sandhed — emit on state change. Delta re-opt er *kontrakt*, implementeres Later.

2. **Hierarchical capability tree (ikke flat tools)**  
   Noder med `can(action, ctx)`, children, deny-by-default. Cirkel’s MetaHarness/S-H/SwarmCoordinator **rewrites not imports**.

3. **COMPASS evaluate-before-execute**  
   Fire agents + synthesizer i TS. Deterministiske regler + evidens-refs først. LLM-as-judge **optional Later**. Golden tests.

4. **DID + hash-chain ledger** med selective-disclosure **interface**  
   W3C DID document shape. SHA-256 chain. Ingen STARK-sticker.

5. **E-liability graph**  
   Ét tal: ops-event → carbon-post → CSRD datapoint → audit row. Samme source. Ingen tre konkurrerende totals.

6. **Wire orphans til kernen**  
   CommandCenter = kernel HUD (ikke fake boot-log). Aegis = prove/verify visning af **rigtige** digests. WarGame = COMPASS-gate på et scriptet scenario mod kernen. DevSwarm = propose → COMPASS → HITL approve. Chronos/HyperMatrix **ikke** v1 (fiction-scope).

7. **NASA shell**  
   Fjern `Sidebar`. Top CommandBar only. Amber = warning, blue = active, green = status only. `docs` og CLAUDE.md matcher koden.

### Tiny interface sketch (ikke produktion)

```ts
// kernel/types.ts — shape only; ikke shipped kode i denne audit
type EarthEvent =
  | { type: 'intake.recorded'; payload: Intake }
  | { type: 'action.proposed'; payload: ProposedAction }
  | { type: 'compass.verdict'; payload: CompassVerdict }
  | { type: 'hitl.approved'; payload: { actionId: string; actorDid: string } };

interface CapabilityNode {
  id: string;
  children: CapabilityNode[];
  can(action: ProposedAction, ctx: EarthCtx): boolean;
}

interface CompassAgent {
  id: 'sovereignty' | 'eco' | 'compliance' | 'ethics';
  evaluate(action: ProposedAction, ctx: EarthCtx): AgentOpinion;
}

interface AgentOpinion {
  score: number;          // 0..1
  floor: number;          // hard fail under
  evidence: EvidenceRef[];
  constraints: string[];
}

interface CompassVerdict {
  allow: boolean;
  opinions: Record<CompassAgent['id'], AgentOpinion>;
  conflicts: string[];
  requiresHitl: boolean;
  digest: string;         // SHA-256 over canonical verdict
}

interface ELiabilityNode {
  id: string;
  kgCO2e: number;
  sourceEventId: string;
  method: 'measured' | 'calculated' | 'estimated';
}

interface DidDocument {
  id: `did:earth:${string}`;
  publicKey: JsonWebKey;
}

interface Ledger {
  append(event: EarthEvent): Hash;
  prove(eventId: string): { digest: string; payload: unknown };
  verify(payload: unknown, digest: string): Promise<boolean>;
  disclose(eventId: string, fields: string[]): unknown; // interface; Merkle later
}
```

### Ude af v1 (transkriptet elskede dem)

VCG, federated learning, hyperspectral, ROBOCYCLE, EUR-Lex live RAG, SKAT API, Neo4j, Kafka, Python COMPASS, Cirkel CV, MitID, CP tokens, 12-framework wizard, Resourcify 9-state DE order machine, Sweep SEO CSRD mill, STARK, FHE, 10M twins, 120Hz matrix.

---

## 5. Forbedringer der SKAL med (ikke i transkriptet)

Disse er **ikke** “nice to have”. De er det, der gør backbone ærlig og bedre end både chatten og COMPASS-paperet.

### 5.1 Ærlig ZK

Prove/verify API. `crypto.subtle.digest`. Ingen `Math.random` hashes. UI må sige “SHA-256 commitment” — aldrig “Post-Quantum ZK-STARKs” før der er en verifier. Aegis orphan i dag er et **anti-mønster**; når den wires, skal den vise kæden fra kernen.

### 5.2 EcoAgent

- Formel: energi × **PUE × CIF × WUE** (How Hungry is AI).
- Carbon-aware **model routing** (lille lokal model vs. stor remote) som *regel*, ikke som LLM-judge.
- EARTH’s **egen inference** posteres som **Scope 3 Category 1** (2606.10660). “Vi kunne ikke måle det” er ikke et revisions-svar.
- Må ikke forveksle tenant-GHG (Hornbach mock) med platformens eget AI-forbrug.

### 5.3 Compliance

- **Runtime evidence artifacts** (hver verdict → ledger event), ikke 94%-progress-bar.
- **Goodhart-resistant** kontinuerlig score: score må ikke være KPI, der kan maxes ved at udfylde wizard-felter. Gate = hard floors + evidens-dækning.
- **FRIA** (Fundamental Rights Impact Assessment) for high-risk actions — AI Act-smag, ikke CSRD-smag.
- **Omnibus-narrowed CSRD:** >1000 ansatte og >€450m. Byg ikke Sweep-wizard som produkt. Hvis tenant er ude af scope, vis det ærligt.
- DK **CO₂-afgift** + **PPWR (12 Aug 2026)** + **Battery DPP (18 Feb 2027)** som de tre regulerings-kroge. Ikke 12 frameworks.

### 5.4 Ethics (færdiggør det truncated)

Transkriptet døde i `_bias_fairness_check`. V1 skal have:

- Protected attributes **ude af** supplier-scoring payload (ingen proxy-felter “land+navn→etnicitet”).
- XAI som **bias probe** (feature ablation på score), ikke som marketing-SHAP-plot.
- Human appeal path (HITL).

### 5.5 SovereigntyAgent — faktisk implementeret

Paperet har den; dumpet har den ikke. V1-regler, deterministiske:

- Data residency (EU vs. US API).
- Model-host (EU cloud / on-prem / US hyperscaler).
- Tool egress (må agenten kalde eksternt?).
- Hard fail hvis action sender PII ud af region.

### 5.6 Battery DPP Feb 2027 som første rigtige pas

`ProductPassports.tsx` er generiske mock-pas (Bosch GSR, BASF paint, Knauf). Første rigtige schema: Annex-XIII-inspireret battery object + W3C DID + GS1 Digital Link-form (QR → URI), **ikke** `dpp.earth/dpp-00847` som pynt. Malingspas kan vente.

### 5.7 Event-driven re-opt som Later-idé

Cirkel sweep/ polling er **ikke** kilden. Når ops findes: delta på event, ikke cron der slår hele netværket op. Rewrite.

### 5.8 Ét mock-data spine

I dag er tallene inkonsistente. Det ødelægger e-liability-påstanden før koden findes.

| Kilde | Total tCO₂e | S1 | S2 | S3 |
|---|---|---|---|---|
| `CarbonAccounting.tsx` | **14.847** | 2.847 | 4.123 | 7.877 |
| `EmissionsScope.tsx` | **14.847** (anden split) | **2.140** | **4.210** | **8.497** |
| `types.ts` MOCK Q2 (ubenyttet) | **22.740** | 1.180 | 3.610 | 17.950 |
| `Overview.tsx` | “CO₂ Saved **2.847** t” | — | — | — (genbruger S1-tallet som “saved”) |
| `PickupOrders` / Overview | **847 locations** | `types.ts` Hornbach = **156** locations | | |

EmissionsScope-kommentaren påstår endda “accounting-grade: no orphaned rounding” **internt** — og divergerer så fra CarbonAccounting, som også summerer pænt **internt**. To konsistente løgne.

Pickup-IDs: Overview/PickupOrders deler PU-2847 Hamburg (godt), men `types.ts` MOCK_PICKUP_ORDERS er et tredje univers (pu-1001 Mannheim).

**V1-regel:** én `src/kernel/mockSpine.ts` (eller senere DB). Alle pages importerer den. `types.ts` MOCK_* enten dør eller bliver spinen.

### 5.9 Døde sidebar-links + orphans + DNA

- Fjern sidebar (CLAUDE.md).
- Wire CommandCenter / Aegis / WarGame / DevSwarm **eller** slet dem fra “live product”-følelsen. Orphans der ser ud som features er overclaim.
- Chronos + HyperMatrix: hold dem ude af v1 HUD, eller label **SIM**.

### 5.10 COMPASS-paperets egen begrænsning → EARTH-win

Paperet: *“current limitations include the absence of human-in-the-loop validation and underdeveloped action-selection.”*

EARTH-forbedring: **CommandBar + Slack approve-path**. Verdict `requiresHitl: true` → ikke execute. Det er ikke i transkriptet. Det er det, der slår paperets eval.

### 5.11 Ikke-kloner

- **Ikke** Resourcify 9-state DE order machine.
- **Ikke** Sweep multi-framework SEO CSRD mill.
- **Ikke** Cirkel forest-green sidebar / lime accent / 264px nav.
- Sweep.git + Drive-mapper = **intel**, ikke vendor-lock-in i koden.

---

## 6. Gap vs “light years ahead”

Vær ligefrem: transkriptet beskriver et produkt, der **ikke eksisterer**. COMPASS-paperet beskriver et **metode-framework** med BERTScore-eval. Cirkel er et **andet system**. Sweep og Resourcify er **rigtige SaaS-konkurrenter** med hhv. CSRD-wizard og waste-OS + 800+ recyclers. EARTH er et **mørkt mock-dashboard** med leftover sidebar.

Efter en *rigtig* backbone er de resterende gaps, rangeret:

| Rank | Gap | Hvorfor det stadig er langt |
|---|---|---|
| 1 | **Virkelige data** | Ingen ingestion. E-liability uden events er et spreadsheet. |
| 2 | **HITL i produktion** | Slack/CommandBar approve er design; identitet (hvem godkender) kræver auth, som ikke findes. |
| 3 | **Battery DPP ↔ EU registry** | V1 har schema+DID. Told/registry-API er Later og politisk/teknisk tung. |
| 4 | **Recycler-dækning** | 14 mock vs Resourcify 800+. Det er et forretningsnetværk, ikke et UI. |
| 5 | **Ops-loop der betaler sig** | Reverse logistics som arkitektur-md er et andet produkt. Pickup-UI uden 3PL/vægt er teater. |
| 6 | **Ægte carbon-aware routing** | Kræver model-metering og region-CIF feeds. v1 kan have tabeller; live PUE er Later. |
| 7 | **Selective disclosure der holder i retten** | Interface v1; Merkle/BBS+/SD-JWT er Later krypto. |
| 8 | **STARK / FHE / 120Hz / 10M twins** | Drop som mål. De er science-fiction-stickers på orphans. |
| 9 | **Cirkel CV / robots / hyperspectral** | Andet selskab/hardware. Hold EARTH suveræn. |
| 10 | **VCG + federated learning** | Research. Ikke differentiering før 1–5 virker. |

“Light years ahead” efter backbone: **foran COMPASS-paperet** på HITL + determinisme + ét tal; **ikke** foran Resourcify på waste-ops; **ikke** foran Sweep på CSRD-skabeloner (og skal heller ikke være det). Foran *begge* kun hvis evidens-grafen er sand og auditbar.

---

## 7. Final: is everything in?

**No.**

### Punch list — udeladt / truncated i transkriptet

- EthicsAgent ufuldstændig (`_bias_fairness_check` cut off)
- SovereigntyAgent: diagram only, no code
- Decision Synthesiser: no code
- Ingen tests
- Python COMPASS ≠ Cirkel TS harness ≠ EARTH
- ZK pipeline som STARK: overclaim
- Kafka/Neo4j som live: fiction
- NemID: dead
- Digital Rock Physics som eget modul: wrong mapping
- Resourcify 800 som “ours”: competitor
- Universal Material ID som globalt net: research
- 12 CE papers: flere er love/metoder, ikke features; 2026-IDs skal checkes én-for-én (tre checket her er ægte: 2603.11277, 2606.10660, 2606.05798)
- Hierarchical PDA tree: navn uden EARTH-kode
- Federated learning, VCG, EUR-Lex RAG, SKAT API, ROBOCYCLE, hyperspectral: out of v1 og delvist out of EARTH

### Punch list — forbedringer transkriptet **aldrig** sagde

- **Backbone-first sequencing** (allerede aftalt — skal stå i planen, ikke “build all layers”)
- **CLAUDE.md DNA:** ingen sidebar, NASA command grid, `#60A5FA` / `#060B18`, never import cirkel-system, `tsc --noEmit`
- **Sweep/Resourcify competitive reality:** intel, ikke clone; Omnibus har skåret CSRD-TAM
- **HITL** CommandBar/Slack (paperets største hul)
- **Ærlig ZK** prove/verify vs Math.random
- **PUE×CIF×WUE** + egen inference som Scope 3 Cat.1
- **FRIA** + Goodhart-resistant score + runtime evidence
- **Protected attrs ude af** scoring payload; XAI som bias probe
- **Battery DPP 18 Feb 2027** som første pas, W3C DID
- **DK CO₂-afgift + PPWR** som reguleringsfokus, ikke 12 frameworks
- **Ét mock-data spine** (14.847 vs 14.847-anden-split vs 22.740 vs 2.847 “saved”)
- **Dead sidebar links + 6 orphans + unused `types.ts`**
- **Fjern STARK/FHE/10M-twin stickers** fra v1 HUD

### Hvad “dækket for backbone-first” **ville** betyde

Kun dette er in-scope at kalde “dækket”, når det er skrevet i TS og wired:

1. In-memory event bus  
2. Capability tree  
3. COMPASS ×4 + synthesizer, deterministic, tested  
4. SovereigntyAgent faktisk der  
5. EthicsAgent færdig, uden protected attrs i payload  
6. DID + SHA-256 ledger + disclose() interface  
7. E-liability graph = one number  
8. HITL approve  
9. NASA shell, no sidebar  
10. CommandCenter + Aegis + WarGame + DevSwarm læser kernen  
11. Battery DPP schema som første pas  
12. Én mock spine  

Alt andet i chatten er Later, Cirkel-only, research, fiction, eller truncated.

---

## Appendix A — Repo facts (quick)

- Port 5180, Vite `--host` (0.0.0.0) — OK for Render-bind.
- Filesystem ephemeral: ingen lokal DB-plan i koden alligevel (godt). Kernel v1 in-memory matcher det; persistens = Later hosted store, ikke `localStorage` som sandhed.
- `package.json` name: `earth-sovereign`. Ingen Recharts. `motion/react` used (ikke `framer-motion` i src).
- Tenant i CommandBar: “Hornbach Germany” / HB — tysk DIY-mock, ikke DK-first. OK som demo; reguleringsfokus i kernen bør stadig være DK CO₂ + EU PPWR/DPP.

## Appendix B — Anbefalet rækkefølge (ingen kalendertid)

1. Kill sidebar. Single mock spine. Dead links. Label orphans SIM or wire.  
2. `kernel/` bus + ledger(SHA-256) + e-liability graph.  
3. Capability tree + COMPASS 4+synth + HITL stub.  
4. Point CommandCenter/Aegis/WarGame/DevSwarm at kernel.  
5. Battery DPP schema on the graph.  
6. **Stop.** Brug produktet. Pick adapters (waste-ops need, DPP registry, CIF feed) fra intel — rewrite.

Intet fra transkriptets Python, cirkel-system, Sweep UI eller Resourcify state-machine krydser den streg.
