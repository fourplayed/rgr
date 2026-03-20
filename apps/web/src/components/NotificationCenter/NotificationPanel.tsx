/**
 * NotificationPanel — slide-out panel showing grouped notifications.
 *
 * Pure presenter: all data and callbacks come from props.
 * Uses motion/react for the slide-in animation (same pattern as AssetDetailSlideout).
 */
import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Notification } from '@rgr/shared';
import { NotificationRow } from './NotificationRow';

export interface NotificationPanelProps {
  notifications: Notification[];
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (notification: Notification) => void;
}

// ── Grouping logic ─────────────────────────────────────────────────────────────

function groupNotifications(notifications: Notification[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  return {
    today: notifications.filter((n) => new Date(n.createdAt) >= todayStart),
    thisWeek: notifications.filter((n) => {
      const d = new Date(n.createdAt);
      return d >= weekStart && d < todayStart;
    }),
    older: notifications.filter((n) => new Date(n.createdAt) < weekStart),
  };
}

// ── Skeleton rows for loading state ───────────────────────────────────────────

const SkeletonRow: React.FC = () => (
  <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
    <div className="w-4 h-4 rounded bg-white/10 flex-shrink-0 mt-0.5" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-32 rounded bg-white/10" />
      <div className="h-3 w-48 rounded bg-white/10" />
      <div className="h-2 w-16 rounded bg-white/10" />
    </div>
  </div>
);

// ── Section heading ────────────────────────────────────────────────────────────

const SectionHeading: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-4 py-1.5 border-b border-white/5">
    <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
      {label}
    </span>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  isOpen,
  isLoading,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}) => {
  const groups = groupNotifications(notifications);
  const hasUnread = notifications.some((n) => !n.read);
  const hasAny =
    groups.today.length > 0 || groups.thisWeek.length > 0 || groups.older.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            data-testid="panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            data-testid="notification-panel"
            role="dialog"
            aria-labelledby="notifications-panel-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 bottom-0 z-50 w-full max-w-sm flex flex-col"
            style={{
              top: '80px',
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(40px) saturate(1.8)',
              WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 id="notifications-panel-title" className="text-sm font-semibold text-slate-200">Notifications</h2>
              <div className="flex items-center gap-2">
                <button
                  data-testid="mark-all-read-button"
                  type="button"
                  onClick={onMarkAllRead}
                  disabled={!hasUnread}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Mark all read
                </button>
                <button
                  data-testid="panel-close-button"
                  type="button"
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors duration-150"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div data-testid="notifications-loading">
                  {[0, 1, 2, 3].map((i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              ) : !hasAny ? (
                <div className="flex items-center justify-center py-16 text-sm text-slate-500">
                  No notifications
                </div>
              ) : (
                <>
                  {groups.today.length > 0 && (
                    <section aria-label="Today">
                      <SectionHeading label="Today" />
                      {groups.today.map((n) => (
                        <NotificationRow
                          key={n.id}
                          notification={n}
                          onMarkRead={onMarkRead}
                          onNavigate={onNavigate}
                        />
                      ))}
                    </section>
                  )}
                  {groups.thisWeek.length > 0 && (
                    <section aria-label="This Week">
                      <SectionHeading label="This Week" />
                      {groups.thisWeek.map((n) => (
                        <NotificationRow
                          key={n.id}
                          notification={n}
                          onMarkRead={onMarkRead}
                          onNavigate={onNavigate}
                        />
                      ))}
                    </section>
                  )}
                  {groups.older.length > 0 && (
                    <section aria-label="Older">
                      <SectionHeading label="Older" />
                      {groups.older.map((n) => (
                        <NotificationRow
                          key={n.id}
                          notification={n}
                          onMarkRead={onMarkRead}
                          onNavigate={onNavigate}
                        />
                      ))}
                    </section>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
