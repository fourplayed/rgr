import { z } from 'zod';
import { safeParseEnum } from '../safeParseEnum';

const TestSchema = z.enum(['alpha', 'beta', 'gamma']);

describe('safeParseEnum', () => {
  it('returns a valid enum value', () => {
    expect(safeParseEnum(TestSchema, 'alpha', 'beta')).toBe('alpha');
    expect(safeParseEnum(TestSchema, 'gamma', 'beta')).toBe('gamma');
  });

  it('returns fallback for invalid values', () => {
    expect(safeParseEnum(TestSchema, 'unknown', 'beta')).toBe('beta');
    expect(safeParseEnum(TestSchema, 123, 'alpha')).toBe('alpha');
    expect(safeParseEnum(TestSchema, '', 'gamma')).toBe('gamma');
  });

  it('returns null fallback for nullable overload', () => {
    expect(safeParseEnum(TestSchema, 'unknown', null)).toBeNull();
    expect(safeParseEnum(TestSchema, undefined, null)).toBeNull();
  });

  it('returns valid value even when fallback is null', () => {
    expect(safeParseEnum(TestSchema, 'alpha', null)).toBe('alpha');
  });

  it('logs a warning on fallback', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    safeParseEnum(TestSchema, 'invalid', 'beta');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[safeParseEnum]'));
    warnSpy.mockRestore();
  });

  it('does not log a warning for valid values', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    safeParseEnum(TestSchema, 'alpha', 'beta');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
