/**
 * NotificationRow — individual notification list item.
 *
 * Shows severity icon, title, body (truncated), relative timestamp.
 * Unread notifications have a left accent border.
 */
import React from 'react';
import { AlertTriangle, Clock, Activity, Wrench, X } from 'lucide-react';
import type { Notification, NotificationType } from '@rgr/shared';

export interface NotificationRowProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onNavigate: (notification: Notification) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<NotificationType, React.FC<{ className?: string }>> = {
  hazard: ({ className }) => <AlertTriangle className={className} />,
  scan_overdue: ({ className }) => <Clock className={className} />,
  health_score: ({ className }) => <Activity className={className} />,
  maintenance: ({ className }) => <Wrench className={className} />,
};

const TYPE_ICON_CLASSES: Record<NotificationType, string> = {
  hazard: 'text-red-400',
  scan_overdue: 'text-amber-400',
  health_score: 'text-blue-400',
  maintenance: 'text-slate-300',
};

/**
 * Formats a UTC ISO string into a human-readable relative time string.
 * e.g. "2 hours ago", "3 days ago", "just now"
 */
function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const past = new Date(isoString).getTime();
  const diffMs = now - past;

  if (diffMs < 0) return 'just now';

  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) return 'just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const NotificationRow: React.FC<NotificationRowProps> = ({
  notification,
  onMarkRead,
  onNavigate,
}) => {
  const Icon = TYPE_ICONS[notification.type] ?? TYPE_ICONS.hazard;
  const iconClass = TYPE_ICON_CLASSES[notification.type] ?? 'text-slate-400';
  const isUnread = !notification.read;

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead(notification.id);
  };

  return (
    <div
      data-testid="notification-row"
      data-read={String(notification.read)}
      onClick={() => onNavigate(notification)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onNavigate(notification);
      }}
      className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 hover:bg-white/5 ${
        isUnread
          ? 'border-l-2 border-blue-500 bg-blue-500/5'
          : 'border-l-2 border-transparent'
      }`}
    >
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isUnread ? 'text-white' : 'text-slate-300'
          }`}
        >
          {notification.title}
        </p>
        <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{notification.body}</p>
        <p
          data-testid="notification-timestamp"
          className="text-xs text-slate-500 mt-1"
        >
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Mark-read button */}
      <button
        data-testid="mark-read-button"
        type="button"
        onClick={handleMarkRead}
        aria-label="Mark as read"
        className="flex-shrink-0 p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-colors duration-150"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default NotificationRow;
