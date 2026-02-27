import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { UserRole, UserRoleLevel } from '@rgr/shared';

interface UserPermissions {
  role: UserRole | null;
  /** Mechanic+ can flag assets for maintenance during scan */
  canMarkMaintenance: boolean;
  /** Mechanic+ can select photo type (freight, damage, inspection, general) */
  canSelectPhotoType: boolean;
  /** Manager+ can perform asset count sessions */
  canPerformAssetCount: boolean;
  /** Manager+ can view audit logs */
  canViewAuditLog: boolean;
  /** Superuser only — access admin screens */
  canAccessAdmin: boolean;
}

const UserPermissionsContext = createContext<UserPermissions | null>(null);

interface UserPermissionsProviderProps {
  userRole: UserRole | null;
  children: ReactNode;
}

export function UserPermissionsProvider({
  userRole,
  children,
}: UserPermissionsProviderProps) {
  const permissions = useMemo<UserPermissions>(() => {
    const level = userRole ? UserRoleLevel[userRole] : 0;
    const mechanicLevel = UserRoleLevel.mechanic;
    const managerLevel = UserRoleLevel.manager;
    const superuserLevel = UserRoleLevel.superuser;

    return {
      role: userRole,
      canMarkMaintenance: level >= mechanicLevel,
      canSelectPhotoType: level >= mechanicLevel,
      canPerformAssetCount: level >= managerLevel,
      canViewAuditLog: level >= managerLevel,
      canAccessAdmin: level >= superuserLevel,
    };
  }, [userRole]);

  return (
    <UserPermissionsContext.Provider value={permissions}>
      {children}
    </UserPermissionsContext.Provider>
  );
}

/**
 * Get the current user's permissions.
 * Returns safe defaults (all false) if used outside the provider.
 */
export function useUserPermissions(): UserPermissions {
  const context = useContext(UserPermissionsContext);

  // Safe fallback for null context (no permissions granted)
  if (!context) {
    return {
      role: null,
      canMarkMaintenance: false,
      canSelectPhotoType: false,
      canPerformAssetCount: false,
      canViewAuditLog: false,
      canAccessAdmin: false,
    };
  }

  return context;
}
