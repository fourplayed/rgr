/**
 * NotificationBell component tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBell } from '../NotificationBell';

vi.mock('lucide-react', () => ({
  Bell: () => <svg data-testid="bell-icon" />,
  AlertTriangle: () => <svg data-testid="alert-triangle-icon" />,
  Clock: () => <svg data-testid="clock-icon" />,
  Activity: () => <svg data-testid="activity-icon" />,
  Wrench: () => <svg data-testid="wrench-icon" />,
  X: () => <svg data-testid="x-icon" />,
  Check: () => <svg data-testid="check-icon" />,
}));

describe('NotificationBell', () => {
  it('renders the bell icon', () => {
    render(<NotificationBell unreadCount={0} onClick={vi.fn()} />);
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });

  it('does not show a badge when unreadCount is 0', () => {
    render(<NotificationBell unreadCount={0} onClick={vi.fn()} />);
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
  });

  it('shows a badge with the count when unreadCount > 0', () => {
    render(<NotificationBell unreadCount={5} onClick={vi.fn()} />);
    const badge = screen.getByTestId('notification-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('5');
  });

  it('caps badge at "99+" when unreadCount > 99', () => {
    render(<NotificationBell unreadCount={150} onClick={vi.fn()} />);
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('99+');
  });

  it('shows "99+" at exactly 100', () => {
    render(<NotificationBell unreadCount={100} onClick={vi.fn()} />);
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('99+');
  });

  it('shows 99 when count is exactly 99', () => {
    render(<NotificationBell unreadCount={99} onClick={vi.fn()} />);
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('99');
  });

  it('calls onClick when the bell button is clicked', () => {
    const onClick = vi.fn();
    render(<NotificationBell unreadCount={0} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders with isLoading prop without crashing', () => {
    render(<NotificationBell unreadCount={0} onClick={vi.fn()} isLoading />);
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });
});
