# EARTH domain model

**Status:** target model. **Not implemented** as durable entities.  
`main` has unused TypeScript mocks in `src/types.ts`. PR #1 has an in-memory `ELiabilityGraph` + `HashChainLedger` that are **not** this model.

No legal interpretation of CSRD/ESRS is implied by field names.

---

## 1. Bounded contexts

| Context | Owns | Does not own |
|---------|------|----------------|
| Identity | Tenants, users, roles, grants, DID optional | Cirkel wallets |
| Operations | Sites, materials, batches, intake tickets | Camera hardware |
| Eco | Factors, emissions posts, e-liability edges | Assured CSRD filing |
| Governance | Actions, COMPASS verdicts, HITL | LLM weights |
| Evidence | 7-tuple + blob metadata | Long-term legal hold policy (Michael) |

---

## 2. Tenant

```
Tenant
  id            uuid
  slug          unique
  name
  status        trial | active | suspended
  jurisdiction_allow_list[]    e.g. EU, DE, DK
  policy_pack_id
  created_at
```

- **Isolation key** for every other table.
- Billing plan (`starter|growth|enterprise` in `src/types.ts`) is commercial, not a security boundary.
- Fixture: a single demo tenant may load the Hornbach **14,847 tCO₂e** seed. Production tenants start at zero.

Related UI today: `BillingSettings.tsx`, unused `MOCK_TENANTS` — neither is this entity.

---

## 3. Actor and approval

```
User
  id, tenant_id, idp_subject, email, display_name, status

Role
  id, tenant_id, name          # not the paint matrix in UsersRoles.tsx

Grant
  user_id, role_id, capability_id, site_id?

HitlApproval
  id, tenant_id, action_id
  actor_id                     # real user, never a bus string
  decision                     allow | deny
  reason
  signed_at
  signature                    # later; required before money/SKAT
```

Capability IDs may reuse PR #1 names (`carbon.post`, `ledger.append`, …) but **grants** replace `CapabilityTree.can()`.

---

## 4. Material and batch

```
Material
  id, tenant_id
  material_id                  # opaque Chem-X / internal code
  name
  hs_code?                     # optional
  hazardous_class?
  default_factor_id?

Batch
  id, tenant_id
  material_id
  site_id
  mass_kg
  mass_uom                     # kg
  received_at
  source_event_id              # intake ticket
  dpp_id?                      # Battery DPP later
  method_of_mass               measured | declared | estimated
```

Intake tickets (`PickupOrder` mocks, `WeightScanning.tsx` weighings) become `source_event` rows. Decorative DPP QR in `ProductPassports.tsx` is **not** a `dpp_id`.

---

## 5. Emission factor (versioned)

```
FactorVersion
  id, tenant_id | global
  factor_key                   # e.g. DE-grid-location-2026
  version                      integer or semver
  value
  unit                         # kgCO2e / kWh | / L | / kg
  gwp_set                      # AR5/AR6 — explicit
  source                       # publisher + URL/hash
  valid_from, valid_to
  superseded_by?
```

**Not found today.** Emissions page stores factors as display strings (`'0.202 kgCO2/kWh'`). Without this table, posts are not auditable.

---

## 6. Emissions post (e-liability node)

```
EmissionsPost
  id, tenant_id
  batch_id?
  scope                        1 | 2 | 3
  category?                    # GHG Protocol Scope 3 category
  kg_co2e                      # canonical; tonnes are a view
  method                       measured | calculated | estimated
  factor_version_id            # required for calculated
  period_id
  csrd_code?                   # e.g. E1-6 — a tag, not a filing
  label
  posted_by_action_id
```

PR #1 `ELiabilityNode` is a subset (`kgCO2e`, `sourceEventId`, `method`, `scope`, `label`, `csrdCode`) **without** tenant, factor version, period, or actor.

**Single spine rule:** Carbon / Scope / CSRD E1-6 / Audit are **projections** of this table. Conflicting constants (2847/4123/7877 vs 2140/4210/8497 vs unused 22740) are forbidden in production.

Offsets are **separate** documents that must not mutate `kg_co2e` in place.

---

## 7. Evidence 7-tuple

Every `EmissionsPost` (and any high-impact `Action`) **must** reference a 7-tuple. Mostly **absent** in current code.

| # | Field | Meaning |
|---|--------|---------|
| 1 | `subject_id` | What was measured (batch, meter, invoice, inference job) |
| 2 | `quantity` | Numeric activity amount |
| 3 | `unit` | UCUM / explicit string (`kWh`, `L`, `kg`) |
| 4 | `factor_version_id` | Or `null` only if `method = measured` and quantity **is** kgCO2e |
| 5 | `method` | `measured` \| `calculated` \| `estimated` |
| 6 | `source_event_id` | Immutable intake/provenance id |
| 7 | `evidence_digest` | SHA-256 (or stronger) of the supporting artefact bytes |

Optional but recommended: `actor_id`, `recorded_at`, `quality` (high/medium/low), `blob_uri`.

`HashChainLedger.disclose` subset-reveal is a **presentation** of payload keys, not this tuple (`inclusionProof: null` today).

---

## 8. Action, verdict, execution

```
Action
  id, tenant_id
  capability
  risk                         low | medium | high | critical
  payload_json
  payload_digest
  proposed_by
  status                       proposed | blocked | awaiting_hitl | executed | refused

CompassVerdict
  action_id
  policy_pack_version
  allow
  requires_hitl
  scores                       { sovereignty, eco, compliance, ethics }
  floors
  conflicts[]
  digest

Execution
  action_id
  specialist_id
  output_digest
  executed_at
```

Mirrors PR #1 `ProposedAction` / `CompassVerdict` / `AgentResult` with persistence and tenancy.

---

## 9. Period and report pack

```
ReportingPeriod
  id, tenant_id, label, starts_on, ends_on

ReportPack
  id, period_id
  kind                         internal | auditor_export
  spine_total_kg
  generator_version
  labelled_as                  # MUST NOT be "CSRD filed" unless a real filing exists
```

SKAT worksheet (Phase 6) is a **draft document** pointing at posts, not an e-file until a human submits **outside** any cron.

---

## 10. Relationships (logical)

```
Tenant 1──* User
Tenant 1──* Material 1──* Batch
Tenant 1──* FactorVersion
Batch 0..1──* EmissionsPost
EmissionsPost 1──1 EvidenceTuple
Action 1──0..1 CompassVerdict
Action 1──0..* HitlApproval
Action 1──0..1 Execution
Execution 0..1──* EmissionsPost
```

---

## 11. Forbidden aliases

| Do not store as | Why |
|-----------------|-----|
| Three independent scope totals | Issue #2 in the technical audit |
| “Verified: true” boolean on a mock row | `CarbonAccounting.tsx` `EMISSIONS[].verified` |
| ZK-STARK proof id | `AegisProtocol.tsx` on `main` |
| `trained: true` meaning hosted RL | PR #3 session-rl |
