/**
 * TopNavBar - Glassmorphic navigation bar for dashboard pages
 *
 * Fixed at top, 66px height, with left nav links and right action icons.
 * Uses glassmorphic styling with dark/light variants.
 */
import React from 'react';
import { LogOut, Settings, ShieldCheck, User } from 'lucide-react';
import { ThemeToggleIcon } from '@/components/common';
import { NAV_ITEMS, DASHBOARD_CONSTANTS } from '../types';
import { NAV_BAR_STYLES } from '../styles';
import { NavLink } from './NavLink';
import { SlidingNavIndicator } from '@/components/dashboard/navigation/SlidingNavIndicator';
import type { DashboardSection } from '../types';

interface TopNavBarProps {
  isDark: boolean;
  activeSection: DashboardSection;
  canAccessAdmin: boolean;
  userName: string | null;
  userRole: string | null;
  userAvatarUrl: string | null;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
  /** When true, the nav bar slides down from off-screen on mount */
  animateIn?: boolean;
}

/** Format role string for display */
function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export const TopNavBar = React.memo<TopNavBarProps>(
  ({
    isDark,
    activeSection,
    canAccessAdmin,
    userName,
    userRole,
    userAvatarUrl,
    onNavigate,
    onSignOut,
    onToggleTheme,
    animateIn,
  }) => {
    const navStyle = isDark ? NAV_BAR_STYLES.dark : NAV_BAR_STYLES.light;
    const iconColor = '#7da8ff';
    const iconHoverColor = '#ffffff';
    const textColor = '#7da8ff';
    const mutedColor = '#5b8af5';

    return (
      <>
        {/* Skip link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
        >
          {DASHBOARD_CONSTANTS.ARIA.SKIP_LINK_TEXT}
        </a>

        <nav
          role="navigation"
          aria-label={DASHBOARD_CONSTANTS.ARIA.NAV_LABEL}
          className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 lg:px-6 overflow-visible"
          style={{
            ...navStyle,
            height: `${DASHBOARD_CONSTANTS.NAV_HEIGHT}px`,
            transition: 'background 0.6s ease, border-bottom 0.6s ease, box-shadow 0.6s ease',
            ...(animateIn
              ? { animation: 'dashNavSlideDown 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards' }
              : {}),
          }}
        >
          {/* Left side: nav links */}
          <div className="flex items-center gap-2">
            {NAV_ITEMS.map((item, index) => (
              <React.Fragment key={item.path}>
                {index > 0 && (
                  <div
                    className="h-5 w-px mx-1"
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(255, 255, 255, 0.3)',
                    }}
                    aria-hidden="true"
                  />
                )}
                <NavLink
                  icon={item.icon}
                  label={item.label}
                  active={activeSection === item.section}
                  isDark={isDark}
                  onClick={() => onNavigate(item.path)}
                  borderGradient
                />
              </React.Fragment>
            ))}
          </div>

          {/* Sliding indicator under nav links */}
          <SlidingNavIndicator isDark={isDark} />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side: user info + actions */}
          <div className="flex items-center gap-3">
            {/* Admin (superuser only) */}
            {canAccessAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('/admin')}
                className="group relative p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-all duration-200"
                aria-label="Admin"
                onMouseEnter={(e) => {
                  (e.currentTarget.querySelector('svg') as SVGElement).style.color = iconHoverColor;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget.querySelector('svg') as SVGElement).style.color = iconColor;
                }}
              >
                <ShieldCheck
                  className="w-6 h-6 transition-colors duration-200"
                  style={{ color: iconColor }}
                />
              </button>
            )}

            {/* User info */}
            {userName && (
              <div className="flex items-center gap-2.5">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                  style={{
                    border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.4)'}`,
                    background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-5 h-5" style={{ color: textColor }} />
                    </div>
                  )}
                </div>
                {/* Name + Role */}
                <div className="flex flex-col leading-tight">
                  <span
                    className="text-[15px] font-semibold truncate max-w-[180px]"
                    style={{ color: textColor, fontFamily: "'Lato', sans-serif" }}
                  >
                    {userName}
                  </span>
                  {userRole && (
                    <span
                      className="text-[13px] truncate max-w-[180px]"
                      style={{ color: mutedColor, fontFamily: "'Lato', sans-serif" }}
                    >
                      {formatRole(userRole)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Sign Out */}
            <button
              type="button"
              onClick={onSignOut}
              className="group relative p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-all duration-200"
              aria-label="Sign out"
              onMouseEnter={(e) => {
                (e.currentTarget.querySelector('svg') as SVGElement).style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.querySelector('svg') as SVGElement).style.color = iconColor;
              }}
            >
              <LogOut
                className="w-6 h-6 transition-all duration-500 ease-out group-hover:scale-125 group-hover:rotate-180"
                style={{ color: iconColor }}
              />
            </button>

            {/* Divider */}
            <div
              className="h-5 w-px mx-1"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.3)',
              }}
              aria-hidden="true"
            />

            {/* Settings */}
            <button
              type="button"
              onClick={() => onNavigate('/settings')}
              className="group relative p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-all duration-200"
              aria-label="Settings"
              onMouseEnter={(e) => {
                (e.currentTarget.querySelector('svg') as SVGElement).style.color = iconHoverColor;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.querySelector('svg') as SVGElement).style.color = iconColor;
              }}
            >
              <Settings
                className="w-6 h-6 transition-all duration-500 ease-out group-hover:scale-125 group-hover:rotate-180"
                style={{ color: iconColor }}
              />
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="group relative p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-all duration-200"
              style={{ color: iconColor }}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = iconHoverColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = iconColor;
              }}
            >
              <ThemeToggleIcon isDark={isDark} />
            </button>
          </div>
        </nav>
      </>
    );
  }
);

TopNavBar.displayName = 'TopNavBar';
