import { z } from 'zod';

/**
 * User role enumeration
 * Defines access levels within the fleet management system
 *
 * Hierarchy (lowest to highest):
 * - driver: Field operations, QR scanning, location updates
 * - mechanic: Service operations, maintenance task completion
 * - manager: Fleet oversight, task delegation, reporting
 * - superuser: System administration, user management
 */
export const UserRole = {
  DRIVER: 'driver',
  MECHANIC: 'mechanic',
  MANAGER: 'manager',
  SUPERUSER: 'superuser',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Zod schema for user role validation
 */
export const UserRoleSchema = z.enum(['driver', 'mechanic', 'manager', 'superuser']);

/**
 * Human-readable labels for user roles
 */
export const UserRoleLabels: Record<UserRole, string> = {
  driver: 'Driver',
  mechanic: 'Mechanic',
  manager: 'Manager',
  superuser: 'Super User',
};

/**
 * Role descriptions for UI display
 */
export const UserRoleDescriptions: Record<UserRole, string> = {
  driver: 'Scan QR codes, update asset locations, upload photos',
  mechanic: 'View service status, complete maintenance tasks',
  manager: 'Full access to assets, delegate tasks, view reports',
  superuser: 'Administrator - manage users, assets, and system settings',
};

/**
 * Role hierarchy levels for permission comparisons
 * Higher number = more privileges
 */
export const UserRoleLevel: Record<UserRole, number> = {
  driver: 1,
  mechanic: 2,
  manager: 3,
  superuser: 4,
};

/**
 * Check if a role has equal or higher privileges than another
 */
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  return UserRoleLevel[userRole] >= UserRoleLevel[requiredRole];
}

/**
 * Get all roles at or below a given level
 */
export function getRolesAtOrBelow(role: UserRole): UserRole[] {
  const level = UserRoleLevel[role];
  return Object.entries(UserRoleLevel)
    .filter(([, lvl]) => lvl <= level)
    .map(([r]) => r as UserRole);
}

/**
 * Get all roles at or above a given level
 */
export function getRolesAtOrAbove(role: UserRole): UserRole[] {
  const level = UserRoleLevel[role];
  return Object.entries(UserRoleLevel)
    .filter(([, lvl]) => lvl >= level)
    .map(([r]) => r as UserRole);
}
