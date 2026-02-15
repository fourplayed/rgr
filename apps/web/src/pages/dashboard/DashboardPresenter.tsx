/**
 * DashboardPresenter - Pure UI component for Dashboard page
 *
 * ARCHITECTURE: Container/Presenter pattern
 * - Renders animated background (gradient + Stars)
 * - Renders glassmorphic top nav bar
 * - Renders scrollable content area below nav
 */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Stars } from '@/components/backgrounds';
import { BACKGROUND_STYLES } from './styles';
import { DASHBOARD_CONSTANTS } from './types';
import { TopNavBar } from './components/TopNavBar';
import { CONTENT_PANEL_STYLES } from './styles';
import type { DashboardState, DashboardActions } from './useDashboardLogic';

export interface DashboardPresenterProps {
  state: DashboardState;
  actions: DashboardActions;
  /** Optional children for page content (used by StubPage) */
  children?: React.ReactNode;
}

export function DashboardPresenter({ state, actions, children }: DashboardPresenterProps) {
  const { isDark, activeSection, canAccessAdmin } = state;
  const { navigateTo, handleSignOut, toggleTheme } = actions;

  const location = useLocation();
  const navigate = useNavigate();
  const fromLogin = location.state?.fromLogin === true;

  // Clear location state after mount so refresh doesn't replay animations
  useEffect(() => {
    if (fromLogin) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const backgroundStyle = isDark ? BACKGROUND_STYLES.dark : BACKGROUND_STYLES.light;
  const panelStyle = isDark ? CONTENT_PANEL_STYLES.dark : CONTENT_PANEL_STYLES.light;

  return (
    <div
      className="relative min-h-screen h-screen flex flex-col overflow-hidden theme-bg-transition"
      style={backgroundStyle}
    >
      <style>{`
        .theme-bg-transition {
          transition: background 1.2s cubic-bezier(0.4, 0.0, 0.2, 1);
        }
        @keyframes dashNavSlideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        @keyframes dashContentFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Animated background layers */}
      <Stars isDark={isDark} />
      {/* Glassmorphic top nav */}
      <TopNavBar
        isDark={isDark}
        activeSection={activeSection}
        canAccessAdmin={canAccessAdmin}
        onNavigate={navigateTo}
        onSignOut={handleSignOut}
        onToggleTheme={toggleTheme}
        animateIn={fromLogin}
      />

      {/* Scrollable content area */}
      <main
        id="main-content"
        aria-label={DASHBOARD_CONSTANTS.ARIA.CONTENT_LABEL}
        className="relative z-10 flex-1 overflow-y-auto"
        style={{
          paddingTop: `${DASHBOARD_CONSTANTS.NAV_HEIGHT}px`,
          ...(fromLogin ? { animation: 'dashContentFadeIn 500ms ease-out forwards' } : {}),
        }}
      >
        <div
          className="mx-auto px-4 lg:px-8 py-8"
          style={{ maxWidth: `${DASHBOARD_CONSTANTS.CONTENT_MAX_WIDTH}px` }}
        >
          {children ?? (
            <div className="p-8" style={panelStyle}>
              <h1
                className="text-2xl font-bold mb-2"
                style={{ color: isDark ? '#f8fafc' : '#ffffff' }}
              >
                Welcome to RGR Fleet Manager
              </h1>
              <p
                className="text-base"
                style={{ color: isDark ? 'rgba(148, 163, 184, 0.9)' : 'rgba(255, 255, 255, 0.8)' }}
              >
                {state.user
                  ? `Signed in as ${state.user.email} (${state.user.role})`
                  : 'Loading...'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default DashboardPresenter;
