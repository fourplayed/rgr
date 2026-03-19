/**
 * Generic retry wrapper with exponential backoff.
 *
 * Unlike the simpler `retry()` in index.ts, this supports:
 * - A `shouldRetry` predicate to skip non-retryable errors
 * - A `maxDelayMs` cap to prevent excessively long waits
 */

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms, doubled each attempt. Default: 1000 */
  baseDelayMs?: number;
  /** Maximum delay cap in ms. Default: 30000 */
  maxDelayMs?: number;
  /** Optional predicate — return false to stop retrying early. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/** Compute exponential backoff delay for a given attempt (1-indexed). */
export function backoffDelay(attempt: number, baseDelayMs = 1000, maxDelayMs = 30000): number {
  return Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 30000, shouldRetry } = options;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      if (shouldRetry && !shouldRetry(error, attempt)) break;
      await new Promise((resolve) =>
        setTimeout(resolve, backoffDelay(attempt, baseDelayMs, maxDelayMs))
      );
    }
  }
  throw lastError;
}
