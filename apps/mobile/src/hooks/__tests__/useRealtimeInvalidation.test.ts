import { renderHook } from '@testing-library/react-native';
import { createWrapper } from './testUtils';
import { getSupabaseClient } from '@rgr/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockOn = jest.fn().mockReturnThis();
const mockSubscribe = jest.fn().mockReturnThis();
const mockUnsubscribe = jest.fn();
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
};
const mockRemoveChannel = jest.fn();
const mockSupabase = {
  channel: jest.fn().mockReturnValue(mockChannel),
  removeChannel: mockRemoveChannel,
};

jest.mock('@rgr/shared', () => ({
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

let mockIsAuthenticated = false;
jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn((selector: (s: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: mockIsAuthenticated })
  ),
}));

// ---------------------------------------------------------------------------
// Import after mocks are in place
// ---------------------------------------------------------------------------

import { useRealtimeInvalidation } from '../useRealtimeInvalidation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the `.on()` call whose options object matches the given table name. */
function findOnCallForTable(table: string) {
  const call = mockOn.mock.calls.find(
    (args: unknown[]) => args[1] && (args[1] as Record<string, unknown>)['table'] === table
  );
  if (!call) throw new Error(`No .on() call found for table "${table}"`);
  return call;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRealtimeInvalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
  });

  // -----------------------------------------------------------------------
  // Channel subscription lifecycle
  // -----------------------------------------------------------------------

  describe('channel subscription lifecycle', () => {
    it('subscribes to 4 channels when authenticated', () => {
      mockIsAuthenticated = true;
      const { wrapper } = createWrapper();

      renderHook(() => useRealtimeInvalidation(), { wrapper });

      expect(mockSupabase.channel).toHaveBeenCalledTimes(4);
      expect(mockSupabase.channel).toHaveBeenCalledWith('mobile-scan-updates');
      expect(mockSupabase.channel).toHaveBeenCalledWith('mobile-asset-updates');
      expect(mockSupabase.channel).toHaveBeenCalledWith('mobile-defect-updates');
      expect(mockSupabase.channel).toHaveBeenCalledWith('mobile-maintenance-updates');
      expect(mockSubscribe).toHaveBeenCalledTimes(4);
    });

    it('does NOT subscribe when not authenticated', () => {
      mockIsAuthenticated = false;
      const { wrapper } = createWrapper();

      renderHook(() => useRealtimeInvalidation(), { wrapper });

      expect(mockSupabase.channel).not.toHaveBeenCalled();
    });

    it('removes all channels on unmount (removeChannel handles unsubscription)', () => {
      mockIsAuthenticated = true;
      const { wrapper } = createWrapper();

      const { unmount } = renderHook(() => useRealtimeInvalidation(), { wrapper });
      unmount();

      // removeChannel() handles unsubscription internally — no separate unsubscribe() calls
      expect(mockUnsubscribe).toHaveBeenCalledTimes(0);
      expect(mockRemoveChannel).toHaveBeenCalledTimes(4);
    });
  });

  // -----------------------------------------------------------------------
  // Table-to-key invalidation mapping
  // -----------------------------------------------------------------------

  describe('table-to-key invalidation mapping', () => {
    it('scan_events INSERT handler invalidates scans and assets', () => {
      mockIsAuthenticated = true;
      const { wrapper, queryClient } = createWrapper();
      const spy = jest.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useRealtimeInvalidation(), { wrapper });

      const [, options, callback] = findOnCallForTable('scan_events');
      expect(options.event).toBe('INSERT');

      callback();

      expect(spy).toHaveBeenCalledWith({ queryKey: ['scans'], refetchType: 'active' });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['assets'], refetchType: 'active' });
    });

    it('defect_reports * handler invalidates defects and assets', () => {
      mockIsAuthenticated = true;
      const { wrapper, queryClient } = createWrapper();
      const spy = jest.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useRealtimeInvalidation(), { wrapper });

      const [, options, callback] = findOnCallForTable('defect_reports');
      expect(options.event).toBe('*');

      callback();

      expect(spy).toHaveBeenCalledWith({ queryKey: ['defects'], refetchType: 'active' });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['assets'], refetchType: 'active' });
    });

    it('maintenance_records * handler invalidates maintenance and assets', () => {
      mockIsAuthenticated = true;
      const { wrapper, queryClient } = createWrapper();
      const spy = jest.spyOn(queryClient, 'invalidateQueries');

      renderHook(() => useRealtimeInvalidation(), { wrapper });

      const [, options, callback] = findOnCallForTable('maintenance_records');
      expect(options.event).toBe('*');

      callback();

      expect(spy).toHaveBeenCalledWith({ queryKey: ['maintenance'], refetchType: 'active' });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['assets'], refetchType: 'active' });
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('does not crash when getSupabaseClient throws', () => {
      mockIsAuthenticated = true;
      (getSupabaseClient as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Client not initialized');
      });
      const { wrapper } = createWrapper();

      // Should not throw
      const { unmount } = renderHook(() => useRealtimeInvalidation(), { wrapper });

      expect(mockSupabase.channel).not.toHaveBeenCalled();

      // Unmount should also be safe (no cleanup to run)
      unmount();
    });
  });
});
