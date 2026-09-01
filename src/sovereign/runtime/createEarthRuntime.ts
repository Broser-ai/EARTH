import { EarthBus } from '../bus/EarthBus.ts';
import { CompassGate } from '../compass/CompassGate.ts';
import { ELiabilityGraph } from '../eliability/ELiabilityGraph.ts';
import { seedHornbachSpine } from '../eliability/seed.ts';
import { HashChainLedger } from '../identity/HashChainLedger.ts';
import { issueDid } from '../identity/did.ts';
import { MISSION_CATALOG } from '../missions/catalog.ts';
import { DeterministicFallbackPolicy } from '../prime/DeterministicFallbackPolicy.ts';
import { InklingBrain } from '../prime/inkling/InklingBrain.ts';
import { InklingPolicy } from '../prime/inkling/InklingPolicy.ts';
import { EARTH_DEFAULT_LESSON, type InklingWeights } from '../prime/inkling/types.ts';
import { PrimeAgent } from '../prime/PrimeAgent.ts';
import type { RlPolicy } from '../prime/UntrainedRlPolicy.ts';
import {
  CredentialedTinkerClient,
  StubTinkerClient,
  type TinkerClient,
} from '../prime/tinker/client.ts';
import { TinkerTrainer } from '../prime/tinker/TinkerTrainer.ts';
import { createDefaultSwarm } from '../swarm/createDefaultSwarm.ts';
import type { EarthCtx } from '../types.ts';
import { StubRoboflowClient, type RoboflowClient } from '../vision/roboflow/client.ts';
import { RoboflowVisionAdapter } from '../vision/roboflow/RoboflowVisionAdapter.ts';
import { readEarthSecretPresence } from '../config/env.ts';
import { EarthRuntime } from './EarthRuntime.ts';

export interface EarthRuntimeOptions {
  policy?: RlPolicy;
  visionClient?: RoboflowClient;
  tinkerClient?: TinkerClient;
  inklingWeights?: InklingWeights | null;
  attachDefaultLesson?: boolean;
}

export function createEarthRuntime(options: EarthRuntimeOptions = {}): EarthRuntime {
  const bus = new EarthBus();
  const compass = new CompassGate();
  const secrets = readEarthSecretPresence();
  const visionClient = options.visionClient ?? new StubRoboflowClient();
  const vision = new RoboflowVisionAdapter(bus, visionClient);
  const swarm = createDefaultSwarm({ bus, compass, vision });
  const inkling =
    options.policy instanceof InklingPolicy ? new InklingBrain(options.policy) : new InklingBrain();
  if (options.inklingWeights) {
    inkling.policy.attachWeights(options.inklingWeights);
  }
  if (options.attachDefaultLesson !== false) {
    inkling.attachLesson(EARTH_DEFAULT_LESSON);
  }
  const prime = new PrimeAgent({
    policy: options.policy ?? inkling.policy,
    fallback: new DeterministicFallbackPolicy(),
  });
  const tinkerClient =
    options.tinkerClient ??
    (secrets.tinkerApiKey ? new CredentialedTinkerClient() : new StubTinkerClient());
  const tinker = new TinkerTrainer(bus, tinkerClient);
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
    vision,
    inkling,
    tinker,
    secrets,
  });
}
