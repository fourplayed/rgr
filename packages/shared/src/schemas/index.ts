/**
 * Zod schemas for validation
 *
 * Auth and enum schemas (ProfileSchema, SignInCredentialsSchema, SignUpInputSchema,
 * ResetPasswordInputSchema, UpdatePasswordInputSchema, UpdateProfileInputSchema,
 * CreateUserInputSchema, UserRoleSchema) are exported via the types barrel
 * (see ../types/index.ts) and must NOT be re-exported here to avoid duplicate
 * export errors in the package entry point.
 */

// Common validation helpers
import { z } from 'zod';

/**
 * UUID validation schema
 */
export const UUIDSchema = z.string().uuid('Invalid UUID format');

/**
 * Email validation schema
 */
export const EmailSchema = z.string().email('Invalid email address');

/**
 * Pagination input schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

/**
 * Date range filter schema
 */
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Search query schema
 */
export const SearchQuerySchema = z.object({
  query: z.string().max(200).optional(),
  ...PaginationSchema.shape,
});

/**
 * Coordinate validation schema
 */
export const CoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
});

/**
 * Phone number validation (international format)
 */
export const PhoneSchema = z
  .string()
  .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number format')
  .optional()
  .nullable();

/**
 * Password validation with security requirements
 */
export const SecurePasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');
