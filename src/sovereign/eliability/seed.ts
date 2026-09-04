import type { ELiabilityGraph } from './ELiabilityGraph.ts';
import type { GhgScope, LiabilityMethod } from './ELiabilityGraph.ts';

interface SeedPost {
  label: string;
  tCO2e: number;
  scope: GhgScope;
  method: LiabilityMethod;
}

const HORNBACH_POSTS: SeedPost[] = [
  { label: 'Natural gas combustion', tCO2e: 1247, scope: 'scope1', method: 'measured' },
  { label: 'Fleet diesel', tCO2e: 892, scope: 'scope1', method: 'measured' },
  { label: 'Refrigerant leakage', tCO2e: 708, scope: 'scope1', method: 'calculated' },
  { label: 'Purchased electricity', tCO2e: 3412, scope: 'scope2', method: 'calculated' },
  { label: 'District heating', tCO2e: 711, scope: 'scope2', method: 'calculated' },
  { label: 'Purchased goods & services', tCO2e: 2847, scope: 'scope3', method: 'estimated' },
  { label: 'Upstream transportation', tCO2e: 1234, scope: 'scope3', method: 'calculated' },
  { label: 'Employee commuting', tCO2e: 847, scope: 'scope3', method: 'estimated' },
  { label: 'Business travel', tCO2e: 423, scope: 'scope3', method: 'calculated' },
  { label: 'Waste generated in operations', tCO2e: 312, scope: 'scope3', method: 'measured' },
  { label: 'Downstream transportation', tCO2e: 1847, scope: 'scope3', method: 'estimated' },
  { label: 'Use of sold products', tCO2e: 367, scope: 'scope3', method: 'estimated' },
];

export function seedHornbachSpine(graph: ELiabilityGraph): void {
  HORNBACH_POSTS.forEach((post, index) => {
    graph.post({
      kgCO2e: post.tCO2e * 1000,
      sourceEventId: `spine-${(index + 1).toString().padStart(3, '0')}`,
      method: post.method,
      scope: post.scope,
      label: post.label,
      csrdCode: 'E1-6',
    });
  });
}
