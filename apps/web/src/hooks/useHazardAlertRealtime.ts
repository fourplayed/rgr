/**
 * useHazardAlertRealtime - Real-time subscription hook for hazard alerts
 *
 * Subscribes to Supabase realtime changes on the hazard_alerts table
 * to provide live updates to the dashboard without polling.
 *
 * Features:
 * - Real-time INSERT events for new hazards
 * - Real-time UPDATE events for status changes
 * - Automatic reconnection handling
 * - Sound/notification on critical hazards
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import { getSupabaseClient, createNotification } from '@rgr/shared';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@rgr/shared';
import type { HazardSeverity, HazardStatus } from '@rgr/shared';
import { useAuthStore } from '@/stores/authStore';

// ============================================================================
// Types
// ============================================================================

export type HazardAlertStatus = HazardStatus;

export interface RealtimeHazardAlert {
  id: string;
  freight_analysis_id: string;
  hazard_rule_id: string | null;
  photo_id: string;
  asset_id: string | null;
  scan_event_id: string | null;
  hazard_type: string;
  severity: HazardSeverity;
  status: HazardAlertStatus;
  confidence_score: number;
  description: string;
  evidence_points: string[];
  recommended_actions: string[];
  location_in_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface HazardRealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  alert: RealtimeHazardAlert;
  oldAlert?: RealtimeHazardAlert;
  timestamp: Date;
}

export interface UseHazardAlertRealtimeOptions {
  /** Only receive alerts for specific asset IDs */
  assetIds?: string[];
  /** Only receive alerts with these severities */
  severities?: HazardSeverity[];
  /** Only receive alerts with these statuses */
  statuses?: HazardAlertStatus[];
  /** Callback for new hazard alerts */
  onNewAlert?: (alert: RealtimeHazardAlert) => void;
  /** Callback for updated hazard alerts */
  onAlertUpdate?: (alert: RealtimeHazardAlert, oldAlert?: RealtimeHazardAlert) => void;
  /** Callback for any event */
  onEvent?: (event: HazardRealtimeEvent) => void;
  /** Enable audio notification for critical alerts */
  playSound?: boolean;
  /** Enable browser notifications */
  browserNotifications?: boolean;
}

export interface UseHazardAlertRealtimeResult {
  /** Whether the subscription is active and connected */
  isConnected: boolean;
  /** Recent events received */
  recentEvents: HazardRealtimeEvent[];
  /** Manually reconnect */
  reconnect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Count of new alerts since last acknowledgment */
  newAlertCount: number;
  /** Clear the new alert count */
  clearNewAlertCount: () => void;
}

// ============================================================================
// Audio notification
// ============================================================================

let audioContext: AudioContext | null = null;

function playAlertSound(severity: HazardSeverity): void {
  try {
    // Create audio context lazily
    if (!audioContext) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Different frequencies for different severities
    const frequencies: Record<HazardSeverity, number> = {
      low: 440, // A4
      medium: 523, // C5
      high: 659, // E5
      critical: 880, // A5
    };

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequencies[severity];
    oscillator.type = severity === 'critical' ? 'square' : 'sine';

    // Quick beep pattern
    const duration = severity === 'critical' ? 0.3 : 0.15;
    const now = audioContext.currentTime;

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);

    // Double beep for critical
    if (severity === 'critical') {
      setTimeout(() => playAlertSound('high'), 400);
    }
  } catch (err) {
    console.warn('Failed to play alert sound:', err);
  }
}

// ============================================================================
// Browser notification
// ============================================================================

async function showBrowserNotification(alert: RealtimeHazardAlert): Promise<void> {
  try {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') return;

    const severityEmoji: Record<HazardSeverity, string> = {
      low: 'info',
      medium: 'warning',
      high: 'alert',
      critical: 'danger',
    };

    new Notification(`[${alert.severity.toUpperCase()}] Hazard Detected`, {
      body: alert.description.slice(0, 100),
      icon: `/icons/hazard-${severityEmoji[alert.severity]}.png`,
      tag: `hazard-${alert.id}`,
      requireInteraction: alert.severity === 'critical',
    });
  } catch (err) {
    console.warn('Failed to show browser notification:', err);
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useHazardAlertRealtime(
  options: UseHazardAlertRealtimeOptions = {}
): UseHazardAlertRealtimeResult {
  const {
    assetIds,
    severities,
    statuses = ['active'],
    onNewAlert,
    onAlertUpdate,
    onEvent,
    playSound = true,
    browserNotifications = false,
  } = options;

  const userId = useAuthStore((s) => s.user?.id ?? null);

  const [isConnected, setIsConnected] = useState(false);
  const [recentEvents, setRecentEvents] = useState<HazardRealtimeEvent[]>([]);
  const [newAlertCount, setNewAlertCount] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef(userId);

  // Use refs for all option values to prevent re-subscription thrashing.
  // Callbacks and filter arrays change identity on every parent render,
  // but the subscription only needs the latest values when a message arrives.
  const onNewAlertRef = useRef(onNewAlert);
  const onAlertUpdateRef = useRef(onAlertUpdate);
  const onEventRef = useRef(onEvent);
  const assetIdsRef = useRef(assetIds);
  const severitiesRef = useRef(severities);
  const statusesRef = useRef(statuses);
  const playSoundRef = useRef(playSound);
  const browserNotificationsRef = useRef(browserNotifications);

  // Keep refs up to date
  useEffect(() => {
    onNewAlertRef.current = onNewAlert;
    onAlertUpdateRef.current = onAlertUpdate;
    onEventRef.current = onEvent;
    assetIdsRef.current = assetIds;
    severitiesRef.current = severities;
    statusesRef.current = statuses;
    playSoundRef.current = playSound;
    browserNotificationsRef.current = browserNotifications;
    userIdRef.current = userId;
  });

  // Handle incoming changes — stable callback (no deps that change per render)
  // Debounced to batch rapid-fire DB changes (e.g. bulk operations)
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<RealtimeHazardAlert>) => {
      // Clear existing debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Debounce by 500ms
      debounceTimeoutRef.current = setTimeout(() => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        // Type assertion for the records
        const alert = newRecord as RealtimeHazardAlert | undefined;
        const oldAlert = oldRecord as RealtimeHazardAlert | undefined;

        // Apply filters (read latest values from refs)
        if (alert) {
          const ids = assetIdsRef.current;
          const sevs = severitiesRef.current;
          const sts = statusesRef.current;
          if (ids?.length && alert.asset_id && !ids.includes(alert.asset_id)) {
            return;
          }
          if (sevs?.length && !sevs.includes(alert.severity)) {
            return;
          }
          if (sts?.length && !sts.includes(alert.status)) {
            return;
          }
        }

        // Create event
        const event: HazardRealtimeEvent = {
          type: eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          alert: alert || (oldAlert as RealtimeHazardAlert),
          ...(oldAlert ? { oldAlert } : {}),
          timestamp: new Date(),
        };

        // Update recent events (keep last 50)
        setRecentEvents((prev) => [event, ...prev].slice(0, 50));

        // Handle specific event types
        if (eventType === 'INSERT' && alert) {
          setNewAlertCount((prev) => prev + 1);
          onNewAlertRef.current?.(alert);

          // Play sound for new critical/high alerts
          if (
            playSoundRef.current &&
            (alert.severity === 'critical' || alert.severity === 'high')
          ) {
            playAlertSound(alert.severity);
          }

          // Show browser notification
          if (browserNotificationsRef.current) {
            showBrowserNotification(alert);
          }

          // Create a persistent notification row for critical/high severity alerts
          if ((alert.severity === 'critical' || alert.severity === 'high') && userIdRef.current) {
            createNotification({
              userId: userIdRef.current,
              type: 'hazard',
              title:
                alert.severity === 'critical' ? 'Critical Hazard Alert' : 'High Severity Hazard',
              body: `A ${alert.severity} severity hazard has been detected on asset ${alert.asset_id}`,
              resourceId: alert.id,
              resourceType: 'hazard_alert',
            }).catch((err) => {
              console.warn('[useHazardAlertRealtime] Failed to create notification:', err);
            });
          }
        } else if (eventType === 'UPDATE' && alert) {
          onAlertUpdateRef.current?.(alert, oldAlert);
        }

        // General callback
        onEventRef.current?.(event);
      }, 500);
    },
    [] // stable — all volatile values read from refs
  );

  // Connect to realtime channel
  const connect = useCallback(() => {
    const supabase = getSupabaseClient();

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new channel
    const channel = supabase
      .channel('hazard-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hazard_alerts',
        },
        handleChange
      )
      .subscribe((status: string) => {
        setIsConnected(status === 'SUBSCRIBED');

        // Auto-reconnect on error
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      });

    channelRef.current = channel;
  }, [handleChange]);

  // Disconnect from realtime channel
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (channelRef.current) {
      const supabase = getSupabaseClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  // Clear new alert count
  const clearNewAlertCount = useCallback(() => {
    setNewAlertCount(0);
  }, []);

  // Setup subscription on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    recentEvents,
    reconnect,
    disconnect,
    newAlertCount,
    clearNewAlertCount,
  };
}

export default useHazardAlertRealtime;
