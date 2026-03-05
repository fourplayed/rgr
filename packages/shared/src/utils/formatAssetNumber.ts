/**
 * Strip leading zeros from the numeric suffix of an asset number for display.
 * Storage retains zero-padding (DL001) for correct lexicographic sort order.
 * Display shows the compact form (DL1).
 */
export function formatAssetNumber(assetNumber: string): string {
  return assetNumber.replace(/^([A-Za-z]+)0+(\d)/, '$1$2');
}
