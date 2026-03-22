/**
 * useWelcomeLogic - Business logic hook for the Welcome/Onboarding page
 *
 * ARCHITECTURE: Container/Presenter + DI pattern (same as useLoginLogic)
 */
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import { useFleetStatistics } from '@/hooks/useFleetData';
import { hasOnboarded, markOnboarded } from '@/utils/onboarding';
import type { Profile } from '@rgr/shared';
import type { FleetStatistics } from '@/hooks/useFleetData';

export interface WelcomeState {
  user: Profile | null;
  isDark: boolean;
  stats: FleetStatistics | null;
  isStatsLoading: boolean;
}

export interface WelcomeActions {
  handleGetStarted: () => void;
  navigateTo: (path: string) => void;
}

export interface UseWelcomeLogicResult {
  state: WelcomeState;
  actions: WelcomeActions;
}

export function useWelcomeLogic(): UseWelcomeLogicResult {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { isDark } = useTheme();
  const { data: stats = null, isLoading: isStatsLoading } = useFleetStatistics();

  // Guard: redirect returning users who access /welcome directly
  useEffect(() => {
    if (user && hasOnboarded(user.id)) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleGetStarted = useCallback(() => {
    if (user) {
      markOnboarded(user.id);
    }
    navigate('/dashboard', { state: { fromLogin: true } });
  }, [user, navigate]);

  const navigateTo = useCallback(
    (path: string) => {
      if (user) {
        markOnboarded(user.id);
      }
      navigate(path);
    },
    [user, navigate]
  );

  return {
    state: { user, isDark, stats, isStatsLoading },
    actions: { handleGetStarted, navigateTo },
  };
}
