/** RFC 9457 problem details, as returned by every backend error. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  /** Stable machine-readable error code, e.g. "invalid_credentials". */
  code?: string;
  /** Validation errors: field -> message. */
  errors?: Record<string, string>;
}

/** The backend's stable pagination envelope. `page` is zero-based. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageParams {
  page?: number;
  size?: number;
  /** `field,asc` or `field,desc`. */
  sort?: string;
}

export interface MessageResponse {
  message: string;
}
