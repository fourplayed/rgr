import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { NavItem } from "./NavItem"
import { UserMenu } from "./UserMenu"
import {
  MapIcon,
  TruckIcon,
  WrenchIcon,
  BarChart3Icon,
  ShieldIcon,
  Settings2Icon,
  PanelLeftCloseIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { useTheme } from "@/hooks/useTheme"
import { hasRoleLevel, UserRole } from "@rgr/shared"

interface SidebarExpandedProps {
  onClose: () => void
}

export function SidebarExpanded({ onClose }: SidebarExpandedProps) {
  const { user } = useAuthStore()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  const isSuperuser = user?.role
    ? hasRoleLevel(user.role, UserRole.SUPERUSER)
    : false

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  return (
    <>
      {/* Dim overlay */}
      <div className="fixed inset-0 z-40 bg-black/40" />

      {/* Expanded panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-2xl shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
      >
        {/* Header: logo + collapse toggle */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <img
              src={isDark ? "/logo_dark.png" : "/logo_light.png"}
              alt="RGR Fleet"
              className="h-7 w-auto object-contain"
            />
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <PanelLeftCloseIcon className="size-5" />
          </button>
        </div>

        {/* Primary nav */}
        <nav className="flex flex-col gap-1 px-3 mt-1">
          <NavItem icon={<MapIcon />} label="Dashboard" href="/dashboard" expanded />
          <NavItem icon={<TruckIcon />} label="Assets" href="/assets" expanded />
          <NavItem icon={<WrenchIcon />} label="Maintenance" href="/maintenance" expanded />
          <NavItem icon={<BarChart3Icon />} label="Reports" href="/reports" expanded />
          {isSuperuser && (
            <NavItem icon={<ShieldIcon />} label="Admin" href="/admin" expanded />
          )}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom section */}
        <div className="flex flex-col gap-1 px-3 pb-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <span className="size-5 shrink-0">
              {isDark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
            </span>
            {isDark ? "Light mode" : "Dark mode"}
          </button>

          {/* Settings */}
          <NavItem icon={<Settings2Icon />} label="Settings" href="/settings" expanded />

          {/* Divider */}
          <div className="my-1 border-t border-sidebar-border" />

          {/* User menu */}
          <UserMenu expanded />
        </div>
      </div>
    </>
  )
}
