import { NotificationBadgeProps } from './types';

/**
 * Visual notification badge indicator
 */
export function NotificationBadge({ count, show = true }: NotificationBadgeProps) {
  if (!show) return null;

  return (
    <span
      className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"
      role="status"
      aria-label={count ? `${count} unread notifications` : 'Unread notifications'}
    />
  );
}
