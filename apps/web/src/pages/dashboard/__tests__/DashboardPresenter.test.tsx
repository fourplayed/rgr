/**
 * DashboardPresenter tests
 *
 * Tests that the Dashboard presenter renders nav, content area, and children.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPresenter } from '../DashboardPresenter';
import type { DashboardState, DashboardActions } from '../useDashboardLogic';

// Mock TopNavBar to avoid complex nav rendering in unit tests
vi.mock('../components/TopNavBar', () => ({
  TopNavBar: () => <nav data-testid="top-nav-bar" />,
}));

// Mock ErrorBoundary to pass children through
vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockState: DashboardState = {
  user: null,
  isDark: false,
  activeSection: 'dashboard',
  canAccessAdmin: false,
};

const mockActions: DashboardActions = {
  navigateTo: vi.fn(),
  handleSignOut: vi.fn(),
  toggleTheme: vi.fn(),
  handleNavigateToReports: vi.fn(),
};

function renderPresenter(props?: Partial<{ children: React.ReactNode }>) {
  return render(
    <MemoryRouter>
      <DashboardPresenter state={mockState} actions={mockActions}>
        {props?.children}
      </DashboardPresenter>
    </MemoryRouter>
  );
}

describe('DashboardPresenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the top nav bar', () => {
    renderPresenter();
    expect(screen.getByTestId('top-nav-bar')).toBeInTheDocument();
  });

  it('renders the main content area', () => {
    renderPresenter();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders children passed to the presenter', () => {
    renderPresenter({ children: <div data-testid="custom-child">Child Content</div> });
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });
});
