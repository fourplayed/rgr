'use client';

import {
  BadgeCheck,
  BarChart3,
  Briefcase,
  ChevronDown,
  ChevronsUpDown,
  ClipboardList,
  Clock3,
  FileText,
  Folder,
  Globe2,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  Star,
  User,
  Users,
} from 'lucide-react';
import * as React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// Base nav item - used by simple sidebars
type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  isActive?: boolean;
  // Optional children for submenus (Sidebar3+)
  children?: NavItem[];
};

// Nav group with optional collapsible state
type NavGroup = {
  title: string;
  items: NavItem[];
  // Optional: default collapsed state (Sidebar2+)
  defaultOpen?: boolean;
};

// User data for footer (Sidebar6+)
type UserData = {
  name: string;
  email: string;
  avatar: string;
};

// Complete sidebar data structure
type SidebarData = {
  // Logo/branding (all sidebars)
  logo: {
    src: string;
    alt: string;
    title: string;
    description: string;
  };
  // Main navigation groups (all sidebars)
  navGroups: NavGroup[];
  // Footer navigation group (all sidebars)
  footerGroup: NavGroup;
  // User data for user footer (Sidebar6+)
  user?: UserData;
  // Workspaces for switcher (Sidebar7+)
  workspaces?: Array<{
    id: string;
    name: string;
    logo: string;
    plan: string;
  }>;
  // Currently active workspace (Sidebar7+)
  activeWorkspace?: string;
};

// Shared sidebar data - works with all sidebar variations
const sidebarData: SidebarData = {
  logo: {
    src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg',
    alt: 'Shadcnblocks',
    title: 'Shadcnblocks',
    description: 'Build your app',
  },
  navGroups: [
    {
      title: 'Overview',
      defaultOpen: true,
      items: [
        {
          label: 'Dashboard',
          icon: LayoutDashboard,
          href: '#',
          isActive: true,
        },
        { label: 'Tasks', icon: ClipboardList, href: '#' },
        { label: 'Roadmap', icon: BarChart3, href: '#' },
      ],
    },
    {
      title: 'Projects',
      defaultOpen: true,
      items: [
        {
          label: 'Active Projects',
          icon: Briefcase,
          href: '#',
          children: [
            { label: 'Project Alpha', icon: FileText, href: '#' },
            { label: 'Project Beta', icon: FileText, href: '#' },
            { label: 'Project Gamma', icon: FileText, href: '#' },
          ],
        },
        {
          label: 'Archived',
          icon: Folder,
          href: '#',
          children: [
            { label: '2024 Archive', icon: FileText, href: '#' },
            { label: '2023 Archive', icon: FileText, href: '#' },
          ],
        },
      ],
    },
    {
      title: 'Team',
      defaultOpen: false,
      items: [
        { label: 'Members', icon: Users, href: '#' },
        { label: 'Sprints', icon: Clock3, href: '#' },
        { label: 'Approvals', icon: BadgeCheck, href: '#' },
        { label: 'Reviews', icon: Star, href: '#' },
      ],
    },
    {
      title: 'Workspace',
      defaultOpen: false,
      items: [
        { label: 'Integrations', icon: Globe2, href: '#' },
        { label: 'Automations', icon: Sparkles, href: '#' },
      ],
    },
  ],
  footerGroup: {
    title: 'Support',
    items: [
      { label: 'Help Center', icon: HelpCircle, href: '#' },
      { label: 'Settings', icon: Settings, href: '#' },
    ],
  },
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp',
  },
  workspaces: [
    {
      id: '1',
      name: 'Shadcnblocks',
      logo: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg',
      plan: 'Enterprise',
    },
    {
      id: '2',
      name: 'Shadcn Templates',
      logo: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg',
      plan: 'Startup',
    },
    {
      id: '3',
      name: 'Shadcn Components',
      logo: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg',
      plan: 'Free',
    },
  ],
  activeWorkspace: '1',
};

// Desktop navigation dropdown for each group
const NavDropdown = ({ group }: { group: NavGroup }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="gap-1" />}>
        {group.title}
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {group.items.map((item) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={item.label}>
              <DropdownMenuItem render={<a href={item.href} className="flex items-center gap-2" />}>
                <Icon className="size-4" />
                {item.label}
              </DropdownMenuItem>
              {item.children?.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <DropdownMenuItem
                    key={child.label}
                    render={<a href={child.href} className="flex items-center gap-2" />}
                    className="pl-6"
                  >
                    <ChildIcon className="size-4" />
                    {child.label}
                  </DropdownMenuItem>
                );
              })}
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Mobile navigation sheet
const MobileNav = () => {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <img src={sidebarData.logo.src} alt={sidebarData.logo.alt} className="size-6" />
            {sidebarData.logo.title}
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-4">
          {sidebarData.navGroups.map((group) => (
            <div key={group.title}>
              <div className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                {group.title}
              </div>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <React.Fragment key={item.label}>
                      <a
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted',
                          item.isActive && 'bg-muted font-medium'
                        )}
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </a>
                      {item.children?.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <a
                            key={child.label}
                            href={child.href}
                            className="flex items-center gap-2 rounded-md py-1.5 pr-2 pl-8 text-sm hover:bg-muted"
                          >
                            <ChildIcon className="size-4" />
                            {child.label}
                          </a>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

// User dropdown
const NavUser = ({ user }: { user: UserData }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-2" />}>
        <Avatar className="size-8">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium md:inline">{user.name}</span>
        <ChevronsUpDown className="hidden size-4 md:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 size-4" />
          Account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface ApplicationShell3Props {
  className?: string;
}

export function ApplicationShell3({ className }: ApplicationShell3Props) {
  return (
    <div className={cn('flex min-h-svh flex-col', className)}>
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
          {/* Mobile menu */}
          <MobileNav />

          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary">
              <img
                src={sidebarData.logo.src}
                alt={sidebarData.logo.alt}
                className="size-6 text-primary-foreground invert dark:invert-0"
              />
            </div>
            <span className="font-semibold">{sidebarData.logo.title}</span>
          </a>

          {/* Desktop navigation */}
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {sidebarData.navGroups.map((group) => (
              <NavDropdown key={group.title} group={group} />
            ))}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder="Search..." className="h-9 w-64 pl-8" />
            </div>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Search className="size-5" />
            </Button>
            {sidebarData.user && <NavUser user={sidebarData.user} />}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </main>
    </div>
  );
}
