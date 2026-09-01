import { SETUP_INVENTORY } from './discovery.ts';
import type { EarthSecretPresence } from '../config/env.ts';
import type { InklingBrain } from '../prime/inkling/InklingBrain.ts';
import type { TinkerTrainer } from '../prime/tinker/TinkerTrainer.ts';
import { assertNever } from '../types.ts';
import type { RoboflowVisionAdapter } from '../vision/roboflow/RoboflowVisionAdapter.ts';

export type AdapterLink = 'connected' | 'stub' | 'untrained';
export type AdapterId = 'roboflow' | 'inkling' | 'tinker';

export interface AdapterHudStatus {
  id: AdapterId;
  product: string;
  role: string;
  link: AdapterLink;
  hasCredential: boolean;
  trained: boolean;
  detail: string;
}

export function adapterLinkTone(link: AdapterLink): 'accent' | 'amber' | 'muted' {
  switch (link) {
    case 'connected':
      return 'accent';
    case 'untrained':
      return 'amber';
    case 'stub':
      return 'muted';
    default:
      return assertNever(link, 'unhandled adapter link');
  }
}

export function buildAdapterStatuses(input: {
  vision: RoboflowVisionAdapter;
  inkling: InklingBrain;
  tinker: TinkerTrainer;
  secrets: EarthSecretPresence;
}): AdapterHudStatus[] {
  return SETUP_INVENTORY.map((item) => {
    switch (item.id) {
      case 'roboflow':
        return roboflowStatus(input.vision, input.secrets.roboflowApiKey, item.role, item.note);
      case 'inkling':
        return inklingStatus(input.inkling, input.secrets.inklingWeightsUri, item.role, item.note);
      case 'tinker':
        return tinkerStatus(input.tinker, input.secrets.tinkerApiKey, item.role, item.note);
      default:
        return assertNever(item.id, 'unhandled adapter inventory id');
    }
  });
}

function roboflowStatus(
  vision: RoboflowVisionAdapter,
  hasCredential: boolean,
  role: string,
  note: string,
): AdapterHudStatus {
  const live = vision.mode() === 'live';
  return {
    id: 'roboflow',
    product: 'Roboflow',
    role,
    link: live ? 'connected' : 'stub',
    hasCredential,
    trained: live,
    detail: live ? 'live HTTP client injected' : note,
  };
}

function inklingStatus(
  brain: InklingBrain,
  hasCredential: boolean,
  role: string,
  note: string,
): AdapterHudStatus {
  const trained = brain.trained();
  const live = brain.policy.liveInference;
  let link: AdapterLink;
  if (live) {
    link = 'connected';
  } else if (trained) {
    link = 'stub';
  } else {
    link = 'untrained';
  }

  return {
    id: 'inkling',
    product: 'Inkling',
    role,
    link,
    hasCredential,
    trained,
    detail: trained
      ? live
        ? `weights ${brain.policy.weightsUri()}`
        : `fixture weights ${brain.policy.weightsUri()} — not live inference`
      : note,
  };
}

function tinkerStatus(
  trainer: TinkerTrainer,
  hasCredential: boolean,
  role: string,
  note: string,
): AdapterHudStatus {
  const live = trainer.mode() !== 'stub';
  const last = trainer.lastSubmitted();
  return {
    id: 'tinker',
    product: 'Tinker',
    role,
    link: live ? 'connected' : 'stub',
    hasCredential,
    trained: last?.status === 'completed' && Boolean(last.weightsUri),
    detail: last ? `last job ${last.id} ${last.status}` : note,
  };
}
