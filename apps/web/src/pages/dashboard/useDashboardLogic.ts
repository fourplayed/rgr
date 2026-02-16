/**
 * useDashboardLogic - Business logic hook for the dashboard page
 *
 * ARCHITECTURE: Container/Presenter pattern
 * Returns { state, actions } for injection into DashboardPresenter
 */
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import type { DashboardSection } from './types';

export interface DashboardState {
  user: { id: string; email: string; role: string; fullName: string | null; avatarUrl: string | null } | null;
  isDark: boolean;
  activeSection: DashboardSection;
  canAccessAdmin: boolean;
}

export interface DashboardActions {
  navigateTo: (path: string) => void;
  handleSignOut: () => Promise<void>;
  toggleTheme: () => void;
}

function pathToSection(pathname: string): DashboardSection {
  if (pathname.startsWith('/assets')) return 'assets';
  if (pathname.startsWith('/maintenance')) return 'maintenance';
  if (pathname.startsWith('/load-analyzer')) return 'load-analyzer';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'dashboard';
}

export function useDashboardLogic(): { state: DashboardState; actions: DashboardActions } {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const activeSection = pathToSection(location.pathname);
  const canAccessAdmin = user?.role === 'superuser';

  const navigateTo = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate],
  );

  const handleSignOut = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  return {
    state: {
      user,
      isDark,
      activeSection,
      canAccessAdmin,
    },
    actions: {
      navigateTo,
      handleSignOut,
      toggleTheme,
    },
  };
}
