import type { ServiceResult } from '../types';

/**
 * Typed error class for service layer failures.
 * Allows consumers to discriminate service errors from unexpected exceptions
 * using `instanceof ServiceError`.
 */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Transforms a service function returning ServiceResult<T>
 * into a React Query-compatible queryFn (throws on error, returns T).
 */
export function queryFromService<T>(serviceFn: () => Promise<ServiceResult<T>>): () => Promise<T> {
  return async () => {
    const result = await serviceFn();
    if (!result.success) {
      throw new ServiceError(result.error);
    }
    return result.data;
  };
}
