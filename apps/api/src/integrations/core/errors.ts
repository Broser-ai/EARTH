import type { IntegrationReasonCode } from '../types.js';

export class IntegrationError extends Error {
  readonly status: number;
  readonly code: IntegrationReasonCode;

  constructor(status: number, code: IntegrationReasonCode, message: string) {
    super(message);
    this.name = 'IntegrationError';
    this.status = status;
    this.code = code;
  }
}

export class IntegrationNotImplementedError extends IntegrationError {
  constructor(message = 'Provider execution is not implemented in Integration Control Plane v0.1.') {
    super(501, 'INTEGRATION_OPERATION_NOT_IMPLEMENTED', message);
    this.name = 'IntegrationNotImplementedError';
  }
}
