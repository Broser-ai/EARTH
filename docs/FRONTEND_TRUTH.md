# Frontend truth — Vite SPA

**Status:** development mock.  
**Owner:** Michael. Nothing on this surface is a license to file, assure, trade, or operate.

The EARTH command-grid SPA (`src/`, Vite port 5180) is a **DEVELOPMENT / DEMO** client. It is not a live ESG, ERP, audit, or compliance product. Numbers, statuses, and partner names are scenario fixtures unless a future API explicitly says otherwise.

## What the UI is

- A dark-first mission-control mock for layout and navigation.
- Hard-coded tables, KPIs, and progress bars.
- A single canonical GHG spine in `src/demo/canonical.ts` for carbon totals that this pass touched.
- Honest badges: `DEVELOPMENT` and `DEMO` on the command bar; `ESTIMATED` / `INPUT_UNVERIFIED` / `DEMO` on carbon and fake-live claims.

## What the UI is not

| Claim you might still see in copy | Truth |
|-----------------------------------|--------|
| Connected SAP / DATEV / Slack / NetSuite / M365 | **Not connected.** Catalog entries are DEMO. No adapter, webhook, or SSO is live. |
| CSRD 94% complete | DEMO scenario completeness. Not a filed ESRS report. |
| Auditor: KPMG / `audit@kpmg.de` | Fictional. No engagement, no assurance letter. |
| SBTi validated / 1.5°C aligned | DEMO illustration. No Science Based Targets submission. |
| ISO 14064-1 certified | DEMO label only. No certificate. |
| Live carbon accounting / real-time sync | In-memory DEMO data. |
| Aegis Protocol ZK-STARK / FHE / defense grid | Client-side animation. **Not a proof system.** Hashes are `Math.random()`. |
| Production API keys (`sk_live_…`) | Masked DEMO placeholders. No secrets. |
| 7-year CSRD Article 19a retention / SHA-256 tamper-proof log | Copy on a mock audit table. No durable audit store in this SPA. |

No recycler, ERP, Slack, Teams, SKAT, SAP, email, blockchain, authority, or AI-provider adapter is connected from this frontend.

The **Material intake** page (`src/pages/MaterialOpportunityIntake.tsx`) is the exception for *local* wiring: it POSTs to the Vite-proxied Fastify API with DEVELOPMENT identity headers. That is still not production auth, not a recycler network, and not an LLM.

## GHG spine

If a screen shows inventory tCO₂e after this change, it should use `src/demo/canonical.ts`:

- Scope 1: **2,140** tCO₂e  
- Scope 2 (location-based): **4,210** tCO₂e  
- Scope 3: **8,497** tCO₂e  
- Total: **14,847** tCO₂e  
- Honesty: **ESTIMATED** / **INPUT_UNVERIFIED** / **DEMO**

These figures are internally consistent with the Scope 1/2/3 breakdown page. They are **not** measured operational data and **must not** be cited as compliance, SBTi progress, or assurance evidence.

Other pages still contain local DEMO tables (pickups, recyclers, auctions). Those were not rewritten. Treat every count as scenario data.

## Tests

This pass is **UI-only labeling plus canonical constants**. There is no test runner in this package (`package.json` has `typecheck` / Vite only). Honesty is enforced by:

1. Visible badges in the command bar and on the screens that previously claimed live status.
2. Runtime asserts in `src/demo/canonical.ts` (`GHG_TOTAL` and category sum must equal 14,847). `tsc --noEmit` typechecks the module.

Add Vitest (or equivalent) when behavior beyond labels is introduced. SPA smoke tests now also assert the Material intake nav entry exists.

## Reversal

All changes are additive labels, copy edits, and one demo module. Revert this branch to restore the previous mock-as-production look. Do not merge to `main` as if the SPA were a production ESG product.
