/**
 * QuickActionsPanel - Grid of quick action buttons
 */
import React from 'react';
import { Settings } from 'lucide-react';
import { QuickAction, type QuickActionProps } from './QuickAction';
import { useTheme } from '@/hooks/useTheme';

export interface QuickActionsPanelProps {
  actions: QuickActionProps[];
  title?: string;
  className?: string;
}

export const QuickActionsPanel = React.memo<QuickActionsPanelProps>(
  ({ actions, title = 'Quick Actions', className = '' }) => {
    const { isDark } = useTheme();

    const cardBg = isDark ? 'bg-slate-900/80' : 'bg-white'; // Light theme: solid white (100% opacity)
    const borderColor = isDark ? 'border-slate-700/50' : 'border-slate-200';
    const textColor = isDark ? 'text-white' : 'text-slate-900';
    const mutedColor = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
      <section
        className={`
        ${cardBg} backdrop-blur-xl border ${borderColor}
        rounded-3xl shadow-premium p-6 lg:p-8
        ${className}
      `}
        aria-label="Quick actions"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl lg:text-2xl font-bold ${textColor}`}>{title}</h2>
          <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
            <Settings className={`w-5 h-5 ${mutedColor}`} aria-hidden="true" />
          </div>
        </div>

        {/* Actions grid */}
        <div className="space-y-3">
          {actions.map((action, index) => (
            <QuickAction
              key={`${action.label}-${index}`}
              {...action}
              className={`animate-fade-in-up ${action.className || ''}`}
            />
          ))}
        </div>
      </section>
    );
  }
);

QuickActionsPanel.displayName = 'QuickActionsPanel';

export default QuickActionsPanel;
