export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "INTERNAL_ERROR"
  | "DB_ERROR"
  | "EXTERNAL_SERVICE_ERROR";

export interface ErrorContext {
  code: ErrorCode;
  statusCode: number;
  detail?: Record<string, unknown>;
}

export class ApplicationError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly detail?: Record<string, unknown>;
  public readonly timestamp = new Date().toISOString();

  constructor(message: string, context: ErrorContext) {
    super(message);
    this.name = "ApplicationError";
    this.code = context.code;
    this.statusCode = context.statusCode;
    this.detail = context.detail;
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }

  toJSON() {
    return { error: this.message, code: this.code, detail: this.detail, timestamp: this.timestamp };
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, detail?: Record<string, unknown>) {
    super(message, { code: "VALIDATION_ERROR", statusCode: 400, detail });
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = "Não autenticado") {
    super(message, { code: "UNAUTHORIZED", statusCode: 401 });
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = "Acesso negado") {
    super(message, { code: "FORBIDDEN", statusCode: 403 });
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string = "Recurso não encontrado") {
    super(message, { code: "NOT_FOUND", statusCode: 404 });
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, detail?: Record<string, unknown>) {
    super(message, { code: "CONFLICT", statusCode: 409, detail });
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends ApplicationError {
  constructor(message: string = "Muitas requisições. Tente novamente mais tarde.") {
    super(message, { code: "RATE_LIMIT", statusCode: 429 });
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, detail?: Record<string, unknown>) {
    super(message, { code: "DB_ERROR", statusCode: 500, detail });
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(service: string, message?: string) {
    super(message || `Erro ao conectar com ${service}`, { code: "EXTERNAL_SERVICE_ERROR", statusCode: 503, detail: { service } });
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

export function isApplicationError(err: unknown): err is ApplicationError {
  return err instanceof ApplicationError;
}

export function parseDatabaseError(err: any): ApplicationError {
  const pgErr = err as { code?: string; constraint?: string; detail?: string };
  if (pgErr.code === "23505") return new ConflictError("Registro duplicado.", { constraint: pgErr.constraint });
  if (pgErr.code === "23503") return new ValidationError("Referência inválida.", { constraint: pgErr.constraint, detail: pgErr.detail });
  if (pgErr.code === "23514") return new ValidationError("Dados inválidos.", { constraint: pgErr.constraint });
  return new DatabaseError("Erro ao acessar banco de dados");
}
