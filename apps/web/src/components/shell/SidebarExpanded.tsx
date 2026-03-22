import { NavItem } from './NavItem';
import {
  MapIcon,
  TruckIcon,
  WrenchIcon,
  BarChart3Icon,
  LogOutIcon,
  Settings2Icon,
  SunIcon,
  MoonIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useFleetStatistics } from '@/hooks/useFleetData';

export function SidebarExpanded() {
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { data: stats } = useFleetStatistics();

  return (
    <div className="relative z-20 flex h-full w-[275px] shrink-0 flex-col overflow-hidden bg-[rgba(8,12,24,0.88)] backdrop-blur-xl border-r border-[rgba(0,168,255,0.08)] shadow-[2px_0_24px_rgba(0,0,0,0.4)]">
      {/* Top accent line */}
      <div
        className="absolute inset-y-0 right-0 w-px"
        style={{
          background: 'linear-gradient(180deg, #00A8FF 0%, transparent 50%)',
          opacity: 0.2,
        }}
      />

      {/* Logo area */}
      <div className="px-3 py-4 border-b border-white/[0.06]">
        <button onClick={() => navigate('/dashboard')} className="block w-full">
          <img
            src={isDark ? '/logo_light_electric.png' : '/logo_light.png'}
            alt="RGR Fleet"
            width={576}
            height={288}
            className="w-full h-auto drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]"
          />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 px-2 mt-5">
        <NavItem icon={<MapIcon />} label="Dashboard" href="/dashboard" expanded />
        <NavItem icon={<TruckIcon />} label="Assets" href="/assets" expanded />
        <NavItem icon={<WrenchIcon />} label="Maintenance" href="/maintenance" expanded />
        <NavItem icon={<BarChart3Icon />} label="Reports" href="/reports" expanded />
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status Breakdown */}
      {stats && (
        <div className="px-4 pb-3 border-b border-white/[0.06]">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Asset Status
          </span>
          <div className="flex flex-col gap-1.5 mt-2">
            {(
              [
                { label: 'Total', value: stats.totalAssets, color: '#3b82f6' },
                { label: 'Active', value: stats.activeAssets, color: '#22c55e' },
                { label: 'Maintenance', value: stats.inMaintenance, color: '#f59e0b' },
                { label: 'Out of Service', value: stats.outOfService, color: '#ef4444' },
              ] as const
            ).map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-white/50">{label}</span>
                </div>
                <span className="font-semibold tabular-nums text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom section — user info with dropdown */}
      <div className="border-t border-white/[0.06] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none hover:bg-white/[0.04] transition-colors">
            <Avatar className="size-8 rounded-lg grayscale shrink-0">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
              <AvatarFallback className="rounded-lg text-xs">
                {user?.fullName
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('') ?? '?'}
              </AvatarFallback>
            </Avatar>
            {user && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white leading-tight truncate">
                  {user.fullName}
                </div>
                <div className="text-[10px] text-white/40 uppercase tracking-wide leading-tight truncate">
                  {user.role}
                </div>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" sideOffset={8} className="min-w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme}>
              {isDark ? <SunIcon /> : <MoonIcon />}
              {isDark ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings2Icon />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOutIcon />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
