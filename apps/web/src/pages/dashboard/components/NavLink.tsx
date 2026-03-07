/**
 * NavLink - Glassmorphic button-styled navigation link for the dashboard top nav
 *
 * Contracts:
 *   - data-nav-button="true" is required by SlidingNavIndicator for DOM queries
 */
import React from 'react';
import { NAV_LINK_COLORS, NAV_BUTTON_STYLES } from '../styles';

interface NavLinkProps {
  icon: React.ComponentType<{
    width?: number;
    height?: number;
    stroke?: string;
    strokeWidth?: number;
    isHovered?: boolean;
  }>;
  label: string;
  active: boolean;
  isDark: boolean;
  onClick: () => void;
  borderGradient?: boolean;
}

export const NavLink = React.memo<NavLinkProps>(
  ({ icon: Icon, label, active, isDark, onClick, borderGradient }) => {
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

    const content = (
      <>
        {/* Animated icon — handles its own hover animation */}
        <span className="relative z-[2]" style={{ flexShrink: 0 }}>
          <Icon width={20} height={20} stroke={textColor} strokeWidth={2} isHovered={isHovered} />
        </span>
        {/* Wrapper holds both plain and gradient text overlaid for smooth fade */}
        <span
          data-nav-label="true"
          className="relative z-[2]"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 700,
            fontSize: '15px',
            letterSpacing: '0.06em',
          }}
        >
          {/* Base text — visible on hover/active */}
          <span
            className="tracking-wide uppercase select-none"
            style={{
              color: textColor,
              transition: 'color 0.4s ease, opacity 0.4s ease',
              opacity: isHovered || active ? 1 : 0,
            }}
          >
            {label}
          </span>
          {/* Gradient text overlay — visible when idle, fades out on hover/active */}
          <span
            className="tracking-wide uppercase select-none chrome-gradient-text absolute inset-0"
            aria-hidden="true"
            style={{
              transition: 'opacity 0.4s ease',
              opacity: isHovered || active ? 0 : 1,
            }}
          >
            {label}
          </span>
        </span>
      </>
    );

    if (borderGradient) {
      const hoverTextColor = isHovered || active ? '#ffffff' : '#7da8ff';
      return (
        <button
          type="button"
          data-nav-button="true"
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative flex items-center gap-2 px-4 outline-none overflow-hidden"
          data-nav-height="true"
          style={{
            height: '40px',
          }}
          aria-current={active ? 'page' : undefined}
          aria-label={label}
        >
          <span className="relative z-[1]" style={{ flexShrink: 0, transition: 'color 0.3s ease' }}>
            <Icon
              width={20}
              height={20}
              stroke={hoverTextColor}
              strokeWidth={2}
              isHovered={isHovered}
            />
          </span>
          <span
            className="relative z-[1]"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: '15px',
              letterSpacing: '0.06em',
              color: hoverTextColor,
              transition: 'color 0.3s ease',
            }}
          >
            <span className="tracking-wide uppercase select-none">{label}</span>
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        data-nav-button="true"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex items-center gap-2 px-4 rounded-xl outline-none motion-reduce:transition-none"
        data-nav-height="true"
        style={{
          background: surface.background,
          border: surface.border,
          boxShadow: surface.boxShadow,
          height: '40px',
          transition: 'background 0.4s ease, box-shadow 0.4s ease, border 0.4s ease',
        }}
        aria-current={active ? 'page' : undefined}
        aria-label={label}
      >
        {content}
      </button>
    );
  }
);

NavLink.displayName = 'NavLink';
