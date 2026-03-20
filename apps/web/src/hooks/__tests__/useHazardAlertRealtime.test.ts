/**
 * useHazardAlertRealtime Hook Tests
 *
 * Covers:
 *   - New critical hazard INSERT → createNotification called with correct payload
 *   - New high hazard INSERT → createNotification called with correct payload
 *   - New medium hazard INSERT → createNotification NOT called
 *   - New low hazard INSERT → createNotification NOT called
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCreateNotification = vi.fn();

// Mock the Supabase channel/subscribe chain
const mockSubscribe = vi.fn().mockImplementation(function (this: unknown) {
  return this;
});
const mockOn = vi.fn().mockImplementation(function (this: unknown) {
  return this;
});
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
};
const mockRemoveChannel = vi.fn();
const mockSupabaseClient = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: mockRemoveChannel,
};

vi.mock('@rgr/shared', () => ({
  getSupabaseClient: () => mockSupabaseClient,
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

// Mock useAuthStore — user.id is 'user-abc'
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: 'user-abc' } })
  ),
}));

// ── Import hook after mocks ────────────────────────────────────────────────────

import { useHazardAlertRealtime } from '../useHazardAlertRealtime';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal RealtimeHazardAlert payload for testing */
function makeAlertPayload(severity: string, id = 'hazard-1', assetId = 'asset-x') {
  return {
    eventType: 'INSERT',
    new: {
      id,
      asset_id: assetId,
      freight_analysis_id: 'fa-1',
      hazard_rule_id: null,
      photo_id: 'photo-1',
      scan_event_id: null,
      hazard_type: 'overload',
      severity,
      status: 'active',
      confidence_score: 0.95,
      description: 'Test hazard',
      evidence_points: [],
      recommended_actions: [],
      location_in_image: null,
      created_at: '2026-03-20T10:00:00Z',
      updated_at: '2026-03-20T10:00:00Z',
    },
    old: {},
  };
}

/** Fire the realtime callback with a given payload, advancing fake timers past debounce */
async function fireRealtimeEvent(payload: ReturnType<typeof makeAlertPayload>) {
  // The handler is the 3rd argument passed to .on(...)
  const onCall = mockOn.mock.calls[0]!;
  const realtimeCallback = onCall[2] as (p: unknown) => void;

  act(() => {
    realtimeCallback(payload);
    vi.advanceTimersByTime(600); // flush 500 ms debounce
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();

  // Re-wire mock chain after clearAllMocks
  mockOn.mockImplementation(function (this: unknown) {
    return this;
  });
  mockSubscribe.mockImplementation(function (this: unknown) {
    return this;
  });
  mockSupabaseClient.channel.mockReturnValue(mockChannel);
  mockCreateNotification.mockResolvedValue({ success: true, data: {}, error: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useHazardAlertRealtime — notification trigger', () => {
  it('calls createNotification with correct payload for a critical hazard INSERT', async () => {
    renderHook(() => useHazardAlertRealtime());

    await fireRealtimeEvent(makeAlertPayload('critical', 'hazard-crit', 'asset-1'));

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'user-abc',
      type: 'hazard',
      title: 'Critical Hazard Alert',
      body: 'A critical severity hazard has been detected on asset asset-1',
      resourceId: 'hazard-crit',
      resourceType: 'hazard_alert',
    });
  });

  it('calls createNotification with correct payload for a high severity hazard INSERT', async () => {
    renderHook(() => useHazardAlertRealtime());

    await fireRealtimeEvent(makeAlertPayload('high', 'hazard-high', 'asset-2'));

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'user-abc',
      type: 'hazard',
      title: 'High Severity Hazard',
      body: 'A high severity hazard has been detected on asset asset-2',
      resourceId: 'hazard-high',
      resourceType: 'hazard_alert',
    });
  });

  it('does NOT call createNotification for a medium severity hazard INSERT', async () => {
    renderHook(() => useHazardAlertRealtime());

    await fireRealtimeEvent(makeAlertPayload('medium', 'hazard-med', 'asset-3'));

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('does NOT call createNotification for a low severity hazard INSERT', async () => {
    renderHook(() => useHazardAlertRealtime());

    await fireRealtimeEvent(makeAlertPayload('low', 'hazard-low', 'asset-4'));

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('does NOT call createNotification for UPDATE events (even critical)', async () => {
    renderHook(() => useHazardAlertRealtime());

    const updatePayload = {
      ...makeAlertPayload('critical', 'hazard-upd', 'asset-5'),
      eventType: 'UPDATE',
      old: { status: 'active' },
    };

    const onCall = mockOn.mock.calls[0]!;
    const realtimeCallback = onCall[2] as (p: unknown) => void;

    act(() => {
      realtimeCallback(updatePayload);
      vi.advanceTimersByTime(600);
    });

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
