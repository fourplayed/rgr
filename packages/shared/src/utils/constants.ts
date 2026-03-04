/**
 * Application constants
 *
 * Shared constants used across the application.
 */

/**
 * Default pagination page size
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Maximum pagination page size
 */
export const MAX_PAGE_SIZE = 100;

/**
 * QR code protocol prefix
 */
export const QR_CODE_PREFIX = 'rgr://asset/';

/**
 * Regex pattern for asset numbers
 * Trailers: TL### (e.g., TL001, TL042)
 * Dollies: DL### (e.g., DL001, DL015)
 */
export const ASSET_NUMBER_REGEX = /^(TL|DL)[0-9]{3,}$/;

/**
 * Regex pattern for trailer asset numbers
 */
export const TRAILER_NUMBER_REGEX = /^TL[0-9]{3,}$/;

/**
 * Regex pattern for dolly asset numbers
 */
export const DOLLY_NUMBER_REGEX = /^DL[0-9]{3,}$/;

/**
 * Session refresh threshold (5 minutes before expiry)
 */
export const SESSION_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * CSRF token lifetime
 */
export const CSRF_TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour

/**
 * Default debounce delay for search inputs
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Default throttle for location updates
 */
export const LOCATION_THROTTLE_MS = 10 * 1000; // 10 seconds

/**
 * Maximum photo upload size (10MB)
 */
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Supported image MIME types
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/**
 * API timeout duration
 */
export const API_TIMEOUT_MS = 30 * 1000; // 30 seconds

/**
 * Retry configuration for network requests
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Date format strings
 */
export const DATE_FORMATS = {
  display: 'dd MMM yyyy',
  displayWithTime: 'dd MMM yyyy HH:mm',
  iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  dateOnly: 'yyyy-MM-dd',
};

/**
 * Locale for date/number formatting
 */
export const DEFAULT_LOCALE = 'en-AU';

/**
 * Currency for cost displays
 */
export const DEFAULT_CURRENCY = 'AUD';

/**
 * Map default settings (Perth, Western Australia)
 */
export const MAP_DEFAULTS = {
  center: {
    latitude: -31.9505,
    longitude: 115.8605,
  },
  zoom: 10,
  minZoom: 4,
  maxZoom: 18,
};

/**
 * Validate a UUID v4 string.
 * Used to sanitize cursor values before PostgREST .or() interpolation.
 */
export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Validate an ISO 8601 timestamp string.
 * Used to sanitize cursor values before PostgREST .or() interpolation.
 */
export function isValidISOTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && !isNaN(Date.parse(value));
}

/**
 * Storage bucket names — must match Supabase storage bucket IDs
 */
export const STORAGE_BUCKETS = {
  photos: 'photos-compressed',
  originals: 'photos-original',
  avatars: 'avatars',
} as const satisfies Record<string, string>;
