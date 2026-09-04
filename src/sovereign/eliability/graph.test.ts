import { describe, expect, it } from 'vitest';
import { ELiabilityGraph } from './ELiabilityGraph.ts';
import { seedHornbachSpine } from './seed.ts';

describe('e-liability graph', () => {
  it('exposes one tCO2e total to carbon, CSRD, and audit views', () => {
    const graph = new ELiabilityGraph();
    seedHornbachSpine(graph);

    const carbon = graph.asCarbonView();
    const csrd = graph.asCsrdView();
    const audit = graph.asAuditView();

    expect(carbon.totalTCO2e).toBe(14847);
    expect(csrd.totalTCO2e).toBe(carbon.totalTCO2e);
    expect(audit.totalTCO2e).toBe(carbon.totalTCO2e);
    expect(carbon.scope1 + carbon.scope2 + carbon.scope3).toBe(carbon.totalTCO2e);
    expect(audit.rows.every((row) => row.sourceEventId.length > 0)).toBe(true);
  });
});
