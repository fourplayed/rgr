/**
 * Compile-time bidirectional type check.
 * Produces a compile error if A and B aren't mutually assignable.
 *
 * Usage:
 *   type _Check = MustBeTrue<AssertTypesMatch<z.infer<typeof Schema>, Interface>>;
 */
export type AssertTypesMatch<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : { error: 'Second type has properties not in first' }
  : { error: 'First type has properties not in second' };

/** Constrains T to `true`. Errors if T is anything else. */
export type MustBeTrue<T extends true> = T;
