import type { ServiceResult } from '../types';

/**
 * Transforms a service function returning ServiceResult<T>
 * into a React Query-compatible queryFn (throws on error, returns T).
 */
export function queryFromService<T>(serviceFn: () => Promise<ServiceResult<T>>): () => Promise<T> {
  return async () => {
    const result = await serviceFn();
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  };
}
