import { END, START, StateGraph } from '@langchain/langgraph/web';
import type { EarthGraphHost } from './host.ts';
import { createEarthGraphNodes } from './nodes.ts';
import { EarthGraphAnnotation } from './state.ts';

export function compileEarthGraph(host: EarthGraphHost) {
  const nodes = createEarthGraphNodes(host);
  return new StateGraph(EarthGraphAnnotation)
    .addNode('prime', nodes.prime)
    .addNode('h_agent', nodes.hAgent)
    .addNode('compass', nodes.compass)
    .addNode('vision', nodes.vision)
    .addNode('s_agent', nodes.sAgent)
    .addNode('ledger', nodes.ledger)
    .addNode('tinker', nodes.tinker)
    .addNode('inkling', nodes.inkling)
    .addEdge(START, 'prime')
    .addEdge('prime', 'h_agent')
    .addEdge('h_agent', 'compass')
    .addConditionalEdges('compass', nodes.routeAfterCompass, {
      vision: 'vision',
      s_agent: 's_agent',
    })
    .addEdge('vision', 's_agent')
    .addConditionalEdges('s_agent', nodes.routeAfterSAgent, {
      h_agent: 'h_agent',
      ledger: 'ledger',
    })
    .addConditionalEdges('ledger', nodes.routeAfterLedger, {
      tinker: 'tinker',
      inkling: 'inkling',
    })
    .addEdge('tinker', 'inkling')
    .addEdge('inkling', END)
    .compile();
}

export type CompiledEarthGraph = ReturnType<typeof compileEarthGraph>;
