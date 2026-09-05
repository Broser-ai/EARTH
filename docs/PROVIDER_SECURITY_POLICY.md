# Provider security policy (EARTH)

**Applies to:** Integration Control Plane v0.1 and every future server-side
provider adapter (Roboflow, Hugging Face, Tinker, Inkling, HeyGen, LangGraph).  
**Not a certification. Not production OIDC. Not Postgres RLS.**

> Integration Control Plane v0.1 manages tenant-scoped, auditable provider
> operation intents and hard policy checks. It does not perform live provider
> calls, model inference, fine-tuning, video generation, LangGraph execution,
> LLM/RAG, reinforcement learning, external queue execution, blockchain/ZK,
> or regulatory decision-making.

## Hard rules

1. Every provider is **`NOT_CONFIGURED` by default**.
2. A provider API key or configuration **does not** mean the provider is
   `CONNECTED` or `AVAILABLE`.
3. No provider call occurs in v0.1. `executeOperation()` throws
   `INTEGRATION_OPERATION_NOT_IMPLEMENTED`.
4. No browser-side provider keys. No `VITE_*` provider secrets.
5. No keys, raw prompts, raw documents, raw image data, JWTs, auth headers,
   provider headers, or full provider responses in logs or audit events.
6. Every operation is scoped to server-derived `TenantContext` and RBAC.
7. **`RESTRICTED` data is always blocked** from external-provider operations.
8. **`CONFIDENTIAL` data is blocked** unless an explicit tenant integration
   policy allows that provider, classification, and purpose.
9. Provider output may **never** directly:
   - create `VERIFIED` claims
   - decide approval
   - resume a PRIME session
   - mutate claim or evidence data
   - call an external authority
   - sign, pay, book, send, publish
   - execute a marketplace action
10. Every blocked, created, or cancelled operation writes an audit event.
11. Never claim a provider is live, connected, trained, or production-ready.

## Classification

| Class | External-provider operation |
|-------|-----------------------------|
| `PUBLIC` | Allowed only if the tenant policy allow-lists it. |
| `INTERNAL` | Allowed only if the tenant policy allow-lists it. |
| `CONFIDENTIAL` | Allowed only if the tenant policy allow-lists that provider, class, and purpose. |
| `RESTRICTED` | **Always blocked**, even if the policy allow-lists it. |

## RBAC

- Request: `OWNER`, `ESG_LEAD`, `OPERATIONS`
- Cancel: `OWNER`, `ESG_LEAD`
- Read: all provisioned roles including `REVIEWER` and `VIEWER`
- `REVIEWER` / `VIEWER` are read-only for operations

## Secrets

| Location | Rule |
|----------|------|
| SPA / Vite | Forbidden. `VITE_ROBOFLOW_API_KEY` (and siblings) must never hold real secrets. |
| `apps/api` process env | Server-side only. v0.1 may probe **presence**, never execute, never echo. |
| REST responses | No env names with values, no keys, no tokens. |
| Audit `metadata_json` | Scalars only; secret-like keys stripped. Digests, not payloads. |
| Browser sovereign kernel | Prototype-only. **Not** the server architecture. Do not copy it. |

## Adapter workers

Adapters must:

1. Resolve `TenantContext` — never take org/role from the body.
2. Call `validateRequest` then `createOperation` on the control plane.
3. Refuse to run when status is `NOT_CONFIGURED` or decision is `BLOCKED`.
4. Keep human approval required unless a later accepted increment says otherwise.
5. Treat provider output as untrusted. It cannot write evidence/claims or
   drive approvals, PRIME, payments, or authority calls.
6. Hash request/response bodies for audit; store job ids, not payloads.

## Reason codes

`INTEGRATION_PROVIDER_UNKNOWN`, `INTEGRATION_NOT_CONFIGURED`,
`INTEGRATION_POLICY_MISSING`, `INTEGRATION_POLICY_DISABLED`,
`INTEGRATION_RESTRICTED_DATA_BLOCKED`, `INTEGRATION_DATA_CLASSIFICATION_BLOCKED`,
`INTEGRATION_PURPOSE_BLOCKED`, `INTEGRATION_ROLE_REQUIRED`,
`INTEGRATION_IDEMPOTENCY_REQUIRED`, `INTEGRATION_OPERATION_NOT_IMPLEMENTED`,
`INTEGRATION_OPERATION_NOT_FOUND`, `INTEGRATION_CANCELLATION_FORBIDDEN`,
plus `INTEGRATION_REQUEST_QUOTA_EXCEEDED`, `INTEGRATION_FORBIDDEN_SIDE_EFFECT`,
`INTEGRATION_PROVIDER_MISMATCH`.
