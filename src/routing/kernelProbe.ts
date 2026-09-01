/**
 * Read-only probe for Tinker / Inkling / Roboflow.
 * Does not own kernel adapter files — a sibling agent writes those.
 * Vite globs keep missing modules a runtime absence, not a compile error.
 */

import { assertNever } from '../sovereign/types.ts';

export type AdapterId = 'roboflow' | 'inkling' | 'tinker';

export type AdapterPresence = 'mcp_ready' | 'mcp_needs_auth' | 'absent' | 'awaiting_kernel';

export interface AdapterUplink {
  id: AdapterId;
  product: string;
  vendor: string;
  role: string;
  note: string;
  presence: AdapterPresence;
  modulePresent: boolean;
  runtimeLinked: boolean;
  linkedKey?: string;
}

interface InventoryRow {
  id: string;
  product: string;
  vendor: string;
  presence: string;
  role: string;
  note: string;
}

const FALLBACK: readonly Omit<AdapterUplink, 'modulePresent' | 'runtimeLinked' | 'linkedKey'>[] = [
  {
    id: 'roboflow',
    product: 'Roboflow',
    vendor: 'Roboflow',
    presence: 'awaiting_kernel',
    role: 'Vision observations for S-Agent vision.infer',
    note: 'Adapter module not on this branch yet — /mission/vision is the reserved flight path.',
  },
  {
    id: 'inkling',
    product: 'Inkling',
    vendor: 'Thinking Machines Lab',
    presence: 'awaiting_kernel',
    role: 'Prime Agent policy brain (untrained until Tinker weights exist)',
    note: 'Adapter module not on this branch yet — /mission/prime is the reserved flight path.',
  },
  {
    id: 'tinker',
    product: 'Tinker',
    vendor: 'Thinking Machines Lab',
    presence: 'awaiting_kernel',
    role: 'Fine-tune backend; Prime trajectories are the dataset',
    note: 'Adapter module not on this branch yet — /mission/prime is the reserved flight path.',
  },
];

const discoveryGlob = import.meta.glob<{ SETUP_INVENTORY?: readonly InventoryRow[] }>(
  '../sovereign/adapters/discovery.ts',
  { eager: true },
);

const visionGlob = import.meta.glob('../sovereign/vision/**/*.ts', { eager: true });
const inklingGlob = import.meta.glob<{ EARTH_DEFAULT_LESSON?: { id: string; title: string } }>(
  '../sovereign/prime/inkling/**/*.ts',
  { eager: true },
);
const tinkerGlob = import.meta.glob('../sovereign/prime/tinker/**/*.ts', { eager: true });

const RUNTIME_KEYS: Record<AdapterId, readonly string[]> = {
  roboflow: ['roboflow', 'vision', 'visionAdapter'],
  inkling: ['inkling', 'inklingClient', 'policyBrain'],
  tinker: ['tinker', 'tinkerClient', 'rlTrainer'],
};

function asAdapterId(value: string): AdapterId | null {
  if (value === 'roboflow' || value === 'inkling' || value === 'tinker') return value;
  return null;
}

function asPresence(value: string): AdapterPresence {
  if (value === 'mcp_ready' || value === 'mcp_needs_auth' || value === 'absent' || value === 'awaiting_kernel') {
    return value;
  }
  return 'awaiting_kernel';
}

function inventoryRows(): InventoryRow[] {
  for (const mod of Object.values(discoveryGlob)) {
    if (mod.SETUP_INVENTORY) return [...mod.SETUP_INVENTORY];
  }
  return FALLBACK.map((row) => ({
    id: row.id,
    product: row.product,
    vendor: row.vendor,
    presence: row.presence,
    role: row.role,
    note: row.note,
  }));
}

function modulePresent(id: AdapterId): boolean {
  switch (id) {
    case 'roboflow':
      return Object.keys(visionGlob).length > 0 || Object.keys(discoveryGlob).length > 0;
    case 'inkling':
      return Object.keys(inklingGlob).length > 0 || Object.keys(discoveryGlob).length > 0;
    case 'tinker':
      return Object.keys(tinkerGlob).length > 0 || Object.keys(discoveryGlob).length > 0;
    default:
      return assertNever(id, 'unknown adapter id');
  }
}

function runtimeLink(runtime: object, id: AdapterId): { linked: boolean; key?: string } {
  const bag = runtime as Record<string, unknown>;
  for (const key of RUNTIME_KEYS[id]) {
    if (key in bag && bag[key] != null) return { linked: true, key };
  }
  return { linked: false };
}

export function probeAdapters(runtime?: object): AdapterUplink[] {
  const rows = inventoryRows();
  const byId = new Map(rows.map((row) => [row.id, row]));

  return FALLBACK.map((fallback) => {
    const row = byId.get(fallback.id);
    const link = runtime ? runtimeLink(runtime, fallback.id) : { linked: false };
    return {
      id: fallback.id,
      product: row?.product ?? fallback.product,
      vendor: row?.vendor ?? fallback.vendor,
      role: row?.role ?? fallback.role,
      note: row?.note ?? fallback.note,
      presence: row ? asPresence(row.presence) : fallback.presence,
      modulePresent: modulePresent(fallback.id),
      runtimeLinked: link.linked,
      linkedKey: link.key,
    };
  });
}

export function probeAdapter(id: AdapterId, runtime?: object): AdapterUplink {
  const found = probeAdapters(runtime).find((row) => row.id === id);
  if (!found) {
    const fallback = FALLBACK.find((row) => row.id === id);
    if (!fallback) throw new Error(`unknown adapter ${id}`);
    return { ...fallback, modulePresent: false, runtimeLinked: false };
  }
  return found;
}

export function presenceTone(presence: AdapterPresence): 'success' | 'amber' | 'muted' {
  switch (presence) {
    case 'mcp_ready':
      return 'success';
    case 'mcp_needs_auth':
      return 'amber';
    case 'absent':
    case 'awaiting_kernel':
      return 'muted';
    default:
      return assertNever(presence, 'unknown adapter presence');
  }
}

export function presenceLabel(presence: AdapterPresence): string {
  switch (presence) {
    case 'mcp_ready':
      return 'MCP READY';
    case 'mcp_needs_auth':
      return 'MCP AUTH';
    case 'absent':
      return 'NO MCP';
    case 'awaiting_kernel':
      return 'AWAITING KERNEL';
    default:
      return assertNever(presence, 'unknown adapter presence');
  }
}

export function inklingLesson(): { id: string; title: string } | null {
  for (const mod of Object.values(inklingGlob)) {
    if (mod.EARTH_DEFAULT_LESSON) return mod.EARTH_DEFAULT_LESSON;
  }
  return null;
}

void asAdapterId;
