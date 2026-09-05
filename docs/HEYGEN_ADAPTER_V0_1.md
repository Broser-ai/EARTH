# HeyGen adapter v0.1 — executive video **draft request**

**Status:** server-side `ProviderAdapter` for a **draft request ledger**. Not a video studio.  
**Provider key:** `HEYGEN`  
**Operation:** `EXECUTIVE_VIDEO_DRAFT_REQUEST`  
**Owner:** Michael.

This adapter does **not** generate, render, publish, email, Slack, Teams, or otherwise distribute video. It does **not** grant `CONNECTED`. A process environment credential is not a live HeyGen session.

Related: [INTEGRATION_CONTROL_PLANE_V0_1.md](./INTEGRATION_CONTROL_PLANE_V0_1.md), [PROVIDER_SECURITY_POLICY.md](./PROVIDER_SECURITY_POLICY.md).

---

## What exists

| Piece | What it is | What it is not |
|-------|------------|----------------|
| `createAdapter()` | Registry entry point in `apps/api/src/integrations/heygen/index.ts` | Not a browser SDK. Not a HeyGen client. |
| Default transport | `null` — no network | Not `fetch`. Not HeyGen HTTP. |
| Injected transport | Test-only mock `{ request(url, init) }` | Not a production webhook. |
| Payload | Short sanitized briefing **reference**: `briefingDigestSha256`, `briefingRef` (`earth://internal/...`), optional `maxChars` | Not a user prompt. Not a supplier document. Not PII. |
| Result watermarks | `DRAFT`, `HUMAN_REVIEW_REQUIRED`, and `NOT_CONFIGURED` when execute is refused | Not rendered media. Not `VERIFIED`. |

`GET /v1/info` still reports `externalApis: false`. HTTP views always include `"connected": false`.

---

## Default behaviour

`createAdapter()` with no options:

- `getStatus` / `checkHealth` → `status: NOT_CONFIGURED`, `connected: false`, `healthy: false`
- No transport call, no `providerOutboundProbe` increment
- `executeOperation` refuses with `PROVIDER_NOT_CONFIGURED` and the honesty watermarks above
- `createOperation` / `cancelOperation` stay local

A configured `EARTH_INTEGRATION_HEYGEN_API_KEY` without `EARTH_INTEGRATION_HEYGEN_ENABLED=true` and without a **successful injected health** check stays `NOT_CONFIGURED` (or disabled). It is never `CONNECTED`.

`AVAILABLE` is only returned after **all** of:

1. server enable flag
2. credential presence (value never returned)
3. mock transport health `200` with a draft-capability body

`AVAILABLE` still sets `connected: false`.

---

## Payload contract

Accepted keys only:

- `briefingDigestSha256` — 64 hex characters (SHA-256 of an internal briefing). Not the briefing text.
- `briefingRef` — `earth://internal/...` with a conservative path charset
- `maxChars` — optional positive integer, max 2 000 (metadata cap, not a script)

Rejected (`UNSAFE_PAYLOAD_FIELD` or `RESTRICTED_DATA_BLOCKED`):

- `payload.prompt` and other unrestricted user prompts
- emails and phone numbers (simple regex)
- `<script`, `javascript:`, `onerror=`
- `publish`, `distribute`, `webhookUrl`, `channel` (and Slack/Teams/email distribution keys)
- raw documents / PII fields
- `RESTRICTED` data classification (cannot be allow-listed)

`CONFIDENTIAL` still requires an explicit tenant outbound classification. Results are `DRAFT` / `INPUT_UNVERIFIED`. This adapter never creates VERIFIED claims, approves claims, resumes PRIME, or sends communications.

---

## Approval gate

Durable human approval is required before any externally configured execute. v0.1 has no durable-approval table on the control-plane branch; `approvalVerified` defaults to **false**.

Without verified approval the adapter **does not call transport**, even if a mock health check already returned `AVAILABLE`.

---

## Environment (server-side only)

| Flag / name | Role |
|-------------|------|
| `EARTH_INTEGRATION_HEYGEN_ENABLED` | Explicit enable. Default false. |
| `EARTH_INTEGRATION_HEYGEN_API_KEY`, `HEYGEN_API_KEY` | Presence-probed only. Never logged, returned, or written to audit metadata. |

`VITE_*` variants refuse process start (control-plane config). Do not put HeyGen keys in the SPA, `localStorage`, fixtures, or commits.

---

## Honesty

Do not claim “HeyGen video generated”, live avatar, auto-published explainer, CONNECTED provider, or production video ops. House line still applies:

*EARTH is currently a development prototype. No external ESG, regulatory, recycler, ERP, tax, blockchain, or AI-provider integration is active.*
