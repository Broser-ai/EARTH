# Provider security policy (v0.1)

**Status:** binding for every EARTH server-side integration adapter.  
**Not** a penetration test, certification, or EU AI Act FRIA.

This policy applies to Roboflow, Hugging Face, Tinker, Inkling, HeyGen, LangGraph, and any later provider mounted on the Integration Control Plane.

---

## Non-negotiable rules

1. Providers run **behind the Fastify API only**. Browser adapters in `src/sovereign/` are prototypes and are not this control plane.
2. No provider key may exist in:
   - `VITE_*` environment variables
   - frontend source
   - `localStorage` / `sessionStorage`
   - committed `.env` files
   - test fixtures (runtime `process.env` in a test is allowed; the value must never be asserted in snapshots or committed)
   - logs
   - `audit_events.metadata_json`
3. Every provider is **disabled by default**. Missing config returns `NOT_CONFIGURED` and a safe reason code.
4. A configured credential is **not** CONNECTED. CONNECTED/AVAILABLE requires all of:
   - explicit server-side enable flag
   - successful provider-specific health/capability check
   - tenant policy `enabled=true` with purpose + classification allow-lists
   - an audit event
   - v0.1 does not grant CONNECTED even when those flags are set, because no adapter health check succeeds yet
5. No external provider call may originate from a browser, an LLM, LangGraph, a client-supplied webhook, or a raw unvalidated body.
6. Every operation needs TenantContext, RBAC, data classification, correlation id, purpose, budget, timeout, idempotency key, provider allow-list, and audit events.
7. `RESTRICTED` data never leaves EARTH through any provider.
8. `CONFIDENTIAL` data needs an explicit tenant outbound-data policy (`allowed_data_classifications` includes `CONFIDENTIAL`).
9. Provider results are `DRAFT` / `INPUT_UNVERIFIED` unless a later increment adds deterministic validation **and** applicable human review.
10. Provider output must never directly:
    - create VERIFIED claims
    - approve claims
    - alter evidence/claim values
    - resume an approval-gated PRIME session
    - call a tax / regulator / ERP / recycler API
    - send communications externally
    - execute contracts, payments, bookings, or marketplace actions

---

## Payload bans

Request `payload` is metadata only. These keys are rejected (`UNSAFE_PAYLOAD_FIELD`):

`apiKey`, `token`, `authorization`, `password`, `secret`, `prompt`, `rawImage`, `document`, `pii`, `webhookUrl`, `callbackUrl`, and close variants.

Maximum payload JSON size in v0.1: **16 384** bytes. No image bytes, no training corpora, no unrestricted user prompts.

Browser-supplied `apiKey` / `token` on the operation body returns 400 and is not persisted.

---

## Audit

Event types:

`INTEGRATION_REQUESTED` · `INTEGRATION_BLOCKED` · `INTEGRATION_NOT_CONFIGURED` · `INTEGRATION_QUEUED` · `INTEGRATION_STARTED` · `INTEGRATION_SUCCEEDED` · `INTEGRATION_FAILED` · `INTEGRATION_CANCELLED` · `INTEGRATION_HEALTH_CHECKED`

Allowed metadata: provider key, operation id, operation type, purpose, classification, reason code, booleans (`configured`, `enabled`), correlation-safe flags.

Forbidden in metadata: raw prompts, images, documents, tokens, secrets, provider headers, full provider responses, request payloads.

---

## Honesty

Do not claim live AI, connected provider, autonomous agent, trained RL, production vision, fine-tune complete, Hugging Face model active, HeyGen video generated, LangGraph production orchestration, CSRD compliant, ZK, or blockchain unless the actual configured server-side operation is tested and auditable.

House line: *EARTH is currently a development prototype. No external ESG, regulatory, recycler, ERP, tax, blockchain, or AI-provider integration is active.*
