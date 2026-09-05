/**
 * Adapter credentials — env interface only.
 *
 * Never log these values. Never commit keys.
 * Vite inlines `VITE_*` into the browser bundle, so EARTH never reads
 * `VITE_ROBOFLOW_API_KEY`, `VITE_TINKER_API_KEY`, or `VITE_INKLING_WEIGHTS_URI`.
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
  return emptyToUndef(env[name]);
}

export function readEarthSecret(
  name: 'ROBOFLOW_API_KEY' | 'TINKER_API_KEY' | 'INKLING_WEIGHTS_URI',
): string | undefined {
  return readProcessEnv(name);
}

export function readEarthSecretPresence(): EarthSecretPresence {
  return {
    roboflowApiKey: Boolean(readEarthSecret('ROBOFLOW_API_KEY')),
    tinkerApiKey: Boolean(readEarthSecret('TINKER_API_KEY')),
    inklingWeightsUri: Boolean(readEarthSecret('INKLING_WEIGHTS_URI')),
  };
}
