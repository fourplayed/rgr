/**
 * useNotifications Hook Tests
 *
 * TDD tests for the notifications React Query hooks.
 * Covers:
 *   - useNotifications: data fetch, error state, query key, staleTime
 *   - useUnreadCount: data fetch, error state, query key, staleTime
 *   - useMarkRead: mutation calls service, invalidates queries on success, throws on error
 *   - useMarkAllRead: same pattern
 *   - Realtime: channel subscribed on mount, removed on unmount
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetNotifications = vi.fn();
const mockGetUnreadCount = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();

// Mock the channel object that Supabase returns
const mockSubscribe = vi.fn().mockReturnThis();
const mockOn = vi.fn().mockReturnThis();
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
};
const mockRemoveChannel = vi.fn();
const mockSupabaseClient = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: mockRemoveChannel,
};
const mockGetSupabaseClient = vi.fn().mockReturnValue(mockSupabaseClient);

vi.mock('@rgr/shared', () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
  markRead: (...args: unknown[]) => mockMarkRead(...args),
  markAllRead: (...args: unknown[]) => mockMarkAllRead(...args),
  getSupabaseClient: () => mockGetSupabaseClient(),
}));

// ── Test wrapper with fresh QueryClient ───────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

// ── Import hooks after mocks ───────────────────────────────────────────────────

import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  NOTIFICATIONS_QUERY_KEYS,
} from '../useNotifications';

// ── Sample data ───────────────────────────────────────────────────────────────

const SAMPLE_NOTIFICATIONS = [
  {
    id: 'notif-1',
    userId: 'user-123',
    type: 'hazard' as const,
    title: 'Critical Hazard Detected',
    body: 'A critical hazard has been detected on asset A001.',
    resourceId: 'asset-1',
    resourceType: 'asset' as const,
    read: false,
    createdAt: '2026-03-20T10:00:00Z',
  },
  {
    id: 'notif-2',
    userId: 'user-123',
    type: 'scan_overdue' as const,
    title: 'Scan Overdue',
    body: 'Asset A002 has not been scanned in 30 days.',
    resourceId: 'asset-2',
    resourceType: 'asset' as const,
    read: true,
    createdAt: '2026-03-19T08:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  // Re-setup the mock chain after clearAllMocks
  mockOn.mockReturnThis();
  mockSubscribe.mockReturnThis();
  mockSupabaseClient.channel.mockReturnValue(mockChannel);
  mockGetSupabaseClient.mockReturnValue(mockSupabaseClient);
});

// ── NOTIFICATIONS_QUERY_KEYS ──────────────────────────────────────────────────

describe('NOTIFICATIONS_QUERY_KEYS', () => {
  it('list key is [notifications]', () => {
    expect(NOTIFICATIONS_QUERY_KEYS.list()).toEqual(['notifications']);
  });

  it('unread count key is [notifications, unread-count]', () => {
    expect(NOTIFICATIONS_QUERY_KEYS.unreadCount()).toEqual(['notifications', 'unread-count']);
  });
});

// ── useNotifications ──────────────────────────────────────────────────────────

describe('useNotifications', () => {
  it('returns notifications data on successful fetch', async () => {
    mockGetNotifications.mockResolvedValue({
      success: true,
      data: SAMPLE_NOTIFICATIONS,
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SAMPLE_NOTIFICATIONS);
    expect(result.current.data).toHaveLength(2);
  });

  it('enters error state when service returns failure', async () => {
    mockGetNotifications.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch notifications: connection refused',
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('Failed to fetch notifications');
  });

  it('uses correct query key', () => {
    expect(NOTIFICATIONS_QUERY_KEYS.list()).toEqual(['notifications']);
  });

  it('uses staleTime of 0', async () => {
    mockGetNotifications.mockResolvedValue({
      success: true,
      data: SAMPLE_NOTIFICATIONS,
      error: null,
    });

    const { wrapper, queryClient } = makeWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = queryClient.getQueryCache().find({
      queryKey: NOTIFICATIONS_QUERY_KEYS.list(),
    });
    expect(cache?.options.staleTime).toBe(0);
  });

  it('returns empty array when user has no notifications', async () => {
    mockGetNotifications.mockResolvedValue({
      success: true,
      data: [],
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

// ── useUnreadCount ────────────────────────────────────────────────────────────

describe('useUnreadCount', () => {
  it('returns unread count on successful fetch', async () => {
    mockGetUnreadCount.mockResolvedValue({
      success: true,
      data: 3,
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUnreadCount(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(3);
  });

  it('returns 0 when there are no unread notifications', async () => {
    mockGetUnreadCount.mockResolvedValue({
      success: true,
      data: 0,
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUnreadCount(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it('enters error state when service returns failure', async () => {
    mockGetUnreadCount.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to fetch unread count: permission denied',
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUnreadCount(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('Failed to fetch unread count');
  });

  it('uses correct query key', () => {
    expect(NOTIFICATIONS_QUERY_KEYS.unreadCount()).toEqual(['notifications', 'unread-count']);
  });

  it('uses staleTime of 0', async () => {
    mockGetUnreadCount.mockResolvedValue({
      success: true,
      data: 5,
      error: null,
    });

    const { wrapper, queryClient } = makeWrapper();
    const { result } = renderHook(() => useUnreadCount(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cache = queryClient.getQueryCache().find({
      queryKey: NOTIFICATIONS_QUERY_KEYS.unreadCount(),
    });
    expect(cache?.options.staleTime).toBe(0);
  });
});

// ── useMarkRead ───────────────────────────────────────────────────────────────

describe('useMarkRead', () => {
  it('calls markRead service with the notification ID', async () => {
    mockMarkRead.mockResolvedValue({ success: true, data: undefined, error: null });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMarkRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('notif-1');
    });

    expect(mockMarkRead).toHaveBeenCalledWith('notif-1');
    expect(mockMarkRead).toHaveBeenCalledTimes(1);
  });

  it('invalidates both notification query keys on success', async () => {
    mockMarkRead.mockResolvedValue({ success: true, data: undefined, error: null });
    mockGetNotifications.mockResolvedValue({ success: true, data: SAMPLE_NOTIFICATIONS, error: null });
    mockGetUnreadCount.mockResolvedValue({ success: true, data: 1, error: null });

    const { wrapper, queryClient } = makeWrapper();

    // Pre-populate the cache
    await queryClient.prefetchQuery({
      queryKey: NOTIFICATIONS_QUERY_KEYS.list(),
      queryFn: async () => SAMPLE_NOTIFICATIONS,
    });
    await queryClient.prefetchQuery({
      queryKey: NOTIFICATIONS_QUERY_KEYS.unreadCount(),
      queryFn: async () => 1,
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useMarkRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('notif-1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('throws an error when service returns failure', async () => {
    mockMarkRead.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to mark notification as read: not found',
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMarkRead(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('notif-bad');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('Failed to mark notification as read');
  });

  it('throws generic error when service returns failure with no error message', async () => {
    mockMarkRead.mockResolvedValue({
      success: false,
      data: null,
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMarkRead(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('notif-bad');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Failed to mark read');
  });
});

// ── useMarkAllRead ────────────────────────────────────────────────────────────

describe('useMarkAllRead', () => {
  it('calls markAllRead service', async () => {
    mockMarkAllRead.mockResolvedValue({ success: true, data: undefined, error: null });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMarkAllRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('invalidates both notification query keys on success', async () => {
    mockMarkAllRead.mockResolvedValue({ success: true, data: undefined, error: null });

    const { wrapper, queryClient } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useMarkAllRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('throws an error when service returns failure', async () => {
    mockMarkAllRead.mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to mark all notifications as read: permission denied',
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMarkAllRead(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain(
      'Failed to mark all notifications as read'
    );
  });

  it('throws generic error when service returns failure with no error message', async () => {
    mockMarkAllRead.mockResolvedValue({
      success: false,
      data: null,
      error: null,
    });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMarkAllRead(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Failed to mark all read');
  });
});

// ── Realtime subscription ─────────────────────────────────────────────────────

describe('Realtime subscription', () => {
  it('subscribes to the notifications channel on mount', async () => {
    mockGetNotifications.mockResolvedValue({ success: true, data: SAMPLE_NOTIFICATIONS, error: null });

    const { wrapper } = makeWrapper();
    renderHook(() => useNotifications(), { wrapper });

    // Wait a tick for the effect to run
    await waitFor(() => {
      expect(mockGetSupabaseClient).toHaveBeenCalled();
    });

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith('notifications-changes');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }),
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('removes the channel on unmount', async () => {
    mockGetNotifications.mockResolvedValue({ success: true, data: SAMPLE_NOTIFICATIONS, error: null });

    const { wrapper } = makeWrapper();
    const { unmount } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(mockGetSupabaseClient).toHaveBeenCalled();
    });

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('invalidates notifications queries when an INSERT event arrives', async () => {
    mockGetNotifications.mockResolvedValue({ success: true, data: SAMPLE_NOTIFICATIONS, error: null });

    const { wrapper, queryClient } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(mockOn).toHaveBeenCalled();
    });

    // Extract the callback passed to .on(...)
    const onCall = mockOn.mock.calls[0];
    const realtimeCallback = onCall[2] as () => void;

    // Simulate an incoming realtime event
    act(() => {
      realtimeCallback();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });
});
