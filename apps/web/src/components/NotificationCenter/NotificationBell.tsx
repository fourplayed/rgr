/**
 * NotificationBell — bell icon button with unread count badge.
 *
 * Pure presenter: accepts unreadCount and onClick as props.
 */
import React from 'react';
import { Bell } from 'lucide-react';

export interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  isLoading?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  onClick,
  isLoading = false,
}) => {
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const showBadge = unreadCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={showBadge ? `Notifications — ${badgeLabel} unread` : 'Notifications'}
      className={`relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors duration-150 ${
        isLoading ? 'opacity-60 cursor-wait' : ''
      }`}
    >
      <Bell className="w-5 h-5" aria-hidden="true" />
      {showBadge && (
        <span
          data-testid="notification-badge"
          className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[0.6rem] font-bold leading-none"
        >
          {badgeLabel}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
