# Tinker + Inkling adapters v0.1

**Status:** server-side **INTENT** adapters only.  
**Owner:** Michael.  
**Not** a live fine-tune pipeline, trained RL policy, Project Bonsai product, or CONNECTED provider.

Related: [INTEGRATION_CONTROL_PLANE_V0_1.md](./INTEGRATION_CONTROL_PLANE_V0_1.md), [PROVIDER_SECURITY_POLICY.md](./PROVIDER_SECURITY_POLICY.md).

These adapters register through `createAdapter()` in:

- `apps/api/src/integrations/tinker/index.ts`
- `apps/api/src/integrations/inkling/index.ts`

The integration registry loads them by dynamic import. They do **not** edit `registry.ts`. They do **not** import browser `SessionRlPolicy`, PRIME RL trainers, or `cirkel-system`.

---

## Honesty

| Claim | v0.1 truth |
|-------|------------|
| Tinker training | **INTENT** only. A queued request is not trained and not complete. |
| Inkling artifact | **INTENT** only. Output is `NOT_CONFIGURED` or **DRAFT** / `INPUT_UNVERIFIED`. |
| CONNECTED | **Never.** `ProviderHealthResult.connected` is the literal `false`. |
| Live inference | **No.** Inkling does not attach trained weights or run live policy. |
| RL | **No.** No reward loops, trajectories, or session RL policy. |
| Real HTTP | **No.** Default transport is `null`. Tests inject a mock `request()` only. |

A configured `TINKER_API_KEY` or `INKLING_WEIGHTS_URI` is presence-only. It does **not** mean AVAILABLE, trained, or CONNECTED.

---

## Tinker — `TINKER_TRAINING_JOB_REQUEST`

Purpose: record a fine-tune / adaptation **job request intent**.

Allowed payload metadata:

| Field | Rule |
|-------|------|
| `datasetDigestSha256` | 64-char hex digest. No raw dataset. |
| `approvedDatasetRef` | `earth://internal/...` only. `http(s)`, `file:`, and `..` are rejected. |
| `modelReference` | Allow-listed token. Default: `earth-tinker-base-v0`. URLs and Hugging Face hosts are rejected. |
| `purpose` | Optional string; request purpose must be `TINKER_TRAINING_JOB_REQUEST`. |
| `estimatedCostDkk` | Optional non-negative number. |

Raw documents, corpora, trajectories, rewards, LoRA weights, and RL payloads are `UNSAFE_PAYLOAD_FIELD`.

This operation is **high-impact**. `validateRequest` returns `HUMAN_APPROVAL_REQUIRED` unless `approvalReference` is present. Even with an approval reference the adapter **does not train** and **does not execute** a provider job. `executeOperation` refuses unless enable flag + credential + injected health would be `AVAILABLE`; a successful path still records an INTENT (`QUEUED`), never `SUCCEEDED` training.

---

## Inkling — `INKLING_POLICY_ARTIFACT_REQUEST`

Purpose: attach/inspect a **policy artifact evaluation intent**.

Allowed payload metadata:

| Field | Rule |
|-------|------|
| `artifactDigestSha256` | 64-char hex digest. |
| `artifactRef` | `earth://internal/...` only. |

`liveInference`, trained-weight fields, and Bonsai-style keys are rejected. v0.1 does not download weights, does not run inference, and does not claim a trained policy.

`executeOperation` is `NOT_CONFIGURED` until injected health succeeds; when it proceeds, the safe summary stays **DRAFT**.

---

## Health and transport

Both adapters accept `createAdapter({ transport, env })`.

- No transport → no network. Status is `NOT_CONFIGURED` (or `DISABLED` if a credential exists without the enable flag).
- Injected transport may be called only against internal URLs:
  - `earth://internal/integrations/tinker/capability`
  - `earth://internal/integrations/tinker/training-job-intent`
  - `earth://internal/integrations/inkling/capability`
  - `earth://internal/integrations/inkling/policy-artifact-intent`
- Mock `200` + `{ capable: true }` (and not `connected`/`trained`/`complete`) → `AVAILABLE` with `connected: false`.
- A mock body that claims `connected: true` or `trained: true` → `DEGRADED` + `CONNECTED_STATUS_FORBIDDEN`.

`globalThis.fetch` is never used. Credential values are never returned, logged, or placed on transport headers.

Enable flags (default false) and presence-only credential names are defined in the control-plane config:

- Tinker: `EARTH_INTEGRATION_TINKER_ENABLED` / `EARTH_INTEGRATION_TINKER_API_KEY`, `TINKER_API_KEY`
- Inkling: `EARTH_INTEGRATION_INKLING_ENABLED` / `EARTH_INTEGRATION_INKLING_WEIGHTS_URI`, `INKLING_WEIGHTS_URI`

---

## What this increment does **not** do

- Call Thinking Machines Tinker, Microsoft Project Bonsai, or any vendor HTTP API
- Train, complete, or attach model weights
- Import or wrap `SessionRlPolicy`
- Create VERIFIED claims, approve claims, or resume PRIME
- Send `RESTRICTED` data outbound (`CONFIDENTIAL` still requires tenant outbound policy on the control plane)
