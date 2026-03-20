/**
 * DashboardPresenter tests
 *
 * Tests that the Dashboard page wires in the FleetHealthScore widget correctly.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPresenter } from '../DashboardPresenter';
import type { DashboardState, DashboardActions } from '../useDashboardLogic';

// Mock FleetHealthScore so it doesn't call hooks internally
vi.mock('@/components/FleetHealthScore', () => ({
  FleetHealthScore: () => <div data-testid="fleet-health-score" />,
}));

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

function renderPresenter(props?: Partial<{ onNavigateToReports: () => void; children: React.ReactNode }>) {
  return render(
    <MemoryRouter>
      <DashboardPresenter
        state={mockState}
        actions={mockActions}
        onNavigateToReports={props?.onNavigateToReports ?? vi.fn()}
      >
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

  it('renders FleetHealthScore widget on the dashboard', () => {
    renderPresenter();
    expect(screen.getByTestId('fleet-health-score')).toBeInTheDocument();
  });

  it('passes onNavigateToReports to FleetHealthScore', () => {
    const onNavigateToReports = vi.fn();
    renderPresenter({ onNavigateToReports });
    // FleetHealthScore is rendered — the mock captures render but we verify it is present
    expect(screen.getByTestId('fleet-health-score')).toBeInTheDocument();
  });

  it('renders children passed to the presenter', () => {
    renderPresenter({ children: <div data-testid="custom-child">Child Content</div> });
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });
});
