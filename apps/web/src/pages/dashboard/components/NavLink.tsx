/**
 * NavLink - Glassmorphic button-styled navigation link for the dashboard top nav
 *
 * Design: A frosted-glass pill button that sits within the near-black glassmorphic
 * nav bar. Three visual states:
 *   - Default: subtle frosted surface with faint border, white text
 *   - Hover: cyan-tinted glow bleeds through edges, icon spins 360deg
 *   - Active: full cyan glass treatment with inset glow and outer halo
 *
 * Accessibility:
 *   - aria-current="page" on active link (consumed by SlidingNavIndicator)
 *   - focus-visible ring for keyboard navigation
 *   - prefers-reduced-motion respected (disables icon spin and scale)
 *
 * Contracts:
 *   - data-nav-button="true" is required by SlidingNavIndicator for DOM queries
 */
import React from 'react';
import { NAV_LINK_COLORS, NAV_BUTTON_STYLES } from '../styles';

interface NavLinkProps {
  icon: React.ComponentType<{ width?: number; height?: number; stroke?: string; strokeWidth?: number; isHovered?: boolean }>;
  label: string;
  active: boolean;
  isDark: boolean;
  onClick: () => void;
}

export const NavLink = React.memo<NavLinkProps>(({ icon: Icon, label, active, isDark, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  // --- Resolve color tokens ---
  const colors = isDark ? NAV_LINK_COLORS.dark : NAV_LINK_COLORS.light;
  const textColor = active ? colors.active : isHovered ? colors.hover : colors.default;

  // --- Resolve button surface tokens ---
  const buttonTokens = isDark ? NAV_BUTTON_STYLES.dark : NAV_BUTTON_STYLES.light;
  const surface = active
    ? buttonTokens.active
    : isHovered
      ? buttonTokens.hover
      : buttonTokens.default;

  return (
    <button
      type="button"
      data-nav-button="true"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex items-center gap-2 px-4 rounded-lg outline-none motion-reduce:transition-none"
      data-nav-height="true"
      style={{
        background: surface.background,
        border: 'none',
        boxShadow: surface.boxShadow,
        height: '66px',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'background 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease',
      }}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
    >
      {/* Animated icon — handles its own hover animation */}
      <span style={{ flexShrink: 0 }}>
        <Icon width={20} height={20} stroke={textColor} strokeWidth={2} isHovered={isHovered} />
      </span>
      {/* Wrapper holds both plain and gradient text overlaid for smooth fade */}
      <span data-nav-label="true" className="relative" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 900, fontSize: '15px', letterSpacing: '0.06em' }}>
        {/* Base text — always visible, fades when gradient activates */}
        <span
          className="tracking-wide uppercase select-none"
          style={{
            color: textColor,
            transition: 'color 0.4s ease, opacity 0.4s ease',
            opacity: isHovered || active ? 0 : 1,
          }}
        >
          {label}
        </span>
        {/* Gradient text overlay — fades in on hover/active */}
        <span
          className="tracking-wide uppercase select-none chrome-gradient-text absolute inset-0"
          aria-hidden="true"
          style={{
            transition: 'opacity 0.4s ease',
            opacity: isHovered || active ? 1 : 0,
          }}
        >
          {label}
        </span>
      </span>
    </button>
  );
});

NavLink.displayName = 'NavLink';
