/**
 * TopNavBar - Glassmorphic navigation bar for dashboard pages
 *
 * Fixed at top, 66px height, with left nav links and right action icons.
 * Uses glassmorphic styling with dark/light variants.
 */
import React from 'react';
import { LogOut, Settings, ShieldCheck } from 'lucide-react';
import { ThemeToggleIcon } from '@/components/common';
import { NAV_ITEMS, DASHBOARD_CONSTANTS } from '../types';
import { NAV_BAR_STYLES, NAV_LINK_COLORS } from '../styles';
import { NavLink } from './NavLink';
import type { DashboardSection } from '../types';

interface TopNavBarProps {
  isDark: boolean;
  activeSection: DashboardSection;
  canAccessAdmin: boolean;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
  /** When true, the nav bar slides down from off-screen on mount */
  animateIn?: boolean;
}

export const TopNavBar = React.memo<TopNavBarProps>(({
  isDark,
  activeSection,
  canAccessAdmin,
  onNavigate,
  onSignOut,
  onToggleTheme,
  animateIn,
}) => {
  const navStyle = isDark ? NAV_BAR_STYLES.dark : NAV_BAR_STYLES.light;
  const iconColor = isDark ? NAV_LINK_COLORS.dark.default : NAV_LINK_COLORS.light.default;
  const iconHoverColor = isDark ? NAV_LINK_COLORS.dark.hover : NAV_LINK_COLORS.light.hover;

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
        className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 lg:px-6"
        style={{
          ...navStyle,
          height: `${DASHBOARD_CONSTANTS.NAV_HEIGHT}px`,
          transition: 'background 0.6s ease, border-bottom 0.6s ease, box-shadow 0.6s ease',
          ...(animateIn ? { animation: 'dashNavSlideDown 500ms ease-out forwards' } : {}),
        }}
      >
        {/* Left side: nav links */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              icon={item.icon}
              label={item.label}
              active={activeSection === item.section}
              isDark={isDark}
              onClick={() => onNavigate(item.path)}
            />
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side: actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="group relative p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-all duration-200"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <ThemeToggleIcon isDark={isDark} />
          </button>

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
              className="w-5 h-5 transition-colors duration-200"
              style={{ color: iconColor }}
            />
          </button>

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
                className="w-5 h-5 transition-colors duration-200"
                style={{ color: iconColor }}
              />
            </button>
          )}

          {/* Divider */}
          <div
            className="h-5 w-px mx-1"
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.3)',
            }}
            aria-hidden="true"
          />

          {/* Sign Out */}
          <button
            type="button"
            onClick={onSignOut}
            className="group relative p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-all duration-200"
            aria-label="Sign out"
            onMouseEnter={(e) => {
              (e.currentTarget.querySelector('svg') as SVGElement).style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget.querySelector('svg') as SVGElement).style.color = iconColor;
            }}
          >
            <LogOut
              className="w-5 h-5 transition-colors duration-200"
              style={{ color: iconColor }}
            />
          </button>
        </div>
      </nav>
    </>
  );
});

TopNavBar.displayName = 'TopNavBar';
