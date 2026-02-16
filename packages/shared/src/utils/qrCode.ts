/**
 * QR Code utility functions
 *
 * Handles parsing, validation, and asset info extraction from QR codes
 * used in the RGR asset management system.
 *
 * Expected QR code format: rgr://asset/{UUID}
 * Asset number format: 2 uppercase letters followed by digits (e.g., TL001, DL015)
 */

/** Prefix used in RGR QR code URIs */
const QR_CODE_PREFIX = 'rgr://asset/';

/** Regex for a standard UUID (v4 or similar) */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Regex for an RGR asset number (e.g., TL001, DL015) */
const ASSET_NUMBER_REGEX = /^[A-Z]{2}\d{3,}$/;

/**
 * Result returned by parseQRCode
 */
export interface ParseQRCodeResult {
  /** The extracted asset ID (UUID), or null if the value could not be parsed */
  assetId: string | null;
}

/**
 * Result returned by extractAssetInfo
 */
export interface AssetInfo {
  /** The resolved asset identifier (UUID for QR/UUID inputs, uppercased value for asset numbers) */
  assetId: string;
}

/**
 * Parse a raw QR code string and extract the asset ID.
 *
 * Expects the format `rgr://asset/{UUID}`. Returns the UUID portion
 * as `assetId` if valid, otherwise returns `{ assetId: null }`.
 *
 * @param value - The raw scanned QR code string
 * @returns ParseQRCodeResult with the extracted assetId or null
 */
export function parseQRCode(value: string): ParseQRCodeResult {
  // TODO: Implement full parsing logic (e.g., support versioned URIs, query params)
  const trimmed = value.trim();

  if (!trimmed.startsWith(QR_CODE_PREFIX)) {
    return { assetId: null };
  }

  const uuidPart = trimmed.slice(QR_CODE_PREFIX.length);

  if (!UUID_REGEX.test(uuidPart)) {
    return { assetId: null };
  }

  return { assetId: uuidPart.toLowerCase() };
}

/**
 * Check whether a string is a valid RGR QR code (matches `rgr://asset/{UUID}`).
 *
 * @param value - The string to validate
 * @returns true if the string is a properly formatted RGR QR code
 */
export function isValidQRCode(value: string): boolean {
  // TODO: Expand validation rules as the QR format evolves
  const trimmed = value.trim();

  if (!trimmed.startsWith(QR_CODE_PREFIX)) {
    return false;
  }

  const uuidPart = trimmed.slice(QR_CODE_PREFIX.length);
  return UUID_REGEX.test(uuidPart);
}

/**
 * Check whether a string matches the RGR asset number format (e.g., TL001, DL015).
 *
 * @param value - The string to check
 * @returns true if the string is a valid asset number
 */
export function isAssetNumber(value: string): boolean {
  // TODO: Add category-specific validation if asset number prefixes are constrained
  return ASSET_NUMBER_REGEX.test(value.trim().toUpperCase());
}

/**
 * Extract asset information from a variety of input formats.
 *
 * Supported formats:
 * - Full QR code URI: `rgr://asset/{UUID}` -> returns `{ assetId: UUID }`
 * - Raw UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` -> returns `{ assetId: UUID }`
 * - Asset number: `TL001` -> returns `{ assetId: "TL001" }` (uppercased)
 *
 * @param value - The input string to extract asset info from
 * @returns AssetInfo if a valid format is detected, or null otherwise
 */
export function extractAssetInfo(value: string): AssetInfo | null {
  // TODO: Integrate with backend asset lookup for richer info extraction
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  // Try QR code format first
  if (trimmed.startsWith(QR_CODE_PREFIX)) {
    const uuidPart = trimmed.slice(QR_CODE_PREFIX.length);
    if (UUID_REGEX.test(uuidPart)) {
      return { assetId: uuidPart.toLowerCase() };
    }
    return null;
  }

  // Try raw UUID
  if (UUID_REGEX.test(trimmed)) {
    return { assetId: trimmed.toLowerCase() };
  }

  // Try asset number
  const upper = trimmed.toUpperCase();
  if (ASSET_NUMBER_REGEX.test(upper)) {
    return { assetId: upper };
  }

  return null;
}
