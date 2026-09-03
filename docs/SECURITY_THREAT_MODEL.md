# EARTH security threat model

**Status:** consolidates the security audit (Phase 4). Not a penetration test. Not a certification.  
**Scope:** `main` @ `7490bda` (shipped-looking SPA) **and** unmerged kernel PRs (in-browser runtime).  
**npm audit:** 0 known vulnerabilities at last scan — **dependency CVEs only**.  
**Secrets in git:** none found. `main` had no `.env.example`; this dossier adds a **non-secret** template that forbids `VITE_*` keys.

This is not legal advice (GDPR, NIS2, EU AI Act).

---

## 1. Assets

| ID | Asset | Where it lives today | Sensitivity if real |
|----|--------|----------------------|---------------------|
| A1 | Operator session | Browser tab; **no login** | Full product authority |
| A2 | Mock PII (names, emails) | Hardcoded in `UsersRoles.tsx`, take-back pages | Would be personal data if live |
| A3 | ESG / e-liability figures | Page constants; PR #1 in-memory graph | Misstatement / greenwashing risk |
| A4 | HITL approval set | PR #1 `EarthCtx.hitlApprovals` | Authority bypass |
| A5 | Hash-chain / DID | PR #1 memory; empty JWK | False integrity claims |
| A6 | Adapter keys (Roboflow, Tinker, Inkling) | **Must not** be in SPA; typed as `VITE_*` on PR #1 | Full third-party account |
| A7 | Mission / COMPASS policy | Hardcoded TS | Safety/compliance bypass if edited client-side |
| A8 | Session-rl logits | PR #3 `localStorage` | Integrity of “trained” UX |

---

## 2. Trust boundaries

```
[ Untrusted browser ]
        │  no TLS termination in-app; no API
        ▼
[ Vite static origin ]  ← entire EARTH today
        │
        ✕  no control plane
```

Target boundary (see [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md)):

```
[ Browser ] --TLS--> [ Control plane ] --IAM--> [ Adapters / DB ]
                         ▲
                         └── HITL actors (IdP)
```

Anything the SPA can call without an authenticated control plane is **attacker-controlled**.

---

## 3. STRIDE (current)

| Threat | Applies | Example | Mitigation (proposal, not built) |
|--------|---------|---------|----------------------------------|
| **S**poofing | Yes | Anyone opens the SPA and is “Admin” / `did:earth:operator` | OIDC/SAML; no anonymous mutate |
| **T**ampering | Yes | Edit `hitlApprovals` / bus history in DevTools; change mock ESG JSON | Server-side verdicts + signed audit log |
| **R**epudiation | Yes | `AuditTrail.tsx` is a static table; PR #1 bus is unsigned | Attributed, append-only events with actor_id |
| **I**nfo disclosure | Yes if keys land in Vite | `VITE_ROBOFLOW_API_KEY` bundled; Roboflow `api_key` query string | Server secrets; header auth; no `VITE_*` secrets |
| **D**enial of service | Low (static SPA) | N/A at origin; future API needs rate limits | Bind `0.0.0.0:$PORT` + gateway limits later |
| **E**levation | Yes | Capability tree `can()` is “id exists”, not RBAC; UsersRoles matrix is paint | Tenant RBAC on the control plane |

---

## 4. Finding register (security-relevant)

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| S1 | Critical | No authentication | No IdP, no session cookie, no `Authorization` |
| S2 | Critical | No tenancy / RLS | No `tenant_id` in runtime; unused `MOCK_TENANTS` |
| S3 | Critical | Client HITL | `EarthRuntime.approveHitl` (PR #1) |
| S4 | High | `VITE_*` secret types | PR #1 `src/vite-env.d.ts`; `readEarthSecret` also reads `VITE_${name}` |
| S5 | High | Roboflow API key in query string if live | `HttpRoboflowClient` `url.searchParams.set('api_key', …)` |
| S6 | High | Capability tree ≠ actor RBAC | `capabilities.ts` `can(capability)` |
| S7 | High | Hash-chain ephemeral + unsigned | `HashChainLedger.ts`; DID empty JWK |
| S8 | Medium | Mock PII in source | `UsersRoles.tsx`, take-back customer names |
| S9 | Medium | Session-rl in `localStorage` (PR #3) | Tamper / confuse “trained” |
| S10 | Low | `npm audit` clean ≠ app secure | Confirmed 0 dep CVEs |

---

## 5. Secret handling (proposal)

| Rule | Detail |
|------|--------|
| Never `VITE_*` for secrets | Vite inlines them. The dossier `.env.example` states this in prose. |
| Server-only names | `ROBOFLOW_API_KEY`, `TINKER_API_KEY`, `INKLING_WEIGHTS_URI`, IdP, DB URL |
| Presence vs value | HUD may show **booleans** (`EarthSecretPresence` idea) — never log values (`env.ts` comment is correct; keep it) |
| Rotation | Adapter keys in a manager (Render env / Vault); no keys in git |
| Live Roboflow | Authorization header or server proxy; **no** query-string `api_key` |
| Browser | Public publishable values only (if any). Zero adapter keys |

Foundation **code** (schema validation that throws if `VITE_*` secrets are set) lands **after kernel merge** — see roadmap Phase 2. This branch does not rewrite `src/`.

---

## 6. Tenant isolation (proposal)

- `tenant_id` on every domain table (see [DOMAIN_MODEL.md](./DOMAIN_MODEL.md)).
- Postgres RLS: `current_setting('earth.tenant_id')`.
- Service principals scoped to one tenant unless a break-glass role exists (HITL + dual control).
- Demo seed (Hornbach 14,847) is a **fixture tenant**, never the production default graph mixed into another org.

---

## 7. PII (proposal)

| Class | Examples | Handling |
|-------|----------|----------|
| Workforce | Operator name, email, IdP subject | Purpose: access control. DPA with processor. |
| Operations | Driver/warehouse staff on intake tickets | Minimize; retain per operations schedule |
| Cirkel-adjacent | Consumer identity, wallet, device IDs | **Out of repo.** If a future adapter exists, it is a separate processing purpose |
| Mock data | Hardcoded DE names in pages | Replace with clearly synthetic fixtures before any shared deploy |

No lawful-basis engine exists today. Do not ship real personal data into this SPA.

---

## 8. Retention (proposal)

| Record | Retain (starting point for Michael to confirm) | Delete |
|--------|------------------------------------------------|--------|
| COMPASS verdicts + HITL | Alignment with financial/ESG audit period (multi-year) | Legal hold override |
| E-liability posts | Same as books / GHG inventory year + assurance window | Never “edit in place”; reverse via compensating post |
| Evidence blobs | Hash retained even if blob GC’d (tombstone) | GC after retention + hold check |
| Bus / debug events | Short (days–weeks) unless promoted to audit | |
| Session-rl / localStorage | Not an audit record; do not retain as evidence | |
| Adapter logs | Redact secrets; 30–90 days operational | |

Exact periods are a **product/legal** question (open question in the PR). Do not invent statutory years here.

---

## 9. Encryption (proposal)

| Layer | v1 | Later |
|-------|----|-------|
| In transit | HTTPS only to control plane | mTLS to adapters if required |
| At rest | Postgres + object-store managed encryption | Tenant CMK if enterprise contract demands |
| Application | Signed HITL + ledger commitments (Ed25519/P-256 **real keys**) | Optional hash-chain on top |
| Browser | No private keys in JS for authority | |

SHA-256 of canonical JSON (PR #1) is a **commitment**, not encryption and not non-repudiation.

---

## 10. Incident response (proposal)

1. **Detect:** auth failures, unexpected `carbon.post`, HITL without matching request, secret-presence flipping, outbound 401/403 from adapters.
2. **Contain:** `halt` the control plane (kill switch); rotate adapter keys; revoke sessions.
3. **Eradicate:** patch the execute path; invalidate forged approvals (they should be impossible if S3 is fixed).
4. **Recover:** restore Postgres from backup; rebuild e-liability from event log, not from SPA memory.
5. **Notify:** Michael first; tenants and authorities only per a written policy that **does not exist in this repo**.

No on-call, no SIEM, no audit log pipeline exists today.

---

## 11. Abuse cases to keep in the test suite (after kernel merge)

| Case | Expected |
|------|----------|
| Unauthenticated `carbon.post` | 401 |
| Cross-tenant read | 404/403, no row leak |
| HITL approve without request | reject |
| HITL approve as different actor | reject |
| `VITE_ROBOFLOW_API_KEY` set in build | **fail the build** |
| COMPASS floor fail | specialist not invoked |
| LLM tool list | mutate/money/authority tools absent |
