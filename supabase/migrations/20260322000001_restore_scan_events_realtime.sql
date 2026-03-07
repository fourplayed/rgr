-- ============================================================================
-- Restore scan_events to realtime publication
--
-- Migration 20260302 removed scan_events from supabase_realtime because
-- mobile has no realtime subscriptions. However, the web dashboard's
-- useFleetRealtime hook subscribes to scan_events changes for live
-- dashboard updates. Without this, the subscription silently receives
-- nothing and the dashboard goes stale.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'scan_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE scan_events;
    END IF;
END $$;
