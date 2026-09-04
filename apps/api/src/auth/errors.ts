export class AuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

export class RoleForbiddenError extends AuthError {
  constructor(message: string) {
    super(403, 'ROLE_FORBIDDEN', message);
    this.name = 'RoleForbiddenError';
  }
}

export class AccountNotProvisionedError extends AuthError {
  constructor() {
    super(
      403,
      'AUTHORIZED_ACCOUNT_NOT_PROVISIONED',
      'The authenticated subject is not provisioned in EARTH. No organization or role was granted from the token.',
    );
    this.name = 'AccountNotProvisionedError';
  }
}
