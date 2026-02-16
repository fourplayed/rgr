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
import { DASHBOARD_CONSTANTS } from './types';
import { TopNavBar } from './components/TopNavBar';
import type { DashboardState, DashboardActions } from './useDashboardLogic';

export interface DashboardPresenterProps {
  state: DashboardState;
  actions: DashboardActions;
  /** Optional children for page content (used by StubPage) */
  children?: React.ReactNode;
}

export function DashboardPresenter({ state, actions, children }: DashboardPresenterProps) {
  const { isDark, activeSection, canAccessAdmin, user } = state;
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

  return (
    <div
      className="relative min-h-screen h-screen flex flex-col overflow-hidden"
      style={{ zIndex: 1 }}
    >
      <style>{`
        @keyframes dashNavSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          40% { opacity: 1; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes dashContentFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashContentFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashMapReveal {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes chromeFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
        .chrome-gradient-bar {
          background: linear-gradient(90deg, #9ca3af 0%, #cbd5e1 20%, #ebebeb 40%, #ffffff 50%, #ebebeb 60%, #cbd5e1 80%, #9ca3af 100%);
          background-size: 300% 100%;
          animation: chromeFlow 4s ease-in-out infinite alternate;
        }
        .chrome-gradient-icon {
          animation: chromeIconFlow 6s ease-in-out infinite;
        }
        @keyframes chromeIconFlow {
          0%, 100% { color: #9ca3af; }
          20% { color: #cbd5e1; }
          40% { color: #ebebeb; }
          60% { color: #cbd5e1; }
          80% { color: #9ca3af; }
        }
        .chrome-gradient-text {
          background: linear-gradient(90deg, #9ca3af 0%, #cbd5e1 20%, #ebebeb 40%, #cbd5e1 60%, #9ca3af 80%, #9ca3af 100%);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: chromeFlow 6s ease-in-out infinite;
        }
      `}</style>

      {/* Glassmorphic top nav */}
      <TopNavBar
        isDark={isDark}
        activeSection={activeSection}
        canAccessAdmin={canAccessAdmin}
        userName={user?.fullName || user?.email || null}
        userRole={user?.role || null}
        userAvatarUrl={user?.avatarUrl || null}
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
          ...(fromLogin ? { opacity: 0, animation: 'dashContentFadeIn 600ms cubic-bezier(0.16, 1, 0.3, 1) 400ms forwards' } : {}),
        }}
      >
        {/* Glassmorphic content shader */}
        <div className="relative mx-auto py-8" style={{ maxWidth: '1440px', minHeight: '100%' }}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? 'rgba(0, 0, 0, 0.15)'
                : 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: 'none',
              boxShadow: 'none',
              margin: '0 auto',
              left: 0,
              right: 0,
            }}
            aria-hidden="true"
          />
          <div
            className="relative mx-auto"
            style={{ maxWidth: '1440px' }}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPresenter;
