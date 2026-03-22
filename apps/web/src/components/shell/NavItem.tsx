import { Link, useLocation } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface NavItemProps {
  icon: ReactNode
  label: string
  href: string
  expanded?: boolean
}

export function NavItem({ icon, label, href, expanded = false }: NavItemProps) {
  const { pathname } = useLocation()
  const isActive = pathname === href

  if (expanded) {
    return (
      <Link
        to={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border border-sidebar-border"
            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
      >
        <span className="size-4 shrink-0 [&>svg]:size-4">{icon}</span>
        {label}
      </Link>
    )
  }

  const triggerLink = (
    <Link
      to={href}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      )}
    >
      <span className="size-4 [&>svg]:size-4">{icon}</span>
    </Link>
  )

  return (
    <Tooltip>
      <TooltipTrigger render={triggerLink} />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
