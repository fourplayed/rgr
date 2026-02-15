/**
 * Type definitions for Header component and subcomponents
 */

export interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
}

export interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
}

export interface NotificationsDropdownProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
  onViewAll?: () => void;
}

export interface UserMenuProps {
  userEmail?: string;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onProfileClick?: () => void;
}

export interface NotificationBadgeProps {
  count?: number;
  show?: boolean;
}

export interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  value?: string;
  onChange?: (value: string) => void;
}
