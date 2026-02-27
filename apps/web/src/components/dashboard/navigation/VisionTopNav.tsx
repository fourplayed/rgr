/**
 * VisionTopNav - Top navigation bar with nav links and user section
 * Replaces sidebar navigation for a cleaner, wider layout
 *
 * Light Theme Implementation:
 * - Clean white background with subtle gradient
 * - Enhanced border definition for clarity
 * - Improved hover states with smooth transitions
 * - Accessible focus indicators
 * - Theme toggle with clear visual feedback
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Truck,
  Wrench,
  FileText,
  Scan,
  LogOut,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { ThemeToggleIcon } from '@/components/common';
import { RGR_COLORS } from '@/styles/color-palette';
import { SlidingNavIndicator } from './SlidingNavIndicator';
import { UserInfoBadge } from './UserInfoBadge';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Truck, label: 'Assets', path: '/assets' },
  { icon: Wrench, label: 'Maintenance', path: '/maintenance' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Scan, label: 'A-Eye', path: '/hazards' },
];

// Extracted nav button component to properly use React hooks
interface NavButtonProps {
  item: NavItem;
  active: boolean;
  isDark: boolean;
  showDivider: boolean;
  onNavigate: (path: string) => void;
}

const NavButton = React.memo<NavButtonProps>(({ item, active, isDark, showDivider, onNavigate }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const lastClickRef = React.useRef<number>(0);
  const CLICK_COOLDOWN_MS = 500; // 500ms cooldown between navigation clicks
  const Icon = item.icon;

  const getColor = () => {
    // A-Eye uses animated iridescent colors via CSS animation
    if (item.label === 'A-Eye') {
      return 'transparent'; // Color handled by CSS animation
    }

    if (active) {
      return isDark ? '#06b6d4' : '#1e40af'; // Cyan for dark, deep blue (blue-800) for light
    }
    if (isHovered) {
      return isDark ? '#06b6d4' : '#1e40af'; // Cyan for dark, deep blue (blue-800) for light
    }
    return isDark ? RGR_COLORS.chrome.medium : '#1e293b'; // Slate-800 for light theme
  };

  const handleClick = () => {
    // Rate limiting: prevent rapid navigation spam
    const now = Date.now();
    if (now - lastClickRef.current < CLICK_COOLDOWN_MS) {
      return; // Still in cooldown, ignore click
    }
    lastClickRef.current = now;
    onNavigate(item.path);
  };

  return (
    <div className="flex items-center gap-8">
      {showDivider && (
        <div
          className="h-5 w-px"
          style={{
            backgroundColor: isDark ? `${RGR_COLORS.chrome.light}33` : 'rgba(107, 114, 128, 0.5)',
            transition: 'background-color 0.3s ease-out',
          }}
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative flex items-center gap-2.5 py-2 px-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-shadow ${item.label === 'A-Eye' ? 'a-eye-button-container' : ''}`}
        style={{
          ['--tw-ring-color' as string]: '#06b6d4', // Cyan (cyan-500) focus ring
        }}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        data-nav-button="true"
      >
        {/* Icon */}
        {item.label === 'A-Eye' ? (
          <Icon
            className="w-[26px] h-[26px] animate-spin-icon a-eye-icon"
            style={{
              color: '#8a2be2',
              transition: 'none',
            }}
          />
        ) : (
          <Icon
            className="w-[26px] h-[26px] animate-spin-icon"
            style={{
              color: getColor(),
              transition: 'color 0.15s ease-out',
            }}
          />
        )}

        {/* Text */}
        <span
          className={`text-lg font-medium group-hover:scale-110 ${item.label === 'A-Eye' ? 'a-eye-iridescent' : ''}`}
          style={{
            color: getColor(),
            transition: item.label === 'A-Eye' ? 'transform 0.15s ease-out' : 'all 0.15s ease-out',
          }}
        >
          {item.label}
        </span>
      </button>
    </div>
  );
});

NavButton.displayName = 'NavButton';

export interface VisionTopNavProps {
  className?: string;
}

export const VisionTopNav = React.memo<VisionTopNavProps>(({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    // Exact match for dashboard, startsWith for other routes
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  // Navbar background with smooth theme transition
  const bgStyle = {
    background: isDark
      ? 'linear-gradient(127.09deg, #060b28 19.41%, #0a0e23 76.65%)' // Original dark theme colors
      : '#e5e7eb', // Light grey
    transition: 'background 0.6s cubic-bezier(0.4, 0, 0.2, 1), border-bottom 0.6s cubic-bezier(0.4, 0, 0.2, 1), backdrop-filter 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        Skip to main content
      </a>
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={`
          sticky top-0 z-50
          h-[66px] px-4 lg:px-6
          border-b
          flex items-center gap-4
          transition-all duration-300
          ${isDark
            ? 'shadow-lg shadow-black/20 border-white/10'
            : 'shadow-[0_15px_30px_-12px_rgba(0,0,0,0.7)]'}
          ${className}
        `}
        style={{
          ...bgStyle,
          borderBottom: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(107, 114, 128, 0.75)'}`,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          backdropFilter: isDark ? 'blur(12px)' : 'blur(24px) saturate(250%) brightness(1.2) contrast(1.1)',
          WebkitBackdropFilter: isDark ? 'blur(12px)' : 'blur(24px) saturate(250%) brightness(1.2) contrast(1.1)',
        }}
      >
      {/* Full-width content container */}
      <div className="w-full relative h-full">
        {/* Right side - Theme | UserInfo | Logout */}
        <div className="absolute top-1/2 -translate-y-1/2 right-0 flex items-center gap-6 z-20">
          {/* Theme Toggle Icon */}
          <button
            type="button"
            onClick={toggleTheme}
            className="group relative py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-shadow"
            style={{
              ['--tw-ring-color' as string]: '#06b6d4', // Cyan (cyan-500) for both themes
            }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <ThemeToggleIcon isDark={isDark} />
          </button>

          {/* Vertical Divider */}
          {user && (
            <div
              className="h-5 w-px"
              style={{
                backgroundColor: isDark ? `${RGR_COLORS.chrome.light}33` : 'rgba(107, 114, 128, 0.5)',
                transition: 'background-color 0.3s ease-out',
              }}
              aria-hidden="true"
            />
          )}

          {/* User Info Badge */}
          {user && <UserInfoBadge user={user} isDark={isDark} />}

          {/* Sign Out Icon */}
          <button
            type="button"
            onClick={handleSignOut}
            className="group relative py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-500 ease-out"
            style={{
              ['--tw-ring-color' as string]: '#ef4444',
              color: isDark ? RGR_COLORS.chrome.medium : '#1e293b', // Slate-800 for light theme
              transition: 'color 0.2s ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444'; // Red
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? RGR_COLORS.chrome.medium : '#1e293b'; // Slate-800 for light theme
            }}
            aria-label="Sign out"
          >
            <LogOut className="w-6 h-6 transition-all duration-500 ease-out group-hover:scale-125" />
          </button>
        </div>

        {/* Navigation Links - left aligned */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-6 relative">
          {/* Sliding Nav Indicator */}
          <SlidingNavIndicator isDark={isDark} zIndex={5} />

          {NAV_ITEMS.map((item, index) => (
            <NavButton
              key={item.path}
              item={item}
              active={isActive(item.path)}
              isDark={isDark}
              showDivider={index > 0}
              onNavigate={navigate}
            />
          ))}
        </div>
      </div>
      </nav>

      {/* Liquid Iridescent Flow Animation for A-Eye */}
      <style>{`
        @keyframes liquidIridescence {
          0% {
            background-position: 0% 50%;
          }
          20% {
            background-position: 25% 75%;
          }
          40% {
            background-position: 50% 100%;
          }
          60% {
            background-position: 75% 75%;
          }
          80% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        /* A-Eye icon with color transitions */
        .a-eye-icon {
          animation: iconColorFlow 8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          position: relative;
          z-index: 1;
        }

        @keyframes iconColorFlow {
          0% {
            color: #8a2be2;  /* Deep Purple */
          }
          12.5% {
            color: #00bfff;  /* Deep Sky Blue */
          }
          25% {
            color: #ff1493;  /* Deep Pink */
          }
          37.5% {
            color: #00ffff;  /* Cyan */
          }
          50% {
            color: #8a2be2;  /* Purple again */
          }
          62.5% {
            color: #ff1493;  /* Pink again */
          }
          75% {
            color: #00bfff;  /* Blue again */
          }
          87.5% {
            color: #8a2be2;  /* Purple */
          }
          100% {
            color: #8a2be2;  /* Complete cycle */
          }
        }

        .a-eye-iridescent {
          /* Multi-layer holographic gradient with liquid metal shimmer */
          background: linear-gradient(
            135deg,
            #8a2be2 0%,    /* Deep Purple */
            #00bfff 15%,   /* Deep Sky Blue */
            #ff1493 30%,   /* Deep Pink */
            #00ffff 45%,   /* Cyan */
            #8a2be2 60%,   /* Purple again */
            #ff1493 75%,   /* Pink again */
            #00bfff 90%,   /* Blue again */
            #8a2be2 100%   /* Complete the cycle */
          );
          background-size: 300% 300%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;

          /* Smooth flowing animation */
          animation: liquidIridescence 8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;

          /* Add subtle shimmer overlay */
          position: relative;
        }

        /* Additional shimmer layer for extra depth */
        .a-eye-iridescent::before {
          content: attr(data-text);
          position: absolute;
          left: 0;
          top: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 45%,
            rgba(255, 255, 255, 0.5) 50%,
            rgba(255, 255, 255, 0.3) 55%,
            transparent 100%
          );
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmerFlow 3s linear infinite;
          pointer-events: none;
        }

        @keyframes shimmerFlow {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        /* Single sparkle that spawns, flashes, then explodes or fades */
        .a-eye-button-container::before {
          content: '';
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 50%;
          pointer-events: none;
          opacity: 0;
          top: 50%;
          left: 50%;
          margin: -1px 0 0 -1px;
          box-shadow:
            0 0 1px 0.5px currentColor,
            0 0 2px 1px currentColor,
            0 0 4px 2px currentColor;
          animation: flashAndDecide 26s ease-in-out infinite;
          z-index: 1;
        }

        .a-eye-button-container::after {
          display: none;
        }

        @keyframes flashAndDecide {
          /* CYCLE 1: Quick spawn, 2 fast flashes, EXPLODE early */
          0% {
            opacity: 0;
            transform: translate(-28px, 0) scale(0.5);
            color: #8a2be2;
            z-index: 10;
          }

          3% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1);
            color: #00bfff;
            z-index: 10;
          }

          /* Quick flash 1 */
          5% {
            opacity: 0.2;
            transform: translate(-28px, 0) scale(0.85);
            color: #ff1493;
            z-index: 10;
          }

          6.5% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.15);
            color: #00ffff;
            z-index: 10;
          }

          /* Quick flash 2 */
          8% {
            opacity: 0.35;
            transform: translate(-28px, 0) scale(0.9);
            color: #8a2be2;
            z-index: 10;
          }

          9.5% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.2);
            color: #00bfff;
            z-index: 10;
          }

          /* Early EXPLODE */
          11% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.4);
            color: #ff1493;
            z-index: 10;
          }

          13% {
            opacity: 0.7;
            transform: translate(-28px, 0) scale(3);
            color: #00ffff;
            z-index: 10;
          }

          14% {
            opacity: 0;
            transform: translate(-28px, 0) scale(5);
            color: #8a2be2;
            z-index: 10;
          }

          /* Hidden */
          14.01%, 29.99% {
            opacity: 0;
            transform: translate(-28px, 0) scale(0);
            color: #8a2be2;
            z-index: 1;
          }

          /* CYCLE 2: Delayed spawn, 4 slow flashes, FADE OUT */
          30% {
            opacity: 0;
            transform: translate(-28px, 0) scale(0.5);
            color: #ff1493;
            z-index: 10;
          }

          35% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1);
            color: #00ffff;
            z-index: 10;
          }

          /* Slow flash 1 */
          37% {
            opacity: 0.4;
            transform: translate(-28px, 0) scale(0.95);
            color: #8a2be2;
            z-index: 10;
          }

          39% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.05);
            color: #00bfff;
            z-index: 10;
          }

          /* Slow flash 2 */
          41.5% {
            opacity: 0.3;
            transform: translate(-28px, 0) scale(0.9);
            color: #ff1493;
            z-index: 10;
          }

          43.5% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.1);
            color: #00ffff;
            z-index: 10;
          }

          /* Slow flash 3 */
          46% {
            opacity: 0.25;
            transform: translate(-28px, 0) scale(0.85);
            color: #8a2be2;
            z-index: 10;
          }

          48% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.15);
            color: #00bfff;
            z-index: 10;
          }

          /* Slow flash 4 */
          50.5% {
            opacity: 0.2;
            transform: translate(-28px, 0) scale(0.8);
            color: #ff1493;
            z-index: 10;
          }

          52.5% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.2);
            color: #00ffff;
            z-index: 10;
          }

          /* Slow FADE OUT */
          55% {
            opacity: 0.8;
            transform: translate(-28px, 0) scale(1.1);
            color: #8a2be2;
            z-index: 10;
          }

          57% {
            opacity: 0.5;
            transform: translate(-28px, 0) scale(0.9);
            color: #00bfff;
            z-index: 10;
          }

          59% {
            opacity: 0.2;
            transform: translate(-28px, 0) scale(0.6);
            color: #ff1493;
            z-index: 10;
          }

          60% {
            opacity: 0;
            transform: translate(-28px, 0) scale(0.4);
            color: #00ffff;
            z-index: 10;
          }

          /* Hidden */
          60.01%, 69.99% {
            opacity: 0;
            transform: translate(-28px, 0) scale(0);
            color: #8a2be2;
            z-index: 1;
          }

          /* CYCLE 3: Medium spawn, 3 varied flashes, EXPLODE late */
          70% {
            opacity: 0;
            transform: translate(-28px, 0) scale(0.5);
            color: #00bfff;
            z-index: 10;
          }

          73% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1);
            color: #ff1493;
            z-index: 10;
          }

          /* Irregular flash 1 - quick */
          74.5% {
            opacity: 0.3;
            transform: translate(-28px, 0) scale(0.88);
            color: #00ffff;
            z-index: 10;
          }

          75.5% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.12);
            color: #8a2be2;
            z-index: 10;
          }

          /* Irregular flash 2 - very slow */
          77.5% {
            opacity: 0.15;
            transform: translate(-28px, 0) scale(0.75);
            color: #00bfff;
            z-index: 10;
          }

          80.5% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.25);
            color: #ff1493;
            z-index: 10;
          }

          /* Irregular flash 3 - medium */
          82.5% {
            opacity: 0.4;
            transform: translate(-28px, 0) scale(0.9);
            color: #00ffff;
            z-index: 10;
          }

          84% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.18);
            color: #8a2be2;
            z-index: 10;
          }

          /* Late EXPLODE */
          86% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.5);
            color: #00bfff;
            z-index: 10;
          }

          88.5% {
            opacity: 0.6;
            transform: translate(-28px, 0) scale(3.5);
            color: #ff1493;
            z-index: 10;
          }

          90% {
            opacity: 0;
            transform: translate(-28px, 0) scale(5.5);
            color: #00ffff;
            z-index: 10;
          }

          /* Hidden */
          90.01%, 90.99% {
            opacity: 0;
            transform: translate(-28px, 0) scale(0);
            color: #8a2be2;
            z-index: 1;
          }

          /* CYCLE 4: Spawn, 2 quick flashes, ZOOM OFF into darkness */
          91% {
            opacity: 0;
            transform: translate(-28px, 0) scale(0.5);
            color: #ff1493;
            z-index: 1;
          }

          92% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1);
            color: #00bfff;
            z-index: 1;
          }

          /* Quick flash 1 */
          93% {
            opacity: 0.25;
            transform: translate(-28px, 0) scale(0.85);
            color: #8a2be2;
            z-index: 1;
          }

          93.8% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.15);
            color: #00ffff;
            z-index: 1;
          }

          /* Quick flash 2 */
          94.6% {
            opacity: 0.3;
            transform: translate(-28px, 0) scale(0.9);
            color: #ff1493;
            z-index: 1;
          }

          95.4% {
            opacity: 1;
            transform: translate(-28px, 0) scale(1.1);
            color: #00bfff;
            z-index: 1;
          }

          /* Start zoom acceleration backward */
          96% {
            opacity: 0.95;
            transform: translate(-35px, 0) scale(1);
            color: #8a2be2;
            z-index: 1;
          }

          96.8% {
            opacity: 0.85;
            transform: translate(-48px, 0) scale(0.8);
            color: #ff1493;
            z-index: 1;
          }

          97.6% {
            opacity: 0.65;
            transform: translate(-64px, 0) scale(0.6);
            color: #00ffff;
            z-index: 1;
          }

          98.4% {
            opacity: 0.4;
            transform: translate(-82px, 0) scale(0.4);
            color: #00bfff;
            z-index: 1;
          }

          99.2% {
            opacity: 0.15;
            transform: translate(-105px, 0) scale(0.25);
            color: #8a2be2;
            z-index: 1;
          }

          /* Disappeared into darkness */
          100% {
            opacity: 0;
            transform: translate(-130px, 0) scale(0.1);
            color: #ff1493;
            z-index: 1;
          }
        }


        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .a-eye-iridescent {
            animation: none;
            background: linear-gradient(135deg, #8a2be2 0%, #00bfff 50%, #ff1493 100%);
            background-size: 100% 100%;
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .a-eye-iridescent::before {
            display: none;
          }
        }
      `}</style>
    </>
  );
});

VisionTopNav.displayName = 'VisionTopNav';

export default VisionTopNav;
