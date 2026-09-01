import { EarthBus } from '../bus/EarthBus.ts';
import { CompassGate } from '../compass/CompassGate.ts';
import { ELiabilityGraph } from '../eliability/ELiabilityGraph.ts';
import { seedHornbachSpine } from '../eliability/seed.ts';
import { HashChainLedger } from '../identity/HashChainLedger.ts';
import { issueDid } from '../identity/did.ts';
import { MISSION_CATALOG } from '../missions/catalog.ts';
import { DeterministicFallbackPolicy } from '../prime/DeterministicFallbackPolicy.ts';
import { PrimeAgent } from '../prime/PrimeAgent.ts';
import { UntrainedRlPolicy } from '../prime/UntrainedRlPolicy.ts';
import { createDefaultSwarm } from '../swarm/createDefaultSwarm.ts';
import type { EarthCtx } from '../types.ts';
import { EarthRuntime } from './EarthRuntime.ts';

export function createEarthRuntime(): EarthRuntime {
  const bus = new EarthBus();
  const compass = new CompassGate();
  const swarm = createDefaultSwarm({ bus, compass });
  const prime = new PrimeAgent({
    policy: new UntrainedRlPolicy(),
    fallback: new DeterministicFallbackPolicy(),
  });
  const ledger = new HashChainLedger();
  const eliability = new ELiabilityGraph();
  seedHornbachSpine(eliability);
  const operatorDid = issueDid('operator');
  const ctx: EarthCtx = {
    actorDid: operatorDid.id,
    allowedJurisdictions: ['EU', 'DE', 'DK'],
    now: new Date('2026-09-01T12:00:00Z'),
    hitlApprovals: new Set(),
  };

  return new EarthRuntime({
    bus,
    compass,
    swarm,
    prime,
    ledger,
    eliability,
    operatorDid,
    catalog: MISSION_CATALOG,
    ctx,
  });
}
