-- P0-3: Add idempotency key to scan_events to prevent duplicate scans from offline queue replay.
-- When network drops mid-response, the server creates the row but the client doesn't remove
-- the queue entry. On replay, the idempotency key causes ON CONFLICT DO NOTHING instead of a dupe.

ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- Partial unique index — only non-null keys are checked (normal online scans have NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_events_idempotency_key
  ON scan_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
