import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import type { Profile } from '@rgr/shared';

/**
 * Initialize Sentry error reporting.
 * Call once at app startup (module scope in _layout.tsx).
 * Disabled in __DEV__ so dev errors stay local.
 */
export function initSentry(): void {
  const dsn = Constants.expoConfig?.extra?.['sentryDsn'] || process.env['EXPO_PUBLIC_SENTRY_DSN'];

  if (!dsn) return;

  const slug = Constants.expoConfig?.slug ?? 'rgr-mobile';
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber ?? '0';

  Sentry.init({
    dsn,
    enabled: !__DEV__,
    tracesSampleRate: 0,
    environment: __DEV__ ? 'development' : 'production',
    release: `${slug}@${version}+${buildNumber}`,
  });
}

/**
 * Set or clear the Sentry user context.
 * Call when auth state changes.
 */
export function setSentryUser(profile: Profile | null): void {
  if (profile) {
    Sentry.setUser({ id: profile.id, email: profile.email });
    Sentry.setTag('role', profile.role);
    Sentry.setTag('depot', profile.depot ?? 'none');
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Capture an error in Sentry with optional extra context.
 * Handles `unknown` error types safely.
 *
 * NOTE: Do NOT import logger.ts here — this module is imported by logger.ts.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  const exception = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(exception, context ? { extra: context } : undefined);
}
