import {
  ChevronRight,
  ChevronsUpDown,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Map,
  Moon,
  Settings,
  Shield,
  Sun,
  Truck,
  User,
  Wrench,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useDepots } from "@/hooks/useAssetData";
import { useFleetStatistics, useAssetLocations } from "@/hooks/useFleetData";
import { useTheme } from "@/hooks/useTheme";
import { hasRoleLevel, UserRole } from "@rgr/shared";

// ── Types ──────────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  isActive?: boolean;
  children?: NavItem[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

// ── Fleet Health section ───────────────────────────────────────────────────

const FLEET_STATS = [
  { key: "totalAssets" as const,   label: "Total Assets",  color: "#3b82f6" },
  { key: "activeAssets" as const,  label: "Active",        color: "#22c55e" },
  { key: "inMaintenance" as const, label: "Maintenance",   color: "#f59e0b" },
  { key: "outOfService" as const,  label: "Out of Service",color: "#ef4444" },
];

const DEPOT_DOT_COLORS = [
  "#22c55e",
  "#a78bfa",
  "#f59e0b",
  "#f87171",
  "#38bdf8",
  "#fb923c",
  "#e879f9",
  "#34d399",
];

const FleetHealthSection = () => {
  const { data, isLoading } = useFleetStatistics();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Fleet Health</SidebarGroupLabel>
      <SidebarMenu>
        {FLEET_STATS.map(({ key, label, color }) => (
          <SidebarMenuItem key={key}>
            <div className="flex items-center justify-between px-2 py-1 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{label}</span>
              </div>
              <span className="font-medium tabular-nums">
                {isLoading ? "—" : (data?.[key] ?? 0)}
              </span>
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
};

const DepotsSection = () => {
  const { data: depots = [] } = useDepots();
  const { data: locations = [] } = useAssetLocations();

  const assetCountByDepotName = locations.reduce<Record<string, number>>((acc, loc) => {
    if (loc.depot) {
      acc[loc.depot] = (acc[loc.depot] ?? 0) + 1;
    }
    return acc;
  }, {});

  const activeDepots = depots.filter((d) => d.isActive);

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Depots</SidebarGroupLabel>
      <SidebarMenu>
        {activeDepots.map((depot, index) => {
          const dotColor = DEPOT_DOT_COLORS[index % DEPOT_DOT_COLORS.length]!;
          const count = assetCountByDepotName[depot.name] ?? 0;
          return (
            <SidebarMenuItem key={depot.id}>
              <div className="flex items-center gap-2 px-2 py-1 text-sm">
                <span
                  className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="flex-1 truncate text-muted-foreground">{depot.name}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{count}</span>
              </div>
            </SidebarMenuItem>
          );
        })}
        {activeDepots.length === 0 && (
          <SidebarMenuItem>
            <div className="px-2 py-1 text-sm text-muted-foreground">No depots found</div>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
};

// ── NavMenuItem ────────────────────────────────────────────────────────────

const NavMenuItem = ({ item }: { item: NavItem }) => {
  const navigate = useNavigate();
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <Collapsible defaultOpen className="group/collapsible" render={<SidebarMenuItem />}>
        <CollapsibleTrigger render={<SidebarMenuButton {...(item.isActive ? { isActive: true } : {})} />}>
          <Icon className="size-4" />
          <span>{item.label}</span>
          <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children!.map((child) => {
              const ChildIcon = child.icon;
              return (
                <SidebarMenuSubItem key={child.label}>
                  <SidebarMenuSubButton
                    {...(child.isActive ? { isActive: true } : {})}
                    onClick={() => navigate(child.href)}
                    className="cursor-pointer"
                  >
                    <ChildIcon className="size-4" />
                    <span>{child.label}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        {...(item.isActive ? { isActive: true } : {})}
        onClick={() => navigate(item.href)}
        className="cursor-pointer"
      >
        <Icon className="size-4" />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

// ── NavUser ────────────────────────────────────────────────────────────────

interface NavUserProps {
  name: string;
  email: string;
  avatarUrl: string | null;
}

const NavUser = ({ name, email, avatarUrl }: NavUserProps) => {
  const { logout } = useAuthStore();
  const { isDark, toggleTheme } = useTheme();

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme}>
              {isDark ? (
                <Sun className="mr-2 size-4" />
              ) : (
                <Moon className="mr-2 size-4" />
              )}
              {isDark ? "Light Mode" : "Dark Mode"}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

// ── ModuleTabs ─────────────────────────────────────────────────────────────

interface ModuleTabsProps {
  className?: string;
  groups: NavGroup[];
  activeGroupIndex: number;
  onChange: (index: number) => void;
}

const ModuleTabs = ({ className, groups, activeGroupIndex, onChange }: ModuleTabsProps) => {
  return (
    <nav
      aria-label="Primary modules"
      className={cn(
        "hidden flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap md:flex",
        className,
      )}
    >
      {groups.map((group, index) => {
        const isActive = index === activeGroupIndex;
        return (
          <button
            key={group.title}
            type="button"
            onClick={() => onChange(index)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <span>{group.title}</span>
          </button>
        );
      })}
    </nav>
  );
};

// ── MobileBottomNav ────────────────────────────────────────────────────────

interface MobileBottomNavProps {
  className?: string;
  groups: NavGroup[];
  activeGroupIndex: number;
  onChange: (index: number) => void;
}

const MobileBottomNav = ({ className, groups, activeGroupIndex, onChange }: MobileBottomNavProps) => {
  const { setOpenMobile } = useSidebar();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden",
        className,
      )}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}
      >
        {groups.map((group, index) => {
          const Icon = group.items[0]?.icon;
          const isActive = index === activeGroupIndex;
          return (
            <button
              key={group.title}
              type="button"
              onClick={() => {
                onChange(index);
                setOpenMobile(false);
              }}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-xs transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={group.title}
            >
              {Icon && <Icon className="size-5" />}
              <span className="truncate">{group.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// ── AppSidebar ─────────────────────────────────────────────────────────────

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeGroupIndex: number;
  navGroups: NavGroup[];
  footerItems: NavItem[];
  userProfile: { name: string; email: string; avatarUrl: string | null } | null;
  isOverviewGroup: boolean;
}

const AppSidebar = ({
  activeGroupIndex,
  navGroups,
  footerItems,
  userProfile,
  isOverviewGroup,
  ...props
}: AppSidebarProps) => {
  const navigate = useNavigate();
  const activeGroup = navGroups[activeGroupIndex];
  const { isMobile } = useSidebar();
  const { isDark } = useTheme();

  if (!activeGroup) return null;

  return (
    <Sidebar
      collapsible="icon"
      className="top-14 h-[calc(100svh-3.5rem)]!"
      {...props}
    >
      <SidebarHeader>
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          {isMobile ? (
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-2"
            >
              <div className="flex aspect-square size-6 items-center justify-center rounded-sm bg-primary">
                <img
                  src="/logo_dark.png"
                  alt="RGR Fleet"
                  className="size-4 text-primary-foreground"
                />
              </div>
                          </button>
          ) : (
            <span className="px-2 text-sm font-medium group-data-[collapsible=icon]:hidden">
              {activeGroup.title}
            </span>
          )}
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          <SidebarGroup>
            <SidebarGroupLabel>{activeGroup.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activeGroup.items.map((item) => (
                  <NavMenuItem key={item.label} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Fleet Health and Depots — only shown in Overview group */}
          {isOverviewGroup && (
            <>
              <FleetHealthSection />
              <DepotsSection />
            </>
          )}

          {/* Support group */}
          <SidebarGroup>
            <SidebarGroupLabel>Support</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {footerItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        {...(item.isActive ? { isActive: true } : {})}
                        onClick={() => navigate(item.href)}
                        className="cursor-pointer"
                      >
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        {userProfile && (
          <NavUser
            name={userProfile.name}
            email={userProfile.email}
            avatarUrl={userProfile.avatarUrl}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

// ── ApplicationShell5 ──────────────────────────────────────────────────────

interface ApplicationShell5Props {
  className?: string;
  children?: React.ReactNode;
}

export const ApplicationShell5 = ({ className, children }: ApplicationShell5Props) => {
  const [activeGroupIndex, setActiveGroupIndex] = React.useState(0);
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const pathname = location.pathname;

  const isSuperuser = user?.role
    ? hasRoleLevel(user.role, UserRole.SUPERUSER)
    : false;

  // Build nav groups dynamically
  const navGroups: NavGroup[] = React.useMemo(() => {
    const groups: NavGroup[] = [
      {
        title: "Overview",
        defaultOpen: true,
        items: [
          {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
            isActive: pathname === "/dashboard",
          },
        ],
      },
      {
        title: "Assets",
        defaultOpen: true,
        items: [
          {
            label: "All Assets",
            icon: Truck,
            href: "/assets",
            isActive: pathname === "/assets" && !location.search,
            children: [
              {
                label: "Trailers",
                icon: Truck,
                href: "/assets?category=trailer",
                isActive: pathname === "/assets" && location.search.includes("category=trailer"),
              },
              {
                label: "Dollies",
                icon: Truck,
                href: "/assets?category=dolly",
                isActive: pathname === "/assets" && location.search.includes("category=dolly"),
              },
            ],
          },
        ],
      },
      {
        title: "Operations",
        defaultOpen: true,
        items: [
          {
            label: "Maintenance",
            icon: Wrench,
            href: "/maintenance",
            isActive: pathname === "/maintenance",
          },
          {
            label: "Load Analyzer",
            icon: BarChart3,
            href: "/load-analyzer",
            isActive: pathname === "/load-analyzer",
          },
          {
            label: "Reports",
            icon: ClipboardList,
            href: "/reports",
            isActive: pathname === "/reports",
          },
        ],
      },
    ];

    if (isSuperuser) {
      groups.push({
        title: "Admin",
        defaultOpen: false,
        items: [
          {
            label: "Settings",
            icon: Settings,
            href: "/settings",
            isActive: pathname === "/settings",
          },
          {
            label: "Admin Panel",
            icon: Shield,
            href: "/admin",
            isActive: pathname === "/admin",
          },
        ],
      });
    }

    return groups;
  }, [pathname, location.search, isSuperuser]);

  const footerItems: NavItem[] = [
    { label: "Help Center", icon: HelpCircle, href: "#" },
    { label: "Settings", icon: Settings, href: "/settings", isActive: pathname === "/settings" },
  ];

  const userProfile = user
    ? { name: user.fullName, email: user.email, avatarUrl: user.avatarUrl }
    : null;

  // Determine which group is the Overview group by index
  const overviewGroupIndex = 0;
  const isOverviewGroup = activeGroupIndex === overviewGroupIndex;

  const activeGroup = navGroups[activeGroupIndex];

  return (
    <SidebarProvider className={cn("flex flex-col", className)}>
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-3 md:hidden">
            <SidebarTrigger />
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary">
                <img
                  src="/logo_dark.png"
                  alt="RGR Fleet"
                  className="size-6 text-primary-foreground"
                />
              </div>
                          </button>
          </div>

          {/* Desktop: logo */}
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary">
              <img
                src="/logo_dark.png"
                alt="RGR Fleet"
                className="size-6 text-primary-foreground"
              />
            </div>
                      </div>

          <ModuleTabs
            groups={navGroups}
            activeGroupIndex={activeGroupIndex}
            onChange={setActiveGroupIndex}
          />

          <div className="ml-auto flex items-center text-sm font-semibold md:hidden">
            {activeGroup?.title}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <AppSidebar
          activeGroupIndex={activeGroupIndex}
          navGroups={navGroups}
          footerItems={footerItems}
          userProfile={userProfile}
          isOverviewGroup={isOverviewGroup}
        />
        <SidebarInset className="pb-20 md:pb-0">
          {children}
        </SidebarInset>
      </div>

      <MobileBottomNav
        groups={navGroups}
        activeGroupIndex={activeGroupIndex}
        onChange={setActiveGroupIndex}
      />
    </SidebarProvider>
  );
};
