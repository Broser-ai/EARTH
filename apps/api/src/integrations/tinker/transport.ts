export interface InjectedTransport {
  request(url: string, init: RequestInit): Promise<{ status: number; json(): Promise<unknown> }>;
}

/** Internal capability probe. Not a public Tinker HTTP endpoint. */
export const TINKER_CAPABILITY_URL = 'earth://internal/integrations/tinker/capability';

/** Internal training-job INTENT submit. Not a live fine-tune API. */
export const TINKER_INTENT_URL = 'earth://internal/integrations/tinker/training-job-intent';
