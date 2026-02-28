-- Composite index for count history list queries
-- Covers: .eq('depot_id', depotId).order('started_at DESC')
CREATE INDEX IF NOT EXISTS idx_count_sessions_depot_started
  ON asset_count_sessions(depot_id, started_at DESC);
