/**
 * NotificationPanel component tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationPanel } from '../NotificationPanel';
import type { Notification } from '@rgr/shared';

vi.mock('lucide-react', () => ({
  Bell: () => <svg data-testid="bell-icon" />,
  AlertTriangle: () => <svg data-testid="alert-triangle-icon" />,
  Clock: () => <svg data-testid="clock-icon" />,
  Activity: () => <svg data-testid="activity-icon" />,
  Wrench: () => <svg data-testid="wrench-icon" />,
  X: () => <svg data-testid="x-icon" />,
  Check: () => <svg data-testid="check-icon" />,
}));

// Mock motion/react to avoid animation issues in tests
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const now = new Date();

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    userId: 'user-1',
    type: 'hazard',
    title: 'Hazard Detected',
    body: 'A hazard was detected.',
    resourceId: 'asset-1',
    resourceType: 'asset',
    read: false,
    createdAt: now.toISOString(),
    ...overrides,
  };
}

const defaultProps = {
  notifications: [],
  isOpen: true,
  isLoading: false,
  onClose: vi.fn(),
  onMarkRead: vi.fn(),
  onMarkAllRead: vi.fn(),
  onNavigate: vi.fn(),
};

describe('NotificationPanel', () => {
  it('renders the panel when isOpen is true', () => {
    render(<NotificationPanel {...defaultProps} />);
    expect(screen.getByTestId('notification-panel')).toBeInTheDocument();
  });

  it('does not render the panel when isOpen is false', () => {
    render(<NotificationPanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('notification-panel')).not.toBeInTheDocument();
  });

  it('shows "Notifications" header text', () => {
    render(<NotificationPanel {...defaultProps} />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows "Mark all read" button', () => {
    render(<NotificationPanel {...defaultProps} />);
    expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument();
  });

  it('calls onMarkAllRead when "Mark all read" button is clicked', () => {
    const onMarkAllRead = vi.fn();
    render(<NotificationPanel {...defaultProps} onMarkAllRead={onMarkAllRead} />);
    fireEvent.click(screen.getByTestId('mark-all-read-button'));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('shows the close button and calls onClose when clicked', () => {
    const onClose = vi.fn();
    render(<NotificationPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('panel-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationPanel {...defaultProps} notifications={[]} />);
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('shows loading skeletons when isLoading is true', () => {
    render(<NotificationPanel {...defaultProps} isLoading={true} />);
    expect(screen.getByTestId('notifications-loading')).toBeInTheDocument();
  });

  it('renders notification rows in the Today group', () => {
    const todayNotif = makeNotification({ id: 'today-1', title: 'Today Hazard' });
    render(<NotificationPanel {...defaultProps} notifications={[todayNotif]} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Today Hazard')).toBeInTheDocument();
  });

  it('renders notification rows in the This Week group', () => {
    const weekAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const weekNotif = makeNotification({ id: 'week-1', title: 'Week Hazard', createdAt: weekAgo });
    render(<NotificationPanel {...defaultProps} notifications={[weekNotif]} />);
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('Week Hazard')).toBeInTheDocument();
  });

  it('renders notification rows in the Older group', () => {
    const oldDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const oldNotif = makeNotification({ id: 'old-1', title: 'Old Hazard', createdAt: oldDate });
    render(<NotificationPanel {...defaultProps} notifications={[oldNotif]} />);
    expect(screen.getByText('Older')).toBeInTheDocument();
    expect(screen.getByText('Old Hazard')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<NotificationPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('panel-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('passes onMarkRead and onNavigate down to notification rows', () => {
    const onMarkRead = vi.fn();
    const onNavigate = vi.fn();
    const notif = makeNotification({ id: 'row-1', title: 'Row Notif' });
    render(
      <NotificationPanel
        {...defaultProps}
        notifications={[notif]}
        onMarkRead={onMarkRead}
        onNavigate={onNavigate}
      />
    );
    // Click the row itself should call onNavigate
    fireEvent.click(screen.getByTestId('notification-row'));
    expect(onNavigate).toHaveBeenCalledWith(notif);
  });
});
