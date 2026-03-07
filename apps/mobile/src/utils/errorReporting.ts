import { logger } from './logger';

/**
 * Error reporting abstraction.
 *
 * Currently logs errors to console (dev) and console.error (prod).
 * Replace the implementation below with Sentry when integrated:
 *
 *   import * as Sentry from '@sentry/react-native';
 *   Sentry.init({ dsn: '...' });
 *
 * Then swap captureException/captureMessage to Sentry equivalents.
 */

interface ErrorContext {
  /** A short tag for the subsystem (e.g., 'scan', 'auth', 'upload') */
  source: string;
  /** Additional key-value data attached to the error report */
  extra?: Record<string, unknown>;
}

/**
 * Report an error to the error tracking service.
 */
export function captureException(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const source = context?.source ?? 'unknown';

  // Always log in production (logger.error is not suppressed in prod)
  logger.error(`[${source}] ${message}`, context?.extra);

  // TODO: Replace with Sentry.captureException(error, { tags: { source }, extra: context?.extra })
}

/**
 * Report a warning-level message (non-fatal).
 */
export function captureMessage(message: string, context?: ErrorContext): void {
  const source = context?.source ?? 'unknown';
  logger.warn(`[${source}] ${message}`, context?.extra);

  // TODO: Replace with Sentry.captureMessage(message, { tags: { source }, extra: context?.extra })
}

/**
 * Set the current user context for error reports.
 */
export function setUser(user: { id: string; email?: string; role?: string } | null): void {
  if (user) {
    logger.info(`Error reporting user set: ${user.id}`);
  }
  // TODO: Replace with Sentry.setUser(user)
}
