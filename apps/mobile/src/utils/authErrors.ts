const AUTH_ERROR_PATTERNS = [
  'JWT expired',
  'Invalid JWT',
  'refresh_token_not_found',
  'session_not_found',
  'token is expired',
  'missing sub claim',
  'invalid claim',
] as const;

export function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return AUTH_ERROR_PATTERNS.some((p) => error.message.includes(p));
}
