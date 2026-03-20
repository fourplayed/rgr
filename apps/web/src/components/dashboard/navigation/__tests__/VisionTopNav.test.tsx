/**
 * VisionTopNav Tests
 *
 * Tests for the top navigation bar component, including
 * integration with NotificationCenter.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VisionTopNav } from '../VisionTopNav';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/dashboard' }),
  useNavigate: () => vi.fn(),
}));

// Mock useTheme
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: true, toggleTheme: vi.fn() }),
}));

// Mock useAuthStore
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: { user: null; logout: () => Promise<void> }) => unknown) =>
    selector({ user: null, logout: async () => {} }),
}));

// Mock SlidingNavIndicator
vi.mock('../SlidingNavIndicator', () => ({
  SlidingNavIndicator: () => null,
}));

// Mock UserInfoBadge
vi.mock('../UserInfoBadge', () => ({
  UserInfoBadge: () => null,
}));

// Mock ThemeToggleIcon
vi.mock('@/components/common', () => ({
  ThemeToggleIcon: () => null,
}));

// Mock NotificationCenter
vi.mock('@/components/NotificationCenter', () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));

describe('VisionTopNav', () => {
  it('renders the main navigation element', () => {
    render(<VisionTopNav />);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
  });

  it('renders NotificationCenter in the nav', () => {
    render(<VisionTopNav />);
    expect(screen.getByTestId('notification-center')).toBeTruthy();
  });
});
