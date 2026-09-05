import {
  INTEGRATION_PROVIDER_KEYS,
  type IntegrationProviderKey,
} from './types.js';

/**
 * Server-side provider env probes for Integration Control Plane v0.1.
 *
 * Presence of an API key or URI does NOT mean the provider is CONNECTED,
 * AVAILABLE, live, or ready for outbound calls. v0.1 never reads secret
 * values into logs, audit events, or HTTP responses.
 *
 * Browser `VITE_*` variables are ignored on purpose.
 */
const SERVER_ENV_NAMES: Record<IntegrationProviderKey, readonly string[]> = {
  ROBOFLOW: ['ROBOFLOW_API_KEY'],
  HUGGINGFACE: ['HUGGINGFACE_API_KEY', 'HF_TOKEN'],
  TINKER: ['TINKER_API_KEY'],
  INKLING: ['INKLING_API_KEY', 'INKLING_WEIGHTS_URI'],
  HEYGEN: ['HEYGEN_API_KEY'],
  LANGGRAPH: ['LANGGRAPH_API_KEY', 'LANGSMITH_API_KEY'],
};

export type ProviderConfigProbe = {
  providerKey: IntegrationProviderKey;
  envVarPresent: boolean;
  statusIfKeyPresentStill: 'NOT_CONFIGURED';
};

export function providerEnvVarPresent(
  providerKey: IntegrationProviderKey,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return SERVER_ENV_NAMES[providerKey].some((name) => {
    const value = env[name];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function probeProviderConfig(
  providerKey: IntegrationProviderKey,
  env: NodeJS.ProcessEnv = process.env,
): ProviderConfigProbe {
  return {
    providerKey,
    envVarPresent: providerEnvVarPresent(providerKey, env),
    statusIfKeyPresentStill: 'NOT_CONFIGURED',
  };
}

export function probeAllProviderConfigs(
  env: NodeJS.ProcessEnv = process.env,
): ProviderConfigProbe[] {
  return INTEGRATION_PROVIDER_KEYS.map((providerKey) => probeProviderConfig(providerKey, env));
}

export function secretLikeFieldNames(): readonly string[] {
  return [
    'apiKey',
    'api_key',
    'token',
    'secret',
    'password',
    'authorization',
    'client_secret',
    'refresh_token',
    'access_token',
    'id_token',
    'jwt',
    'bearer',
    'rawPrompt',
    'rawDocument',
    'imageData',
    'providerResponse',
    'VITE_ROBOFLOW_API_KEY',
    'VITE_TINKER_API_KEY',
    'VITE_HEYGEN_API_KEY',
    'HUGGINGFACE_API_KEY',
    'ROBOFLOW_API_KEY',
    'TINKER_API_KEY',
    'HEYGEN_API_KEY',
    'LANGGRAPH_API_KEY',
  ] as const;
}
