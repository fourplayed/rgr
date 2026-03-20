/**
 * NotificationRow component tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationRow } from '../NotificationRow';
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

const now = new Date();

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    userId: 'user-1',
    type: 'hazard',
    title: 'Hazard Detected',
    body: 'A new hazard was detected on asset ABC-123.',
    resourceId: 'asset-1',
    resourceType: 'asset',
    read: false,
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    ...overrides,
  };
}

describe('NotificationRow', () => {
  it('renders the notification title', () => {
    render(
      <NotificationRow
        notification={makeNotification()}
        onMarkRead={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByText('Hazard Detected')).toBeInTheDocument();
  });

  it('renders the notification body', () => {
    render(
      <NotificationRow
        notification={makeNotification()}
        onMarkRead={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByText('A new hazard was detected on asset ABC-123.')).toBeInTheDocument();
  });

  it('shows AlertTriangle icon for hazard type', () => {
    render(
      <NotificationRow
        notification={makeNotification({ type: 'hazard' })}
        onMarkRead={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
  });

  it('shows Clock icon for scan_overdue type', () => {
    render(
      <NotificationRow
        notification={makeNotification({ type: 'scan_overdue' })}
        onMarkRead={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });

  it('shows Activity icon for health_score type', () => {
    render(
      <NotificationRow
        notification={makeNotification({ type: 'health_score' })}
        onMarkRead={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
  });

  it('shows Wrench icon for maintenance type', () => {
    render(
      <NotificationRow
        notification={makeNotification({ type: 'maintenance' })}
        onMarkRead={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByTestId('wrench-icon')).toBeInTheDocument();
  });

  it('applies unread visual style when notification is unread', () => {
    render(
      <NotificationRow
        notification={makeNotification({ read: false })}
        onMarkRead={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByTestId('notification-row')).toHaveAttribute('data-read', 'false');
  });

  it('applies read visual style when notification is read', () => {
    render(
      <NotificationRow
        notification={makeNotification({ read: true })}
        onMarkRead={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByTestId('notification-row')).toHaveAttribute('data-read', 'true');
  });

  it('shows a relative timestamp', () => {
    render(
      <NotificationRow
        notification={makeNotification()}
        onMarkRead={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    // Should contain something like "hours ago" or "2h ago"
    const timeEl = screen.getByTestId('notification-timestamp');
    expect(timeEl).toBeInTheDocument();
    expect(timeEl.textContent).toBeTruthy();
  });

  it('shows "3 days ago" for a 3-day-old notification', () => {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <NotificationRow
        notification={makeNotification({ createdAt: threeDaysAgo })}
        onMarkRead={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    const timeEl = screen.getByTestId('notification-timestamp');
    expect(timeEl.textContent).toMatch(/3\s*d(ays?)?\s*ago/i);
  });

  it('shows "1 day ago" (not "1 days ago") for a 1-day-old notification', () => {
    const oneDayAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    render(
      <NotificationRow
        notification={makeNotification({ createdAt: oneDayAgo })}
        onMarkRead={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    const timeEl = screen.getByTestId('notification-timestamp');
    expect(timeEl.textContent).toBe('1 day ago');
  });

  it('calls onNavigate with the notification when the row is clicked', () => {
    const onNavigate = vi.fn();
    const notification = makeNotification();
    render(
      <NotificationRow notification={notification} onMarkRead={vi.fn()} onNavigate={onNavigate} />
    );
    fireEvent.click(screen.getByTestId('notification-row'));
    expect(onNavigate).toHaveBeenCalledWith(notification);
  });

  it('calls onMarkRead with the notification id when mark-read button is clicked', () => {
    const onMarkRead = vi.fn();
    const notification = makeNotification();
    render(
      <NotificationRow notification={notification} onMarkRead={onMarkRead} onNavigate={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId('mark-read-button'));
    expect(onMarkRead).toHaveBeenCalledWith('notif-1');
  });

  it('does not call onNavigate when mark-read button is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <NotificationRow
        notification={makeNotification()}
        onMarkRead={vi.fn()}
        onNavigate={onNavigate}
      />
    );
    fireEvent.click(screen.getByTestId('mark-read-button'));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
