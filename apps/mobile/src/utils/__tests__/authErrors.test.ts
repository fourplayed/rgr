import { isAuthError } from '../authErrors';

describe('isAuthError', () => {
  it('returns true for JWT expired errors', () => {
    expect(isAuthError(new Error('JWT expired'))).toBe(true);
  });

  it('returns true for Invalid JWT errors', () => {
    expect(isAuthError(new Error('Invalid JWT: token is malformed'))).toBe(true);
  });

  it('returns true for refresh token errors', () => {
    expect(isAuthError(new Error('refresh_token_not_found'))).toBe(true);
  });

  it('returns false for non-auth errors', () => {
    expect(isAuthError(new Error('Network request failed'))).toBe(false);
    expect(isAuthError(new Error('timeout'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isAuthError('JWT expired')).toBe(false);
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError(undefined)).toBe(false);
    expect(isAuthError(42)).toBe(false);
  });
});
