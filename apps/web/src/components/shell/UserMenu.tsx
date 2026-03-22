import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CircleUserRoundIcon, LogOutIcon } from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { useNavigate } from "react-router-dom"

interface UserMenuProps {
  expanded?: boolean
}

export function UserMenu({ expanded = false }: UserMenuProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  if (!user) return null

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")

  const avatarElement = (
    <Avatar className="size-8 rounded-lg grayscale">
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
      <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
    </Avatar>
  )

  return (
    <DropdownMenu>
      {expanded ? (
        <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50 transition-colors outline-none">
          {avatarElement}
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate font-medium text-sidebar-foreground">{user.fullName}</span>
            <span className="truncate text-xs text-sidebar-foreground/50">{user.email}</span>
          </div>
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger className="flex size-9 items-center justify-center rounded-lg hover:bg-sidebar-accent/50 transition-colors outline-none">
          {avatarElement}
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        className="min-w-56"
        side="right"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            {avatarElement}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.fullName}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate("/settings")}>
            <CircleUserRoundIcon />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}>
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
