/**
 * VisionSidebar - Vision UI styled sidebar navigation
 * Dark glassmorphism with gradient accents
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Truck,
  Wrench,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { Logo } from '@/components/common';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number;
}

export interface VisionSidebarProps {
  className?: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Truck, label: 'Assets', path: '/assets' },
  { icon: Wrench, label: 'Maintenance', path: '/maintenance' },
  { icon: FileText, label: 'Reports', path: '/reports' },
];

const BOTTOM_ITEMS: NavItem[] = [{ icon: Settings, label: 'Settings', path: '/settings' }];

export const VisionSidebar = React.memo<VisionSidebarProps>(({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const { logout } = useAuthStore();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const bgStyle = isDark
    ? {
        background:
          'linear-gradient(127.09deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)',
      }
    : { background: '#ffffff', boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)' }; // Light theme: solid white (100% opacity)

  return (
    <aside
      className={`
        w-[280px] h-screen flex-shrink-0
        backdrop-blur-xl
        border-r
        flex flex-col
        relative
        ${isDark ? 'border-white/10' : 'border-slate-200'}
        ${className}
      `}
      style={bgStyle}
    >
      {/* Logo - Absolute positioned to break out of container */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-[295px]">
        <Logo size="xl" alt="RGR Fleet Manager" />
      </div>

      {/* Spacer for logo */}
      <div className="h-[125px] flex-shrink-0" />

      {/* Divider below logo */}
      <div
        className={`mx-4 mt-[45px] mb-2 h-px bg-gradient-to-r from-transparent ${isDark ? 'via-white/20' : 'via-slate-300'} to-transparent`}
      />

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`
                w-full flex items-center gap-3 px-4 py-4 rounded-xl
                transition-all duration-200
                group relative
                ${
                  active
                    ? isDark
                      ? 'bg-vision-info text-white shadow-vision-brand'
                      : 'bg-brand text-white shadow-lg'
                    : isDark
                      ? 'text-vision-text-secondary hover:bg-navy-500/50 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              `}
            >
              <Icon
                className={`w-6 h-6 ${active ? 'text-white' : isDark ? 'text-vision-text-muted group-hover:text-white' : 'text-slate-400 group-hover:text-slate-900'}`}
              />
              <span className="font-semibold text-base">{item.label}</span>
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-error text-white">
                  {item.badge}
                </span>
              )}
              {active && (
                <div
                  className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full ${isDark ? 'bg-white' : 'bg-brand'}`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-4 pb-4 space-y-1">
        {/* Divider */}
        <div
          className={`mb-4 h-px bg-gradient-to-r from-transparent ${isDark ? 'via-vision-border/50' : 'via-slate-200'} to-transparent`}
        />

        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`
                w-full flex items-center gap-3 px-4 py-4 rounded-xl
                transition-all duration-200
                ${
                  active
                    ? isDark
                      ? 'bg-navy-500/80 text-white'
                      : 'bg-slate-100 text-slate-900'
                    : isDark
                      ? 'text-vision-text-secondary hover:bg-navy-500/50 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              `}
            >
              <Icon className="w-6 h-6" />
              <span className="font-semibold text-base">{item.label}</span>
            </button>
          );
        })}

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 ${isDark ? 'text-vision-text-secondary hover:bg-navy-500/50 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
        >
          {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          <span className="font-semibold text-base">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* User Section */}
        <div
          className={`mt-4 p-4 rounded-xl border ${isDark ? 'bg-navy-600/50 border-vision-border/20' : 'bg-slate-50 border-slate-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-vision-info flex items-center justify-center text-white font-bold text-sm">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                John Doe
              </p>
              <p
                className={`text-xs truncate ${isDark ? 'text-vision-text-muted' : 'text-slate-500'}`}
              >
                Manager
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-navy-500/50 text-vision-text-muted hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-900'}`}
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
});

VisionSidebar.displayName = 'VisionSidebar';

export default VisionSidebar;
