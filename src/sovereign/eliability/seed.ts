import {
  DEMO_GHG_LINE_ITEMS,
  type DemoGhgLineItem,
} from '../../../packages/earth-contracts/src/index.ts';
import type { ELiabilityGraph } from './ELiabilityGraph.ts';

/**
 * Posts the shared DEMO GHG spine onto the in-tab e-liability graph.
 * Prototype / simulation only — not a live ledger, not tenant inventory.
 */
export function seedHornbachSpine(graph: ELiabilityGraph): void {
  DEMO_GHG_LINE_ITEMS.forEach((post: DemoGhgLineItem) => {
    graph.post({
      kgCO2e: post.tCO2e * 1000,
      sourceEventId: post.id,
      method: post.method,
      scope: post.scope,
      label: post.label,
      csrdCode: 'E1-6',
    });
  });
}
