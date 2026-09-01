import { HAgent } from '../agents/HAgent.ts';
import { SAgent } from '../agents/SAgent.ts';
import type { EarthBus } from '../bus/EarthBus.ts';
import type { CompassGate } from '../compass/CompassGate.ts';
import { buildEarthCapabilityTree, SPECIALIST_CAPABILITIES } from './capabilities.ts';
import { SwarmCoordinator } from './SwarmCoordinator.ts';

export function createDefaultSwarm(options: {
  bus: EarthBus;
  compass: CompassGate;
}): SwarmCoordinator {
  const tree = buildEarthCapabilityTree();
  const specialists = SPECIALIST_CAPABILITIES.map(
    (capability) =>
      new SAgent({
        id: `s-${capability.replace('.', '-')}`,
        capability,
        run: async (action) => ({
          ok: true,
          capability: action.capability,
          actionId: action.id,
        }),
      }),
  );
  const harness = new HAgent({ id: 'h-earth', specialists });
  return new SwarmCoordinator({
    bus: options.bus,
    compass: options.compass,
    tree,
    harness,
  });
}
