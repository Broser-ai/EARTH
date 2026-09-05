export interface InjectedTransport {
  request(url: string, init: RequestInit): Promise<{ status: number; json(): Promise<unknown> }>;
}

/** Internal capability probe. Not a public Inkling HTTP endpoint. */
export const INKLING_CAPABILITY_URL = 'earth://internal/integrations/inkling/capability';

/** Internal policy-artifact INTENT submit. Not live inference. */
export const INKLING_INTENT_URL = 'earth://internal/integrations/inkling/policy-artifact-intent';
