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
