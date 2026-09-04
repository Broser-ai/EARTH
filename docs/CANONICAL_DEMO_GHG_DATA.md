# Canonical DEMO GHG Data

The canonical DEMO GHG source is `packages/earth-contracts/src/demo-ghg.ts`, using the existing e-liability line-item breakdown:

| Scope   |                                    tCO2e |
| ------- | ---------------------------------------: |
| Scope 1 |                                    2,847 |
| Scope 2 |                                    4,123 |
| Scope 3 |                                    7,877 |
| Total   | Derived from Scope 1 + Scope 2 + Scope 3 |

Dataset metadata: versionless development fixture, reporting period `H1 2026`, `DEMO`, `INPUT_UNVERIFIED`, `ESTIMATED`, and synthetic. The shared helper derives both scope totals and the total from the 12 line items. No independent `14,847` headline constant exists.

The SPA imports it through `src/demo/canonical.ts`; the in-tab e-liability seed imports the same line items directly. This is not live carbon accounting data and is unsuitable for reporting, tax, audit, investor, customer, or regulatory use.

`test/canonical-spine.test.tsx` verifies shared SPA/kernel totals and rejects any second active `src/` module containing the complete canonical scope breakdown.
