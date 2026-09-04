import type { CapabilityNodeSpec } from '../types.ts';

export class CapabilityTree {
  private readonly index = new Map<string, CapabilityNodeSpec>();

  constructor(readonly root: CapabilityNodeSpec) {
    this.indexNode(root);
  }

  can(capability: string): boolean {
    if (capability === this.root.id) return true;
    return this.index.has(capability);
  }

  node(id: string): CapabilityNodeSpec | undefined {
    return this.index.get(id);
  }

  ids(): string[] {
    return [...this.index.keys()];
  }

  private indexNode(node: CapabilityNodeSpec): void {
    this.index.set(node.id, node);
    for (const child of node.children) this.indexNode(child);
  }
}

export function buildEarthCapabilityTree(): CapabilityTree {
  const leaf = (id: string, label: string): CapabilityNodeSpec => ({
    id,
    label,
    children: [],
  });

  return new CapabilityTree({
    id: 'earth',
    label: 'EARTH sovereign runtime',
    children: [
      {
        id: 'mission',
        label: 'Mission',
        children: [leaf('mission.prime', 'Prime Agent policy')],
      },
      {
        id: 'swarm',
        label: 'Swarm',
        children: [leaf('swarm.coordinate', 'H-Agent coordinator')],
      },
      {
        id: 'ops',
        label: 'Operations',
        children: [leaf('ops.intake', 'Intake recording'), leaf('ops.route', 'Route / logistics')],
      },
      {
        id: 'vision',
        label: 'Vision',
        children: [leaf('vision.infer', 'Material / intake inference')],
      },
      {
        id: 'carbon',
        label: 'Carbon',
        children: [leaf('carbon.post', 'E-liability posting')],
      },
      {
        id: 'compliance',
        label: 'Compliance',
        children: [leaf('compliance.gate', 'Regulatory gate')],
      },
      {
        id: 'identity',
        label: 'Identity',
        children: [leaf('identity.anchor', 'DID anchor'), leaf('ledger.append', 'Hash-chain append')],
      },
    ],
  });
}

export const SPECIALIST_CAPABILITIES = [
  'ops.intake',
  'ops.route',
  'carbon.post',
  'compliance.gate',
  'identity.anchor',
  'ledger.append',
  'vision.infer',
] as const;

export type SpecialistCapability = (typeof SPECIALIST_CAPABILITIES)[number];
