/** Sanitize a numeric value: return null if negative or null, otherwise the value. */
export const sanitizeNonNegative = (val: number | null): number | null =>
  val !== null && val >= 0 ? val : null;
