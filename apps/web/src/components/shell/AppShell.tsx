import { useState, useCallback } from "react"
import { SidebarRail } from "./SidebarRail"
import { SidebarExpanded } from "./SidebarExpanded"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [expanded, setExpanded] = useState(false)

  const handleToggle = useCallback(() => setExpanded((prev) => !prev), [])
  const handleClose = useCallback(() => setExpanded(false), [])

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarRail onToggleExpand={handleToggle} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      {expanded && <SidebarExpanded onClose={handleClose} />}
    </div>
  )
}
