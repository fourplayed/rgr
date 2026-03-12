import { z } from 'zod';

/**
 * Safely parse a value against a Zod enum schema, returning a fallback on failure.
 *
 * Unlike `.parse()` which throws on unknown values, this logs a warning and
 * returns the fallback — preventing a single bad DB row from crashing the app.
 */

// Non-nullable overload
export function safeParseEnum<T extends [string, ...string[]]>(
  schema: z.ZodEnum<T>,
  value: unknown,
  fallback: T[number]
): T[number];

// Nullable overload
export function safeParseEnum<T extends [string, ...string[]]>(
  schema: z.ZodEnum<T>,
  value: unknown,
  fallback: null
): T[number] | null;

// Implementation
export function safeParseEnum<T extends [string, ...string[]]>(
  schema: z.ZodEnum<T>,
  value: unknown,
  fallback: T[number] | null
): T[number] | null {
  // null/undefined with null fallback is an expected "absent value" pattern —
  // skip the parse and warning entirely (e.g. analysis?.max_severity on photos
  // without freight analysis).
  if (value == null && fallback === null) return null;
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  console.warn(`[safeParseEnum] Unknown value "${value}", falling back to "${fallback}"`);
  return fallback;
}
