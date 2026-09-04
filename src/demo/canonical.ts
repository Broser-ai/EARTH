// Canonical DEMO data for the Vite SPA.
// Nothing in this module is a live measurement, assurance opinion, or filed disclosure.

export const DEMO_TENANT = {
  name: 'Hornbach Germany',
  initials: 'HB',
  note: 'DEMO tenant — fictional scenario, not a live customer environment',
} as const;

export type HonestyLabel = 'DEMO' | 'ESTIMATED' | 'INPUT_UNVERIFIED';

export type GhgScopeName = 'Scope 1' | 'Scope 2' | 'Scope 3';

export interface GhgCategoryRow {
  category: string;
  scope: GhgScopeName;
  amount: number;
  method: string;
  honesty: HonestyLabel;
}

/**
 * Single GHG inventory spine for the SPA.
 * Totals match the detailed Scope 1/2/3 breakdown (location-based Scope 2).
 * Figures are ESTIMATED / INPUT_UNVERIFIED DEMO values — not measured, audited, or SBTi-validated.
 */
export const GHG_SPINE = {
  period: 'H1 2026',
  unit: 'tCO2e',
  honesty: 'ESTIMATED' as const,
  source: 'INPUT_UNVERIFIED' as const,
  origin: 'DEMO' as const,
  scope1: 2140,
  scope2: 4210,
  scope3: 8497,
} as const;

export const GHG_TOTAL = GHG_SPINE.scope1 + GHG_SPINE.scope2 + GHG_SPINE.scope3;

export const GHG_EXPECTED_TOTAL = 14847;

function assertEqual(actual: number, expected: number, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

assertEqual(GHG_TOTAL, GHG_EXPECTED_TOTAL, 'GHG_SPINE total');

export const GHG_SCOPE_SHARE = {
  scope1Pct: 14.4,
  scope2Pct: 28.3,
  scope3Pct: 57.2,
} as const;

export const GHG_CATEGORIES: readonly GhgCategoryRow[] = [
  { category: 'Natural gas (heating)', scope: 'Scope 1', amount: 950, method: 'Measured', honesty: 'INPUT_UNVERIFIED' },
  { category: 'Fleet diesel', scope: 'Scope 1', amount: 580, method: 'Measured', honesty: 'INPUT_UNVERIFIED' },
  { category: 'Refrigerants (R-410A leakage)', scope: 'Scope 1', amount: 300, method: 'Estimated', honesty: 'ESTIMATED' },
  { category: 'Fugitive emissions (SF6, switchgear)', scope: 'Scope 1', amount: 130, method: 'Estimated', honesty: 'ESTIMATED' },
  { category: 'On-site backup generators (diesel)', scope: 'Scope 1', amount: 100, method: 'Measured', honesty: 'INPUT_UNVERIFIED' },
  { category: 'LPG forklifts', scope: 'Scope 1', amount: 80, method: 'Measured', honesty: 'INPUT_UNVERIFIED' },
  { category: 'Purchased electricity (location-based)', scope: 'Scope 2', amount: 3643, method: 'Location-based', honesty: 'ESTIMATED' },
  { category: 'District heating', scope: 'Scope 2', amount: 567, method: 'Location-based', honesty: 'ESTIMATED' },
  { category: 'Purchased goods & services', scope: 'Scope 3', amount: 4218, method: 'Spend-based', honesty: 'ESTIMATED' },
  { category: 'Capital goods', scope: 'Scope 3', amount: 210, method: 'Spend-based', honesty: 'ESTIMATED' },
  { category: 'Fuel- and energy-related activities', scope: 'Scope 3', amount: 145, method: 'Activity-based', honesty: 'ESTIMATED' },
  { category: 'Upstream transportation & distribution', scope: 'Scope 3', amount: 1847, method: 'Activity-based', honesty: 'ESTIMATED' },
  { category: 'Waste generated in operations', scope: 'Scope 3', amount: 412, method: 'Measured', honesty: 'INPUT_UNVERIFIED' },
  { category: 'Business travel', scope: 'Scope 3', amount: 287, method: 'Distance-based', honesty: 'ESTIMATED' },
  { category: 'Employee commuting', scope: 'Scope 3', amount: 847, method: 'Survey-based', honesty: 'ESTIMATED' },
  { category: 'Upstream leased assets', scope: 'Scope 3', amount: 38, method: 'Activity-based', honesty: 'ESTIMATED' },
  { category: 'Downstream transportation & distribution', scope: 'Scope 3', amount: 165, method: 'Activity-based', honesty: 'ESTIMATED' },
  { category: 'Processing of sold products', scope: 'Scope 3', amount: 0, method: 'Not applicable', honesty: 'DEMO' },
  { category: 'Use of sold products', scope: 'Scope 3', amount: 210, method: 'Estimated', honesty: 'ESTIMATED' },
  { category: 'End-of-life treatment of sold products', scope: 'Scope 3', amount: 68, method: 'Estimated', honesty: 'ESTIMATED' },
  { category: 'Downstream leased assets', scope: 'Scope 3', amount: 12, method: 'Not applicable', honesty: 'DEMO' },
  { category: 'Franchises', scope: 'Scope 3', amount: 0, method: 'Not applicable', honesty: 'DEMO' },
  { category: 'Investments', scope: 'Scope 3', amount: 38, method: 'Spend-based', honesty: 'ESTIMATED' },
];

const categorySum = GHG_CATEGORIES.reduce((sum, row) => sum + row.amount, 0);
assertEqual(categorySum, GHG_EXPECTED_TOTAL, 'GHG_CATEGORIES sum');

export const DEMO_COMPLIANCE = {
  csrdPct: 94,
  griPct: 88,
  eudrPct: 67,
  cbamPct: 52,
  honesty: 'DEMO' as const,
  note: 'Scenario completeness for UI mock-ups — not a filed disclosure, assurance opinion, or legal status',
} as const;
