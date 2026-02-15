/**
 * UserInfoBadge - Display user information badge
 */
import React from 'react';
import { User } from 'lucide-react';
import { RGR_COLORS } from '@/styles/color-palette';

export interface UserInfoBadgeProps {
  user: {
    email?: string | null;
    full_name?: string | null;
  };
  isDark?: boolean;
}

export const UserInfoBadge = React.memo<UserInfoBadgeProps>(({ user, isDark = true }) => {
  const displayName = user.full_name || user.email || 'User';

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
      style={{
        backgroundColor: isDark ? `${RGR_COLORS.navy.base}4D` : 'rgba(226, 232, 240, 0.6)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: isDark ? `${RGR_COLORS.chrome.light}33` : 'rgba(107, 114, 128, 0.5)',
      }}
    >
      <User
        className="w-4 h-4"
        style={{ color: isDark ? RGR_COLORS.chrome.medium : '#000000' }}
      />
      <span
        className="text-sm font-medium"
        style={{ color: isDark ? RGR_COLORS.chrome.light : '#000000' }}
      >
        {displayName}
      </span>
    </div>
  );
});

UserInfoBadge.displayName = 'UserInfoBadge';

export default UserInfoBadge;
