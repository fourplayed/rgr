/**
 * useNotifications — React Query hooks for notification data with realtime updates
 *
 * Provides:
 * - useNotifications: fetch all notifications for the current user
 * - useUnreadCount: get unread notification count (used for badge)
 * - useMarkRead: mark a single notification as read
 * - useMarkAllRead: mark all notifications as read
 *
 * staleTime is 0 — notifications need to be fresh.
 * A Supabase realtime subscription in useNotifications keeps data up to date
 * by invalidating the queries whenever a new notification INSERT arrives.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  getSupabaseClient,
} from '@rgr/shared';
import type { Notification } from '@rgr/shared';

// Re-export Notification type for consumer convenience
export type { Notification } from '@rgr/shared';

// ── Query Keys ────────────────────────────────────────────────────────────────

export const NOTIFICATIONS_QUERY_KEYS = {
  list: () => ['notifications'] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
} as const;

// ── useNotifications ──────────────────────────────────────────────────────────

/**
 * Fetch all notifications for the current user, newest first.
 *
 * Also sets up a Supabase realtime subscription that invalidates both
 * notification query keys whenever a new notification is inserted, keeping
 * the list and badge count live without polling.
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  // Realtime subscription: invalidate on INSERT
  useEffect(() => {
    const supabase = getSupabaseClient();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery<Notification[]>({
    queryKey: NOTIFICATIONS_QUERY_KEYS.list(),
    queryFn: async () => {
      const result = await getNotifications();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch notifications');
      }
      if (result.data == null) throw new Error('Service returned no data');
      return result.data;
    },
    staleTime: 0,
  });
}

// ── useUnreadCount ────────────────────────────────────────────────────────────

/**
 * Get the count of unread notifications for the current user.
 * Used to drive the badge on the notification bell icon.
 */
export function useUnreadCount() {
  return useQuery<number>({
    queryKey: NOTIFICATIONS_QUERY_KEYS.unreadCount(),
    queryFn: async () => {
      const result = await getUnreadCount();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch unread count');
      }
      if (result.data == null) throw new Error('Service returned no data');
      return result.data;
    },
    staleTime: 0,
  });
}

// ── useMarkRead ───────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 * On success, invalidates both notification query keys so the list and badge refresh.
 */
export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (notificationId: string) => {
      const result = await markRead(notificationId);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to mark read');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ── useMarkAllRead ────────────────────────────────────────────────────────────

/**
 * Mark all notifications as read for the current user.
 * On success, invalidates both notification query keys so the list and badge refresh.
 */
export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const result = await markAllRead();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to mark all read');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
