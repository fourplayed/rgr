import { NotificationItemProps } from './types';

/**
 * Individual notification list item component
 */
export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const handleClick = () => {
    onClick?.(notification);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
      aria-label={`Notification: ${notification.title}`}
    >
      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
      <p className="text-sm text-gray-500">{notification.message}</p>
      <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
    </div>
  );
}
