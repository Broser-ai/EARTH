# Roboflow adapter v0.1

**Status:** server-side **DRAFT** material-image inference stub.  
**Not** a production vision system. **Not** CONNECTED. **Not** a live Roboflow client.

This adapter sits behind the EARTH Integration Control Plane. It classifies **image metadata references** only. It does not create EvidenceRecords, Claims, or VERIFIED labels. Browser code under `src/sovereign/vision/roboflow` is a prototype and is not this adapter.

Related: [INTEGRATION_CONTROL_PLANE_V0_1.md](./INTEGRATION_CONTROL_PLANE_V0_1.md), [PROVIDER_SECURITY_POLICY.md](./PROVIDER_SECURITY_POLICY.md).

---

## What it does

| Piece | What it is | What it is not |
|-------|------------|----------------|
| `createAdapter({ transport? })` | Factory loaded by the registry from `apps/api/src/integrations/roboflow/index.ts` | Not a browser SDK. Not an auto-enabler. |
| Default (no transport, no enable flag) | `getStatus` / `checkHealth` → `NOT_CONFIGURED`, `connected: false` | Not a probe of api.roboflow.com |
| Injected `RoboflowTransport` | Test double. `request(url, init)` only | Not `fetch`. Default transport is `null` |
| Operation `MATERIAL_IMAGE_INFERENCE` | Accepts `objectStorageRef` + `byteLength` | Not image bytes, data URIs, or http(s) URLs |

Results are always one of: `DRAFT`, `ABSTAINED`, `REQUIRES_HUMAN_REVIEW`, `NOT_CONFIGURED`.

---

## Payload rules

Allowed metadata:

- `objectStorageRef` matching `^earth://internal/` or `^earth://object/`
- `byteLength` — positive integer, max **8 388 608** (8 MiB)
- optional `confidenceThreshold` (default `0.8`)

Rejected (no transport call):

- `http://` / `https://` (SSRF)
- `data:` URIs, `file:`, `ftp:`
- image bytes / `imageBytes` / `rawImage`
- `apiKey` and other unsafe credential fields
- missing or oversized `byteLength`

v0.1 does **not** fetch image bytes unless the ref is an internal object-storage URI **and** a transport is injected. The default adapter never fetches.

`RESTRICTED` is always blocked. `CONFIDENTIAL` is refused here; the control plane owns tenant outbound-data policy.

---

## Health and CONNECTED

A process environment key (`EARTH_INTEGRATION_ROBOFLOW_API_KEY` / `ROBOFLOW_API_KEY`) is **presence only**. Values are never returned, logged, or placed on the wire by this adapter.

| Runtime | Health |
|---------|--------|
| Disabled, no credential | `NOT_CONFIGURED` |
| Credential, enable flag false | `NOT_CONFIGURED` (not CONNECTED) |
| Enable flag + credential, no transport | `NOT_CONFIGURED` |
| Enable flag + credential + injected health **not** 200/capability | `DEGRADED` or `ERROR` |
| Enable flag + credential + mock 200 + capability body | `AVAILABLE`, still `connected: false` |

There is **no CONNECTED status**. HTTP views from the control plane also force `connected: false`.

`executeOperation` refuses unless health would be `AVAILABLE` after enable + credential + successful **injected** health. Otherwise it returns `NOT_CONFIGURED` and does not infer.

---

## Draft result

`safeSummary` is a JSON object:

```json
{
  "labels": ["HDPE"],
  "confidence": 0.91,
  "modelVersion": "earth-material-v0",
  "operationId": "<uuid>",
  "status": "DRAFT"
}
```

Confidence below the request threshold → `ABSTAINED` (very low) or `REQUIRES_HUMAN_REVIEW` (borderline). Empty labels → `REQUIRES_HUMAN_REVIEW`. Never `VERIFIED`.

---

## What this increment does **not** do

- Call the real Roboflow HTTP API
- Put secrets in `VITE_*`, the SPA, fixtures, logs, or audit metadata
- Create VERIFIED claims, approve claims, or resume PRIME
- Treat a configured key as CONNECTED
- Claim production vision, trained detection, or live material identification
