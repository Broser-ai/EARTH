import type { MissionSpec, ProposedAction } from '../types.ts';

const ACTOR = 'did:earth:operator';

function task(
  id: string,
  capability: ProposedAction['capability'],
  intent: string,
  payload: Record<string, unknown>,
  risk: ProposedAction['risk'] = 'low',
): ProposedAction {
  return { id, capability, intent, actorDid: ACTOR, risk, payload };
}

const CLEAN: Record<string, unknown> = {
  jurisdiction: 'DE',
  laborFairness: 0.88,
  kgCO2e: 6,
  method: 'measured',
  eudrDeforestationIndex: 0.01,
};

export const MISSION_CATALOG: MissionSpec[] = [
  {
    id: 'mission-cbam',
    title: 'CBAM cache fallback',
    tasks: [
      task('cbam-route', 'ops.route', 'Cache carbon-price lookup with 8s fallback', {
        ...CLEAN,
        kgCO2e: 2,
      }),
    ],
  },
  {
    id: 'mission-ontology',
    title: 'rPET ontology reclass',
    tasks: [
      task('rpet-intake', 'ops.intake', 'Reclass rPET under recycled taxonomy', {
        ...CLEAN,
        material: 'rPET',
      }),
      task('rpet-carbon', 'carbon.post', 'Post reclass carbon delta', {
        ...CLEAN,
        kgCO2e: 18,
        method: 'calculated',
      }),
    ],
  },
  {
    id: 'mission-vision-intake',
    title: 'Vision intake observe',
    tasks: [
      task('vision-pallet', 'vision.infer', 'Identify inbound material from intake photo', {
        ...CLEAN,
        imageUrl: 'https://earth.local/intake/stub.jpg',
        materialHint: 'rPET',
      }),
    ],
  },
  {
    id: 'mission-ethics-block',
    title: 'Ethics floor — supplier labor',
    tasks: [
      task('ethics-supplier', 'compliance.gate', 'Score supplier SUP-BR-001', {
        jurisdiction: 'DE',
        laborFairness: 0.31,
        kgCO2e: 8,
        method: 'measured',
        eudrDeforestationIndex: 0.01,
      }),
    ],
  },
];

export const WARGAME_BLOCKED: ProposedAction = task(
  'wargame-batch-br',
  'compliance.gate',
  'Clear material batch MB-2026-0451 from SUP-BR-001',
  {
    jurisdiction: 'BR',
    laborFairness: 0.31,
    kgCO2e: 40,
    method: 'estimated',
    eudrDeforestationIndex: 0.082,
  },
  'high',
);

export const WARGAME_ALTERNATE: ProposedAction = task(
  'wargame-batch-de',
  'ops.intake',
  'Source 15.2t rPET from SUP-DE-044',
  {
    jurisdiction: 'DE',
    laborFairness: 0.86,
    kgCO2e: 22,
    method: 'measured',
    eudrDeforestationIndex: 0.01,
    supplier: 'SUP-DE-044',
    tonnes: 15.2,
  },
);
