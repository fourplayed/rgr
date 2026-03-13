import type { UserRole } from '@rgr/shared';
import { colors } from '../theme/colors';

export const getUserRoleColor = (role: UserRole): string => colors.userRole[role];
