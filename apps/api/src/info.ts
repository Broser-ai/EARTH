export const SERVICE_NAME = 'earth-api' as const;
export const SERVICE_VERSION = '0.1.0' as const;

/**
 * Explicitly false until a later, accepted wave implements them.
 * DEVELOPMENT ONLY — these flags must not be advertised as live connections.
 */
export const INTEGRATION_FLAGS = {
  postgres: false,
  authentication: false,
  primeRuntime: false,
  nanoChat: false,
  metaHarness: false,
  reinforcementLearning: false,
  externalApis: false,
  blockchain: false,
  digitalProductPassport: false,
} as const;

export type IntegrationName = keyof typeof INTEGRATION_FLAGS;

export function describeIntegration(name: IntegrationName): string {
  switch (name) {
    case 'postgres':
      return 'no database in this wave';
    case 'authentication':
      return 'no identity or auth in this wave';
    case 'primeRuntime':
      return 'PRIME runtime is out of scope';
    case 'nanoChat':
      return 'NanoChat is out of scope';
    case 'metaHarness':
      return 'Meta Harness is out of scope';
    case 'reinforcementLearning':
      return 'RL is out of scope';
    case 'externalApis':
      return 'no outbound vendor or authority calls';
    case 'blockchain':
      return 'no chain node or wallet';
    case 'digitalProductPassport':
      return 'DPP is out of scope';
    default: {
      const exhaustive: never = name;
      return exhaustive;
    }
  }
}
