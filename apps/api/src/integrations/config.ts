import { assertNever } from '../contracts.js';
import {
  INTEGRATION_PROVIDER_KEYS,
  type IntegrationProviderKey,
  type ProviderRuntimeConfig,
} from './types.js';

const ENABLED_ENV: Record<IntegrationProviderKey, string> = {
  ROBOFLOW: 'EARTH_INTEGRATION_ROBOFLOW_ENABLED',
  HUGGINGFACE: 'EARTH_INTEGRATION_HUGGINGFACE_ENABLED',
  TINKER: 'EARTH_INTEGRATION_TINKER_ENABLED',
  INKLING: 'EARTH_INTEGRATION_INKLING_ENABLED',
  HEYGEN: 'EARTH_INTEGRATION_HEYGEN_ENABLED',
  LANGGRAPH: 'EARTH_INTEGRATION_LANGGRAPH_ENABLED',
};

const CREDENTIAL_ENV: Record<IntegrationProviderKey, readonly string[]> = {
  ROBOFLOW: ['EARTH_INTEGRATION_ROBOFLOW_API_KEY', 'ROBOFLOW_API_KEY'],
  HUGGINGFACE: ['EARTH_INTEGRATION_HUGGINGFACE_TOKEN', 'HF_TOKEN', 'HUGGINGFACE_TOKEN'],
  TINKER: ['EARTH_INTEGRATION_TINKER_API_KEY', 'TINKER_API_KEY'],
  INKLING: ['EARTH_INTEGRATION_INKLING_WEIGHTS_URI', 'INKLING_WEIGHTS_URI'],
  HEYGEN: ['EARTH_INTEGRATION_HEYGEN_API_KEY', 'HEYGEN_API_KEY'],
  LANGGRAPH: ['EARTH_INTEGRATION_LANGGRAPH_ENABLED'],
};

const SECRET_NAME_RE =
  /(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|AUTHORIZATION|BEARER|HF_TOKEN)/i;

export interface IntegrationRuntimeConfig {
  providers: Record<IntegrationProviderKey, ProviderRuntimeConfig>;
}

export function loadIntegrationConfig(env: NodeJS.ProcessEnv = process.env): IntegrationRuntimeConfig {
  assertNoViteIntegrationSecrets(env);
  const providers = {} as Record<IntegrationProviderKey, ProviderRuntimeConfig>;
  for (const providerKey of INTEGRATION_PROVIDER_KEYS) {
    providers[providerKey] = loadProviderRuntimeConfig(providerKey, env);
  }
  return { providers };
}

export function loadProviderRuntimeConfig(
  providerKey: IntegrationProviderKey,
  env: NodeJS.ProcessEnv = process.env,
): ProviderRuntimeConfig {
  switch (providerKey) {
    case 'ROBOFLOW':
    case 'HUGGINGFACE':
    case 'TINKER':
    case 'INKLING':
    case 'HEYGEN':
    case 'LANGGRAPH':
      return {
        providerKey,
        enabled: envFlagTrue(env[ENABLED_ENV[providerKey]]),
        credentialPresent: credentialPresent(providerKey, env),
      };
    default:
      return assertNever(providerKey);
  }
}

export function assertNoViteIntegrationSecrets(env: NodeJS.ProcessEnv = process.env): void {
  const offenders: string[] = [];
  for (const name of Object.keys(env)) {
    if (!name.startsWith('VITE_')) {
      continue;
    }
    if (SECRET_NAME_RE.test(name) || /ROBOFLOW|TINKER|INKLING|HUGGING|HEYGEN|LANGGRAPH|HF_/i.test(name)) {
      offenders.push(name);
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      `VITE_* integration secrets are forbidden (bundled into the browser): ${offenders.join(', ')}`,
    );
  }
}

export function credentialEnvNames(providerKey: IntegrationProviderKey): readonly string[] {
  return CREDENTIAL_ENV[providerKey];
}

function credentialPresent(providerKey: IntegrationProviderKey, env: NodeJS.ProcessEnv): boolean {
  if (providerKey === 'LANGGRAPH') {
    return envFlagTrue(env.EARTH_INTEGRATION_LANGGRAPH_ENABLED);
  }
  return CREDENTIAL_ENV[providerKey].some((name) => hasNonEmpty(env[name]));
}

function envFlagTrue(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function hasNonEmpty(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}
