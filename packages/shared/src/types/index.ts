/**
 * Standard service result wrapper for error handling.
 *
 * A discriminated union that makes invalid states unrepresentable.
 * The `success` field acts as the discriminant for type narrowing.
 *
 * @example
 * ```typescript
 * const result = await someService();
 * if (!result.success) {
 *   console.error(result.error); // string
 *   return;
 * }
 * console.log(result.data); // T (narrowed)
 * ```
 */
export type ServiceResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

/**
 * Paginated result wrapper for list endpoints.
 * Extracted here so all services can share it.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Present when using cursor-based pagination — indicates more pages available */
  hasMore?: boolean;
}

// Re-export all types from subdirectories
export * from './api/auth';
export * from './enums';
export * from './entities';
export * from './location';
