/**
 * Wrapper padrão para respostas de API
 * Uso: res.json(new ApiResponse(data, "Demanda criada com sucesso"))
 */

export interface ApiResponseData<T> {
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  detail?: Record<string, unknown>;
  requestId?: string;
  timestamp: string;
}

export class ApiResponse<T> {
  public readonly data: T;
  public readonly message?: string;
  public readonly timestamp: string;

  constructor(data: T, message?: string) {
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): ApiResponseData<T> {
    return {
      data: this.data,
      message: this.message,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Helper para paginated responses
 */
export class PaginatedResponse<T> extends ApiResponse<T[]> {
  constructor(
    data: T[],
    public readonly total: number,
    public readonly limit: number,
    public readonly offset: number,
    message?: string
  ) {
    super(data, message);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      pagination: {
        total: this.total,
        limit: this.limit,
        offset: this.offset,
        hasMore: this.offset + this.limit < this.total,
      },
    };
  }
}

/**
 * Type guard para ApplicationError
 */
export function isApplicationError(err: unknown): err is {
  code: string;
  statusCode: number;
  message: string;
  toJSON: () => any;
} {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "statusCode" in err &&
    "message" in err &&
    "toJSON" in err
  );
}
