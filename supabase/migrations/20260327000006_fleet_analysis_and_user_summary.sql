-- Fleet Analysis + User Action Summary
-- Adds AI-powered daily fleet analysis storage and per-user 24h activity RPC

-- ── 1a. fleet_analysis table ──
CREATE TABLE fleet_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date DATE NOT NULL UNIQUE,
  content TEXT NOT NULL,
  input_data JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  model VARCHAR(50) NOT NULL DEFAULT 'claude-3-5-haiku-latest',
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fleet_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY fleet_analysis_select ON fleet_analysis
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE INDEX idx_fleet_analysis_date ON fleet_analysis(analysis_date DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE fleet_analysis;

-- ── 1b. get_user_action_summary RPC ──
CREATE OR REPLACE FUNCTION get_user_action_summary(p_user_id UUID)
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_build_object(
    'scans_performed',
      (SELECT COUNT(*) FROM scan_events
       WHERE scanned_by = p_user_id AND created_at > now() - interval '24 hours'),
    'defects_reported',
      (SELECT COUNT(*) FROM defect_reports
       WHERE reported_by = p_user_id AND created_at > now() - interval '24 hours'),
    'maintenance_reported',
      (SELECT COUNT(*) FROM maintenance_records
       WHERE reported_by = p_user_id AND created_at > now() - interval '24 hours'),
    'maintenance_completed',
      (SELECT COUNT(*) FROM maintenance_records
       WHERE completed_by = p_user_id AND status = 'completed'
       AND completed_at > now() - interval '24 hours')
  )
  WHERE auth.uid() = p_user_id;
$$;
GRANT EXECUTE ON FUNCTION get_user_action_summary(UUID) TO authenticated;

-- ── 1c. Cron job — 30 min after rego-check (20:30 UTC = 4:30 AM AWST) ──
SELECT cron.schedule(
  'daily-fleet-analysis',
  '30 20 * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/fleet-analysis-daily',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
      'Content-Type', 'application/json'),
    body := '{}'::jsonb
  ); $$
);

-- ── 1d. Retention cleanup — keep 6 months ──
SELECT cron.schedule(
  'fleet-analysis-cleanup',
  '0 3 1 * *',
  $$DELETE FROM fleet_analysis WHERE created_at < now() - interval '6 months'$$
);
