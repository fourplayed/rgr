import * as React from "react"
import { useLocation } from "react-router-dom"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavFleetHealth } from "@/components/nav-fleet-health"
import { NavDepots } from "@/components/nav-depots"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  IconLayoutDashboard,
  IconBox,
  IconTool,
  IconChartBar,
  IconSettings,
  IconShieldLock,
} from "@tabler/icons-react"
import { useAuthStore } from "@/stores/authStore"
import { hasRoleLevel, UserRole } from "@rgr/shared"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { pathname } = useLocation()

  const isSuperuser = user?.role ? hasRoleLevel(user.role, UserRole.SUPERUSER) : false

  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <IconLayoutDashboard />,
      isActive: pathname === "/dashboard",
      items: [],
    },
    {
      title: "Assets",
      url: "/assets",
      icon: <IconBox />,
      isActive: pathname.startsWith("/assets"),
      items: [
        { title: "All Assets", url: "/assets" },
        { title: "Trailers", url: "/assets?category=trailer" },
        { title: "Dollies", url: "/assets?category=dolly" },
      ],
    },
    {
      title: "Maintenance",
      url: "/maintenance",
      icon: <IconTool />,
      isActive: pathname.startsWith("/maintenance"),
      items: [],
    },
    {
      title: "Reports",
      url: "/reports",
      icon: <IconChartBar />,
      isActive: pathname.startsWith("/reports"),
      items: [],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: <IconSettings />,
      isActive: pathname.startsWith("/settings"),
      items: [],
    },
    ...(isSuperuser
      ? [
          {
            title: "Admin",
            url: "/admin",
            icon: <IconShieldLock />,
            isActive: pathname.startsWith("/admin"),
            items: [],
          },
        ]
      : []),
  ]

  const navUser = {
    name: user?.fullName ?? "User",
    email: user?.email ?? "",
    avatar: user?.avatarUrl ?? "",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex items-center justify-center py-4">
        <img
          src="/logo_light.png"
          alt="RGR"
          className="h-9 w-auto group-data-[collapsible=icon]:h-6"
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavFleetHealth />
        <NavDepots />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} onSignOut={logout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
