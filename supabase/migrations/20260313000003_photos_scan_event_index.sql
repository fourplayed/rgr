-- ============================================================================
-- Add missing index on photos.scan_event_id
--
-- Every getPhotosByScanEventId() call and every scan event deletion (undo flow)
-- triggers a sequential scan on the photos table. This index covers both
-- lookup and cascading delete patterns.
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_scan_event
    ON photos(scan_event_id)
    WHERE scan_event_id IS NOT NULL;
