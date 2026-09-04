# Canonical DEMO GHG spine

**Status:** DEVELOPMENT prototype data. Not inventory, not assurance, not a filed disclosure.

## Chosen breakdown

The shared module is `packages/earth-contracts/src/demo-ghg.ts`.

**Source of truth:** the in-tab e-liability line items (twelve posts).

| Scope | tCO₂e | How it is derived |
|-------|-------|-------------------|
| Scope 1 | 2,847 | sum of `scope1` line items |
| Scope 2 | 4,123 | sum of `scope2` line items |
| Scope 3 | 7,877 | sum of `scope3` line items |
| Total | **scope1 + scope2 + scope3** | never a hardcoded 14,847 independent of parts |

The retired SPA frontend-truth split **2,140 / 4,210 / 8,497** is not used. Those numbers summed to the same headline total and were the second, conflicting spine.

## Honesty

Every figure is:

- `DEMO`
- `INPUT_UNVERIFIED`
- synthetic
- **unsuitable for reporting, tax, audit, customer, or investor use**

Not GHG Protocol inventory. Not ISO 14064. Not CSRD E1-6 evidence. Not Hornbach (or any tenant) measured emissions. The in-tab graph is wiped on refresh. Specialist `carbon.post` remains a noop.

## Consumers

| Surface | Import |
|---------|--------|
| Shared contracts | `DEMO_GHG_LINE_ITEMS`, `sumDemoGhgByScope`, `DEMO_GHG_SCOPES` |
| SPA `src/demo/canonical.ts` | re-exports derived `GHG_SPINE` / `GHG_TOTAL` / `GHG_CATEGORIES` |
| Kernel `src/sovereign/eliability/seed.ts` | posts the same line items as kgCO₂e onto `ELiabilityGraph` |
| Carbon / Scope pages | display derived totals and line items |
| Command Center HUD | reads the kernel graph, which is seeded from the same module |

There is no second numeric array for this inventory. Unrelated DEMO chrome (pickup IDs, take-back item counts, offset-credit mock numbers) is not this spine.

## What this is not

- Not a live ERP extract
- Not a Neo4j e-ledger
- Not LLM / NanoChat / RAG / RL
- Not an external integration
- Not blockchain, ZK, CSRD engine, or DPP
