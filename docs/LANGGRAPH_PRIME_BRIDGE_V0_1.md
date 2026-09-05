# LangGraph PRIME visualization bridge v0.1

**Status:** optional, **read-only** workflow visualization for PRIME.  
**Not** a production LangGraph runtime, hosted agent graph, or LLM orchestrator.  
**Owner:** Michael. Default remains `NOT_CONFIGURED`. This adapter never grants a live connection.

Related: [INTEGRATION_CONTROL_PLANE_V0_1.md](./INTEGRATION_CONTROL_PLANE_V0_1.md), [PROVIDER_SECURITY_POLICY.md](./PROVIDER_SECURITY_POLICY.md).

---

## What this is

A server-side `ProviderAdapter` for `LANGGRAPH` that can turn an injected **read-only PRIME projection** into a deterministic `{ nodes, edges }` JSON graph.

| Piece | What it is | What it is not |
|-------|------------|----------------|
| Operation `PRIME_WORKFLOW_PROJECTION` | Metadata request with `{ sessionId }` UUID only | Not `run-next`. Not session control |
| `PrimeProjectionReader` | Injected read function used in tests | Not a default Postgres client. Not `PrimeService` |
| Visualization JSON | DRAFT / INPUT_UNVERIFIED nodes and edges | Not a verified claim. Not an LLM transcript |
| Transition pointer | `{ action: 'REQUIRES_PRIME_API', path: '/v1/sessions/:id/run-next' }` | Not an executed state change |

The PRIME Postgres state machine remains the source of truth. This bridge does not own session state.

---

## Default posture

`createAdapter()` (what the registry loads) has:

- no projection reader
- no transport (`null` — no network)
- enable flag off

`getStatus` / `checkHealth` therefore return `NOT_CONFIGURED` with `connected: false`.

`EARTH_INTEGRATION_LANGGRAPH_ENABLED=true` without an injected projection reader is still `NOT_CONFIGURED`. The enable flag is not a live graph.

HTTP views continue to set `"connected": false`. The adapter status enum has no live-connection variant.

---

## How a visualization is produced (tests only in v0.1)

All three must hold before `executeOperation` will project:

1. Server enable flag `EARTH_INTEGRATION_LANGGRAPH_ENABLED`
2. An injected `PrimeProjectionReader` (default reader returns nothing and does not talk to Postgres)
3. A successful **mock** health/capability check through an injected transport (`llm` must not be true)

Then the adapter:

1. Reads `{ sessionId }` from the operation reference
2. Asks the injected reader for a projection (session + tasks)
3. Builds a deterministic graph from PRIME task types and session state
4. Returns `SUCCEEDED` with a DRAFT / INPUT_UNVERIFIED summary
5. Always includes `transitionRequest: { action: 'REQUIRES_PRIME_API', path: '/v1/sessions/<id>/run-next' }`

It never calls `/v1/sessions/:id/run-next`. It never resumes `WAITING_FOR_APPROVAL`.

---

## Payload

Allow-listed body:

```json
{ "sessionId": "<uuid>" }
```

Rejected: extra keys (`transition`, free-form messages), unsafe fields (`prompt`, tokens, documents), non-UUID values.

---

## What this increment does **not** do

- Migrate the browser LangGraph FSM (`src/sovereign`, `@langchain/langgraph/web`) into the API
- Run LLM nodes or free-form agent messages
- Query or mutate Postgres from adapter code (no session writes; the default reader does not read the database)
- Import `PrimeService` for writes
- Persist to `localStorage` / `sessionStorage`
- Create VERIFIED claims, approve claims, or bypass tenant / RBAC / human-approval gates
- Call tax, ERP, recycler, comms, contract, or payment systems
- Claim a connected or production LangGraph

House line: *EARTH is currently a development prototype. No external ESG, regulatory, recycler, ERP, tax, blockchain, or AI-provider integration is active.*
