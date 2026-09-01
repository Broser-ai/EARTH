import { HAgent } from '../agents/HAgent.ts';
import { SAgent } from '../agents/SAgent.ts';
import type { EarthBus } from '../bus/EarthBus.ts';
import type { CompassGate } from '../compass/CompassGate.ts';
import { assertNever } from '../types.ts';
import { StubRoboflowClient } from '../vision/roboflow/client.ts';
import { RoboflowVisionAdapter } from '../vision/roboflow/RoboflowVisionAdapter.ts';
import {
  buildEarthCapabilityTree,
  SPECIALIST_CAPABILITIES,
  type SpecialistCapability,
} from './capabilities.ts';
import { SwarmCoordinator } from './SwarmCoordinator.ts';

export function createDefaultSwarm(options: {
  bus: EarthBus;
  compass: CompassGate;
  vision?: RoboflowVisionAdapter;
}): SwarmCoordinator {
  const tree = buildEarthCapabilityTree();
  const vision =
    options.vision ?? new RoboflowVisionAdapter(options.bus, new StubRoboflowClient());
  const specialists = SPECIALIST_CAPABILITIES.map(
    (capability) =>
      new SAgent({
        id: `s-${capability.replace('.', '-')}`,
        capability,
        run: runnerFor(capability, vision),
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

function runnerFor(capability: SpecialistCapability, vision: RoboflowVisionAdapter) {
  switch (capability) {
    case 'vision.infer':
      return async (action: Parameters<RoboflowVisionAdapter['inferFromAction']>[0]) =>
        vision.inferFromAction(action);
    case 'ops.intake':
    case 'ops.route':
    case 'carbon.post':
    case 'compliance.gate':
    case 'identity.anchor':
    case 'ledger.append':
      return async (action: { capability: string; id: string }) => ({
        ok: true,
        capability: action.capability,
        actionId: action.id,
      });
    default:
      return assertNever(capability, 'unhandled specialist capability');
  }
}
