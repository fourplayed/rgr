/**
 * DashboardPresenter tests
 *
 * Tests that the Dashboard presenter renders wrapper and children.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardPresenter } from '../DashboardPresenter';
import type { DashboardState, DashboardActions } from '../useDashboardLogic';

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
    <DashboardPresenter state={mockState} actions={mockActions}>
      {props?.children}
    </DashboardPresenter>
  );
}

describe('DashboardPresenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the content wrapper', () => {
    const { container } = renderPresenter();
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('relative', 'h-full', 'w-full');
  });

  it('renders children passed to the presenter', () => {
    renderPresenter({ children: <div data-testid="custom-child">Child Content</div> });
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });
});
