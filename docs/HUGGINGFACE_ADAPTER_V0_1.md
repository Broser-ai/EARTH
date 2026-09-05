# Hugging Face adapter v0.1

**Status:** implemented as a **bounded, allow-listed catalog and draft inference job-request adapter**.  
**Owner:** Michael.  
**Not** a live Hugging Face client. **Not** CONNECTED. **Not** a Space launcher, model downloader, or remote code runner.

This adapter sits behind the Integration Control Plane (`HUGGINGFACE`). Default `createAdapter()` installs **no transport** and an **empty model-id allow-list**. Missing config is `NOT_CONFIGURED`. A process environment token is not a live Hub session.

Related: [INTEGRATION_CONTROL_PLANE_V0_1.md](./INTEGRATION_CONTROL_PLANE_V0_1.md), [PROVIDER_SECURITY_POLICY.md](./PROVIDER_SECURITY_POLICY.md).

---

## What exists

| Piece | What it is | What it is not |
|-------|------------|----------------|
| `createAdapter({ transport?, allowListedModelIds? })` | Server-side `ProviderAdapter` | Not a browser SDK. Not `@huggingface/inference`. |
| Model-id allow-list | Exact ids supplied by the server at construction | Not a tenant-writable catalog. Default empty. |
| Catalog lookup | `MODEL_CATALOG_LOOKUP` with `{ modelId }` | Not a verified model card. Metadata is unverified external data. |
| Inference request | `APPROVED_INFERENCE_REQUEST` with `{ modelId, inputDigestSha256 }` | Not inference. Digest only — no prompt, document, or raw text. |
| Injected transport | Test/mock HTTP boundary | Default `null` → no network. v0.1 never ships a real `fetch`. |

HTTP views still force `"connected": false`. Adapter statuses are `NOT_CONFIGURED`, `DISABLED`, `AVAILABLE`, `DEGRADED`, `ERROR`. There is **no** `CONNECTED` status.

---

## Operations

| Operation | Payload | Result honesty |
|-----------|---------|----------------|
| `MODEL_CATALOG_LOOKUP` | `{ modelId }` — must be on the server allow-list | DRAFT / INPUT_UNVERIFIED external metadata. Digest stored, raw Hub JSON is not. |
| `APPROVED_INFERENCE_REQUEST` | `{ modelId, inputDigestSha256 }` — 64 hex chars | DRAFT job **request**. No model output. Digest is not sent as model input. |

Unsupported (rejected as `OPERATION_NOT_SUPPORTED`): Spaces launch, model download, remote tool use, unrestricted code execution, any other operation type.

---

## Allow-list and SSRF

- Default allow-list is **empty**. A well-formed id such as `google/flan-t5-small` is still rejected until the server passes it in `allowListedModelIds`.
- Tenants cannot widen the list through the request payload.
- Safe id shape: `name` or `namespace/name` using `[A-Za-z0-9._-]`. No extra path segments.
- Payload strings that look like URLs, `file:` URIs, `../` traversal, percent-encoded traversal, `huggingface.co` / `hf.co` hosts, loopback, or link-local metadata addresses are `UNSAFE_PAYLOAD_FIELD`. No transport call is made.
- Transport, when injected, may only be pointed at `https://huggingface.co/api/models` (health) or `https://huggingface.co/api/models/{allowListedId}` (catalog). User-supplied URLs are never forwarded.

---

## Status honesty

| Runtime | Transport / health | Status | `connected` |
|---------|--------------------|--------|-------------|
| Default (no enable, no credential) | none | `NOT_CONFIGURED` | `false` |
| Token present, enable flag false | none | `NOT_CONFIGURED` | `false` |
| Enable + credential, no transport | none | `DEGRADED` | `false` |
| Enable + credential + mock health HTTP 200 with a capability body | injected | `AVAILABLE` | `false` |

`executeOperation` refuses unless that last row would hold. Otherwise it returns `NOT_CONFIGURED` and does not call the transport.

Environment (presence probed only; values never returned, logged, or written to audit metadata):

- Enable: `EARTH_INTEGRATION_HUGGINGFACE_ENABLED`
- Credential: `EARTH_INTEGRATION_HUGGINGFACE_TOKEN`, `HF_TOKEN`, `HUGGINGFACE_TOKEN`

---

## Data classification

- `RESTRICTED` is always blocked (`RESTRICTED_DATA_BLOCKED`).
- `CONFIDENTIAL` still requires an explicit tenant outbound policy on the control plane. The adapter additionally refuses secret-like raw text (`hf_…`, long token-shaped strings) and never sends prompts.
- Results do **not** create VERIFIED claims, Evidence records, approvals, PRIME resumes, tax/ERP/recycler calls, outbound comms, or payments.

---

## What this increment does **not** do

- Call the real Hugging Face Hub or Inference API
- Launch Spaces, download weights, or execute Hub-hosted code
- Accept arbitrary model URLs or client-supplied webhooks
- Put tokens in `VITE_*`, the SPA, fixtures, logs, or `audit_events.metadata_json`
- Treat a configured token as CONNECTED
- Produce VERIFIED model output or production LLM/RAG behavior

House line: *EARTH is currently a development prototype. No external ESG, regulatory, recycler, ERP, tax, blockchain, or AI-provider integration is active.*
