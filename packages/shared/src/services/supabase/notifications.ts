import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';

// ── Types ──

export type NotificationType = 'hazard' | 'scan_overdue' | 'health_score' | 'maintenance';
export type ResourceType = 'asset' | 'depot' | 'hazard_alert' | 'fleet';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  resourceId: string | null;
  resourceType: ResourceType | null;
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  resourceId?: string;
  resourceType?: ResourceType;
}

// ── DB row type ──

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  resource_id: string | null;
  resource_type: string | null;
  read: boolean;
  created_at: string;
}

// ── Mapper ──

function mapRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    resourceId: row.resource_id,
    resourceType: row.resource_type as ResourceType | null,
    read: row.read,
    createdAt: row.created_at,
  };
}

// ── Auth helper ──

async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

// ── Service functions ──

/**
 * Fetch notifications for the current user, newest first.
 * @param limit - Optional maximum number of notifications to return (default 50).
 */
export async function getNotifications(limit: number = 50): Promise<ServiceResult<Notification[]>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, data: null, error: 'User not authenticated' };
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch notifications: ${error.message}`,
    };
  }

  return {
    success: true,
    data: (data || []).map((row) => mapRow(row as NotificationRow)),
    error: null,
  };
}

/**
 * Get the count of unread notifications for the current user.
 */
export async function getUnreadCount(): Promise<ServiceResult<number>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, data: null, error: 'User not authenticated' };
  }

  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch unread count: ${error.message}`,
    };
  }

  return { success: true, data: count ?? 0, error: null };
}

/**
 * Mark a single notification as read.
 */
export async function markRead(notificationId: string): Promise<ServiceResult<void>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, data: null, error: 'User not authenticated' };
  }

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('id', notificationId);

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to mark notification as read: ${error.message}`,
    };
  }

  return { success: true, data: undefined, error: null };
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllRead(): Promise<ServiceResult<void>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, data: null, error: 'User not authenticated' };
  }

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId);

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to mark all notifications as read: ${error.message}`,
    };
  }

  return { success: true, data: undefined, error: null };
}

/**
 * Insert a notification row.
 * Intended for server-side use or trigger logic.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<ServiceResult<Notification>> {
  const supabase = getSupabaseClient();

  const insertPayload = {
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    resource_id: input.resourceId ?? null,
    resource_type: input.resourceType ?? null,
  };

  const { data, error } = await supabase
    .from('notifications')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to create notification: ${error.message}`,
    };
  }

  return { success: true, data: mapRow(data as NotificationRow), error: null };
}
