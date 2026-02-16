/**
 * Standard service result wrapper for error handling
 */
export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

// Re-export all types from subdirectories
export * from './api/auth';
export * from './enums';
export * from './entities';
export * from './location';
