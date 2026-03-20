/**
 * NotificationCenter — top-level container component.
 *
 * Wires together the hooks, manages isOpen state, and provides navigation.
 * Renders <NotificationBell> and <NotificationPanel>.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from '@/hooks/useNotifications';
import type { Notification } from '@/hooks/useNotifications';
import { NotificationBell } from './NotificationBell';
import { NotificationPanel } from './NotificationPanel';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const { data: notifications = [], isLoading: isLoadingList } = useNotifications();
  const { data: unreadCount = 0, isLoading: isLoadingCount } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleNavigate = (notification: Notification) => {
    markRead.mutate(notification.id);
    setIsOpen(false);
    switch (notification.type) {
      case 'hazard':
        navigate(
          `/assets${notification.resourceId ? `?highlight=${notification.resourceId}` : ''}`
        );
        break;
      case 'scan_overdue':
        navigate('/assets');
        break;
      case 'maintenance':
        navigate('/maintenance');
        break;
      case 'health_score':
        navigate('/reports');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <NotificationBell unreadCount={unreadCount} onClick={handleOpen} isLoading={isLoadingCount} />
      <NotificationPanel
        notifications={notifications}
        isOpen={isOpen}
        isLoading={isLoadingList}
        onClose={handleClose}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onNavigate={handleNavigate}
      />
    </>
  );
};

export default NotificationCenter;
