import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, Moon, Sun, User } from 'lucide-react';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  IoDesktopOutline,
  IoDesktop,
  IoCubeOutline,
  IoCube,
  IoConstructOutline,
  IoConstruct,
  IoBarChartOutline,
  IoBarChart,
} from 'react-icons/io5';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Navigation data
// ---------------------------------------------------------------------------

interface NavLinkItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  iconFilled: React.ComponentType<{ className?: string; size?: number }>;
}

interface NavGroup {
  title: string;
  items: NavLinkItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Dashboard',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: IoDesktopOutline, iconFilled: IoDesktop }],
  },
  {
    title: 'Assets',
    items: [{ label: 'Assets', href: '/assets', icon: IoCubeOutline, iconFilled: IoCube }],
  },
  {
    title: 'Maintenance',
    items: [
      {
        label: 'Maintenance',
        href: '/maintenance',
        icon: IoConstructOutline,
        iconFilled: IoConstruct,
      },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Reports', href: '/reports', icon: IoBarChartOutline, iconFilled: IoBarChart },
    ],
  },
];

// ---------------------------------------------------------------------------
// Desktop nav with sliding indicator
// ---------------------------------------------------------------------------

function DualIcon({
  icon: OutlineIcon,
  iconFilled: FilledIcon,
  className,
  filled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconFilled: React.ComponentType<{ className?: string }>;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span className="relative inline-flex">
      <OutlineIcon
        className={cn(
          className,
          'transition-opacity duration-300 ease-in-out',
          filled ? 'opacity-0' : 'opacity-100'
        )}
      />
      <FilledIcon
        className={cn(
          className,
          'absolute inset-0 transition-opacity duration-300 ease-in-out',
          filled ? 'opacity-100' : 'opacity-0'
        )}
      />
    </span>
  );
}

function DesktopNav() {
  const { pathname } = useLocation();
  const [hoveredHref, setHoveredHref] = React.useState<string | null>(null);

  const allLinks = navGroups.flatMap((g) => g.items);

  return (
    <nav
      className="relative ml-2 hidden items-center md:flex"
      onMouseLeave={() => setHoveredHref(null)}
    >
      {allLinks.map((item, i) => {
        const isActive = pathname === item.href;
        const isHovered = hoveredHref === item.href;
        return (
          <React.Fragment key={item.href}>
            {i > 0 && <div className="h-4 w-px bg-white/10 mx-1" />}
            <Link
              to={item.href}
              onMouseEnter={() => setHoveredHref(item.href)}
              className={cn(
                'relative flex items-center px-5 py-1.5 text-sm uppercase tracking-[0.12em] font-semibold transition-all duration-200',
                isActive
                  ? 'text-white [filter:saturate(1.2)_brightness(1.1)]'
                  : 'text-white/60 hover:text-white/90'
              )}
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              <span className="relative flex items-center gap-2">
                <DualIcon
                  icon={item.icon}
                  iconFilled={item.iconFilled}
                  filled={isActive || isHovered}
                  className={cn('size-3.5', isActive || isHovered ? 'text-white' : 'text-white/50')}
                />
                <span>{item.label}</span>

                {/* Per-link indicator — matches content width */}
                <span
                  className={cn(
                    'absolute -bottom-1.5 left-0 right-0 h-[2px] rounded-full transition-all duration-300 ease-in-out',
                    isActive
                      ? 'opacity-100 bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)] [filter:saturate(1.2)_brightness(1.2)]'
                      : 'opacity-0'
                  )}
                />
              </span>
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Mobile navigation sheet
// ---------------------------------------------------------------------------

function MobileNav() {
  const { pathname } = useLocation();
  const { isDark: _isDark } = useTheme();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button className="inline-flex items-center justify-center size-9 rounded-md text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors md:hidden" />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <img src={'/logo_dark.png'} alt="RGR Fleet" className="h-6 w-auto" />
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {group.title}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#00A8FF]/10 text-[#00A8FF]'
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Theme toggle button
// ---------------------------------------------------------------------------

function SpinButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  const [spinning, setSpinning] = React.useState(false);
  const animating = React.useRef(false);

  const handleMouseEnter = () => {
    if (animating.current) return;
    animating.current = true;
    setSpinning(true);
  };

  const handleAnimationEnd = () => {
    setSpinning(false);
    animating.current = false;
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      className="flex size-10 items-center justify-center text-white/60 hover:text-white hover:brightness-110 transition-colors duration-200 cursor-pointer"
      aria-label={label}
    >
      <span
        className={spinning ? 'animate-[spin-once_0.5s_ease-in-out]' : ''}
        onAnimationEnd={handleAnimationEnd}
      >
        {children}
      </span>
    </button>
  );
}

function ThemeButton() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <SpinButton
      onClick={toggleTheme}
      label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </SpinButton>
  );
}

// ---------------------------------------------------------------------------
// Logout button
// ---------------------------------------------------------------------------

function LogoutButton() {
  const { logout } = useAuthStore();
  return (
    <SpinButton onClick={() => logout()} label="Log out">
      <LogOut className="size-5" />
    </SpinButton>
  );
}

// ---------------------------------------------------------------------------
// User dropdown
// ---------------------------------------------------------------------------

function NavUser() {
  const { user } = useAuthStore();

  return (
    <div className="flex items-center gap-2">
      <div className="flex size-8 items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.1]">
        <User className="size-4 text-white/70" />
      </div>
      <span className="hidden text-sm font-medium text-white/80 md:inline">{user?.fullName}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppShell — top navigation bar layout
// ---------------------------------------------------------------------------

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isDark: _isDark } = useTheme();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-gradient-to-b from-[#06062a] to-[#03031a] shadow-md">
        <div className="flex h-14 items-center gap-4 px-3 lg:px-4 overflow-visible">
          {/* Mobile menu */}
          <MobileNav />

          {/* Logo */}
          <Link to="/dashboard" className="flex shrink-0 items-center mt-5">
            <img
              src={'/logo_dark.png'}
              alt="RGR Fleet"
              className="h-16 w-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            />
          </Link>

          {/* Desktop navigation */}
          <DesktopNav />

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            <NavUser />
            <div className="h-5 w-px bg-white/10" />
            <ThemeButton />
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content — full bleed, no padding (map needs edge-to-edge) */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
