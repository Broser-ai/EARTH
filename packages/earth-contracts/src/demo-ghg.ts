/**
 * Canonical DEMO GHG spine for SPA carbon pages and the in-tab e-liability kernel.
 *
 * Chosen breakdown: kernel e-liability line items (scope split 2,847 / 4,123 / 7,877).
 * Not the retired SPA frontend-truth split 2,140 / 4,210 / 8,497.
 * Totals are always scope1 + scope2 + scope3. There is no independent 14,847 constant.
 *
 * SYNTHETIC. DEMO. INPUT_UNVERIFIED.
 * Unsuitable for reporting, tax, audit, customer, or investor use.
 * Not GHG Protocol inventory, not ISO 14064, not CSRD E1-6 evidence, not a live tenant.
 */

export const DEMO_GHG_ORIGIN = 'DEMO' as const;
export const DEMO_GHG_SOURCE = 'INPUT_UNVERIFIED' as const;
export const DEMO_GHG_HONESTY = 'ESTIMATED' as const;

export const DEMO_GHG_UNSUITABLE_FOR = [
  'reporting',
  'tax',
  'audit',
  'customer',
  'investor',
] as const;
export type DemoGhgUnsuitableUse = (typeof DEMO_GHG_UNSUITABLE_FOR)[number];

export type DemoGhgScope = 'scope1' | 'scope2' | 'scope3';
export type DemoGhgMethod = 'measured' | 'calculated' | 'estimated';

export interface DemoGhgLineItem {
  id: string;
  label: string;
  tCO2e: number;
  scope: DemoGhgScope;
  method: DemoGhgMethod;
}

export interface DemoGhgScopeTotals {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
}

export interface DemoGhgScopeShare {
  scope1Pct: number;
  scope2Pct: number;
  scope3Pct: number;
}

export const DEMO_GHG_CLASSIFICATION = {
  period: 'H1 2026',
  unit: 'tCO2e',
  origin: DEMO_GHG_ORIGIN,
  source: DEMO_GHG_SOURCE,
  honesty: DEMO_GHG_HONESTY,
  synthetic: true,
  unsuitableFor: DEMO_GHG_UNSUITABLE_FOR,
  note: 'DEMO / INPUT_UNVERIFIED synthetic inventory. Unsuitable for reporting, tax, audit, customer, or investor use.',
} as const;

/**
 * Twelve e-liability DEMO posts. This is the single numeric spine.
 * Kernel posts kgCO2e = tCO2e * 1000; SPA displays tCO2e.
 */
export const DEMO_GHG_LINE_ITEMS: readonly DemoGhgLineItem[] = [
  { id: 'spine-001', label: 'Natural gas combustion', tCO2e: 1247, scope: 'scope1', method: 'measured' },
  { id: 'spine-002', label: 'Fleet diesel', tCO2e: 892, scope: 'scope1', method: 'measured' },
  { id: 'spine-003', label: 'Refrigerant leakage', tCO2e: 708, scope: 'scope1', method: 'calculated' },
  { id: 'spine-004', label: 'Purchased electricity', tCO2e: 3412, scope: 'scope2', method: 'calculated' },
  { id: 'spine-005', label: 'District heating', tCO2e: 711, scope: 'scope2', method: 'calculated' },
  { id: 'spine-006', label: 'Purchased goods & services', tCO2e: 2847, scope: 'scope3', method: 'estimated' },
  { id: 'spine-007', label: 'Upstream transportation', tCO2e: 1234, scope: 'scope3', method: 'calculated' },
  { id: 'spine-008', label: 'Employee commuting', tCO2e: 847, scope: 'scope3', method: 'estimated' },
  { id: 'spine-009', label: 'Business travel', tCO2e: 423, scope: 'scope3', method: 'calculated' },
  { id: 'spine-010', label: 'Waste generated in operations', tCO2e: 312, scope: 'scope3', method: 'measured' },
  { id: 'spine-011', label: 'Downstream transportation', tCO2e: 1847, scope: 'scope3', method: 'estimated' },
  { id: 'spine-012', label: 'Use of sold products', tCO2e: 367, scope: 'scope3', method: 'estimated' },
];

export function sumDemoGhgByScope(
  items: readonly DemoGhgLineItem[] = DEMO_GHG_LINE_ITEMS,
): DemoGhgScopeTotals {
  const scope1 = sumScope(items, 'scope1');
  const scope2 = sumScope(items, 'scope2');
  const scope3 = sumScope(items, 'scope3');
  return {
    scope1,
    scope2,
    scope3,
    total: scope1 + scope2 + scope3,
  };
}

export function demoGhgScopeShare(totals: DemoGhgScopeTotals): DemoGhgScopeShare {
  if (totals.total === 0) {
    return { scope1Pct: 0, scope2Pct: 0, scope3Pct: 0 };
  }
  const scope1Pct = round1((totals.scope1 / totals.total) * 100);
  const scope2Pct = round1((totals.scope2 / totals.total) * 100);
  const scope3Pct = round1(100 - scope1Pct - scope2Pct);
  return { scope1Pct, scope2Pct, scope3Pct };
}

export function demoGhgMethodHonesty(method: DemoGhgMethod): 'INPUT_UNVERIFIED' | 'ESTIMATED' {
  switch (method) {
    case 'measured':
      return 'INPUT_UNVERIFIED';
    case 'calculated':
      return 'ESTIMATED';
    case 'estimated':
      return 'ESTIMATED';
    default:
      return assertNever(method);
  }
}

export function demoGhgScopeLabel(scope: DemoGhgScope): 'Scope 1' | 'Scope 2' | 'Scope 3' {
  switch (scope) {
    case 'scope1':
      return 'Scope 1';
    case 'scope2':
      return 'Scope 2';
    case 'scope3':
      return 'Scope 3';
    default:
      return assertNever(scope);
  }
}

export function demoGhgMethodLabel(method: DemoGhgMethod): 'Measured' | 'Calculated' | 'Estimated' {
  switch (method) {
    case 'measured':
      return 'Measured';
    case 'calculated':
      return 'Calculated';
    case 'estimated':
      return 'Estimated';
    default:
      return assertNever(method);
  }
}

/** Derived once from line items. Never a hardcoded headline total. */
export const DEMO_GHG_SCOPES: DemoGhgScopeTotals = sumDemoGhgByScope(DEMO_GHG_LINE_ITEMS);
export const DEMO_GHG_TOTAL = DEMO_GHG_SCOPES.scope1 + DEMO_GHG_SCOPES.scope2 + DEMO_GHG_SCOPES.scope3;
export const DEMO_GHG_SCOPE_SHARE = demoGhgScopeShare(DEMO_GHG_SCOPES);

function sumScope(items: readonly DemoGhgLineItem[], scope: DemoGhgScope): number {
  return items.filter((item) => item.scope === scope).reduce((sum, item) => sum + item.tCO2e, 0);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled union member: ${JSON.stringify(value)}`);
}
