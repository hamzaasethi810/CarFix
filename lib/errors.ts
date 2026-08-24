export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

const STATUS: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export const unauthenticated = () => new AppError("UNAUTHENTICATED", "Please sign in to continue.");
export const forbidden = () => new AppError("FORBIDDEN", "You do not have access to that.");
export const notFound = () => new AppError("NOT_FOUND", "Not found.");
export const conflict = (m: string) => new AppError("CONFLICT", m);
export const validation = (m: string, details?: unknown) => new AppError("VALIDATION", m, details);
export const rateLimited = () => new AppError("RATE_LIMITED", "Too many requests. Please try again shortly.");
