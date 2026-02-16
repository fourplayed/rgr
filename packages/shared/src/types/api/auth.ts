import { z } from 'zod';
import { UserRoleSchema, type UserRole } from '../enums/UserRole';

/**
 * User profile interface
 * Represents the profiles table data with TypeScript types
 */
export interface Profile {
  /** UUID primary key (matches Supabase auth.users.id) */
  id: string;
  /** User email address */
  email: string;
  /** Full display name */
  fullName: string;
  /** User role determining permissions */
  role: UserRole;
  /** Contact phone number */
  phone: string | null;
  /** Profile avatar URL */
  avatarUrl: string | null;
  /** Whether user can access the system */
  isActive: boolean;
  /** Employee ID or badge number */
  employeeId: string | null;
  /** Assigned depot/location (free text, legacy) */
  depot: string | null;
  /** FK to depots table */
  depotId: string | null;
  /** Last login timestamp */
  lastLoginAt: string | null;
  /** Record creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Zod schema for profile validation
 */
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  role: UserRoleSchema,
  phone: z.string().max(20).nullable(),
  avatarUrl: z.string().url().nullable(),
  isActive: z.boolean(),
  employeeId: z.string().max(50).nullable(),
  depot: z.string().max(100).nullable(),
  depotId: z.string().uuid().nullable(),
  lastLoginAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Database row type (snake_case) for direct Supabase queries
 */
export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  employee_id: string | null;
  depot: string | null;
  depot_id: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Sign-in credentials
 */
export interface SignInCredentials {
  email: string;
  password: string;
}

export const SignInCredentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Sign-up input
 */
export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  employeeId?: string | null;
  depot?: string | null;
}

export const SignUpInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(1, 'Full name is required').max(200),
  phone: z.string().max(20).nullable().optional(),
  employeeId: z.string().max(50).nullable().optional(),
  depot: z.string().max(100).nullable().optional(),
});

/**
 * Password reset request
 */
export interface ResetPasswordInput {
  email: string;
}

export const ResetPasswordInputSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Update password (after reset token validated)
 */
export interface UpdatePasswordInput {
  newPassword: string;
}

export const UpdatePasswordInputSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * Update profile input
 */
export interface UpdateProfileInput {
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  employeeId?: string | null;
  depot?: string | null;
}

export const UpdateProfileInputSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  employeeId: z.string().max(50).nullable().optional(),
  depot: z.string().max(100).nullable().optional(),
});

/**
 * Create user input (admin only)
 */
export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  employeeId?: string | null;
  depot?: string | null;
}

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(200),
  role: UserRoleSchema,
  phone: z.string().max(20).nullable().optional(),
  employeeId: z.string().max(50).nullable().optional(),
  depot: z.string().max(100).nullable().optional(),
});

/**
 * Auth result from sign-in/sign-up operations
 */
export interface AuthResult {
  profile: Profile | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  error: string | null;
}

/**
 * Session information
 */
export interface SessionInfo {
  isAuthenticated: boolean;
  profile: Profile | null;
  accessToken: string | null;
  expiresAt: number | null;
}

/**
 * Map database row (snake_case) to Profile interface (camelCase)
 */
export function mapRowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as UserRole,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    isActive: row.is_active,
    employeeId: row.employee_id,
    depot: row.depot,
    depotId: row.depot_id,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map Profile interface (camelCase) to database update fields (snake_case)
 */
export function mapProfileToUpdate(
  profile: UpdateProfileInput
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  if (profile.fullName !== undefined) updates.full_name = profile.fullName;
  if (profile.phone !== undefined) updates.phone = profile.phone;
  if (profile.avatarUrl !== undefined) updates.avatar_url = profile.avatarUrl;
  if (profile.employeeId !== undefined) updates.employee_id = profile.employeeId;
  if (profile.depot !== undefined) updates.depot = profile.depot;

  return updates;
}
