/**
 * Adapter credentials — env interface only.
 *
 * Never log these values. Never commit keys.
 * `VITE_*` copies are bundled into the browser; do not put real secrets there.
 * Live Roboflow/Tinker clients attach from a non-browser worker when credentials exist.
 */

export interface EarthSecretPresence {
  roboflowApiKey: boolean;
  tinkerApiKey: boolean;
  inklingWeightsUri: boolean;
}

function emptyToUndef(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readProcessEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const env = proc?.env;
  if (!env) return undefined;
  return emptyToUndef(env[name]) ?? emptyToUndef(env[`VITE_${name}`]);
}

function readViteEnv(name: string): string | undefined {
  const meta = import.meta.env as ImportMetaEnv & Record<string, string | undefined>;
  return emptyToUndef(meta[name]) ?? emptyToUndef(meta[`VITE_${name}`]);
}

export function readEarthSecret(name: 'ROBOFLOW_API_KEY' | 'TINKER_API_KEY' | 'INKLING_WEIGHTS_URI'): string | undefined {
  return readProcessEnv(name) ?? readViteEnv(name) ?? readViteEnv(`VITE_${name}`);
}

export function readEarthSecretPresence(): EarthSecretPresence {
  return {
    roboflowApiKey: Boolean(readEarthSecret('ROBOFLOW_API_KEY')),
    tinkerApiKey: Boolean(readEarthSecret('TINKER_API_KEY')),
    inklingWeightsUri: Boolean(readEarthSecret('INKLING_WEIGHTS_URI')),
  };
}
