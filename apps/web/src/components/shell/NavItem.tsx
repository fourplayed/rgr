import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface NavItemProps {
  icon: ReactNode;
  label: string;
  href: string;
  expanded?: boolean;
}

export function NavItem({ icon, label, href, expanded = false }: NavItemProps) {
  const { pathname } = useLocation();
  const isActive = pathname === href;

  if (expanded) {
    return (
      <Link
        to={href}
        className={cn(
          'relative flex items-center gap-3 rounded-r-md py-2.5 text-sm font-bold uppercase tracking-wide transition-all duration-150 cursor-pointer',
          isActive
            ? 'bg-[#00A8FF]/[0.08] text-[#00A8FF] border-l-2 border-l-[#00A8FF] pl-[10px] pr-3'
            : 'text-white/50 hover:text-white/75 hover:bg-white/[0.03] border-l-2 border-l-transparent pl-[10px] pr-3'
        )}
      >
        <span className="size-5 shrink-0 [&>svg]:size-5">{icon}</span>
        {label}
      </Link>
    );
  }

  const triggerLink = (
    <Link
      to={href}
      className={cn(
        'flex size-9 items-center justify-center rounded-lg transition-colors',
        isActive
          ? 'bg-[#00A8FF]/10 text-[#00A8FF] border border-[#00A8FF]/20'
          : 'text-sidebar-foreground/50 hover:bg-white/[0.04] hover:text-sidebar-foreground'
      )}
    >
      <span className="size-5 [&>svg]:size-5">{icon}</span>
    </Link>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={triggerLink} />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
