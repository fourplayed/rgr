/**
 * WelcomePresenter - Pure UI orchestrator for the Welcome/Onboarding page
 *
 * ARCHITECTURE: Container/Presenter pattern
 * - Composes section components into a scrollable full-screen layout
 * - PersistentBackground (gradient + LightPillar) renders at app root — no extra background needed
 */
import { WelcomeHeader } from './components/WelcomeHeader';
import { FleetOverview } from './components/FleetOverview';
import { QuickActions } from './components/QuickActions';
import { AlertsSummary } from './components/AlertsSummary';
import { GetStartedCTA } from './components/GetStartedCTA';
import { STAGGER_MS } from './styles';
import type { WelcomeState, WelcomeActions } from './useWelcomeLogic';

export interface WelcomePresenterProps {
  state: WelcomeState;
  actions: WelcomeActions;
}

export function WelcomePresenter({ state, actions }: WelcomePresenterProps) {
  const { user, isDark, stats, isStatsLoading } = state;
  const { handleGetStarted, navigateTo } = actions;

  return (
    <div className="relative min-h-screen overflow-y-auto" style={{ zIndex: 1 }}>
      <WelcomeHeader user={user} isDark={isDark} delay={0} />

      <FleetOverview stats={stats} isLoading={isStatsLoading} isDark={isDark} delay={STAGGER_MS} />

      <QuickActions isDark={isDark} delay={STAGGER_MS * 2} onNavigate={navigateTo} />

      <AlertsSummary isDark={isDark} delay={STAGGER_MS * 3} />

      <GetStartedCTA isDark={isDark} delay={STAGGER_MS * 4} onGetStarted={handleGetStarted} />
    </div>
  );
}
