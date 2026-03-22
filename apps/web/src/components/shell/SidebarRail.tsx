import { useNavigate } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NavItem } from "./NavItem"
import { UserMenu } from "./UserMenu"
import {
  MapIcon,
  TruckIcon,
  WrenchIcon,
  BarChart3Icon,
  ShieldIcon,
  Settings2Icon,
  SunIcon,
  MoonIcon,
} from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { useTheme } from "@/hooks/useTheme"
import { hasRoleLevel, UserRole } from "@rgr/shared"

interface SidebarRailProps {
  onToggleExpand: () => void
}

export function SidebarRail({ onToggleExpand }: SidebarRailProps) {
  const { user } = useAuthStore()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const isSuperuser = user?.role
    ? hasRoleLevel(user.role, UserRole.SUPERUSER)
    : false

  return (
    <div className="relative z-40 flex h-full w-14 flex-col items-center border-r border-sidebar-border bg-sidebar py-3 gap-1">

      {/* Logo */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-1 flex size-9 items-center justify-center rounded-lg hover:bg-sidebar-accent/50 transition-colors"
      >
        <img
          src={isDark ? "/logo_light_electric.png" : "/logo_light.png"}
          alt="RGR Fleet"
          className="size-7 object-contain"
        />
      </button>

      {/* Primary nav */}
      <nav className="flex flex-col items-center gap-1">
        <NavItem icon={<MapIcon />} label="Dashboard" href="/dashboard" />
        <NavItem icon={<TruckIcon />} label="Assets" href="/assets" />
        <NavItem icon={<WrenchIcon />} label="Maintenance" href="/maintenance" />
        <NavItem icon={<BarChart3Icon />} label="Reports" href="/reports" />
        {isSuperuser && (
          <NavItem icon={<ShieldIcon />} label="Admin" href="/admin" />
        )}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-1">
        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={toggleTheme}
                className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
              />
            }
          >
            {isDark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {isDark ? "Light mode" : "Dark mode"}
          </TooltipContent>
        </Tooltip>

        {/* Settings */}
        <NavItem icon={<Settings2Icon />} label="Settings" href="/settings" />

        {/* User menu */}
        <UserMenu />
      </div>
    </div>
  )
}
