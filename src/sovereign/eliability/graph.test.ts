import { describe, expect, it } from 'vitest';
import { DEMO_GHG_SCOPES, DEMO_GHG_TOTAL } from '../../../packages/earth-contracts/src/index.ts';
import { ELiabilityGraph } from './ELiabilityGraph.ts';
import { seedHornbachSpine } from './seed.ts';

describe('e-liability graph', () => {
  it('exposes one tCO2e total to carbon, CSRD, and audit views', () => {
    const graph = new ELiabilityGraph();
    seedHornbachSpine(graph);

    const carbon = graph.asCarbonView();
    const csrd = graph.asCsrdView();
    const audit = graph.asAuditView();

    expect(carbon.totalTCO2e).toBe(carbon.scope1 + carbon.scope2 + carbon.scope3);
    expect(carbon.totalTCO2e).toBe(DEMO_GHG_TOTAL);
    expect(carbon.scope1).toBe(DEMO_GHG_SCOPES.scope1);
    expect(carbon.scope2).toBe(DEMO_GHG_SCOPES.scope2);
    expect(carbon.scope3).toBe(DEMO_GHG_SCOPES.scope3);
    expect(csrd.totalTCO2e).toBe(carbon.totalTCO2e);
    expect(audit.totalTCO2e).toBe(carbon.totalTCO2e);
    expect(audit.rows.every((row) => row.sourceEventId.length > 0)).toBe(true);
  });
});
