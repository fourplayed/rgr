import { sanitizeNonNegative } from '../location';

describe('sanitizeNonNegative', () => {
  it('passes through a positive number', () => {
    expect(sanitizeNonNegative(42)).toBe(42);
  });

  it('passes through zero', () => {
    expect(sanitizeNonNegative(0)).toBe(0);
  });

  it('returns null for a negative number', () => {
    expect(sanitizeNonNegative(-1)).toBeNull();
  });

  it('returns null when given null', () => {
    expect(sanitizeNonNegative(null)).toBeNull();
  });
});
