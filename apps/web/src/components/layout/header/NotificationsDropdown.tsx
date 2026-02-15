import { useEffect, useRef, useCallback } from 'react';
import { NotificationItem } from './NotificationItem';
import { NotificationsDropdownProps } from './types';

/**
 * Dropdown panel styling configuration
 * Extracted to named constants for maintainability and clarity
 */
const DROPDOWN_STYLES = {
  container: 'absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50',
  header: 'px-4 py-3 border-b border-gray-200',
  title: 'text-sm font-medium text-gray-900',
  listContainer: 'max-h-96 overflow-y-auto',
  emptyState: 'px-4 py-8 text-center text-sm text-gray-500',
  footer: 'px-4 py-3 border-t border-gray-200',
  viewAllButton: 'text-sm text-primary-600 hover:text-primary-700 font-medium focus:outline-none focus:underline',
} as const;

/**
 * Dropdown panel for displaying notifications
 */
export function NotificationsDropdown({
  notifications,
  isOpen,
  onClose,
  onNotificationClick,
  onViewAll,
}: NotificationsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleNotificationClick = useCallback((notification: typeof notifications[0]) => {
    onNotificationClick?.(notification);
    onClose();
  }, [onNotificationClick, onClose]);

  const handleViewAll = useCallback(() => {
    onViewAll?.();
    onClose();
  }, [onViewAll, onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, handleKeyDown, handleClickOutside]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={DROPDOWN_STYLES.container}
      role="menu"
      aria-label="Notifications menu"
    >
      <div className={DROPDOWN_STYLES.header}>
        <h3 className={DROPDOWN_STYLES.title} id="notifications-heading">
          Notifications
        </h3>
      </div>
      <div className={DROPDOWN_STYLES.listContainer} role="list" aria-labelledby="notifications-heading">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={handleNotificationClick}
            />
          ))
        ) : (
          <div className={DROPDOWN_STYLES.emptyState}>
            No notifications
          </div>
        )}
      </div>
      {notifications.length > 0 && (
        <div className={DROPDOWN_STYLES.footer}>
          <button
            onClick={handleViewAll}
            className={DROPDOWN_STYLES.viewAllButton}
            aria-label="View all notifications"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
