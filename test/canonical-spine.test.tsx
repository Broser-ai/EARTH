import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DEMO_GHG_CLASSIFICATION,
  DEMO_GHG_LINE_ITEMS,
  DEMO_GHG_SCOPES,
  DEMO_GHG_SOURCE,
  DEMO_GHG_TOTAL,
  DEMO_GHG_UNSUITABLE_FOR,
  sumDemoGhgByScope,
} from '../packages/earth-contracts/src/index';
import { GHG_CATEGORIES, GHG_SPINE, GHG_TOTAL } from '../src/demo/canonical';
import CarbonAccounting from '../src/pages/CarbonAccounting';
import EmissionsScope from '../src/pages/EmissionsScope';
import { ELiabilityGraph } from '../src/sovereign/eliability/ELiabilityGraph.ts';
import { seedHornbachSpine } from '../src/sovereign/eliability/seed.ts';

describe('canonical DEMO GHG spine', () => {
  it('has one source of line items and derives total from s1+s2+s3', () => {
    const derived = sumDemoGhgByScope(DEMO_GHG_LINE_ITEMS);
    expect(derived.total).toBe(derived.scope1 + derived.scope2 + derived.scope3);
    expect(DEMO_GHG_SCOPES).toEqual(derived);
    expect(DEMO_GHG_TOTAL).toBe(derived.scope1 + derived.scope2 + derived.scope3);
    expect(DEMO_GHG_SCOPES.scope1).toBe(2847);
    expect(DEMO_GHG_SCOPES.scope2).toBe(4123);
    expect(DEMO_GHG_SCOPES.scope3).toBe(7877);
    expect(DEMO_GHG_CLASSIFICATION.origin).toBe('DEMO');
    expect(DEMO_GHG_SOURCE).toBe('INPUT_UNVERIFIED');
    expect(DEMO_GHG_CLASSIFICATION.synthetic).toBe(true);
    expect([...DEMO_GHG_UNSUITABLE_FOR]).toEqual([
      'reporting',
      'tax',
      'audit',
      'customer',
      'investor',
    ]);
  });

  it('keeps SPA canonical totals equal to the shared module', () => {
    expect(GHG_SPINE.scope1).toBe(DEMO_GHG_SCOPES.scope1);
    expect(GHG_SPINE.scope2).toBe(DEMO_GHG_SCOPES.scope2);
    expect(GHG_SPINE.scope3).toBe(DEMO_GHG_SCOPES.scope3);
    expect(GHG_TOTAL).toBe(GHG_SPINE.scope1 + GHG_SPINE.scope2 + GHG_SPINE.scope3);
    expect(GHG_TOTAL).toBe(DEMO_GHG_TOTAL);
    expect(GHG_SPINE.origin).toBe('DEMO');
    expect(GHG_SPINE.source).toBe('INPUT_UNVERIFIED');
    expect(GHG_CATEGORIES.reduce((sum, row) => sum + row.amount, 0)).toBe(GHG_TOTAL);
  });

  it('keeps the in-tab kernel seed on the same values as the SPA', () => {
    const graph = new ELiabilityGraph();
    seedHornbachSpine(graph);
    const carbon = graph.asCarbonView();
    expect(carbon.scope1).toBe(GHG_SPINE.scope1);
    expect(carbon.scope2).toBe(GHG_SPINE.scope2);
    expect(carbon.scope3).toBe(GHG_SPINE.scope3);
    expect(carbon.totalTCO2e).toBe(carbon.scope1 + carbon.scope2 + carbon.scope3);
    expect(carbon.totalTCO2e).toBe(GHG_TOTAL);
    expect(carbon.posts).toHaveLength(DEMO_GHG_LINE_ITEMS.length);
  });

  it('renders Carbon and Scope pages as DEMO / INPUT_UNVERIFIED', () => {
    render(<CarbonAccounting />);
    expect(screen.getAllByText(/DEMO/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/INPUT_UNVERIFIED/).length).toBeGreaterThan(0);
    expect(document.body.textContent?.replace(/,/g, '')).toContain(String(GHG_TOTAL));

    render(<EmissionsScope />);
    expect(screen.getAllByText(/DEMO/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/INPUT_UNVERIFIED/).length).toBeGreaterThan(0);
  });
});
