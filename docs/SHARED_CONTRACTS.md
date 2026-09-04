# Shared contracts (foundation freeze)

This file is a **contract**, not an implementation. It exists so later MATERIAL_OPPORTUNITY_INTAKE v0.1 does not invent parallel enums.

**Freeze:** Database, authentication, PRIME runtime, NanoChat, Meta Harness, RL, external APIs, blockchain, and Digital Product Passports **do not begin until this foundation integration is green** (all three specialist branches inspected, merged into `integration/earth-foundation-v0`, post-merge gate passed). See `docs/SWARM_EXECUTION.md`.

Published `main` is a Vite SPA only. These types are **not** live in the published tree.

---

## Honesty labels (required everywhere)

Canonical strings. Do not substitute marketing synonyms.

| Label | When to use |
|-------|-------------|
| `NOT_CONFIGURED` | Capability slot exists; adapter/provider/key is absent |
| `NOT_CONNECTED` | External system is not connected |
| `DEMO` | SPA fixture / mock; not a customer tenant |
| `ESTIMATED` | Computed or projected; not measured |
| `INPUT_UNVERIFIED` | Operator/user supplied; not attested evidence |

Frontend Truth applies these in `src/**`. Any later API envelope that returns a baseline or connector list must use the same strings.

---

## MATERIAL_OPPORTUNITY_INTAKE v0.1 — reserved types

**Status:** reserved for a later wave. **Not implemented on this integration branch.** Specialists in the foundation wave must not persist these, expose HTTP for them, or call NanoChat.

Workflow identity (when implementation is later authorised):

- `workflowType`: `MATERIAL_OPPORTUNITY_INTAKE`
- `workflowVersion`: `0.1`
- `policyVersion`: `prime-v0.1`
- Envelope `mode`: `DEVELOPMENT_ONLY` (never imply production)

### Roles

```ts
type UserRole = 'OWNER' | 'ESG_LEAD' | 'OPERATIONS' | 'REVIEWER' | 'VIEWER';
```

Development header identity is **not** authentication. OIDC (or equivalent) is out of scope until the freeze lifts **and** Michael accepts.

### Session state

```ts
type SessionState =
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING_FOR_DEPENDENCY'
  | 'WAITING_FOR_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'BUDGET_STOPPED'
  | 'EXPIRED';
```

Terminal: `COMPLETED`, `FAILED`, `CANCELLED`, `BUDGET_STOPPED`, `EXPIRED`.

### Task type (v0.1 plan, max five tasks)

```ts
type TaskType =
  | 'VALIDATE_BATCH'
  | 'CHECK_EVIDENCE'
  | 'CALCULATE_BASELINE'
  | 'FIND_CANDIDATE_ROUTES'
  | 'NANOCHAT_EXTRACT';
```

`NANOCHAT_EXTRACT` is created only if extraction was requested **and** data is not `RESTRICTED`. When the freeze lifts, its v0.1 state is still `NOT_CONFIGURED` until a local adapter exists. **No LLM call in v0.1.**

### Task state

```ts
type TaskState =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'ABSTAINED'
  | 'FAILED'
  | 'BLOCKED'
  | 'NOT_CONFIGURED'
  | 'CANCELLED';
```

### Data classification

```ts
type DataClassification = 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
```

### Actor

```ts
type ActorType = 'USER' | 'SYSTEM' | 'WORKER';
```

### Reason codes

```ts
type ReasonCode =
  | 'INVALID_QUANTITY'
  | 'MATERIAL_CLASS_REQUIRED'
  | 'EVIDENCE_MISSING'
  | 'NANOCHAT_RESTRICTED_DATA_BLOCK'
  | 'NANOCHAT_NOT_CONFIGURED'
  | 'BUDGET_EXCEEDED'
  | 'INVALID_STATE_TRANSITION'
  | 'TASK_RETRY_EXHAUSTED'
  | 'RECYCLER_NETWORK_NOT_CONNECTED';
```

### Next recommended action

```ts
type NextRecommendedAction = 'UPLOAD_EVIDENCE' | 'RUN_NEXT' | 'NONE';
```

### v0.1 start payload (shape only)

```ts
interface MaterialBatchInput {
  externalReference?: string | null;
  materialClass: string;
  quantityKg: number;
  facilityName?: string | null;
  availableFrom?: string | null;
}

interface BaselineInput {
  disposalCostDkk: number; // returned labelled INPUT_UNVERIFIED
  co2eKg: number;          // returned labelled INPUT_UNVERIFIED
}

interface EvidenceInput {
  documentIds: string[];
  extractionRequested: boolean;
}

interface StartOpportunityInput {
  idempotencyKey: string;
  materialBatch: MaterialBatchInput;
  baseline: BaselineInput;
  evidence: EvidenceInput;
  dataClassification: DataClassification;
}
```

### v0.1 stub semantics (when later implemented)

| Task | Honest result |
|------|----------------|
| `VALIDATE_BATCH` | Fail on missing material class or `quantityKg <= 0` |
| `CHECK_EVIDENCE` | `PARTIAL` + `EVIDENCE_MISSING` if `documentIds` is empty. Does **not** read document bytes |
| `CALCULATE_BASELINE` | Echo submitted numbers with label `INPUT_UNVERIFIED` |
| `FIND_CANDIDATE_ROUTES` | Empty candidates, `PARTIAL`, `RECYCLER_NETWORK_NOT_CONNECTED` |
| `NANOCHAT_EXTRACT` | `NOT_CONFIGURED` / `NANOCHAT_NOT_CONFIGURED`. **No LLM** |

These stubs are still **not** to be built in the foundation wave. API Foundation may scaffold HTTP/process layout only within `apps/api/**` as documented in `docs/API_FOUNDATION.md`, without claiming intake is live.

---

## SPA demo data (Frontend Truth)

Canonical demo fixtures live in `src/` and must be labelled `DEMO`. They are not tenants, not measured emissions, and not connected recyclers.

Do not treat SPA mock fields as the intake contract. If a UI later displays an intake session, it must use the unions above and the honesty labels, not invented status strings.

---

## Explicitly out of contract until freeze lifts

Do not add types or adapters in this wave for:

- Real database-backed control plane beyond API Foundation’s explicit scaffold
- Auth / OIDC / sessions-as-login
- PRIME runtime as an autonomous loop
- NanoChat, Meta Harness, RAG, LLM providers
- Reinforcement learning
- External APIs (recycler, ERP, Slack, Teams, SKAT, SAP, email)
- Blockchain, ZK, Digital Product Passports
- CSRD / EU AI Act / SBTi / ISO / KPMG as live programs

**EARTH is a development prototype. No external ESG, regulatory, recycler, ERP, tax, blockchain, or AI-provider integration is active.**
