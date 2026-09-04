// Canonical DEMO data for the Vite SPA.
// GHG numbers come from packages/earth-contracts (kernel e-liability line items).
// Nothing in this module is a live measurement, assurance opinion, or filed disclosure.

import type { HonestyLabel as SharedHonestyLabel } from '../contracts';
import {
  DEMO_GHG_CLASSIFICATION,
  DEMO_GHG_LINE_ITEMS,
  DEMO_GHG_SCOPE_SHARE,
  DEMO_GHG_SCOPES,
  demoGhgMethodHonesty,
  demoGhgMethodLabel,
  demoGhgScopeLabel,
  type DemoGhgLineItem,
} from '../contracts';

export const DEMO_TENANT = {
  name: 'Hornbach Germany',
  initials: 'HB',
  note: 'DEMO tenant — fictional scenario, not a live customer environment',
} as const;

/** GHG DEMO fixtures use this subset of the shared honesty labels. */
export type HonestyLabel = Extract<SharedHonestyLabel, 'DEMO' | 'ESTIMATED' | 'INPUT_UNVERIFIED'>;

export type GhgScopeName = 'Scope 1' | 'Scope 2' | 'Scope 3';

export interface GhgCategoryRow {
  category: string;
  scope: GhgScopeName;
  amount: number;
  method: string;
  honesty: HonestyLabel;
}

/**
 * Single GHG inventory spine for the SPA — re-export of the shared contracts module.
 * Scope totals are derived (s1+s2+s3). Figures are DEMO / ESTIMATED / INPUT_UNVERIFIED
 * and unsuitable for reporting, tax, audit, customer, or investor use.
 */
export const GHG_SPINE = {
  period: DEMO_GHG_CLASSIFICATION.period,
  unit: DEMO_GHG_CLASSIFICATION.unit,
  honesty: DEMO_GHG_CLASSIFICATION.honesty,
  source: DEMO_GHG_CLASSIFICATION.source,
  origin: DEMO_GHG_CLASSIFICATION.origin,
  synthetic: DEMO_GHG_CLASSIFICATION.synthetic,
  unsuitableFor: DEMO_GHG_CLASSIFICATION.unsuitableFor,
  note: DEMO_GHG_CLASSIFICATION.note,
  scope1: DEMO_GHG_SCOPES.scope1,
  scope2: DEMO_GHG_SCOPES.scope2,
  scope3: DEMO_GHG_SCOPES.scope3,
} as const;

export const GHG_TOTAL = GHG_SPINE.scope1 + GHG_SPINE.scope2 + GHG_SPINE.scope3;
export const GHG_SCOPE_SHARE = DEMO_GHG_SCOPE_SHARE;
export const GHG_LINE_ITEMS: readonly DemoGhgLineItem[] = DEMO_GHG_LINE_ITEMS;

export const GHG_CATEGORIES: readonly GhgCategoryRow[] = DEMO_GHG_LINE_ITEMS.map((item) => ({
  category: item.label,
  scope: demoGhgScopeLabel(item.scope),
  amount: item.tCO2e,
  method: demoGhgMethodLabel(item.method),
  honesty: demoGhgMethodHonesty(item.method),
}));

export const DEMO_COMPLIANCE = {
  csrdPct: 94,
  griPct: 88,
  eudrPct: 67,
  cbamPct: 52,
  honesty: 'DEMO' as const,
  note: 'Scenario completeness for UI mock-ups — not a filed disclosure, assurance opinion, or legal status',
} as const;
