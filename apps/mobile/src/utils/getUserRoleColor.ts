import { colors } from '../theme/colors';

export const getUserRoleColor = (role: string): string | undefined =>
  role in colors.userRole ? colors.userRole[role as keyof typeof colors.userRole] : undefined;
